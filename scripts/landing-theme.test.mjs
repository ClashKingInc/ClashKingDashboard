import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { initialWebTheme, readSharedTheme, sharedThemeCookie } from "../lib/theme-preference.ts";

test("new visitors default to system and previous theme choices are preserved", () => {
  assert.equal(initialWebTheme("", null), "system");
  assert.equal(initialWebTheme("CK_LANDING_THEME=system", null), "system");
  assert.equal(initialWebTheme("CK_LANDING_THEME=invalid", null), "system");
  assert.equal(initialWebTheme("other=value; CK_LANDING_THEME=day", null), "light");
  assert.equal(initialWebTheme("CK_LANDING_THEME=sunset; other=value", null), "dark");
});

test("system follows live OS changes while manual themes stay selected", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/" });
  const keys = ["window", "document", "navigator", "location", "localStorage", "IS_REACT_ACT_ENVIRONMENT"];
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of keys.slice(0, 5)) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const listeners = new Set();
  const media = { matches: false, addEventListener: (_, listener) => listeners.add(listener), removeEventListener: (_, listener) => listeners.delete(listener), addListener: listener => listeners.add(listener), removeListener: listener => listeners.delete(listener) };
  window.matchMedia = () => media;
  let root, server, React;
  try {
    React = await import("react");
    const { createRoot } = await import("react-dom/client");
    server = await createServer({ configFile: false, cacheDir: ".wrangler/theme-test-cache", resolve: { alias: { "@": process.cwd() } }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } });
    const { useTheme } = await import("next-themes");
    const { ThemeProvider } = await server.ssrLoadModule("/components/theme-provider.tsx");
    const { useLandingTheme } = await server.ssrLoadModule("/components/landing/explorations/clan-signal/use-landing-theme.ts");
    function Probe() {
      const { theme, preference, changeTheme } = useLandingTheme();
      const dashboard = useTheme();
      return React.createElement("div", { "data-theme": theme, "data-preference": preference, "data-dashboard": dashboard.theme },
        ...["day", "sunset", "system"].map(value => React.createElement("button", { key: value, "data-value": value, onClick: () => changeTheme(value) }, value)), ...["light", "dark", "system"].map(value => React.createElement("button", { key: `dashboard-${value}`, "data-dashboard-value": value, onClick: () => dashboard.setTheme(value) }, value)));
    }
    const state = () => document.querySelector("[data-theme]");
    root = createRoot(document.getElementById("root"));
    await React.act(async () => root.render(React.createElement(ThemeProvider, {attribute:"class", defaultTheme:"system", enableSystem:true}, React.createElement(Probe))));
    assert.equal(state().dataset.preference, "system");
    assert.equal(state().dataset.theme, "day");
    await React.act(async () => { media.matches = true; listeners.forEach(listener => listener(media)); });
    assert.equal(state().dataset.theme, "sunset");
    await React.act(async () => document.querySelector('[data-value="day"]').click());
    assert.equal(state().dataset.preference, "day");
    assert.equal(state().dataset.theme, "day");
    assert.ok(document.cookie.includes("CK_WEB_THEME=light"));
    await React.act(async () => { media.matches = false; listeners.forEach(listener => listener(media)); media.matches = true; listeners.forEach(listener => listener(media)); });
    assert.equal(state().dataset.theme, "day");
    await React.act(async () => document.querySelector('[data-value="system"]').click());
    assert.equal(state().dataset.preference, "system");
    assert.equal(state().dataset.theme, "sunset");
    assert.ok(document.cookie.includes("CK_WEB_THEME=system"));
    // Dashboard controls update the same context used by the landing page.
    await React.act(async () => document.querySelector('[data-dashboard-value="dark"]').click());
    assert.equal(state().dataset.preference, "sunset");
    assert.equal(state().dataset.theme, "sunset");
    assert.ok(document.cookie.includes("CK_WEB_THEME=dark"));
    await React.act(async () => document.querySelector('[data-value="day"]').click());
    assert.equal(state().dataset.dashboard, "light");
    // A change from the other origin is picked up when returning to this tab.
    document.cookie = "CK_WEB_THEME=dark; path=/";
    await React.act(async () => window.dispatchEvent(new window.Event("focus")));
    assert.equal(state().dataset.preference, "sunset");
    assert.equal(state().dataset.dashboard, "dark");
    await React.act(async () => root.unmount());
    root = undefined;
    assert.equal(listeners.size, 0);
    document.cookie = "CK_WEB_THEME=; Max-Age=0; path=/";
    localStorage.removeItem("theme");
    document.cookie = "CK_LANDING_THEME=sunset; path=/";
    media.matches = false;
    root = createRoot(document.getElementById("root"));
    await React.act(async () => root.render(React.createElement(ThemeProvider, {attribute:"class", defaultTheme:"system", enableSystem:true}, React.createElement(Probe))));
    assert.equal(state().dataset.preference, "sunset");
    assert.equal(state().dataset.theme, "sunset");
    await React.act(async () => root.render(React.createElement(ThemeProvider, {attribute:"class", forcedTheme:"light"}, React.createElement(Probe))));
    assert.equal(state().dataset.theme, "day");
    assert.equal(state().dataset.preference, "sunset");
    assert.equal(readSharedTheme(document.cookie), "dark");
    assert.equal(localStorage.getItem("theme"), "dark");
  } finally {
    if (root) await React.act(async () => root.unmount());
    if (server) await server.close();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test("shared theme wins over old settings and carries both directions across subdomains", () => {
  assert.equal(initialWebTheme("", null), "system");
  assert.equal(initialWebTheme("", "dark"), "dark");
  assert.equal(initialWebTheme("CK_LANDING_THEME=day", null), "light");
  assert.equal(initialWebTheme("CK_LANDING_THEME=sunset", null), "dark");
  assert.equal(initialWebTheme("CK_WEB_THEME=system; CK_LANDING_THEME=sunset", "dark"), "system");
  assert.equal(readSharedTheme("CK_WEB_THEME=invalid"), undefined);
  const website = new JSDOM("", {url:"https://clashk.ing/"});
  const dashboard = new JSDOM("", {url:"https://dash.clashk.ing/", cookieJar:website.cookieJar});
  const other = new JSDOM("", {url:"https://example.com/", cookieJar:website.cookieJar});
  try {
    website.window.document.cookie = sharedThemeCookie("light", "clashk.ing", "https:");
    assert.equal(readSharedTheme(dashboard.window.document.cookie), "light");
    dashboard.window.document.cookie = sharedThemeCookie("dark", "dash.clashk.ing", "https:");
    assert.equal(readSharedTheme(website.window.document.cookie), "dark");
    dashboard.window.document.cookie = sharedThemeCookie("system", "dash.clashk.ing", "https:");
    assert.equal(readSharedTheme(website.window.document.cookie), "system");
    assert.equal(readSharedTheme(other.window.document.cookie), undefined);
  } finally { website.window.close(); dashboard.window.close(); other.window.close(); }
});
