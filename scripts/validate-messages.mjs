import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
    console.log(`messages/${locale}.json: ${translated.size} keys match English`);
  }
}

if (failed) process.exitCode = 1;
