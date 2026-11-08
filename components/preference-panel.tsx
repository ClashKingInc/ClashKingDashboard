"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";
import { ArrowLeft, Check, ChevronRight, Globe } from "lucide-react";
import Image from "@/components/app-image";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { LANGUAGE_OPTIONS, resolveBrowserLocale, type LocaleMode, type SupportedLocale } from "@/lib/locale-preference";

export function PreferencePanel({
  locale, mode, languageLabel, appearanceLabel, options = LANGUAGE_OPTIONS,
  themes, theme, onLocaleChange, onThemeChange,
}: {
  locale: string;
  mode: LocaleMode;
  languageLabel: string;
  appearanceLabel: string;
  options?: typeof LANGUAGE_OPTIONS;
  themes: ReadonlyArray<{ value: string; label: string }>;
  theme: string;
  onLocaleChange: (locale: SupportedLocale, mode: LocaleMode) => void;
  onThemeChange: (theme: string) => void;
}) {
  const [languages, setLanguages] = useState(false);
  const common = useTranslations("Common");
  const navigation = useTranslations("Navigation");
  const landing = useTranslations("ClanSignal");
  const current = LANGUAGE_OPTIONS.find(option => option.code === locale) ?? LANGUAGE_OPTIONS[0];

  if (languages) return <>
    <div className="ck-language-heading"><button type="button" onClick={() => setLanguages(false)} aria-label={common("back")}><ArrowLeft size={17} /></button><strong>{languageLabel}</strong></div>
    <Command className="ck-language-command"><CommandInput aria-label={languageLabel} placeholder={common("search")} autoFocus /><CommandList>
      <CommandEmpty>{landing("rally.noResults")}</CommandEmpty>
      <CommandItem value="auto browser" onSelect={() => onLocaleChange(resolveBrowserLocale(navigator.languages), "browser")}><Globe size={24} /><span>{navigation("browserLanguage")}</span>{mode === "browser" && <Check size={14} />}</CommandItem>
      {options.map(option => <CommandItem key={option.code} value={`${option.code} ${option.name}`} onSelect={() => onLocaleChange(option.code, "manual")}>
        <span className="cs-language-flag"><Image src={`/landing/flags/${option.flagCode}.png`} alt="" width={24} height={18} /></span><span lang={option.code}>{option.name}</span><small>{option.code.toUpperCase()}</small>{mode === "manual" && option.code === locale && <Check size={14} />}
      </CommandItem>)}
    </CommandList></Command>
  </>;

  return <>
    <button type="button" className="ck-language-open" onClick={() => setLanguages(true)}><span><small>{languageLabel}</small><strong>{current.name}</strong></span><ChevronRight size={16} /></button>
    <fieldset><legend>{appearanceLabel}</legend><div className="ck-theme-options" style={{ gridTemplateColumns: `repeat(${themes.length}, minmax(0, 1fr))` }}>{themes.map(option => <button key={option.value} type="button" aria-pressed={theme === option.value} onClick={() => onThemeChange(option.value)}><span className={`ck-theme-preview ck-theme-${option.value}`} aria-hidden="true" />{option.label}{theme === option.value && <Check size={14} aria-hidden="true" />}</button>)}</div></fieldset>
  </>;
}
