const NATIVE_LOCALIZED_PREFIXES = [
  "/access",
  "/admin",
  "/auth",
  "/dashboard",
  "/login",
  "/roster",
  "/servers",
  "/transcript",
  "/view",
] as const;

// These interactive routes use LocaleProvider. Browser translators must not
// replace their text nodes while React still owns and updates those nodes.
export function isNativeLocalizedRoute(pathname: string): boolean {
  return NATIVE_LOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
