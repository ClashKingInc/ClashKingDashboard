import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

// Run the shipped Worker and app, not manually mounted components. Host resolver
// rules keep both real production hostnames local so domain cookies and origin
// isolation work as in deployment. No API or browser responses are fabricated.
const port = 8855;
const local = `http://127.0.0.1:${port}`;
const site = `http://clashk.ing:${port}`;
const dash = `http://dash.clashk.ing:${port}`;
const worker = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "dev", "--config", "dist/clashking_dashboard/wrangler.json", "--local", "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", "0"], { env: { ...process.env, WRANGLER_SEND_METRICS: "false" }, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
worker.stdout.on("data", data => { logs += data; });
worker.stderr.on("data", data => { logs += data; });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (worker.exitCode !== null) throw Error(logs.slice(-3000));
    try { ready = (await fetch(local, { signal: AbortSignal.timeout(1000) })).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, logs.slice(-3000));
  const { PUBLIC_LOCALES: locales, PUBLIC_PAGE_PATHS: pagePaths, publicPath } = await import("../lib/locale-preference.ts");
  const sitemap = await fetch(`${local}/sitemap.xml`).then(response => response.text());
  for (const locale of locales) {
    const catalog = JSON.parse(await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"));
    for (const page of pagePaths) {
      const path = publicPath(locale, page);
      const response = await fetch(local + path);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert(html.includes(`lang="${locale}"`), path);
      assert(html.includes(`rel="canonical" href="https://clashk.ing${path}"`), path);
      assert(html.includes(`hreflang="x-default"`), path);
      assert(sitemap.includes(`<loc>https://clashk.ing${path}</loc>`), path);
      const title = page === "/" ? catalog.ClanSignal.metadata.title
        : page === "/privacy" || page === "/terms" ? catalog.PublicSeo[page.slice(1)].title
          : `${page === "/features" ? catalog.FeaturesPage.hero.title : page === "/help" ? catalog.HelpPage.title : page === "/open-source" ? catalog.OpenSourcePage.title : catalog.SupportPage.title} | ClashKing`;
      assert(html.includes(title.replaceAll("&", "&amp;").replaceAll('"', "&quot;")), path);
    }
  }
  for (const path of pagePaths) {
    const alias = path === "/" ? "/en" : `/en${path}`;
    const response = await fetch(local + alias, { redirect: "manual" });
    assert.equal(response.status, 308, alias);
    assert.equal(new URL(response.headers.get("location")).pathname, path, alias);
  }
  console.log("PASS: built locale routes and sitemap");
  browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--no-proxy-server", "--host-resolver-rules=MAP clashk.ing 127.0.0.1, MAP dash.clashk.ing 127.0.0.1"] });
  const context = await browser.newContext({ locale: "nl-NL", colorScheme: "light", serviceWorkers: "block" });
  // Prevent the real page from reaching production APIs/CDNs during a local test.
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return ["clashk.ing", "dash.clashk.ing", "127.0.0.1"].includes(url.hostname) && url.port === String(port) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const waitLocale = async (tab, locale) => tab.waitForFunction(expected => document.querySelector(".cs-nav") && document.documentElement.lang === expected && !document.querySelector("[data-locale-loading]"), locale);
  let releaseCatalog;
  const catalogGate = new Promise(resolve => { releaseCatalog = resolve; });
  // Delay, then deliver the actual built French catalog to test a slow network.
  await page.route(/\/assets\/fr-[^/]+\.js$/, async route => { await catalogGate; await route.continue(); });
  await page.goto(`${site}/fr/terms`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-locale-loading]").waitFor({ state: "attached" });
  assert.equal(await page.locator(".cs-nav").count(), 0, "Do not render English navigation while French loads");
  releaseCatalog();
  await waitLocale(page, "fr");
  await page.unroute(/\/assets\/fr-[^/]+\.js$/);
  const fr = JSON.parse(await readFile(new URL("../messages/fr.json", import.meta.url), "utf8"));
  assert.equal(await page.locator(".cs-nav").getAttribute("aria-label"), fr.ClanSignal.navigation.ariaLabel);
  await page.locator(".ck-language-suggestion a").click();
  await waitLocale(page, "nl");
  assert(new URL(page.url()).pathname === "/nl/terms");
  await page.goto(`${site}/fr/privacy?source=shared#details`);
  await waitLocale(page, "nl");
  assert.equal(new URL(page.url()).pathname, "/nl/privacy");
  assert.equal(new URL(page.url()).search, "?source=shared");
  assert.equal(new URL(page.url()).hash, "#details");
  const openPreferences = async tab => { await tab.locator(".cs-language-trigger").click(); };
  await openPreferences(page);
  await page.locator(".ck-language-open").click();
  await page.getByRole("option", { name: /Français/ }).click();
  await waitLocale(page, "fr");
  assert.equal(new URL(page.url()).pathname, "/fr/privacy");
  await openPreferences(page);
  await page.locator(".ck-theme-options button").nth(1).click();
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
  const other = await context.newPage();
  await other.goto(`${dash}/privacy`);
  await waitLocale(other, "en"); // Public URL wins for manual mode; saved preference remains French.
  assert.equal(await other.evaluate(() => localStorage.getItem("clashking_locale")), "fr");
  await other.waitForFunction(() => document.documentElement.classList.contains("dark"));
  await other.goto(`${dash}/fr/features`);
  await waitLocale(other, "fr");
  await other.waitForFunction(() => document.querySelector('link[rel="canonical"]')?.href === "https://clashk.ing/fr/features");
  assert.equal(await other.locator("html").getAttribute("lang"), "fr", "Localized SEO must match the rendered UI language");
  await other.goto(`${dash}/privacy`);
  await waitLocale(other, "en");
  await openPreferences(other);
  await other.locator(".ck-theme-options button").nth(0).click();
  await other.waitForFunction(() => document.documentElement.classList.contains("light"));
  // Headless pages stay focused even when another page is brought forward.
  // Verify cross-origin persistence via an actual reload instead of fabricating
  // focus/visibility events (which would reproduce the removed mocked tests).
  await page.reload();
  await waitLocale(page, "fr");
  await page.waitForFunction(() => document.documentElement.classList.contains("light"));
  await openPreferences(page);
  await page.locator(".ck-theme-options button").nth(2).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(() => document.documentElement.classList.contains("light"));
  // A real app navigation with native session storage must retain the forced
  // appearance rather than exporting that appearance to the shared preference.
  await other.bringToFront();
  await other.evaluate(() => { sessionStorage.setItem("ck_scoped_server", "123"); sessionStorage.setItem("ck_embedded_theme", "dark"); });
  await other.reload();
  await other.waitForFunction(() => document.documentElement.classList.contains("dark"));
  assert((await context.cookies(site)).some(cookie => cookie.name === "CK_WEB_THEME" && cookie.value === "system"));
  const nl = JSON.parse(await readFile(new URL("../messages/nl.json", import.meta.url), "utf8"));
  const headings = {
    "/features": nl.FeaturesPage.hero.title,
    "/help": nl.HelpPage.title,
    "/open-source": nl.OpenSourcePage.title,
    "/support": nl.SupportPage.title,
  };
  for (const [path, heading] of Object.entries(headings)) {
    await page.goto(`${site}/nl${path}`);
    await waitLocale(page, "nl");
    assert.equal(await page.locator("h1").innerText(), heading);
    for (const target of Object.keys(headings)) {
      assert.equal(await page.locator(`.cs-footer-links a[href="/nl${target}"]`).count(), 1);
    }
    await openPreferences(page);
    await page.locator(".ck-language-open").click();
    await page.getByRole("option", { name: /Français/ }).click();
    await page.waitForURL(`${site}/fr${path}`);
    await waitLocale(page, "fr");
    await page.reload();
    await waitLocale(page, "fr");
    await openPreferences(page);
    await page.locator(".ck-language-open").click();
    await page.getByRole("option").first().click(); // Follow this browser's Dutch locale.
    await page.waitForURL(`${site}/nl${path}`);
    await waitLocale(page, "nl");
    await page.goto(`${site}/fr${path}?source=shared#details`);
    await page.waitForURL(`${site}/nl${path}?source=shared#details`);
    await waitLocale(page, "nl");
    await openPreferences(page);
    await page.locator(".ck-language-open").click();
    await page.getByRole("option", { name: /English/ }).click();
    await page.waitForURL(`${site}${path}`);
    await waitLocale(page, "en");
  }
  console.log("PASS: information-page headings, localized footer links, manual language switches, reloads, browser-language redirects and English URLs");
  await context.close();
  console.log(`PASS: ${locales.length * pagePaths.length} built localized pages and sitemap; slow catalog gate; real language controls and redirects; cross-origin preferences; OS themes; native-forced theme isolation.`);
} finally {
  await browser?.close();
  worker.kill("SIGTERM");
}
