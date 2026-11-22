export const DASHBOARD_LOCALE_STORAGE_KEY = "clashking_locale";
export const DASHBOARD_LOCALE_MODE_STORAGE_KEY = "clashking_locale_mode";

export type LocaleMode = "manual" | "browser";
export const PUBLIC_PAGE_PATHS = ["/", "/features", "/help", "/open-source", "/support", "/privacy", "/terms"] as const;
export type PublicPagePath = (typeof PUBLIC_PAGE_PATHS)[number];

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

export const PUBLIC_LOCALES = SUPPORTED_LOCALES;
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

export function matchBrowserLocale(browserLanguages: readonly string[] = []): SupportedLocale | undefined {
  for (const rawLocale of browserLanguages) {
    const normalizedLocale = rawLocale.toLowerCase();

    if (isSupportedLocale(normalizedLocale)) return normalizedLocale;

    const baseLocale = normalizedLocale.split("-")[0];
    if (baseLocale === "nb") return "no";
    if (isSupportedLocale(baseLocale)) return baseLocale;
  }

  return undefined;
}

export function resolveBrowserLocale(browserLanguages: readonly string[] = []): SupportedLocale {
  return matchBrowserLocale(browserLanguages) ?? "en";
}

export function getLocaleModeFromStorage(
  value: string | null,
  storedLocale: string | null = null,
): LocaleMode {
  if (value === "browser") return "browser";
  if (value === "manual" || isSupportedLocale(storedLocale)) return "manual";
  return "browser";
}

export function resolveDashboardLocalePreference(
  storedMode: string | null,
  storedLocale: string | null,
  browserLanguages: readonly string[] = [],
): { locale: SupportedLocale; mode: LocaleMode } {
  const hasStoredLocale = isSupportedLocale(storedLocale);
  const mode = getLocaleModeFromStorage(storedMode, storedLocale);
  let locale: SupportedLocale = "en";

  if (mode === "browser") {
    locale = resolveBrowserLocale(browserLanguages);
  } else if (hasStoredLocale) {
    locale = storedLocale;
  }

  return {
    locale,
    mode,
  };
}

export function getPublicRoute(pathname: string): {
  locale: PublicLocale;
  page: PublicPagePath;
} | undefined {
  const normalizedPath = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const match = normalizedPath.match(new RegExp(`^/?(?:(${PUBLIC_LOCALES.join("|")})(?=/|$))?(${PUBLIC_PAGE_PATHS.filter(page => page !== "/").join("|")})?$`));
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

export const PUBLIC_LANGUAGE_SUGGESTION_STORAGE_KEY = "clashking_public_language_suggestion";
export const PUBLIC_LANGUAGE_CHOICE_EVENT = "clashking:public-language-choice";

export function getPublicLanguageSuggestion(
  pathname: string,
  browserLanguages: readonly string[],
  dismissedLocale: string | null,
): PublicLocale | undefined {
  const route = getPublicRoute(pathname);
  const browserLocale = matchBrowserLocale(browserLanguages);
  if (!route || !browserLocale || route.locale === browserLocale || dismissedLocale === browserLocale) return undefined;
  return browserLocale;
}

export function dismissPublicLanguageSuggestion(): void {
  const browserLocale = matchBrowserLocale(navigator.languages);
  try {
    if (browserLocale) localStorage.setItem(PUBLIC_LANGUAGE_SUGGESTION_STORAGE_KEY, browserLocale);
  } catch { /* The choice still applies when browser storage is unavailable. */ }
  globalThis.dispatchEvent(new Event(PUBLIC_LANGUAGE_CHOICE_EVENT));
}

export type LocalePreference = { locale: SupportedLocale; mode: LocaleMode };
const WEB_LOCALE_COOKIE = "CK_WEB_LOCALE";

export function initialLocalePreference(
  pathname: string,
  savedPreference: LocalePreference | undefined,
  browserLanguages: readonly string[],
): LocalePreference {
  if (savedPreference) return savedPreference;
  const publicRoute = getPublicRoute(pathname);
  return publicRoute ? { locale: publicRoute.locale, mode: "manual" }
    : { locale: resolveBrowserLocale(browserLanguages), mode: "browser" };
}

export function readSavedLocalePreference(browserLanguages: readonly string[] = navigator.languages): LocalePreference | undefined {
  // This preference cookie carries explicit choices between the website and dashboard.
  const cookie = document.cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${WEB_LOCALE_COOKIE}=`));
  const [cookieMode, cookieLocale] = cookie?.slice(WEB_LOCALE_COOKIE.length + 1).split(":") ?? [];
  if ((cookieMode === "manual" || cookieMode === "browser") && isSupportedLocale(cookieLocale)) {
    return resolveDashboardLocalePreference(cookieMode, cookieLocale, browserLanguages);
  }
  try {
    const storedMode = localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY);
    const storedLocale = localStorage.getItem(DASHBOARD_LOCALE_STORAGE_KEY);
    if (storedMode === "browser" || isSupportedLocale(storedLocale)) {
      return resolveDashboardLocalePreference(storedMode, storedLocale, browserLanguages);
    }
  } catch { /* Cookies can still preserve the preference when local storage is unavailable. */ }
  return undefined;
}

export function saveLocalePreference(locale: SupportedLocale, mode: LocaleMode): void {
  try {
    localStorage.setItem(DASHBOARD_LOCALE_STORAGE_KEY, locale);
    localStorage.setItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY, mode);
  } catch { /* The preference cookie is also usable without local storage. */ }
  const sharedDomain = ["clashk.ing", "www.clashk.ing", "dash.clashk.ing"].includes(location.hostname)
    ? "; Domain=clashk.ing" : "";
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${WEB_LOCALE_COOKIE}=${mode}:${locale}; Path=/; Max-Age=31536000; SameSite=Lax${sharedDomain}${secure}`;
}

export function preferredPublicPath(pathname: string, preference: LocalePreference): string | undefined {
  const route = getPublicRoute(pathname);
  if (!route || preference.mode !== "browser" || route.locale === preference.locale) return undefined;
  return publicPath(preference.locale, route.page);
}
