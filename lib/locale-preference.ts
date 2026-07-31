export const DASHBOARD_LOCALE_STORAGE_KEY = "clashking_locale";
export const DASHBOARD_LOCALE_MODE_STORAGE_KEY = "clashking_locale_mode";

export type LocaleMode = "manual" | "browser";
export type SupportedLocale = "en" | "fr" | "nl";
export type PublicPagePath = "/" | "/privacy" | "/terms";

export const SUPPORTED_LOCALES = ["en", "fr", "nl"] as const;

export const LANGUAGE_OPTIONS: ReadonlyArray<{ code: SupportedLocale; name: string; flagCode: string }> = [
  { code: "en", name: "English", flagCode: "us" },
  { code: "fr", name: "Français", flagCode: "fr" },
  { code: "nl", name: "Nederlands", flagCode: "nl" },
];

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function resolveBrowserLocale(browserLanguages: readonly string[] = []): SupportedLocale {
  for (const rawLocale of browserLanguages) {
    const normalizedLocale = rawLocale.toLowerCase();

    if (normalizedLocale === "en" || normalizedLocale === "fr" || normalizedLocale === "nl") {
      return normalizedLocale;
    }

    const baseLocale = normalizedLocale.split("-")[0];
    if (baseLocale === "en" || baseLocale === "fr" || baseLocale === "nl") {
      return baseLocale;
    }
  }

  return "en";
}

export function getLocaleModeFromStorage(value: string | null): LocaleMode {
  return value === "browser" ? "browser" : "manual";
}

export function getPublicRoute(pathname: string): {
  locale: SupportedLocale;
  page: PublicPagePath;
} | undefined {
  const normalizedPath = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const match = normalizedPath.match(/^\/(?:(fr|nl)(?=\/|$))?(\/privacy|\/terms)?$/);
  if (!match) return undefined;

  return {
    locale: isSupportedLocale(match[1]) ? match[1] : "en",
    page: (match[2] || "/") as PublicPagePath,
  };
}

export function publicPath(locale: SupportedLocale, page: PublicPagePath): string {
  const prefix = locale === "en" ? "" : `/${locale}`;
  return page === "/" ? prefix || "/" : `${prefix}${page}`;
}
