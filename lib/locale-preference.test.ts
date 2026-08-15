import { describe, it, expect } from "vitest";
import {
  LANGUAGE_OPTIONS,
  PUBLIC_LANGUAGE_OPTIONS,
  SUPPORTED_LOCALES,
  resolveBrowserLocale,
  resolveDashboardLocalePreference,
  getLocaleModeFromStorage,
  getPublicRoute,
  publicPath,
} from "./locale-preference";

describe("locale catalog", () => {
  it("offers every translated Dashboard locale while keeping public routes scoped", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(30);
    expect(LANGUAGE_OPTIONS.map(({ code }) => code)).toEqual(SUPPORTED_LOCALES);
    expect(PUBLIC_LANGUAGE_OPTIONS.map(({ code }) => code)).toEqual(["en", "fr", "nl"]);
  });
});

describe("resolveBrowserLocale", () => {
  it("returns 'en' for empty array", () => {
    expect(resolveBrowserLocale([])).toBe("en");
  });

  it("returns exact match for supported locale", () => {
    expect(resolveBrowserLocale(["fr"])).toBe("fr");
    expect(resolveBrowserLocale(["nl"])).toBe("nl");
    expect(resolveBrowserLocale(["en"])).toBe("en");
    expect(resolveBrowserLocale(["de"])).toBe("de");
    expect(resolveBrowserLocale(["zh"])).toBe("zh");
  });

  it("matches base locale from language tag", () => {
    expect(resolveBrowserLocale(["fr-FR"])).toBe("fr");
    expect(resolveBrowserLocale(["nl-NL"])).toBe("nl");
    expect(resolveBrowserLocale(["en-US"])).toBe("en");
    expect(resolveBrowserLocale(["pt-BR"])).toBe("pt");
    expect(resolveBrowserLocale(["zh-CN"])).toBe("zh");
    expect(resolveBrowserLocale(["nb-NO"])).toBe("no");
  });

  it("is case insensitive", () => {
    expect(resolveBrowserLocale(["FR"])).toBe("fr");
    expect(resolveBrowserLocale(["EN-US"])).toBe("en");
  });

  it("returns first supported locale from list", () => {
    expect(resolveBrowserLocale(["xx", "de", "fr"])).toBe("de");
  });

  it("falls back to 'en' when no supported locale found", () => {
    expect(resolveBrowserLocale(["xx", "yy", "zz"])).toBe("en");
  });
});

describe("getLocaleModeFromStorage", () => {
  it("defaults to browser detection when the preference is absent or invalid", () => {
    expect(getLocaleModeFromStorage(null)).toBe("browser");
    expect(getLocaleModeFromStorage("other")).toBe("browser");
  });

  it("returns the stored browser preference", () => {
    expect(getLocaleModeFromStorage("browser")).toBe("browser");
  });

  it("returns the stored manual preference", () => {
    expect(getLocaleModeFromStorage("manual")).toBe("manual");
  });

  it("preserves a locale stored before locale modes were introduced", () => {
    expect(getLocaleModeFromStorage(null, "fr")).toBe("manual");
  });
});

describe("resolveDashboardLocalePreference", () => {
  it("uses the browser language for a first-time visitor", () => {
    expect(resolveDashboardLocalePreference(null, null, ["fr-CA", "en-US"])).toEqual({
      locale: "fr",
      mode: "browser",
    });
  });

  it("preserves a stored manual locale", () => {
    expect(resolveDashboardLocalePreference("manual", "de", ["fr-FR"])).toEqual({
      locale: "de",
      mode: "manual",
    });
  });

  it("treats a locale saved before mode storage existed as manual", () => {
    expect(resolveDashboardLocalePreference(null, "nl", ["fr-FR"])).toEqual({
      locale: "nl",
      mode: "manual",
    });
  });

  it("falls back to English when manual storage is invalid", () => {
    expect(resolveDashboardLocalePreference("manual", "xx", ["fr-FR"])).toEqual({
      locale: "en",
      mode: "manual",
    });
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
