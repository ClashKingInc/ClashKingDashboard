"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Globe } from "lucide-react";
import { useAppLocale } from "@/components/locale-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getPublicRoute,
  isPublicLocale,
  LANGUAGE_OPTIONS,
  publicPath,
  resolveBrowserLocale,
  type LocaleMode,
  type SupportedLocale,
} from "@/lib/locale-preference";

type LandingLanguageSwitcherProps = {
  label: string;
  appearanceLabel: string;
  dayLabel: string;
  sunsetLabel: string;
  initialTheme: LandingTheme;
};

type LandingTheme = "day" | "sunset";

const LANDING_THEME_COOKIE = "CK_LANDING_THEME";

export function LandingLanguageSwitcher({
  label,
  appearanceLabel,
  dayLabel,
  sunsetLabel,
  initialTheme,
}: Readonly<LandingLanguageSwitcherProps>) {
  const locale = useLocale() as SupportedLocale;
  const { mode: localeMode, setDashboardLocale } = useAppLocale();
  const navigationT = useTranslations("Navigation");
  const pathname = usePathname();
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [landingTheme, setLandingTheme] = useState<LandingTheme>(initialTheme);
  const [isPending, startTransition] = useTransition();
  const currentLanguage = LANGUAGE_OPTIONS.find((language) => language.code === locale) ?? LANGUAGE_OPTIONS[0];

  const switchLocale = (nextLocale: SupportedLocale, nextMode: LocaleMode) => {
    const page = getPublicRoute(pathname)?.page ?? "/";
    const hash = globalThis.location.hash;
    const destination = nextMode === "browser"
      ? "/"
      : isPublicLocale(nextLocale) ? publicPath(nextLocale, page) : "/";
    const destinationWithHash = `${destination}${page === "/" ? hash : ""}`;

    startTransition(() => {
      setDashboardLocale(nextLocale, nextMode);
      if (destination !== pathname) router.push(destinationWithHash);
    });
  };

  const useBrowserLanguage = () => {
    switchLocale(resolveBrowserLocale(navigator.languages), "browser");
  };

  const switchLandingTheme = (nextTheme: LandingTheme) => {
    setLandingTheme(nextTheme);
    document.cookie = `${LANDING_THEME_COOKIE}=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
    triggerRef.current?.closest<HTMLElement>(".clan-signal")?.setAttribute("data-cs-theme", nextTheme);
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button ref={triggerRef} className="cs-language-trigger" type="button" aria-label={label} disabled={isPending}>
          <span className="cs-language-flag">
            <Image
              src={`https://flagcdn.com/w40/${currentLanguage.flagCode}.png`}
              alt=""
              width={20}
              height={14}
            />
          </span>
          <span>{currentLanguage.code.toUpperCase()}</span>
          <span className="cs-language-chevron" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="cs-language-menu"
        data-landing-theme={landingTheme}
      >
        <DropdownMenuItem
          className="cs-language-option"
          aria-current={localeMode === "browser" ? "true" : undefined}
          onClick={useBrowserLanguage}
        >
          <Globe className="cs-language-auto-icon" aria-hidden="true" />
          <span>{navigationT("browserLanguage")}</span>
          <span className="cs-language-code">AUTO</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="cs-language-separator" />
        {LANGUAGE_OPTIONS.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className="cs-language-option"
            aria-current={localeMode === "manual" && locale === language.code ? "true" : undefined}
            onClick={() => switchLocale(language.code, "manual")}
          >
            <span className="cs-language-flag">
              <Image
                src={`https://flagcdn.com/w40/${language.flagCode}.png`}
                alt=""
                width={20}
                height={14}
              />
            </span>
            <span>{language.name}</span>
            <span className="cs-language-code">{language.code.toUpperCase()}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="cs-language-separator" />
        <DropdownMenuLabel className="cs-language-label">{appearanceLabel}</DropdownMenuLabel>
        <DropdownMenuItem
          className="cs-language-option"
          data-active={landingTheme === "day" ? "true" : undefined}
          onClick={() => switchLandingTheme("day")}
        >
          <span className="cs-theme-swatch cs-theme-swatch-day" aria-hidden="true" />
          <span>{dayLabel}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cs-language-option"
          data-active={landingTheme === "sunset" ? "true" : undefined}
          onClick={() => switchLandingTheme("sunset")}
        >
          <span className="cs-theme-swatch cs-theme-swatch-sunset" aria-hidden="true" />
          <span>{sunsetLabel}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
