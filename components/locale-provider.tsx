"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import englishMessages from "@/messages/en.json";
import {
  DASHBOARD_LOCALE_MODE_STORAGE_KEY,
  DASHBOARD_LOCALE_STORAGE_KEY,
  getLocaleModeFromStorage,
  getPublicRoute,
  isSupportedLocale,
  resolveBrowserLocale,
  type LocaleMode,
  type SupportedLocale,
} from "@/lib/locale-preference";

type Messages = typeof englishMessages;

const messageLoaders: Record<SupportedLocale, () => Promise<Messages>> = {
  en: async () => englishMessages,
  fr: async () => (await import("@/messages/fr.json")).default,
  nl: async () => (await import("@/messages/nl.json")).default,
};

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
  const [messages, setMessages] = useState<Messages>(englishMessages);
  const [mode, setMode] = useState<LocaleMode>("manual");

  const applyLocale = useCallback(async (nextLocale: SupportedLocale) => {
    const nextMessages = await messageLoaders[nextLocale]();
    setMessages(nextMessages);
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const setDashboardLocale = useCallback(
    (nextLocale: SupportedLocale, nextMode: LocaleMode) => {
      updateDashboardLocale(nextLocale, nextMode);
    },
    [],
  );

  useEffect(() => {
    const publicRoute = getPublicRoute(globalThis.location.pathname);
    if (publicRoute) {
      void applyLocale(publicRoute.locale);
      return;
    }

    const storedMode = getLocaleModeFromStorage(
      localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY),
    );
    const storedLocale = localStorage.getItem(DASHBOARD_LOCALE_STORAGE_KEY);
    const nextLocale = storedMode === "browser"
      ? resolveBrowserLocale(navigator.languages)
      : isSupportedLocale(storedLocale) ? storedLocale : "en";

    setMode(storedMode);
    void applyLocale(nextLocale);
  }, [applyLocale, children]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        getPublicRoute(globalThis.location.pathname) ||
        (event.key !== DASHBOARD_LOCALE_STORAGE_KEY &&
          event.key !== DASHBOARD_LOCALE_MODE_STORAGE_KEY)
      ) {
        return;
      }

      const storedMode = getLocaleModeFromStorage(
        localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY),
      );
      const storedLocale = localStorage.getItem(DASHBOARD_LOCALE_STORAGE_KEY);
      const nextLocale = storedMode === "browser"
        ? resolveBrowserLocale(navigator.languages)
        : isSupportedLocale(storedLocale) ? storedLocale : "en";
      setMode(storedMode);
      void applyLocale(nextLocale);
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
