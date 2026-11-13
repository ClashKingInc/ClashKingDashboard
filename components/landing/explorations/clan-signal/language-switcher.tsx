"use client";
import Image from '@/components/app-image';
import { useLocale } from 'use-intl';
import { usePathname, useRouter } from '@/lib/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ChevronDown } from 'lucide-react';
import { PreferencePanel } from '@/components/preference-panel';
import { useAppLocale } from '@/components/locale-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { dismissPublicLanguageSuggestion, getPublicRoute, LANGUAGE_OPTIONS, publicPath, type LocaleMode, type SupportedLocale } from '@/lib/locale-preference';
export type LandingTheme = 'day' | 'sunset';
export function readLandingTheme(): LandingTheme {
  return typeof document !== 'undefined' && document.cookie.split(';').some(part => part.trim() === 'CK_LANDING_THEME=sunset') ? 'sunset' : 'day';
}
export function LandingLanguageSwitcher({ label, appearanceLabel, dayLabel, sunsetLabel, initialTheme, onThemeChange }: Readonly<{
  label: string; appearanceLabel: string; dayLabel: string; sunsetLabel: string; initialTheme: LandingTheme; onThemeChange?: (theme: LandingTheme) => void;
}>) {
  const locale = useLocale() as SupportedLocale;
  const { mode, setDashboardLocale } = useAppLocale();
  const pathname = usePathname(), router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState(initialTheme);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const current = LANGUAGE_OPTIONS.find(option => option.code === locale) ?? LANGUAGE_OPTIONS[0];
  const page = getPublicRoute(pathname)?.page ?? '/';
  const options = LANGUAGE_OPTIONS;
  useEffect(() => { const saved = readLandingTheme(); setTheme(saved); trigger.current?.closest('.clan-signal')?.setAttribute('data-cs-theme', saved); }, []);
  const changeLocale = (next: SupportedLocale, nextMode: LocaleMode) => {
    dismissPublicLanguageSuggestion();
    const path = publicPath(next, page);
    const href = `${path}${page === '/' ? globalThis.location.hash : ''}`;
    startTransition(() => { setDashboardLocale(next, nextMode); if (nextMode !== 'browser' && path !== pathname) router.push(href); });
    setOpen(false);
  };
  const changeTheme = (next: LandingTheme) => {
    setTheme(next); onThemeChange?.(next);
    document.cookie = `CK_LANDING_THEME=${next}; path=/; max-age=31536000; SameSite=Lax`;
    trigger.current?.closest('.clan-signal')?.setAttribute('data-cs-theme', next);
    setOpen(false);
  };
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button ref={trigger} type="button" className="cs-language-trigger" aria-label={`${label} / ${appearanceLabel}`} disabled={pending}>
      <span className="cs-language-flag"><Image src={`/landing/flags/${current.flagCode}.png`} alt="" width={24} height={18} /></span>
      <span>{current.code.toUpperCase()}</span><ChevronDown className="ck-preference-chevron" aria-hidden="true" />
    </button></PopoverTrigger>
    <PopoverContent className="ck-preferences" align="end" sideOffset={9} collisionPadding={16} data-landing-theme={theme}>
      <PreferencePanel locale={locale} mode={mode} languageLabel={label} appearanceLabel={appearanceLabel} options={options} theme={theme}
        themes={[{ value: 'day', label: dayLabel }, { value: 'sunset', label: sunsetLabel }]}
        onLocaleChange={changeLocale} onThemeChange={value => changeTheme(value as LandingTheme)} />
    </PopoverContent>
  </Popover>;
}
