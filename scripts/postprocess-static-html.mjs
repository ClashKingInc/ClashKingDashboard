import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "dist", "client");
const localizedFiles = {
  "index.html": "en",
  "privacy.html": "en",
  "terms.html": "en",
  "fr.html": "fr",
  "fr/privacy.html": "fr",
  "fr/terms.html": "fr",
  "nl.html": "nl",
  "nl/privacy.html": "nl",
  "nl/terms.html": "nl",
};

for (const [relativePath, locale] of Object.entries(localizedFiles)) {
  const filename = resolve(outputRoot, relativePath);
  const html = await readFile(filename, "utf8");
  const localized = html.replace(/<html lang="[^"]*"/, `<html lang="${locale}"`);
  if (localized === html && !html.includes(`<html lang="${locale}"`)) {
    throw new Error(`Could not set <html lang> in ${relativePath}`);
  }
  await writeFile(filename, localized);
}

console.log("Localized <html lang> in 9 public static pages");
