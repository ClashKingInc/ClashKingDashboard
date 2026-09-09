import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import * as contracts from "@clashking/api-contracts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clientRoot = resolve(projectRoot, "lib/api/clients");
const outputPath = resolve(projectRoot, "docs/api-contract-migration-manifest.json");

function sourceText(source, node) {
  return source.slice(node.start, node.end);
}

function propertyValue(object, name) {
  if (object?.type !== "ObjectExpression") return undefined;
  const property = object.properties.find(
    (entry) =>
      entry.type === "ObjectProperty" &&
      !entry.computed &&
      ((entry.key.type === "Identifier" && entry.key.name === name) ||
        (entry.key.type === "StringLiteral" && entry.key.value === name)),
  );
  return property?.type === "ObjectProperty" ? property.value : undefined;
}

function normalizedPath(source, node) {
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral") {
    return node.quasis
      .map((quasi, index) => {
        const expression = node.expressions[index];
        return quasi.value.cooked + (expression ? `{${sourceText(source, expression)}}` : "");
      })
      .join("");
  }
  return sourceText(source, node);
}

function walk(node, visit) {
  visit(node);
  for (const [key, value] of Object.entries(node ?? {})) {
    if (["loc", "start", "end", "extra", "errors", "comments", "tokens"].includes(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child.type === "string") walk(child, visit);
      }
    } else if (value && typeof value.type === "string") {
      walk(value, visit);
    }
  }
}

function importedTypeLocations(program) {
  const locations = new Map();
  for (const statement of program.body) {
    if (statement.type !== "ImportDeclaration" || !statement.source.value.startsWith("../types/")) continue;
    const sourcePath = `lib/api/${statement.source.value.replace(/^\.\.\//, "")}.ts`;
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportSpecifier") locations.set(specifier.local.name, sourcePath);
    }
  }
  return locations;
}

function referencedTypeLocations(signature, imports) {
  return [...imports.entries()]
    .filter(([name]) => new RegExp(`\\b${name}\\b`).test(signature))
    .map(([name, path]) => ({ name, path }));
}

function contractImports(program) {
  const bindings = new Map();
  for (const statement of program.body) {
    if (statement.type !== "ImportDeclaration" || statement.source.value !== "@clashking/api-contracts") continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportSpecifier") bindings.set(specifier.local.name, contracts[specifier.imported.name]);
      if (specifier.type === "ImportNamespaceSpecifier") bindings.set(specifier.local.name, contracts);
    }
  }
  return bindings;
}

function resolveContract(node, bindings) {
  if (node?.type === "Identifier") return bindings.get(node.name);
  if (node?.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
    return resolveContract(node.object, bindings)?.[node.property.name];
  }
  return undefined;
}

async function clientEndpoints() {
  const files = (await readdir(clientRoot))
    .filter((name) => name.endsWith("-client.ts") && !name.endsWith(".test.ts"))
    .sort();
  const endpoints = [];

  for (const file of files) {
    const filename = resolve(clientRoot, file);
    const source = await readFile(filename, "utf8");
    const program = parse(source, { sourceType: "module", plugins: ["typescript"] }).program;
    const imports = importedTypeLocations(program);
    const bindings = contractImports(program);
    let className = "";

    walk(program, (node) => {
      if (node.type === "ClassDeclaration") className = node.id?.name ?? className;
      if (node.type !== "ClassMethod" || node.key.type !== "Identifier") return;

      let requestCall;
      walk(node.body, (candidate) => {
        if (requestCall || candidate.type !== "CallExpression") return;
        if (
          candidate.callee.type === "MemberExpression" &&
          candidate.callee.object.type === "ThisExpression" &&
          candidate.callee.property.type === "Identifier" &&
          candidate.callee.property.name === "executeEndpoint"
        ) {
          requestCall = candidate;
        }
      });
      if (!requestCall?.arguments[0] || requestCall.arguments[0].type === "SpreadElement") return;

      const descriptor = resolveContract(requestCall.arguments[0], bindings);
      if (!descriptor?.operationId) throw new Error(`Unresolved shared descriptor in ${file}:${node.loc.start.line}`);
      const responseTypeNode = node.returnType?.typeAnnotation;
      const responseType = responseTypeNode ? sourceText(source, responseTypeNode) : "inferred from shared descriptor";
      const parameterSignature = node.params.map((parameter) => sourceText(source, parameter)).join(", ");
      const signature = `${parameterSignature} ${responseType}`;

      endpoints.push({
        clientMethod: `${className}.${node.key.name}`,
        operationId: descriptor.operationId,
        method: descriptor.method,
        path: descriptor.path,
        contract: sourceText(source, requestCall.arguments[0]),
        validatedBySharedClient: true,
        responseType,
        parameters: parameterSignature,
        source: `${relative(projectRoot, filename)}:${node.loc.start.line}`,
        localTypeLocations: referencedTypeLocations(signature, imports),
      });
    });
  }
  return endpoints;
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.[jt]sx?$/.test(entry.name) && !/\.(?:test|spec)\.[jt]sx?$/.test(entry.name)) files.push(path);
  }
  return files;
}

async function directCallers() {
  const roots = ["app", "components", "lib/auth", "workers/roster-assistant"];
  const files = (await Promise.all(roots.map((root) => sourceFiles(resolve(projectRoot, root))))).flat();
  const callers = [];

  for (const filename of files) {
    const source = await readFile(filename, "utf8");
    const program = parse(source, {
      sourceType: "module",
      plugins: ["typescript", ...(filename.endsWith("x") ? ["jsx"] : [])],
    }).program;
    const bindings = contractImports(program);
    walk(program, (node) => {
      if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
      const shared = ["executeSharedEndpoint", "executeSharedApiResult", "executeAssistantEndpoint"].includes(node.callee.name);
      const rawAssistant = node.callee.name === "apiRequest";
      if (!shared && !rawAssistant && node.callee.name !== "apiFetch" && node.callee.name !== "fetch") return;
      const argument = node.arguments[node.callee.name === "executeAssistantEndpoint" || rawAssistant ? 2 : 0];
      if (!argument || argument.type === "SpreadElement") return;
      if (shared) {
        const descriptor = resolveContract(argument, bindings);
        if (!descriptor?.operationId) throw new Error(`Unresolved shared descriptor in ${filename}:${node.loc.start.line}`);
        callers.push({
          helper: node.callee.name,
          operationId: descriptor.operationId,
          method: descriptor.method,
          path: descriptor.path,
          contract: sourceText(source, argument),
          validatedBySharedClient: true,
          source: `${relative(projectRoot, filename)}:${node.loc.start.line}`,
        });
        return;
      }
      const path = normalizedPath(source, argument);
      if (!path.includes("/v2/") && node.callee.name !== "apiFetch") return;
      const options = node.arguments[1];
      const methodNode = propertyValue(options, "method");
      callers.push({
        helper: node.callee.name,
        method: rawAssistant ? "POST" : methodNode?.type === "StringLiteral" ? methodNode.value : "GET",
        path,
        validatedBySharedClient: false,
        source: `${relative(projectRoot, filename)}:${node.loc.start.line}`,
      });
    });
  }
  return callers.sort((a, b) => a.source.localeCompare(b.source));
}

const manifest = {
  generatedFrom: "ClashKingDashboard current shared descriptor callers and remaining raw transport boundaries",
  packageTargets: {
    contracts: "@clashking/api-contracts@0.1.0-rc.12",
    client: "@clashking/api-client@0.1.0-rc.12",
  },
  queryToPostRoutes: [
    "/v2/home/activity",
  ],
  statisticsGetRoutes: [
    "/v2/stats/ranked",
    "/v2/stats/war",
    "/v2/stats/cwl",
  ],
  leagueAnalyticsGetRoutes: [
    "/v2/player/:playerTag/ranked/:seasonId/battlelog",
    "/v2/player/:playerTag/legend/:day/battlelog",
    "/v2/stats/armies",
    "/v2/stats/league/hit-rates",
    "/v2/stats/league/tournaments",
  ],
  notes: [
    "No current Dashboard source caller references the body-based home activity route, statistics GET routes, or league analytics GET routes.",
    "The original GET /api/tenor-media resolver remains on the Dashboard frontend Worker; it is not a central API operation.",
    "localTypeLocations points to facade aliases or UI projections; wire types are derived from shared contracts.",
    "The auth refresh raw transport is independently schema-validated to avoid a circular refresh dependency.",
  ],
  clientEndpoints: await clientEndpoints(),
  directCallers: await directCallers(),
};

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${relative(projectRoot, outputPath)} with ${manifest.clientEndpoints.length} client endpoints and ${manifest.directCallers.length} direct callers.`);
