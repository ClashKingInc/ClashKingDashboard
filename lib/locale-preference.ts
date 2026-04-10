export const LOCALE_MODE_COOKIE = "CK_LOCALE_MODE";

export type LocaleMode = "manual" | "browser";
export type SupportedLocale = "en" | "fr" | "nl";

export const LANGUAGE_OPTIONS: ReadonlyArray<{ code: SupportedLocale; name: string; flagCode: string }> = [
  { code: "en", name: "English", flagCode: "us" },
  { code: "fr", name: "Français", flagCode: "fr" },
  { code: "nl", name: "Nederlands", flagCode: "nl" },
];

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

export function getLocaleModeFromCookie(cookieString: string): LocaleMode {
  const cookie = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_MODE_COOKIE}=`));

  if (!cookie) {
    return "manual";
  }

  return cookie.endsWith("browser") ? "browser" : "manual";
}

