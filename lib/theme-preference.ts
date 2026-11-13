export type WebTheme = "light" | "dark" | "system";

export function isWebTheme(value: string | undefined | null): value is WebTheme {
  return value === "light" || value === "dark" || value === "system";
}

function cookieValue(cookies: string, name: string): string | undefined {
  return cookies.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function readSharedTheme(cookies: string): WebTheme | undefined {
  const value = cookieValue(cookies, "CK_WEB_THEME");
  return isWebTheme(value) ? value : undefined;
}

export function initialWebTheme(cookies: string, storedTheme: string | null): WebTheme {
  const shared = readSharedTheme(cookies);
  if (shared) return shared;
  const legacy = cookieValue(cookies, "CK_LANDING_THEME");
  if (legacy === "day") return "light";
  if (legacy === "sunset") return "dark";
  if (legacy === "system") return "system";
  return isWebTheme(storedTheme) ? storedTheme : "system";
}

export function sharedThemeCookie(theme: WebTheme, hostname: string, protocol: string): string {
  const domain = ["clashk.ing", "www.clashk.ing", "dash.clashk.ing"].includes(hostname) ? "; Domain=clashk.ing" : "";
  return `CK_WEB_THEME=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${protocol === "https:" ? "; Secure" : ""}`;
}
