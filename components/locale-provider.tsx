"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { IntlProvider } from "use-intl";
import englishMessages from "@/messages/en.json";
import { useRouter } from "@/lib/navigation";
import { embeddedServerId } from '@/lib/auth/embedded';
import {
  DASHBOARD_LOCALE_MODE_STORAGE_KEY,
  DASHBOARD_LOCALE_STORAGE_KEY,
  getPublicRoute,
  resolveBrowserLocale,
  initialLocalePreference,
  preferredPublicPath,
  type LocalePreference,
  readSavedLocalePreference,
  saveLocalePreference,
  type LocaleMode,
  type SupportedLocale,
} from "@/lib/locale-preference";

type Messages = typeof englishMessages;

const loadMessages = async (loader: () => Promise<{ default: Messages }>): Promise<Messages> =>
  (await loader()).default;

const messageLoaders: Record<SupportedLocale, () => Promise<Messages>> = {
  en: async () => englishMessages,
  af: () => loadMessages(() => import("@/messages/af.json")),
  ar: () => loadMessages(() => import("@/messages/ar.json")),
  ca: () => loadMessages(() => import("@/messages/ca.json")),
  cs: () => loadMessages(() => import("@/messages/cs.json")),
  da: () => loadMessages(() => import("@/messages/da.json")),
  de: () => loadMessages(() => import("@/messages/de.json")),
  el: () => loadMessages(() => import("@/messages/el.json")),
  es: () => loadMessages(() => import("@/messages/es.json")),
  fi: () => loadMessages(() => import("@/messages/fi.json")),
  fr: () => loadMessages(() => import("@/messages/fr.json")),
  he: () => loadMessages(() => import("@/messages/he.json")),
  hi: () => loadMessages(() => import("@/messages/hi.json")),
  hu: () => loadMessages(() => import("@/messages/hu.json")),
  it: () => loadMessages(() => import("@/messages/it.json")),
  ja: () => loadMessages(() => import("@/messages/ja.json")),
  ko: () => loadMessages(() => import("@/messages/ko.json")),
  nl: () => loadMessages(() => import("@/messages/nl.json")),
  no: () => loadMessages(() => import("@/messages/no.json")),
  pl: () => loadMessages(() => import("@/messages/pl.json")),
  pt: () => loadMessages(() => import("@/messages/pt.json")),
  ro: () => loadMessages(() => import("@/messages/ro.json")),
  ru: () => loadMessages(() => import("@/messages/ru.json")),
  sr: () => loadMessages(() => import("@/messages/sr.json")),
  sv: () => loadMessages(() => import("@/messages/sv.json")),
  tr: () => loadMessages(() => import("@/messages/tr.json")),
  uk: () => loadMessages(() => import("@/messages/uk.json")),
  ur: () => loadMessages(() => import("@/messages/ur.json")),
  vi: () => loadMessages(() => import("@/messages/vi.json")),
  zh: () => loadMessages(() => import("@/messages/zh.json")),
};

const RTL_LOCALES = new Set<SupportedLocale>(["ar", "he", "ur"]);

type LocaleContextValue = {
  locale: SupportedLocale;
  mode: LocaleMode;
  setDashboardLocale: (locale: SupportedLocale, mode: LocaleMode) => void;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
const DASHBOARD_LOCALE_CHANGE_EVENT = "clashking:locale-change";

type DashboardLocaleChangeDetail = {
  locale: SupportedLocale;
  mode: LocaleMode;
};

export function updateDashboardLocale(locale: SupportedLocale, mode: LocaleMode): void {
  saveLocalePreference(locale, mode);
  globalThis.dispatchEvent(new CustomEvent<DashboardLocaleChangeDetail>(DASHBOARD_LOCALE_CHANGE_EVENT, {
    detail: { locale, mode },
  }));
}

export function LocaleProvider({ children, pathname = globalThis.location.pathname }: { readonly children: React.ReactNode; readonly pathname?: string }) {
  const [locale, setLocale] = useState<SupportedLocale>(() => getPublicRoute(pathname)?.locale ?? "en");
  const [loadedLocale, setLoadedLocale] = useState<SupportedLocale | null>(null);
  const [messages, setMessages] = useState<Messages>(englishMessages);
  const [mode, setMode] = useState<LocaleMode>("manual");
  const localeRequestId = useRef(0);
  const router = useRouter();

  const applyLocale = useCallback(async (nextLocale: SupportedLocale) => {
    const requestId = ++localeRequestId.current;
    const nextMessages = await messageLoaders[nextLocale]();
    if (requestId !== localeRequestId.current) return;
    setMessages(nextMessages);
    setLocale(nextLocale);
    setLoadedLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = RTL_LOCALES.has(nextLocale) ? "rtl" : "ltr";
  }, []);

  const applyPreference = useCallback((preference: LocalePreference) => {
    setMode(preference.mode);
    const redirectPath = preferredPublicPath(pathname, preference);
    if (redirectPath) router.replace(`${redirectPath}${globalThis.location.search}${globalThis.location.hash}`);
    const publicLocale = getPublicRoute(pathname)?.locale;
    void applyLocale(preference.mode === "browser" ? preference.locale : publicLocale ?? preference.locale);
  }, [applyLocale, pathname, router]);

  const setDashboardLocale = useCallback(
    (nextLocale: SupportedLocale, nextMode: LocaleMode) => {
      saveLocalePreference(nextLocale, nextMode);
      applyPreference({ locale: nextLocale, mode: nextMode });
    },
    [applyPreference],
  );

  useEffect(() => {
    if(embeddedServerId()){
      const candidate=(new URLSearchParams(window.location.search).get('locale')??sessionStorage.getItem('ck_embedded_locale')??'en').split(/[-_]/)[0];
      if(candidate && candidate in messageLoaders){sessionStorage.setItem('ck_embedded_locale',candidate);void applyLocale(candidate as SupportedLocale);return;}
    }
    if (pathname === "/concepts/clan-signal") {
      void applyLocale("en");
      return;
    }

    const preference = initialLocalePreference(pathname, readSavedLocalePreference(), navigator.languages);
    saveLocalePreference(preference.locale, preference.mode);
    applyPreference(preference);
  }, [applyLocale, applyPreference, pathname]);

  useEffect(() => {
    const refreshPreference = () => {
      if (embeddedServerId() || pathname === "/concepts/clan-signal") return;
      const preference = initialLocalePreference(pathname, readSavedLocalePreference(), navigator.languages);
      // Reconcile this origin's local storage with the cross-origin cookie too,
      // so language settings and future navigation use the same preference.
      saveLocalePreference(preference.locale, preference.mode);
      applyPreference(preference);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== DASHBOARD_LOCALE_STORAGE_KEY && event.key !== DASHBOARD_LOCALE_MODE_STORAGE_KEY) return;
      refreshPreference();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshPreference();
    };

    // Storage events do not cross website/dashboard origins. Refresh on return
    // to an existing tab without requiring navigation or a reload.
    globalThis.addEventListener("storage", handleStorage);
    globalThis.addEventListener("focus", refreshPreference);
    globalThis.addEventListener("pageshow", refreshPreference);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      globalThis.removeEventListener("storage", handleStorage);
      globalThis.removeEventListener("focus", refreshPreference);
      globalThis.removeEventListener("pageshow", refreshPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [applyPreference, pathname]);

  useEffect(() => {
    const handleLocaleChange = (event: Event) => {
      const { locale: nextLocale, mode: nextMode } = (event as CustomEvent<DashboardLocaleChangeDetail>).detail;
      applyPreference({ locale: nextLocale, mode: nextMode });
    };

    globalThis.addEventListener(DASHBOARD_LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => globalThis.removeEventListener(DASHBOARD_LOCALE_CHANGE_EVENT, handleLocaleChange);
  }, [applyPreference]);

  useEffect(() => {
    if (
      mode !== "browser" ||
      pathname === "/concepts/clan-signal"
    ) {
      return;
    }

    const handleLanguageChange = () => {
      setDashboardLocale(resolveBrowserLocale(navigator.languages), "browser");
    };

    globalThis.addEventListener("languagechange", handleLanguageChange);
    return () => globalThis.removeEventListener("languagechange", handleLanguageChange);
  }, [setDashboardLocale, mode, pathname]);

  const value = useMemo(
    () => ({ locale, mode, setDashboardLocale }),
    [locale, mode, setDashboardLocale],
  );

  // A public URL can change before its lazy catalog arrives. Keep English (or
  // the previous route's messages) off-screen until the correct catalog is ready.
  // The initial locale alone is not enough: it must match the loaded messages.
  const publicLocale = getPublicRoute(pathname)?.locale;
  const ready = loadedLocale !== null &&
    (mode === "browser" || !publicLocale || loadedLocale === publicLocale);

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider locale={locale} messages={messages}>
        {ready ? children : <div aria-busy="true" data-locale-loading="true" />}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}

export function useAppLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useAppLocale must be used inside LocaleProvider");
  return value;
}
