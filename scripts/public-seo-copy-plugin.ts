import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

/** Derive public metadata at build time without shipping complete locale files. */
export function publicSeoCopyPlugin(): Plugin {
  const moduleId = "virtual:public-seo-copy";
  return {
    name: "clashking-public-seo-copy",
    resolveId(id) { if (id === moduleId) return `\0${moduleId}`; },
    load(id) {
      if (id !== `\0${moduleId}`) return;
      const copy = Object.fromEntries(["en", "fr", "nl"].map((locale) => {
        const path = resolve(import.meta.dirname, `../messages/${locale}.json`);
        this.addWatchFile(path);
        const messages = JSON.parse(readFileSync(path, "utf8"));
        return [locale, { ClanSignal: { metadata: messages.ClanSignal.metadata }, PublicSeo: messages.PublicSeo }];
      }));
      return `export default ${JSON.stringify(copy)};`;
    },
  };
}
