"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import englishMessages from "@/messages/en.json";
import {
  withEnglishFallback,
  type LocalizedMessageCatalog,
  type MessageCatalog,
} from "@/lib/message-catalog";
import {
  DASHBOARD_LOCALE_MODE_STORAGE_KEY,
  DASHBOARD_LOCALE_STORAGE_KEY,
  getPublicRoute,
  resolveBrowserLocale,
  resolveDashboardLocalePreference,
  type LocaleMode,
  type SupportedLocale,
} from "@/lib/locale-preference";

const loadMessages = async (loader: () => Promise<{ default: unknown }>): Promise<LocalizedMessageCatalog> =>
  (await loader()).default as LocalizedMessageCatalog;

const messageLoaders: Record<SupportedLocale, () => Promise<LocalizedMessageCatalog>> = {
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

const getFixedPublicRoute = (pathname: string) =>
  pathname === "/" ? undefined : getPublicRoute(pathname);

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
  localStorage.setItem(DASHBOARD_LOCALE_STORAGE_KEY, locale);
  localStorage.setItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY, mode);
  globalThis.dispatchEvent(new CustomEvent<DashboardLocaleChangeDetail>(DASHBOARD_LOCALE_CHANGE_EVENT, {
    detail: { locale, mode },
  }));
}

export function LocaleProvider({ children }: { readonly children: React.ReactNode }) {
  const [locale, setLocale] = useState<SupportedLocale>("en");
  const [messages, setMessages] = useState<MessageCatalog>(englishMessages);
  const [mode, setMode] = useState<LocaleMode>("manual");
  const localeRequestId = useRef(0);

  const applyLocale = useCallback(async (nextLocale: SupportedLocale) => {
    const requestId = ++localeRequestId.current;
    const nextMessages = withEnglishFallback(await messageLoaders[nextLocale]());
    if (requestId !== localeRequestId.current) return;
    setMessages(nextMessages);
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = RTL_LOCALES.has(nextLocale) ? "rtl" : "ltr";
  }, []);

  const setDashboardLocale = useCallback(
    (nextLocale: SupportedLocale, nextMode: LocaleMode) => {
      localStorage.setItem(DASHBOARD_LOCALE_STORAGE_KEY, nextLocale);
      localStorage.setItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY, nextMode);
      setMode(nextMode);
      void applyLocale(nextLocale);
    },
    [applyLocale],
  );

  useEffect(() => {
    const pathname = globalThis.location.pathname;
    const publicRoute = getFixedPublicRoute(pathname);
    if (publicRoute) {
      void applyLocale(publicRoute.locale);
      return;
    }
    if (pathname === "/concepts/clan-signal") {
      void applyLocale("en");
      return;
    }

    const preference = resolveDashboardLocalePreference(
      localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY),
      localStorage.getItem(DASHBOARD_LOCALE_STORAGE_KEY),
      navigator.languages,
    );

    setMode(preference.mode);
    void applyLocale(preference.locale);
  }, [applyLocale, children]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        getFixedPublicRoute(globalThis.location.pathname) ||
        globalThis.location.pathname === "/concepts/clan-signal" ||
        (event.key !== DASHBOARD_LOCALE_STORAGE_KEY &&
          event.key !== DASHBOARD_LOCALE_MODE_STORAGE_KEY)
      ) {
        return;
      }

      const preference = resolveDashboardLocalePreference(
        localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY),
        localStorage.getItem(DASHBOARD_LOCALE_STORAGE_KEY),
        navigator.languages,
      );
      setMode(preference.mode);
      void applyLocale(preference.locale);
    };

    globalThis.addEventListener("storage", handleStorage);
    return () => globalThis.removeEventListener("storage", handleStorage);
  }, [applyLocale]);

  useEffect(() => {
    const handleLocaleChange = (event: Event) => {
      const { locale: nextLocale, mode: nextMode } = (event as CustomEvent<DashboardLocaleChangeDetail>).detail;
      setMode(nextMode);
      void applyLocale(nextLocale);
    };

    globalThis.addEventListener(DASHBOARD_LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => globalThis.removeEventListener(DASHBOARD_LOCALE_CHANGE_EVENT, handleLocaleChange);
  }, [applyLocale]);

  useEffect(() => {
    if (
      mode !== "browser" ||
      getFixedPublicRoute(globalThis.location.pathname) ||
      globalThis.location.pathname === "/concepts/clan-signal"
    ) {
      return;
    }

    const handleLanguageChange = () => {
      void applyLocale(resolveBrowserLocale(navigator.languages));
    };

    globalThis.addEventListener("languagechange", handleLanguageChange);
    return () => globalThis.removeEventListener("languagechange", handleLanguageChange);
  }, [applyLocale, mode]);

  const value = useMemo(
    () => ({ locale, mode, setDashboardLocale }),
    [locale, mode, setDashboardLocale],
  );

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useAppLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useAppLocale must be used inside LocaleProvider");
  return value;
}
