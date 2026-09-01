import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, TYPE } from "@formatjs/icu-messageformat-parser";
import ts from "typescript";

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
  return node && ts.isStringLiteralLike(node) ? node.text : undefined;
}

function translationNamespace(call, sourceFile) {
  const argument = call.arguments[0];
  const directNamespace = stringLiteralValue(argument);
  if (directNamespace !== undefined) return directNamespace;
  if (!argument || !ts.isObjectLiteralExpression(argument)) return "";

  const namespaceProperty = argument.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      property.name.getText(sourceFile) === "namespace",
  );
  if (
    !namespaceProperty ||
    !ts.isPropertyAssignment(namespaceProperty)
  ) {
    return "";
  }
  return stringLiteralValue(namespaceProperty.initializer) ?? "";
}

function translationDeclaration(node, sourceFile) {
  if (
    !ts.isVariableDeclaration(node) ||
    !ts.isIdentifier(node.name) ||
    !node.initializer
  ) {
    return undefined;
  }

  const initializer = ts.isAwaitExpression(node.initializer)
    ? node.initializer.expression
    : node.initializer;
  if (
    !ts.isCallExpression(initializer) ||
    !ts.isIdentifier(initializer.expression) ||
    !["getTranslations", "useTranslations"].includes(initializer.expression.text)
  ) {
    return undefined;
  }

  return {
    name: node.name.text,
    namespace: translationNamespace(initializer, sourceFile),
  };
}

function unambiguousFileTranslators(sourceFile) {
  const candidates = new Map();
  const visit = (node) => {
    const declaration = translationDeclaration(node, sourceFile);
    if (declaration) {
      const namespaces = candidates.get(declaration.name) ?? new Set();
      namespaces.add(declaration.namespace);
      candidates.set(declaration.name, namespaces);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return new Map(
    [...candidates.entries()]
      .filter(([, namespaces]) => namespaces.size === 1)
      .map(([name, namespaces]) => [name, [...namespaces][0]]),
  );
}

async function collectStaticTranslationCalls() {
  const files = (
    await Promise.all(
      ["app", "components", "i18n", "lib"].map((directory) =>
        sourceFiles(resolve(projectRoot, directory)),
      ),
    )
  ).flat();
  const calls = [];

  for (const filename of files) {
    const source = await readFile(filename, "utf8");
    const sourceFile = ts.createSourceFile(
      filename,
      source,
      ts.ScriptTarget.Latest,
      true,
      filename.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const visit = (node, inheritedTranslators = new Map()) => {
      const translators =
        ts.isSourceFile(node) || ts.isFunctionLike(node) || ts.isBlock(node)
          ? new Map(inheritedTranslators)
          : inheritedTranslators;

      const declaration = translationDeclaration(node, sourceFile);
      if (declaration) {
        translators.set(declaration.name, declaration.namespace);
      }

      if (ts.isCallExpression(node)) {
        let translatorName;
        let method = "call";
        if (ts.isIdentifier(node.expression)) {
          translatorName = node.expression.text;
        } else if (
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression)
        ) {
          translatorName = node.expression.expression.text;
          method = node.expression.name.text;
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
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            calls.push({
              key: fullKey,
              method,
              location: `${filename.slice(projectRoot.length + 1)}:${line + 1}`,
            });
          }
        }
      }

      ts.forEachChild(node, (child) => visit(child, translators));
    };

    visit(sourceFile, unambiguousFileTranslators(sourceFile));
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
const intentionalFallbackPrefixes = ["ConnectedApps."];
const usesIntentionalFallback = (key) =>
  intentionalFallbackPrefixes.some((prefix) => key.startsWith(prefix));
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
  const missing = [...english.keys()].filter(
    (key) => !translated.has(key) && !usesIntentionalFallback(key),
  );
  const fallbackOverrides = [...translated.keys()].filter(usesIntentionalFallback);
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
    fallbackOverrides.length ||
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
    if (fallbackOverrides.length) {
      console.error(`  Intentional English fallback must be omitted: ${fallbackOverrides.join(", ")}`);
    }
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
    const fallbackCount = [...english.keys()].filter(usesIntentionalFallback).length;
    console.log(`messages/${locale}.json: ${translated.size} translated keys + ${fallbackCount} explicit English fallback keys match English`);
  }
}

if (failed) process.exitCode = 1;
