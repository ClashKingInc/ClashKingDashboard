"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { initialWebTheme, isWebTheme, readSharedTheme, sharedThemeCookie } from "@/lib/theme-preference";

function SharedThemeSync() {
  const { theme, setTheme, forcedTheme } = useTheme();

  React.useEffect(() => {
    if (forcedTheme) return;
    const sync = () => {
      const shared = readSharedTheme(document.cookie);
      if (shared && shared !== theme) setTheme(shared);
    };
    const visible = () => { if (document.visibilityState === "visible") sync(); };
    // Subdomains have separate local storage. The shared cookie is read again
    // when returning to a tab, or immediately where Cookie Store events exist.
    const cookieStore = (window as Window & { cookieStore?: {
      addEventListener: (type: "change", listener: () => void) => void;
      removeEventListener: (type: "change", listener: () => void) => void;
    } }).cookieStore;
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", visible);
    cookieStore?.addEventListener("change", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", visible);
      cookieStore?.removeEventListener("change", sync);
    };
  }, [theme, setTheme, forcedTheme]);

  React.useEffect(() => {
    // A native embedded dashboard can force its display theme without changing
    // the visitor's saved website/dashboard preference.
    if (!forcedTheme && isWebTheme(theme)) {
      document.cookie = sharedThemeCookie(theme, location.hostname, location.protocol);
    }
  }, [theme, forcedTheme]);

  return null;
}

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  const [initialTheme] = React.useState(() => {
    if (typeof window === "undefined") return props.defaultTheme ?? "system";
    const storageKey = props.storageKey ?? "theme";
    let stored: string | null = null;
    try { stored = localStorage.getItem(storageKey); } catch { /* Storage is optional. */ }
    const initial = initialWebTheme(document.cookie, stored);
    try { localStorage.setItem(storageKey, initial); } catch { /* The cookie remains usable. */ }
    return initial;
  });

  return <NextThemesProvider {...props} defaultTheme={initialTheme}>
    <SharedThemeSync />
    {children}
  </NextThemesProvider>;
}
