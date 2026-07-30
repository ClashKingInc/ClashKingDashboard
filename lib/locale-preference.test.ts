import { describe, it, expect } from "vitest";
import {
  resolveBrowserLocale,
  getLocaleModeFromCookie,
  LOCALE_MODE_COOKIE,
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

describe("getLocaleModeFromCookie", () => {
  it("returns 'browser' when cookie is absent", () => {
    expect(getLocaleModeFromCookie("")).toBe("browser");
    expect(getLocaleModeFromCookie("other=value")).toBe("browser");
  });

  it("preserves a legacy NEXT_LOCALE preference as manual", () => {
    expect(getLocaleModeFromCookie("NEXT_LOCALE=fr")).toBe("manual");
    expect(getLocaleModeFromCookie("foo=bar; NEXT_LOCALE=nl")).toBe("manual");
  });

  it("returns 'browser' when cookie ends with 'browser'", () => {
    expect(getLocaleModeFromCookie(`${LOCALE_MODE_COOKIE}=browser`)).toBe("browser");
  });

  it("returns 'manual' when cookie is set to 'manual'", () => {
    expect(getLocaleModeFromCookie(`${LOCALE_MODE_COOKIE}=manual`)).toBe("manual");
  });

  it("works with multiple cookies", () => {
    expect(getLocaleModeFromCookie(`foo=bar; ${LOCALE_MODE_COOKIE}=browser; baz=qux`)).toBe("browser");
    expect(getLocaleModeFromCookie(`foo=bar; ${LOCALE_MODE_COOKIE}=manual; baz=qux`)).toBe("manual");
  });
});
