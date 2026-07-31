import { describe, it, expect } from "vitest";
import {
  resolveBrowserLocale,
  getLocaleModeFromStorage,
  getPublicRoute,
  publicPath,
} from "./locale-preference";

describe("resolveBrowserLocale", () => {
  it("returns 'en' for empty array", () => {
    expect(resolveBrowserLocale([])).toBe("en");
  });

  it("returns exact match for supported locale", () => {
    expect(resolveBrowserLocale(["fr"])).toBe("fr");
    expect(resolveBrowserLocale(["nl"])).toBe("nl");
    expect(resolveBrowserLocale(["en"])).toBe("en");
  });

  it("matches base locale from language tag", () => {
    expect(resolveBrowserLocale(["fr-FR"])).toBe("fr");
    expect(resolveBrowserLocale(["nl-NL"])).toBe("nl");
    expect(resolveBrowserLocale(["en-US"])).toBe("en");
  });

  it("is case insensitive", () => {
    expect(resolveBrowserLocale(["FR"])).toBe("fr");
    expect(resolveBrowserLocale(["EN-US"])).toBe("en");
  });

  it("returns first supported locale from list", () => {
    expect(resolveBrowserLocale(["de", "fr", "en"])).toBe("fr");
  });

  it("falls back to 'en' when no supported locale found", () => {
    expect(resolveBrowserLocale(["de", "es", "it"])).toBe("en");
  });
});

describe("getLocaleModeFromStorage", () => {
  it("returns 'manual' when the preference is absent or invalid", () => {
    expect(getLocaleModeFromStorage(null)).toBe("manual");
    expect(getLocaleModeFromStorage("other")).toBe("manual");
  });

  it("returns the stored browser preference", () => {
    expect(getLocaleModeFromStorage("browser")).toBe("browser");
  });

  it("returns the stored manual preference", () => {
    expect(getLocaleModeFromStorage("manual")).toBe("manual");
  });
});

describe("public locale routes", () => {
  it("recognizes only the localized public routes", () => {
    expect(getPublicRoute("/")).toEqual({ locale: "en", page: "/" });
    expect(getPublicRoute("/fr/privacy")).toEqual({ locale: "fr", page: "/privacy" });
    expect(getPublicRoute("/nl/terms/")).toEqual({ locale: "nl", page: "/terms" });
    expect(getPublicRoute("/dashboard")).toBeUndefined();
  });

  it("builds English and locale-prefixed public paths", () => {
    expect(publicPath("en", "/privacy")).toBe("/privacy");
    expect(publicPath("fr", "/")).toBe("/fr");
    expect(publicPath("nl", "/terms")).toBe("/nl/terms");
  });
});
