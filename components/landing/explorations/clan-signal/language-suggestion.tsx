import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { LandingTheme } from "./language-switcher";
import copy from "virtual:public-seo-copy";
import Link from "@/components/app-link";
import { useAppLocale } from "@/components/locale-provider";
import { usePathname } from "@/lib/navigation";
import {
  dismissPublicLanguageSuggestion, getPublicLanguageSuggestion, getPublicRoute,
  PUBLIC_LANGUAGE_CHOICE_EVENT, PUBLIC_LANGUAGE_SUGGESTION_STORAGE_KEY,
  publicPath, type PublicLocale,
} from "@/lib/locale-preference";

export function LandingLanguageSuggestion({ theme }: { readonly theme: LandingTheme }) {
  const pathname = usePathname();
  const { setDashboardLocale } = useAppLocale();
  const [suggestion, setSuggestion] = useState<PublicLocale>();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const refresh = () => {
      let dismissed: string | null = null;
      try { dismissed = localStorage.getItem(PUBLIC_LANGUAGE_SUGGESTION_STORAGE_KEY); } catch { /* Storage is optional. */ }
      setSuggestion(getPublicLanguageSuggestion(pathname, navigator.languages, dismissed));
    };
    const hide = () => setSuggestion(undefined);
    refresh();
    globalThis.addEventListener("languagechange", refresh);
    globalThis.addEventListener(PUBLIC_LANGUAGE_CHOICE_EVENT, hide);
    return () => {
      globalThis.removeEventListener("languagechange", refresh);
      globalThis.removeEventListener(PUBLIC_LANGUAGE_CHOICE_EVENT, hide);
    };
  }, [pathname]);

  const route = getPublicRoute(pathname);
  if (!suggestion || !route || suggestion === route.locale) return null;
  const text = copy[suggestion].ClanSignal.languageSuggestion;
  const href = `${publicPath(suggestion, route.page)}${location.search}${location.hash}`;
  const dismiss = () => {
    dismissPublicLanguageSuggestion();
    setSuggestion(undefined);
  };

  return createPortal(<div className="ck-home ck-public-header" data-cs-theme={theme}><aside className="ck-language-suggestion" role="region" aria-labelledby={titleId} aria-describedby={descriptionId}
    lang={suggestion} dir={["ar", "he", "ur"].includes(suggestion) ? "rtl" : "ltr"}>
    <h2 id={titleId}>{text.title}</h2>
    <p id={descriptionId}>{text.description}</p>
    <div className="ck-language-suggestion-actions">
      <button type="button" onClick={dismiss}>{text.stay}</button>
      <Link href={href} onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        setDashboardLocale(suggestion, "browser");
        dismiss();
      }}>{text.change}</Link>
    </div>
  </aside></div>, document.body);
}
