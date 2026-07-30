"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Computer, Globe, Moon, Settings, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getLocaleModeFromCookie,
  LANGUAGE_OPTIONS,
  LOCALE_MODE_COOKIE,
  resolveBrowserLocale,
  type LocaleMode,
  type SupportedLocale,
} from "@/lib/locale-preference";

type LandingLanguageSwitcherProps = {
  label: string;
  languageLabel: string;
  appearanceLabel: string;
  systemLanguageLabel: string;
  systemAppearanceLabel: string;
  dayLabel: string;
  sunsetLabel: string;
  initialTheme: LandingTheme;
};

type LandingTheme = "day" | "sunset";
type LandingThemeMode = LandingTheme | "system";

const LANDING_THEME_COOKIE = "CK_LANDING_THEME";

function resolveSystemTheme(): LandingTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "sunset" : "day";
}

export function LandingLanguageSwitcher({
  label,
  languageLabel,
  appearanceLabel,
  systemLanguageLabel,
  systemAppearanceLabel,
  dayLabel,
  sunsetLabel,
  initialTheme,
}: Readonly<LandingLanguageSwitcherProps>) {
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const [landingTheme, setLandingTheme] = useState<LandingTheme>(initialTheme);
  const [themeMode, setThemeMode] = useState<LandingThemeMode>(initialTheme);
  const [localeMode, setLocaleMode] = useState<LocaleMode>("manual");
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentLanguage = LANGUAGE_OPTIONS.find((language) => language.code === locale) ?? LANGUAGE_OPTIONS[0];

  const applyTheme = (nextTheme: LandingTheme, mode: LandingThemeMode) => {
    setLandingTheme(nextTheme);
    setThemeMode(mode);
    document.cookie = `${LANDING_THEME_COOKIE}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
    document.querySelector<HTMLElement>(".clan-signal")?.setAttribute("data-cs-theme", nextTheme);
  };

  useEffect(() => {
    const nextLocaleMode = getLocaleModeFromCookie(document.cookie);
    setLocaleMode(nextLocaleMode);
    if (nextLocaleMode === "browser") {
      const browserLocale = resolveBrowserLocale(navigator.languages);
      if (browserLocale !== locale) {
        document.cookie = `NEXT_LOCALE=${browserLocale}; path=/; max-age=31536000; SameSite=Lax`;
        router.refresh();
      }
    }

    const storedTheme = document.cookie.match(new RegExp(`(?:^|; )${LANDING_THEME_COOKIE}=([^;]*)`))?.[1];
    if (storedTheme === "system") {
      setThemeMode("system");
    }
  }, [locale, router]);

  useEffect(() => {
    if (themeMode !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      const nextTheme = resolveSystemTheme();
      setLandingTheme(nextTheme);
      document.querySelector<HTMLElement>(".clan-signal")?.setAttribute("data-cs-theme", nextTheme);
    };
    syncSystemTheme();
    mediaQuery.addEventListener("change", syncSystemTheme);
    return () => mediaQuery.removeEventListener("change", syncSystemTheme);
  }, [themeMode]);

  const switchLocale = (nextLocale: SupportedLocale, mode: LocaleMode) => {
    document.cookie = `${LOCALE_MODE_COOKIE}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setLocaleMode(mode);
    startTransition(() => router.refresh());
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className="cs-settings-trigger" type="button" aria-label={label} disabled={isPending}>
          <Settings aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="cs-settings-menu" data-landing-theme={landingTheme}>
        <DropdownMenuSub open={openSubmenu === "appearance"} onOpenChange={(open) => setOpenSubmenu(open ? "appearance" : null)}>
          <DropdownMenuSubTrigger className="cs-settings-option">
            {landingTheme === "sunset" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            <span>{appearanceLabel}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="cs-settings-menu" data-landing-theme={landingTheme} sideOffset={8} alignOffset={-6}>
            <DropdownMenuItem className="cs-settings-option" onClick={() => applyTheme(resolveSystemTheme(), "system")}>
              <Computer aria-hidden="true" />
              <span>{systemAppearanceLabel}</span>
              {themeMode === "system" && <Check className="cs-settings-check" aria-hidden="true" />}
            </DropdownMenuItem>
            <DropdownMenuItem className="cs-settings-option" onClick={() => applyTheme("day", "day")}>
              <span className="cs-theme-swatch cs-theme-swatch-day" aria-hidden="true" />
              <span>{dayLabel}</span>
              {themeMode === "day" && <Check className="cs-settings-check" aria-hidden="true" />}
            </DropdownMenuItem>
            <DropdownMenuItem className="cs-settings-option" onClick={() => applyTheme("sunset", "sunset")}>
              <span className="cs-theme-swatch cs-theme-swatch-sunset" aria-hidden="true" />
              <span>{sunsetLabel}</span>
              {themeMode === "sunset" && <Check className="cs-settings-check" aria-hidden="true" />}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub open={openSubmenu === "language"} onOpenChange={(open) => setOpenSubmenu(open ? "language" : null)}>
          <DropdownMenuSubTrigger className="cs-settings-option">
            <span className="cs-language-flag"><Image src={`https://flagcdn.com/w40/${currentLanguage.flagCode}.png`} alt="" width={20} height={14} /></span>
            <span>{languageLabel}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="cs-settings-menu" data-landing-theme={landingTheme} sideOffset={8} alignOffset={-6}>
            <DropdownMenuItem className="cs-settings-option" onClick={() => switchLocale(resolveBrowserLocale(navigator.languages), "browser")}>
              <Globe aria-hidden="true" />
              <span>{systemLanguageLabel}</span>
              {localeMode === "browser" && <Check className="cs-settings-check" aria-hidden="true" />}
            </DropdownMenuItem>
            {LANGUAGE_OPTIONS.map((language) => (
              <DropdownMenuItem key={language.code} className="cs-settings-option" onClick={() => switchLocale(language.code, "manual")}>
                <span className="cs-language-flag"><Image src={`https://flagcdn.com/w40/${language.flagCode}.png`} alt="" width={20} height={14} /></span>
                <span>{language.name}</span>
                {localeMode === "manual" && locale === language.code && <Check className="cs-settings-check" aria-hidden="true" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
