"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";
import { useTheme } from "next-themes";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PreferencePanel } from "@/components/preference-panel";
import { useAppLocale } from "@/components/locale-provider";

interface SettingsDropdownProps {
  locale: string;
  align?: "start" | "end";
  triggerButtonClassName?: string;
}

export function SettingsDropdown({ locale, align = "end", triggerButtonClassName }: Readonly<SettingsDropdownProps>) {
  const { theme, setTheme } = useTheme();
  const { mode, setDashboardLocale } = useAppLocale();
  const t = useTranslations("Navigation");
  const [open, setOpen] = useState(false);

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" className={triggerButtonClassName}><Settings className="h-5 w-5" /><span className="sr-only">{t("settings")}</span></Button></PopoverTrigger>
    <PopoverContent align={align} sideOffset={9} collisionPadding={16} className="ck-dashboard-preferences w-[300px] rounded-[19px] p-3.5">
      <PreferencePanel locale={locale} mode={mode} languageLabel={t("language")} appearanceLabel={t("theme")} theme={theme ?? "system"}
        themes={[{ value: "light", label: t("lightTheme") }, { value: "dark", label: t("darkTheme") }, { value: "system", label: t("systemTheme") }]}
        onLocaleChange={(next, nextMode) => { setDashboardLocale(next, nextMode); setOpen(false); }}
        onThemeChange={next => { setTheme(next); setOpen(false); }} />
    </PopoverContent>
  </Popover>;
}
