export const DASHBOARD_LOCALE_STORAGE_KEY = "clashking_locale";
export const DASHBOARD_LOCALE_MODE_STORAGE_KEY = "clashking_locale_mode";

export type LocaleMode = "manual" | "browser";
export type PublicPagePath = "/" | "/privacy" | "/terms";

export const SUPPORTED_LOCALES = [
  "af",
  "ar",
  "ca",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "fi",
  "fr",
  "he",
  "hi",
  "hu",
  "it",
  "ja",
  "ko",
  "nl",
  "no",
  "pl",
  "pt",
  "ro",
  "ru",
  "sr",
  "sv",
  "tr",
  "uk",
  "ur",
  "vi",
  "zh",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const PUBLIC_LOCALES = ["en", "fr", "nl"] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export const LANGUAGE_OPTIONS: ReadonlyArray<{ code: SupportedLocale; name: string; flagCode: string }> = [
  { code: "af", name: "Afrikaans", flagCode: "za" },
  { code: "ar", name: "العربية", flagCode: "sa" },
  { code: "ca", name: "Català", flagCode: "es" },
  { code: "cs", name: "Čeština", flagCode: "cz" },
  { code: "da", name: "Dansk", flagCode: "dk" },
  { code: "de", name: "Deutsch", flagCode: "de" },
  { code: "el", name: "Ελληνικά", flagCode: "gr" },
  { code: "en", name: "English", flagCode: "us" },
  { code: "es", name: "Español", flagCode: "es" },
  { code: "fi", name: "Suomi", flagCode: "fi" },
  { code: "fr", name: "Français", flagCode: "fr" },
  { code: "he", name: "עברית", flagCode: "il" },
  { code: "hi", name: "हिन्दी", flagCode: "in" },
  { code: "hu", name: "Magyar", flagCode: "hu" },
  { code: "it", name: "Italiano", flagCode: "it" },
  { code: "ja", name: "日本語", flagCode: "jp" },
  { code: "ko", name: "한국어", flagCode: "kr" },
  { code: "nl", name: "Nederlands", flagCode: "nl" },
  { code: "no", name: "Norsk", flagCode: "no" },
  { code: "pl", name: "Polski", flagCode: "pl" },
  { code: "pt", name: "Português", flagCode: "pt" },
  { code: "ro", name: "Română", flagCode: "ro" },
  { code: "ru", name: "Русский", flagCode: "ru" },
  { code: "sr", name: "Српски", flagCode: "rs" },
  { code: "sv", name: "Svenska", flagCode: "se" },
  { code: "tr", name: "Türkçe", flagCode: "tr" },
  { code: "uk", name: "Українська", flagCode: "ua" },
  { code: "ur", name: "اردو", flagCode: "pk" },
  { code: "vi", name: "Tiếng Việt", flagCode: "vn" },
  { code: "zh", name: "中文", flagCode: "cn" },
];

export const PUBLIC_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter(
  (option): option is (typeof LANGUAGE_OPTIONS)[number] & { code: PublicLocale } =>
    PUBLIC_LOCALES.includes(option.code as PublicLocale),
);

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function isPublicLocale(value: string | null | undefined): value is PublicLocale {
  return PUBLIC_LOCALES.includes(value as PublicLocale);
}

export function resolveBrowserLocale(browserLanguages: readonly string[] = []): SupportedLocale {
  for (const rawLocale of browserLanguages) {
    const normalizedLocale = rawLocale.toLowerCase();

    if (isSupportedLocale(normalizedLocale)) return normalizedLocale;

    const baseLocale = normalizedLocale.split("-")[0];
    if (baseLocale === "nb") return "no";
    if (isSupportedLocale(baseLocale)) return baseLocale;
  }

  return "en";
}

export function getLocaleModeFromStorage(value: string | null): LocaleMode {
  return value === "browser" ? "browser" : "manual";
}

export function getPublicRoute(pathname: string): {
  locale: PublicLocale;
  page: PublicPagePath;
} | undefined {
  const normalizedPath = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const match = normalizedPath.match(/^\/(?:(fr|nl)(?=\/|$))?(\/privacy|\/terms)?$/);
  if (!match) return undefined;

  return {
    locale: isPublicLocale(match[1]) ? match[1] : "en",
    page: (match[2] || "/") as PublicPagePath,
  };
}

export function publicPath(locale: PublicLocale, page: PublicPagePath): string {
  const prefix = locale === "en" ? "" : `/${locale}`;
  return page === "/" ? prefix || "/" : `${prefix}${page}`;
}
