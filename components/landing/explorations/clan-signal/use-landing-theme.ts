import { useCallback } from "react";
import { useTheme } from "next-themes";
import type { LandingTheme, LandingThemePreference } from "@/lib/landing-theme";

export function useLandingTheme() {
  const { theme = "system", resolvedTheme, forcedTheme, setTheme } = useTheme();
  const preference: LandingThemePreference = theme === "light" ? "day" : theme === "dark" ? "sunset" : "system";
  const resolved = forcedTheme ?? (theme === "system" ? resolvedTheme : theme);
  const landingTheme: LandingTheme = resolved === "dark" ? "sunset" : "day";
  const changeTheme = useCallback((next: LandingThemePreference) => {
    setTheme(next === "day" ? "light" : next === "sunset" ? "dark" : "system");
  }, [setTheme]);

  return { theme: landingTheme, preference, changeTheme };
}
