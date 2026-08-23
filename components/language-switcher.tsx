"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { useAppLocale } from "@/components/locale-provider";
import { LANGUAGE_OPTIONS } from "@/lib/locale-preference";

export function LanguageSwitcher() {
  const { setDashboardLocale } = useAppLocale();
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const [mounted, setMounted] = React.useState(false);

  const currentLocale = locale || "en";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Languages className="h-5 w-5" />
        <span className="sr-only">{t("label")}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-5 w-5" />
          <span className="sr-only">{t("label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGE_OPTIONS.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setDashboardLocale(lang.code, "manual")}
            className={currentLocale === lang.code ? "bg-accent" : ""}
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
            <span lang={lang.code}>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
