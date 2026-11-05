"use client";
import Image from '@/components/app-image';
import { useLocale, useTranslations } from 'use-intl';
import { usePathname, useRouter } from '@/lib/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Globe, Check } from 'lucide-react';
import { useAppLocale } from '@/components/locale-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { getPublicRoute, isPublicLocale, LANGUAGE_OPTIONS, PUBLIC_LANGUAGE_OPTIONS, publicPath, resolveBrowserLocale, type LocaleMode, type PublicPagePath, type SupportedLocale } from '@/lib/locale-preference';
export type LandingTheme = 'day' | 'sunset';
export function readLandingTheme(): LandingTheme {
  return typeof document !== 'undefined' && document.cookie.split(';').some(part => part.trim() === 'CK_LANDING_THEME=sunset') ? 'sunset' : 'day';
}
function destination(locale: SupportedLocale, mode: LocaleMode, page: PublicPagePath) {
  if (page !== '/') return publicPath(isPublicLocale(locale) ? locale : 'en', page);
  return mode === 'manual' && isPublicLocale(locale) ? publicPath(locale, page) : '/';
}
export function LandingLanguageSwitcher({ label, appearanceLabel, dayLabel, sunsetLabel, initialTheme, onThemeChange }: Readonly<{
  label: string; appearanceLabel: string; dayLabel: string; sunsetLabel: string; initialTheme: LandingTheme; onThemeChange?: (theme: LandingTheme) => void;
}>) {
  const locale = useLocale() as SupportedLocale;
  const { mode, setDashboardLocale } = useAppLocale();
  const t = useTranslations('Navigation'), common = useTranslations('Common'), landing = useTranslations('ClanSignal');
  const pathname = usePathname(), router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState(initialTheme);
  const [open, setOpen] = useState(false), [languages, setLanguages] = useState(false);
  const [pending, startTransition] = useTransition();
  const current = LANGUAGE_OPTIONS.find(option => option.code === locale) ?? LANGUAGE_OPTIONS[0];
  const page = getPublicRoute(pathname)?.page ?? '/';
  const options = page === '/' ? LANGUAGE_OPTIONS : PUBLIC_LANGUAGE_OPTIONS;
  useEffect(() => { const saved = readLandingTheme(); setTheme(saved); trigger.current?.closest('.clan-signal')?.setAttribute('data-cs-theme', saved); }, []);
  const changeLocale = (next: SupportedLocale, nextMode: LocaleMode) => {
    const path = destination(next, nextMode, page);
    const href = `${path}${page === '/' ? globalThis.location.hash : ''}`;
    startTransition(() => { setDashboardLocale(next, nextMode); if (path !== pathname) router.push(href); });
    setOpen(false);
  };
  const changeTheme = (next: LandingTheme) => {
    setTheme(next); onThemeChange?.(next);
    document.cookie = `CK_LANDING_THEME=${next}; path=/; max-age=31536000; SameSite=Lax`;
    trigger.current?.closest('.clan-signal')?.setAttribute('data-cs-theme', next);
    setOpen(false);
  };
  return <Popover open={open} onOpenChange={value => { setOpen(value); if (!value) setLanguages(false); }}>
    <PopoverTrigger asChild><button ref={trigger} type="button" className="cs-language-trigger" aria-label={`${label} / ${appearanceLabel}`} disabled={pending}>
      <span className="cs-language-flag"><Image src={`/landing/flags/${current.flagCode}.png`} alt="" width={24} height={18} /></span>
      <span>{current.code.toUpperCase()}</span><ChevronDown className="ck-preference-chevron" aria-hidden="true" />
    </button></PopoverTrigger>
    <PopoverContent className="ck-preferences" align="end" sideOffset={9} collisionPadding={16} data-landing-theme={theme}>
      {languages ? <>
        <div className="ck-language-heading"><button type="button" onClick={() => setLanguages(false)} aria-label={common('back')}><ArrowLeft size={17} /></button><strong>{label}</strong></div>
        <Command className="ck-language-command"><CommandInput aria-label={label} placeholder={common('search')} autoFocus /><CommandList>
          <CommandEmpty>{landing('rally.noResults')}</CommandEmpty>
          <CommandItem value="auto browser" onSelect={() => changeLocale(resolveBrowserLocale(navigator.languages), 'browser')}><Globe size={24} /><span>{t('browserLanguage')}</span>{mode === 'browser' && <Check size={14} />}</CommandItem>
          {options.map(option => <CommandItem key={option.code} value={`${option.code} ${option.name}`} onSelect={() => changeLocale(option.code, 'manual')}>
            <span className="cs-language-flag"><Image src={`/landing/flags/${option.flagCode}.png`} alt="" width={24} height={18} /></span><span lang={option.code}>{option.name}</span><small>{option.code.toUpperCase()}</small>{mode === 'manual' && option.code === locale && <Check size={14} />}
          </CommandItem>)}
        </CommandList></Command>
      </> : <>
        <button type="button" className="ck-language-open" onClick={() => setLanguages(true)}><span><small>{label}</small><strong>{current.name}</strong></span><ChevronRight size={16} /></button>
        <fieldset><legend>{appearanceLabel}</legend><div className="ck-theme-options">{(['day','sunset'] as const).map(value => <button key={value} type="button" aria-pressed={theme === value} onClick={() => changeTheme(value)}><span className={`ck-theme-preview ck-theme-${value}`} aria-hidden="true" />{value === 'day' ? dayLabel : sunsetLabel}{theme === value && <Check size={14} aria-hidden="true" />}</button>)}</div></fieldset>
      </>}
    </PopoverContent>
  </Popover>;
}
