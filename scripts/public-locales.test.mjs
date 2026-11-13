import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";
import { PUBLIC_LOCALES, PUBLIC_LANGUAGE_OPTIONS, getPublicRoute, publicPath, getPublicLanguageSuggestion, initialLocalePreference, readSavedLocalePreference, saveLocalePreference, preferredPublicPath } from "../lib/locale-preference.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

test("every selectable language has a stable public URL for each page", () => {
  assert.deepEqual(PUBLIC_LANGUAGE_OPTIONS.map(option => option.code), [...PUBLIC_LOCALES]);
  for (const locale of PUBLIC_LOCALES) {
    for (const page of ["/", "/privacy", "/terms"]) {
      const pathname = publicPath(locale, page);
      assert.ok(locale === "en" ? !pathname.startsWith("/en") : pathname.startsWith(`/${locale}`));
      assert.deepEqual(getPublicRoute(pathname), { locale, page });
      assert.deepEqual(getPublicRoute(pathname === "/" ? pathname : `${pathname}/`), { locale, page });
    }
  }
  for (const page of ["/", "/privacy", "/terms"]) {
    assert.deepEqual(getPublicRoute(page), { locale: "en", page });
  }
  for (const pathname of ["/xx", "/de/dashboard", "/fr/unknown", "/dashboard", "/french", "/en/features"]) {
    assert.equal(getPublicRoute(pathname), undefined);
  }
});

test("generated documents and sitemap cover all locales with reciprocal SEO links", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "clashking-public-seo-"));
  try {
    await mkdir(join(fixture, "dist/client"), { recursive: true });
    await mkdir(join(fixture, "messages"));
    await writeFile(join(fixture, "dist/client/index.html"), await readFile(join(root, "index.html")));
    for (const locale of PUBLIC_LOCALES) {
      await writeFile(join(fixture, `messages/${locale}.json`), await readFile(join(root, `messages/${locale}.json`)));
    }
    execFileSync(process.execPath, [join(root, "scripts/generate-public-shells.mjs")], { cwd: fixture });
    const sitemap = new JSDOM(await readFile(join(fixture, "dist/client/sitemap.xml"), "utf8"), { contentType: "text/xml" }).window.document;
    assert.equal(sitemap.querySelectorAll("url").length, PUBLIC_LOCALES.length * 3 + 4);
    for (const locale of PUBLIC_LOCALES) {
      const messages = JSON.parse(await readFile(join(fixture, `messages/${locale}.json`), "utf8"));
      for (const page of ["/", "/privacy", "/terms"]) {
        const pathname = publicPath(locale, page);
        const html = await readFile(join(fixture, pathname === "/" ? "dist/client/index.html" : `dist/client${pathname}.html`), "utf8");
        const document = new JSDOM(html).window.document;
        assert.equal(document.documentElement.lang, locale);
        assert.equal(document.documentElement.dir, ["ar", "he", "ur"].includes(locale) ? "rtl" : "ltr");
        assert.equal(document.title, page === "/" ? messages.ClanSignal.metadata.title : messages.PublicSeo[page.slice(1)].title);
        assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
        assert.equal(document.querySelector('link[rel="canonical"]').href, `https://clashk.ing${pathname}`);
        assert.equal(document.querySelectorAll('link[hreflang]').length, PUBLIC_LOCALES.length + 1);
        const entry = [...sitemap.querySelectorAll("url")].find(url => url.querySelector("loc").textContent === `https://clashk.ing${pathname}`);
        assert.ok(entry);
        for (const alternate of [...PUBLIC_LOCALES, "x-default"]) {
          const href = `https://clashk.ing${publicPath(alternate === "x-default" ? "en" : alternate, page)}`;
          assert.equal(document.querySelector(`link[hreflang="${alternate}"]`).href, href);
          assert.equal(entry.querySelector(`[hreflang="${alternate}"]`).getAttribute("href"), href);
        }
      }
    }
    for (const [alias, canonical] of [["index", "/"], ["privacy", "/privacy"], ["terms", "/terms"]]) {
      const document = new JSDOM(await readFile(join(fixture, `dist/client/${alias}.html`), "utf8")).window.document;
      assert.equal(document.querySelector('link[rel="canonical"]').href, `https://clashk.ing${canonical}`);
    }
  } finally {
    assert.equal(resolve(dirname(fixture)), resolve(tmpdir()));
    assert.ok(basename(fixture).startsWith("clashking-public-seo-"));
    await rm(fixture, { recursive: true, force: true });
  }
});

test("browser language is only suggested when useful and respects a dismissed choice", () => {
  assert.equal(getPublicLanguageSuggestion("/", ["nl-NL", "en"], null), "nl");
  assert.equal(getPublicLanguageSuggestion("/en", ["nl-NL"], null), "nl");
  assert.equal(getPublicLanguageSuggestion("/fr/terms", ["nl-BE"], null), "nl");
  assert.equal(getPublicLanguageSuggestion("/nl", ["nl-NL"], null), undefined);
  assert.equal(getPublicLanguageSuggestion("/", ["nl-NL"], "nl"), undefined);
  assert.equal(getPublicLanguageSuggestion("/", ["de-DE"], "nl"), "de");
  assert.equal(getPublicLanguageSuggestion("/no", ["nb-NO"], null), undefined);
  assert.equal(getPublicLanguageSuggestion("/fr", ["zz-ZZ"], null), undefined);
  assert.equal(getPublicLanguageSuggestion("/fr", [], null), undefined);
  assert.equal(getPublicLanguageSuggestion("/dashboard", ["nl-NL"], null), undefined);
});

test("first public visit seeds the URL language and preserves explicit preferences", () => {
  assert.deepEqual(initialLocalePreference("/fr", undefined, ["nl-NL"]), {locale:"fr", mode:"manual"});
  assert.deepEqual(initialLocalePreference("/", undefined, ["nl-NL"]), {locale:"en", mode:"manual"});
  assert.deepEqual(initialLocalePreference("/dashboard", undefined, ["nl-NL"]), {locale:"nl", mode:"browser"});
  assert.deepEqual(initialLocalePreference("/fr", {locale:"nl", mode:"browser"}, ["nl-NL"]), {locale:"nl", mode:"browser"});
  assert.deepEqual(initialLocalePreference("/fr", {locale:"de", mode:"manual"}, ["nl-NL"]), {locale:"de", mode:"manual"});
});

test("preference survives website to dashboard navigation and browser mode stays dynamic", () => {
  const website = new JSDOM("", {url:"https://clashk.ing/fr"});
  const dashboard = new JSDOM("", {url:"https://dash.clashk.ing/dashboard", cookieJar:website.cookieJar});
  const other = new JSDOM("", {url:"https://unrelated.example/", cookieJar:website.cookieJar});
  const previous = Object.fromEntries(["document", "location", "localStorage"].map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const bind = window => {
    for (const key of ["document", "location", "localStorage"]) Object.defineProperty(globalThis,key,{configurable:true,value:window[key]});
  };
  try {
    bind(website.window);
    saveLocalePreference("fr", "manual");
    bind(dashboard.window);
    assert.equal(localStorage.length,0);
    assert.deepEqual(readSavedLocalePreference(["nl-NL"]), {locale:"fr", mode:"manual"});
    saveLocalePreference("nl", "browser");
    bind(website.window);
    assert.deepEqual(readSavedLocalePreference(["de-DE"]), {locale:"de", mode:"browser"});
    assert.deepEqual(readSavedLocalePreference(["nl-NL"]), {locale:"nl", mode:"browser"});
    bind(other.window);
    assert.equal(readSavedLocalePreference(["nl-NL"]), undefined);
  } finally {
    for(const [key,descriptor] of Object.entries(previous)) {
      if(descriptor) Object.defineProperty(globalThis,key,descriptor);
      else delete globalThis[key];
    }
    website.window.close(); dashboard.window.close(); other.window.close();
  }
});

test("saved browser mode follows the visitor's language when opening shared public links", () => {
  const dutchBrowser = {locale:"nl", mode:"browser"};
  assert.equal(preferredPublicPath("/fr", dutchBrowser), "/nl");
  assert.equal(preferredPublicPath("/fr/privacy", dutchBrowser), "/nl/privacy");
  assert.equal(preferredPublicPath("/fr/terms", dutchBrowser), "/nl/terms");
  assert.equal(preferredPublicPath("/nl", dutchBrowser), undefined);
  assert.equal(preferredPublicPath("/dashboard/settings", dutchBrowser), undefined);
  assert.equal(preferredPublicPath("/fr", initialLocalePreference("/fr", undefined, ["nl-NL"])), undefined);
  assert.equal(preferredPublicPath("/fr", {locale:"nl",mode:"manual"}), undefined);
  assert.equal(preferredPublicPath("/fr/terms", {locale:"en",mode:"browser"}), "/terms");
});
