import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseSource } from "@babel/parser";
import { parse, TYPE } from "@formatjs/icu-messageformat-parser";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const messagesDirectory = resolve(projectRoot, "messages");
const expectedLocales = [
  "af", "ar", "ca", "cs", "da", "de", "el", "en", "es", "fi",
  "fr", "he", "hi", "hu", "it", "ja", "ko", "nl", "no", "pl",
  "pt", "ro", "ru", "sr", "sv", "tr", "uk", "ur", "vi", "zh",
];
const locales = (await readdir(messagesDirectory))
  .filter((filename) => filename.endsWith(".json"))
  .map((filename) => filename.slice(0, -5))
  .sort();

if (locales.join(",") !== [...expectedLocales].sort().join(",")) {
  throw new Error(
    `Runtime locale catalog mismatch. Expected ${expectedLocales.join(", ")}; found ${locales.join(", ")}.`,
  );
}

function flatten(value, prefix = "", output = new Map()) {
  if (value === null || typeof value !== "object") {
    output.set(prefix, {
      type: typeof value,
      value,
    });
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((child, index) => flatten(child, `${prefix}[${index}]`, output));
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

function messageAtPath(messages, key) {
  let value = messages;
  for (const segment of key.split(".")) {
    if (
      value === null ||
      typeof value !== "object" ||
      !Object.hasOwn(value, segment)
    ) {
      return { exists: false, value: undefined };
    }
    value = value[segment];
  }
  return { exists: true, value };
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", ".git", ".next", "dist"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await sourceFiles(path));
    } else if (
      /\.[jt]sx?$/.test(entry.name) &&
      !/\.(?:test|spec)\.[jt]sx?$/.test(entry.name)
    ) {
      files.push(path);
    }
  }
  return files;
}

function stringLiteralValue(node) {
  return node?.type === "StringLiteral" ? node.value : undefined;
}

function translationNamespace(call) {
  const argument = call.arguments[0];
  const directNamespace = stringLiteralValue(argument);
  if (directNamespace !== undefined) return directNamespace;
  if (argument?.type !== "ObjectExpression") return "";

  const namespaceProperty = argument.properties.find(
    (property) =>
      property.type === "ObjectProperty" &&
      !property.computed &&
      ((property.key.type === "Identifier" && property.key.name === "namespace") ||
        (property.key.type === "StringLiteral" && property.key.value === "namespace")),
  );
  if (namespaceProperty?.type !== "ObjectProperty") {
    return "";
  }
  return stringLiteralValue(namespaceProperty.value) ?? "";
}

function translationDeclaration(node) {
  if (
    node?.type !== "VariableDeclarator" ||
    node.id.type !== "Identifier" ||
    !node.init
  ) {
    return undefined;
  }

  const initializer = node.init.type === "AwaitExpression"
    ? node.init.argument
    : node.init;
  if (
    initializer.type !== "CallExpression" ||
    initializer.callee.type !== "Identifier" ||
    !["getTranslations", "useTranslations"].includes(initializer.callee.name)
  ) {
    return undefined;
  }

  return {
    name: node.id.name,
    namespace: translationNamespace(initializer),
  };
}

function forEachChild(node, visit) {
  for (const [key, value] of Object.entries(node ?? {})) {
    if (["loc", "start", "end", "extra", "errors", "comments", "tokens"].includes(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child.type === "string") visit(child);
      }
    } else if (value && typeof value.type === "string") {
      visit(value);
    }
  }
}

function unambiguousFileTranslators(program) {
  const candidates = new Map();
  const visit = (node) => {
    const declaration = translationDeclaration(node);
    if (declaration) {
      const namespaces = candidates.get(declaration.name) ?? new Set();
      namespaces.add(declaration.namespace);
      candidates.set(declaration.name, namespaces);
    }
    forEachChild(node, visit);
  };
  visit(program);

  return new Map(
    [...candidates.entries()]
      .filter(([, namespaces]) => namespaces.size === 1)
      .map(([name, namespaces]) => [name, [...namespaces][0]]),
  );
}

async function collectStaticTranslationCalls() {
  const files = (
    await Promise.all(
      ["app", "components", "lib", "src"].map((directory) =>
        sourceFiles(resolve(projectRoot, directory)),
      ),
    )
  ).flat();
  const calls = [];

  for (const filename of files) {
    const source = await readFile(filename, "utf8");
    const program = parseSource(source, {
      sourceType: "module",
      plugins: ["typescript", ...(filename.endsWith("x") ? ["jsx"] : [])],
    }).program;

    const visit = (node, inheritedTranslators = new Map()) => {
      const translators =
        [
          "Program",
          "BlockStatement",
          "FunctionDeclaration",
          "FunctionExpression",
          "ArrowFunctionExpression",
        ].includes(node.type)
          ? new Map(inheritedTranslators)
          : inheritedTranslators;

      const declaration = translationDeclaration(node);
      if (declaration) {
        translators.set(declaration.name, declaration.namespace);
      }

      if (node.type === "CallExpression") {
        let translatorName;
        let method = "call";
        if (node.callee.type === "Identifier") {
          translatorName = node.callee.name;
        } else if (
          node.callee.type === "MemberExpression" &&
          !node.callee.computed &&
          node.callee.object.type === "Identifier" &&
          node.callee.property.type === "Identifier"
        ) {
          translatorName = node.callee.object.name;
          method = node.callee.property.name;
        }

        if (
          translatorName &&
          translators.has(translatorName) &&
          ["call", "markup", "raw", "rich"].includes(method)
        ) {
          const key = stringLiteralValue(node.arguments[0]);
          if (key !== undefined) {
            const namespace = translators.get(translatorName);
            const fullKey = namespace ? `${namespace}.${key}` : key;
            calls.push({
              key: fullKey,
              method,
              location: `${filename.slice(projectRoot.length + 1)}:${node.loc?.start.line ?? 1}`,
            });
          }
        }
      }

      forEachChild(node, (child) => visit(child, translators));
    };

    visit(program, unambiguousFileTranslators(program));
  }

  return calls;
}

function placeholders(value) {
  if (typeof value !== "string") return [];
  const found = new Set();
  const visit = (elements) => {
    for (const element of elements) {
      if (
        element.type === TYPE.argument ||
        element.type === TYPE.number ||
        element.type === TYPE.date ||
        element.type === TYPE.time ||
        element.type === TYPE.select ||
        element.type === TYPE.plural
      ) {
        found.add(element.value);
      }
      if (element.type === TYPE.select || element.type === TYPE.plural) {
        for (const option of Object.values(element.options)) visit(option.value);
      } else if (element.type === TYPE.tag) {
        visit(element.children);
      }
    }
  };
  visit(parse(value));
  return [...found].sort();
}

function richTextTags(value) {
  if (typeof value !== "string") return [];
  const found = [];
  const visit = (elements) => {
    for (const element of elements) {
      if (element.type === TYPE.select || element.type === TYPE.plural) {
        for (const option of Object.values(element.options)) visit(option.value);
      } else if (element.type === TYPE.tag) {
        found.push(element.value);
        visit(element.children);
      }
    }
  };
  visit(parse(value));
  return found.sort();
}

function printfTokens(value) {
  if (typeof value !== "string") return [];
  return [...value.matchAll(/%(?:\d+\$)?[a-zA-Z]/g)].map((match) => match[0]).sort();
}

function icuControls(value) {
  if (typeof value !== "string") return [];
  const controls = [];
  const visit = (elements) => {
    for (const element of elements) {
      if (element.type === TYPE.select) {
        controls.push(`select:${element.value}`);
        for (const option of Object.values(element.options)) visit(option.value);
      } else if (element.type === TYPE.plural) {
        controls.push(
          `plural:${element.value}:${element.pluralType}:${element.offset ?? 0}`,
        );
        for (const option of Object.values(element.options)) visit(option.value);
      } else if (
        element.type === TYPE.number ||
        element.type === TYPE.date ||
        element.type === TYPE.time
      ) {
        controls.push(`${element.type}:${element.value}`);
      } else if (element.type === TYPE.tag) {
        visit(element.children);
      }
    }
  };
  visit(parse(value));
  return controls.sort();
}

function pluralBranches(value) {
  if (typeof value !== "string") return [];
  const plurals = [];
  const visit = (elements) => {
    for (const element of elements) {
      if (element.type === TYPE.plural) {
        plurals.push({
          argument: element.value,
          pluralType: element.pluralType,
          selectors: Object.keys(element.options),
        });
        for (const option of Object.values(element.options)) visit(option.value);
      } else if (element.type === TYPE.select) {
        for (const option of Object.values(element.options)) visit(option.value);
      } else if (element.type === TYPE.tag) {
        visit(element.children);
      }
    }
  };
  visit(parse(value));
  return plurals;
}

function invalidPluralBranches(source, translated, locale) {
  const sourcePlurals = pluralBranches(source);
  const allowedSourceSelectors = new Map();
  for (const plural of sourcePlurals) {
    const signature = `${plural.argument}:${plural.pluralType}`;
    const selectors = allowedSourceSelectors.get(signature) ?? new Set();
    plural.selectors.forEach((selector) => selectors.add(selector));
    allowedSourceSelectors.set(signature, selectors);
  }

  return pluralBranches(translated).flatMap((plural) => {
    const signature = `${plural.argument}:${plural.pluralType}`;
    const sourceSelectors = allowedSourceSelectors.get(signature) ?? new Set();
    const localeSelectors = new Set(
      new Intl.PluralRules(locale, { type: plural.pluralType }).resolvedOptions().pluralCategories,
    );
    return plural.selectors
      .filter((selector) => {
        if (selector === "other" || /^=\d+$/.test(selector)) return false;
        return !sourceSelectors.has(selector) && !localeSelectors.has(selector);
      })
      .map((selector) => `${plural.argument}:${selector}`);
  });
}

const parsed = {};
for (const locale of locales) {
  const filename = resolve(projectRoot, "messages", `${locale}.json`);
  parsed[locale] = JSON.parse(await readFile(filename, "utf8"));
}

const english = flatten(parsed.en);
let failed = false;

const staticTranslationCalls = await collectStaticTranslationCalls();
const missingEnglishCalls = staticTranslationCalls.filter(({ key, method }) => {
  const message = messageAtPath(parsed.en, key);
  if (!message.exists) return true;
  return method !== "raw" && typeof message.value !== "string";
});
const uniqueMissingEnglishCalls = [
  ...new Map(
    missingEnglishCalls.map((call) => [`${call.key}:${call.location}`, call]),
  ).values(),
];

if (uniqueMissingEnglishCalls.length > 0) {
  failed = true;
  console.error("messages/en.json does not cover static translation calls");
  for (const call of uniqueMissingEnglishCalls) {
    console.error(`  ${call.key} (${call.location})`);
  }
} else {
  const uniqueStaticKeys = new Set(staticTranslationCalls.map(({ key }) => key));
  console.log(`messages/en.json: ${uniqueStaticKeys.size} static translation keys resolve`);
}

for (const locale of locales.filter((locale) => locale !== "en")) {
  const translated = flatten(parsed[locale]);
  const missing = [...english.keys()].filter((key) => !translated.has(key));
  const extra = [...translated.keys()].filter((key) => !english.has(key));
  const typeMismatches = [...english.entries()]
    .filter(([key, entry]) => translated.has(key) && translated.get(key).type !== entry.type)
    .map(([key]) => key);
  const placeholderMismatches = [...english.entries()]
    .filter(([key, entry]) => {
      if (!translated.has(key) || entry.type !== "string") return false;
      return placeholders(entry.value).join(",") !== placeholders(translated.get(key).value).join(",");
    })
    .map(([key]) => key);
  const richTextTagMismatches = [...english.entries()]
    .filter(([key, entry]) => {
      if (!translated.has(key) || entry.type !== "string") return false;
      return richTextTags(entry.value).join(",") !== richTextTags(translated.get(key).value).join(",");
    })
    .map(([key]) => key);
  const printfTokenMismatches = [...english.entries()]
    .filter(([key, entry]) => {
      if (!translated.has(key) || entry.type !== "string") return false;
      return printfTokens(entry.value).join(",") !== printfTokens(translated.get(key).value).join(",");
    })
    .map(([key]) => key);
  const icuControlMismatches = [...english.entries()]
    .filter(([key, entry]) => {
      if (!translated.has(key) || entry.type !== "string") return false;
      return icuControls(entry.value).join(",") !== icuControls(translated.get(key).value).join(",");
    })
    .map(([key]) => key);
  const invalidPluralSelectors = [...english.entries()]
    .filter(([key, entry]) => {
      if (!translated.has(key) || entry.type !== "string") return false;
      return invalidPluralBranches(entry.value, translated.get(key).value, locale).length > 0;
    })
    .map(([key]) => key);

  if (
    missing.length ||
    extra.length ||
    typeMismatches.length ||
    placeholderMismatches.length ||
    richTextTagMismatches.length ||
    printfTokenMismatches.length ||
    icuControlMismatches.length ||
    invalidPluralSelectors.length
  ) {
    failed = true;
    console.error(`messages/${locale}.json does not match messages/en.json`);
    if (missing.length) console.error(`  Missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`  Extra: ${extra.join(", ")}`);
    if (typeMismatches.length) console.error(`  Type mismatch: ${typeMismatches.join(", ")}`);
    if (placeholderMismatches.length) {
      console.error(`  Placeholder mismatch: ${placeholderMismatches.join(", ")}`);
    }
    if (richTextTagMismatches.length) {
      console.error(`  Rich-text tag mismatch: ${richTextTagMismatches.join(", ")}`);
    }
    if (printfTokenMismatches.length) {
      console.error(`  Printf token mismatch: ${printfTokenMismatches.join(", ")}`);
    }
    if (icuControlMismatches.length) {
      console.error(`  ICU control mismatch: ${icuControlMismatches.join(", ")}`);
    }
    if (invalidPluralSelectors.length) {
      console.error(`  Invalid plural selector: ${invalidPluralSelectors.join(", ")}`);
    }
  } else {
    console.log(`messages/${locale}.json: ${translated.size} translated keys match English`);
  }
}

if (failed) process.exitCode = 1;
