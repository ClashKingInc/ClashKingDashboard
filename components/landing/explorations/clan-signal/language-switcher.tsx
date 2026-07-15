"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LANGUAGE_OPTIONS,
  LOCALE_MODE_COOKIE,
  type SupportedLocale,
} from "@/lib/locale-preference";

type LandingLanguageSwitcherProps = {
  label: string;
  appearanceLabel: string;
  dayLabel: string;
  sunsetLabel: string;
};

export function LandingLanguageSwitcher({
  label,
  appearanceLabel,
  dayLabel,
  sunsetLabel,
}: Readonly<LandingLanguageSwitcherProps>) {
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const currentLanguage = LANGUAGE_OPTIONS.find((language) => language.code === locale) ?? LANGUAGE_OPTIONS[0];

  useEffect(() => setMounted(true), []);

  const switchLocale = (nextLocale: SupportedLocale) => {
    // eslint-disable-next-line react-hooks/immutability -- locale preference is persisted by next-intl's cookie contract
    document.cookie = `${LOCALE_MODE_COOKIE}=manual; path=/; max-age=31536000; SameSite=Lax`;
    // eslint-disable-next-line react-hooks/immutability -- locale preference is persisted by next-intl's cookie contract
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => router.refresh());
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className="cs-language-trigger" type="button" aria-label={label} disabled={isPending}>
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
      <DropdownMenuContent align="end" sideOffset={6} className="cs-language-menu">
        {LANGUAGE_OPTIONS.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className="cs-language-option"
            aria-current={locale === language.code ? "true" : undefined}
            onClick={() => switchLocale(language.code)}
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
          data-active={mounted && resolvedTheme === "light" ? "true" : undefined}
          onClick={() => setTheme("light")}
        >
          <span className="cs-theme-swatch cs-theme-swatch-day" aria-hidden="true" />
          <span>{dayLabel}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cs-language-option"
          data-active={mounted && resolvedTheme === "dark" ? "true" : undefined}
          onClick={() => setTheme("dark")}
        >
          <span className="cs-theme-swatch cs-theme-swatch-sunset" aria-hidden="true" />
          <span>{sunsetLabel}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
