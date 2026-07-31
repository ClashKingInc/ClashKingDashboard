import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["en", "fr", "nl"];

function flatten(value, prefix = "", output = new Map()) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    output.set(prefix, {
      type: Array.isArray(value) ? "array" : typeof value,
      value,
    });
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

function placeholders(value) {
  if (typeof value !== "string") return [];
  return [
    ...new Set(
      [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)(?:,|\})/g)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
}

const parsed = {};
for (const locale of locales) {
  const filename = resolve(projectRoot, "messages", `${locale}.json`);
  parsed[locale] = JSON.parse(await readFile(filename, "utf8"));
}

const english = flatten(parsed.en);
let failed = false;

for (const locale of locales.slice(1)) {
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

  if (missing.length || extra.length || typeMismatches.length || placeholderMismatches.length) {
    failed = true;
    console.error(`messages/${locale}.json does not match messages/en.json`);
    if (missing.length) console.error(`  Missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`  Extra: ${extra.join(", ")}`);
    if (typeMismatches.length) console.error(`  Type mismatch: ${typeMismatches.join(", ")}`);
    if (placeholderMismatches.length) {
      console.error(`  Placeholder mismatch: ${placeholderMismatches.join(", ")}`);
    }
  } else {
    console.log(`messages/${locale}.json: ${translated.size} keys match English`);
  }
}

if (failed) process.exitCode = 1;
