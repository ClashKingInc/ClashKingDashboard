import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

test("public language choices persist through popup, shared links, and dashboard navigation", { timeout: 30000 }, async () => {
  const dom = new JSDOM('<html><body><div id="root"></div></body></html>', { url: "http://localhost/fr/terms" });
  const globals = ["window", "document", "navigator", "location", "localStorage", "sessionStorage", "HTMLElement", "Element", "Node", "Event", "MouseEvent", "CustomEvent", "MutationObserver", "getComputedStyle", "addEventListener", "removeEventListener", "dispatchEvent", "requestAnimationFrame", "cancelAnimationFrame", "IS_REACT_ACT_ENVIRONMENT"];
  const previous = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of globals.slice(0, 14)) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  for (const key of ["addEventListener", "removeEventListener", "dispatchEvent"]) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key].bind(dom.window) });
  globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);
  globalThis.cancelAnimationFrame = clearTimeout;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const browserLanguage = language => Object.defineProperty(navigator, "languages", { configurable: true, value: [language] });
  browserLanguage("nl-NL");
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

  let loader, server, root, React;
  try {
    React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterContextProvider } = await import("@tanstack/react-router");
    const config = { configFile: false, cacheDir: ".wrangler/locale-test-cache", resolve: { alias: { "@": process.cwd() } }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } };
    loader = await createServer(config);
    const { publicSeoCopyPlugin } = await loader.ssrLoadModule("/scripts/public-seo-copy-plugin.ts");
    await loader.close();
    loader = undefined;
    server = await createServer({ ...config, plugins: [publicSeoCopyPlugin()] });
    const { ClanSignalHeader } = await server.ssrLoadModule("/components/landing/explorations/clan-signal/header.tsx");
    const { DocumentMetadata } = await server.ssrLoadModule("/components/document-metadata.tsx");
    const { LocaleProvider, updateDashboardLocale } = await server.ssrLoadModule("/components/locale-provider.tsx");
    const rootRoute = createRootRoute();
    const catchAll = createRoute({ getParentRoute: () => rootRoute, path: "$" });
    const router = createRouter({ routeTree: rootRoute.addChildren([catchAll]), history: createMemoryHistory({ initialEntries: ["/fr/terms"] }) });
    router.history.subscribe(() => { void router.load(); });
    root = createRoot(document.getElementById("root"));

    // SSR-loaded hooks read the router's current snapshot. Re-render the context
    // on navigation to exercise the same pathname changes as the app's RootLayout.
    const render = async () => {
      await React.act(async () => {
        root.render(React.createElement(RouterContextProvider, { router },
          React.createElement(LocaleProvider, { pathname: router.state.location.pathname },
            React.createElement(React.Fragment, null,
              React.createElement(DocumentMetadata),
              React.createElement(ClanSignalHeader, { landingTheme: "day" })))));
      });
    };
    const until = async predicate => {
      const deadline = Date.now() + 5000;
      while (!predicate() && Date.now() < deadline) await React.act(async () => { await delay(20); });
      assert.ok(predicate(), "UI did not reach the expected language state");
    };
    const navigate = async href => {
      dom.reconfigure({ url: `http://localhost${href}` });
      await React.act(async () => { router.history.push(href); await router.load(); });
      const requestedPath = router.state.location.pathname;
      await render();
      if (router.state.location.pathname !== requestedPath) await render();
    };
    await router.load();
    await render();
    await until(() => document.documentElement.lang === "fr" && document.querySelector(".ck-language-suggestion"));
    assert.equal(router.state.location.pathname, "/fr/terms");
    await until(() => document.querySelector('link[rel="canonical"]')?.href === "https://clashk.ing/fr/terms");
    assert.equal(localStorage.getItem("clashking_locale"), "fr");
    assert.equal(localStorage.getItem("clashking_locale_mode"), "manual");

    await React.act(async () => document.querySelector(".ck-language-suggestion button").click());
    assert.equal(document.querySelector(".ck-language-suggestion"), null);
    assert.equal(router.state.location.pathname, "/fr/terms");
    localStorage.removeItem("clashking_public_language_suggestion");
    await React.act(async () => window.dispatchEvent(new Event("languagechange")));
    const suggestion = document.querySelector(".ck-language-suggestion");
    assert.equal(suggestion.lang, "nl");
    await React.act(async () => suggestion.querySelector("a").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })));
    await render();
    await until(() => document.documentElement.lang === "nl");
    assert.equal(router.state.location.pathname, "/nl/terms");
    assert.equal(localStorage.getItem("clashking_locale_mode"), "browser");
    assert.ok(document.cookie.includes("CK_WEB_LOCALE=browser:nl"));

    await navigate("/fr/privacy?source=shared#details");
    await until(() => document.documentElement.lang === "nl");
    assert.equal(router.state.location.pathname, "/nl/privacy");
    await until(() => document.querySelector('link[rel="canonical"]')?.href === "https://clashk.ing/nl/privacy");
    assert.equal(router.state.location.searchStr, "?source=shared");
    assert.equal(router.state.location.hash, "details");
    assert.equal(localStorage.getItem("clashking_locale_mode"), "browser");

    browserLanguage("de-DE");
    await React.act(async () => window.dispatchEvent(new Event("languagechange")));
    await render();
    await until(() => document.documentElement.lang === "de");
    assert.equal(router.state.location.pathname, "/de/privacy");
    await navigate("/login");
    await until(() => document.documentElement.lang === "de");
    await React.act(async () => updateDashboardLocale("it", "manual"));
    await until(() => document.documentElement.lang === "it");
    // The other origin changes only the shared cookie: no storage/custom event
    // is delivered to this already-open dashboard tab.
    document.cookie = "CK_WEB_LOCALE=manual:nl; path=/";
    assert.equal(document.documentElement.lang, "it");
    await React.act(async () => window.dispatchEvent(new Event("focus")));
    await until(() => document.documentElement.lang === "nl");
    assert.equal(router.state.location.pathname, "/login");
    assert.equal(localStorage.getItem("clashking_locale"), "nl");
    assert.equal(localStorage.getItem("clashking_locale_mode"), "manual");

    document.cookie = "CK_WEB_LOCALE=manual:fr; path=/";
    await React.act(async () => window.dispatchEvent(new Event("pageshow")));
    await until(() => document.documentElement.lang === "fr");

    Object.defineProperty(document, "visibilityState", {configurable:true, value:"hidden"});
    document.cookie = "CK_WEB_LOCALE=browser:nl; path=/";
    await React.act(async () => document.dispatchEvent(new Event("visibilitychange")));
    assert.equal(document.documentElement.lang, "fr");
    Object.defineProperty(document, "visibilityState", {configurable:true, value:"visible"});
    await React.act(async () => document.dispatchEvent(new Event("visibilitychange")));
    await until(() => document.documentElement.lang === "de");
    assert.equal(localStorage.getItem("clashking_locale_mode"), "browser");
    assert.equal(localStorage.getItem("clashking_locale"), "de");

    // Native-embedded sessions keep the locale supplied by the native app.
    sessionStorage.setItem("ck_scoped_server", "123");
    document.cookie = "CK_WEB_LOCALE=manual:nl; path=/";
    await React.act(async () => window.dispatchEvent(new Event("focus")));
    assert.equal(document.documentElement.lang, "de");
    sessionStorage.removeItem("ck_scoped_server");
    await React.act(async () => updateDashboardLocale("it", "manual"));
    await until(() => document.documentElement.lang === "it");
    await navigate("/fr/terms");
    await until(() => document.documentElement.lang === "fr");
    assert.equal(localStorage.getItem("clashking_locale"), "it");
    assert.equal(localStorage.getItem("clashking_locale_mode"), "manual");
  } finally {
    if (root) await React.act(async () => root.unmount());
    if (server) await server.close();
    if (loader) await loader.close();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
