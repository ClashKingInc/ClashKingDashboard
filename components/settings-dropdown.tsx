"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Computer, Globe, Moon, Settings, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  LANGUAGE_OPTIONS,
  LOCALE_MODE_COOKIE,
  getLocaleModeFromCookie,
  resolveBrowserLocale,
  type LocaleMode,
} from "@/lib/locale-preference";

interface SettingsDropdownProps {
  locale: string;
  align?: "start" | "end";
  triggerButtonClassName?: string;
  menuClassName?: string;
  subTriggerClassName?: string;
  itemClassName?: string;
  textClassName?: string;
  selectedItemClassName?: string;
}

export function SettingsDropdown({
  locale,
  align = "end",
  triggerButtonClassName,
  menuClassName,
  subTriggerClassName,
  itemClassName,
  textClassName,
  selectedItemClassName = "bg-primary/10 text-primary",
}: Readonly<SettingsDropdownProps>) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const t = useTranslations("Navigation");
  const [mounted, setMounted] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [localeMode, setLocaleMode] = useState<LocaleMode>("manual");

  useEffect(() => {
    setMounted(true);
    const currentMode = getLocaleModeFromCookie(document.cookie);
    setLocaleMode(currentMode);

    if (currentMode === "browser") {
      const browserLocale = resolveBrowserLocale(navigator.languages);
      if (browserLocale !== locale) {
        document.cookie = `NEXT_LOCALE=${browserLocale}; path=/; max-age=31536000; SameSite=Lax`;
        router.refresh();
      }
    }
  }, [locale, router]);

  const applyLocale = (newLocale: string, mode: LocaleMode) => {
    document.cookie = `${LOCALE_MODE_COOKIE}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setLocaleMode(mode);
    router.refresh();
  };

  const currentLocale = mounted && localeMode === "browser"
    ? resolveBrowserLocale(navigator.languages)
    : locale;
  const currentLanguage = LANGUAGE_OPTIONS.find((lang) => lang.code === currentLocale) ?? LANGUAGE_OPTIONS[0];
  let themeIcon = <Computer className="h-4 w-4" />;
  if (theme === "dark") {
    themeIcon = <Moon className="h-4 w-4" />;
  } else if (theme === "light") {
    themeIcon = <Sun className="h-4 w-4" />;
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerButtonClassName}>
          <Settings className="h-5 w-5" />
          <span className="sr-only">{t("settings")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={menuClassName} sideOffset={4} alignOffset={0}>
        <DropdownMenuSub open={openSubmenu === "theme"} onOpenChange={(open) => setOpenSubmenu(open ? "theme" : null)}>
          <DropdownMenuSubTrigger className={subTriggerClassName}>
            {mounted ? themeIcon : <Computer className="h-4 w-4" />}
            <span className={textClassName}>{t("theme")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-card border border-border shadow-2xl" sideOffset={2} alignOffset={-5}>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className={cn(itemClassName, theme === "system" && selectedItemClassName)}
            >
              <Computer className="h-4 w-4" />
              <span className={textClassName}>{t("systemTheme")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className={cn(itemClassName, theme === "light" && selectedItemClassName)}
            >
              <Sun className="h-4 w-4" />
              <span className={textClassName}>{t("lightTheme")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className={cn(itemClassName, theme === "dark" && selectedItemClassName)}
            >
              <Moon className="h-4 w-4" />
              <span className={textClassName}>{t("darkTheme")}</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub open={openSubmenu === "language"} onOpenChange={(open) => setOpenSubmenu(open ? "language" : null)}>
          <DropdownMenuSubTrigger className={subTriggerClassName}>
            <div className="relative w-5 h-3.5 overflow-hidden rounded-sm border border-border/50">
              <Image
                src={`https://flagcdn.com/w40/${currentLanguage.flagCode}.png`}
                alt="Current language"
                fill
                sizes="20px"
                className="object-cover"
              />
            </div>
            <span className={textClassName}>{t("language")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-card border border-border shadow-2xl" sideOffset={2} alignOffset={-5}>
            <DropdownMenuItem
              onClick={() => applyLocale(resolveBrowserLocale(navigator.languages), "browser")}
              className={cn(itemClassName, localeMode === "browser" && selectedItemClassName)}
            >
              <Globe className="h-4 w-4" />
              <span className={textClassName}>{t("browserLanguage")}</span>
            </DropdownMenuItem>
            {LANGUAGE_OPTIONS.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => applyLocale(lang.code, "manual")}
                className={cn(itemClassName, localeMode === "manual" && locale === lang.code && selectedItemClassName)}
              >
                <div className="mr-2 relative w-5 h-3.5 overflow-hidden rounded-sm border border-border/50">
                  <Image
                    src={`https://flagcdn.com/w40/${lang.flagCode}.png`}
                    alt={lang.name}
                    fill
                    sizes="20px"
                    className="object-cover"
                  />
                </div>
                <span className={textClassName}>{lang.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
