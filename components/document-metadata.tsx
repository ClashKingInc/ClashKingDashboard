import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

import type { PublicPage } from "@/lib/public-seo";
import { getPublicRoute, type PublicLocale } from "@/lib/locale-preference";

type PublicRoute = { readonly locale: PublicLocale; readonly page: PublicPage };

function publicRoute(pathname: string): PublicRoute | null {
  const localized = getPublicRoute(pathname);
  if (localized) {
    return { locale: localized.locale, page: localized.page === "/" ? "home" : localized.page === "/privacy" ? "privacy" : "terms" };
  }
  const path = pathname.replace(/\/$/, "");
  if (path === "/features" || path === "/help" || path === "/open-source" || path === "/support") {
    return { locale: "en", page: path.slice(1) as PublicPage };
  }
  return null;
}

function setMeta(name: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.append(element);
  }
  element.content = content;
}

function appendManagedMeta(attribute: "name" | "property", key: string, content: string): void {
  const element = document.createElement("meta");
  element.setAttribute(attribute, key);
  element.content = content;
  element.dataset.clashkingManaged = "true";
  document.head.append(element);
}

function appendManagedLink(rel: string, href: string, hreflang?: string): void {
  const element = document.createElement("link");
  element.rel = rel;
  element.href = href;
  if (hreflang) element.hreflang = hreflang;
  element.dataset.clashkingManaged = "true";
  document.head.append(element);
}

function clearManagedHead(): void {
  document.head.querySelectorAll(
    "[data-clashking-managed='true'], link[rel='canonical'], link[rel='alternate'][hreflang], meta[property^='og:'], meta[name^='twitter:']",
  ).forEach((element) => element.remove());
}

export function DocumentMetadata() {
  const pathname = useLocation({ select: (location) => location.pathname });

  useEffect(() => {
    clearManagedHead();
    const route = publicRoute(pathname);
    if (route) {
      let active = true;
      void import("@/lib/public-seo").then(({ getPublicMetadata }) => {
        if (!active) return;
        const metadata = getPublicMetadata(route.locale, route.page);
        document.title = metadata.title;
        setMeta("description", metadata.description);
        setMeta("robots", "index, follow");
        document.documentElement.lang = route.locale;
        appendManagedLink("canonical", metadata.canonical);
        for (const [locale, href] of Object.entries(metadata.languageAlternates)) {
          appendManagedLink("alternate", href, locale);
        }
        appendManagedMeta("property", "og:type", "website");
        appendManagedMeta("property", "og:title", metadata.openGraphTitle);
        appendManagedMeta("property", "og:description", metadata.description);
        appendManagedMeta("property", "og:url", metadata.canonical);
        appendManagedMeta("property", "og:locale", metadata.openGraphLocale);
        metadata.alternateOpenGraphLocales.forEach((locale) =>
          appendManagedMeta("property", "og:locale:alternate", locale));
        appendManagedMeta("property", "og:image", metadata.socialImage);
        appendManagedMeta("property", "og:image:alt", metadata.socialImageAlt);
        appendManagedMeta("name", "twitter:card", "summary_large_image");
        appendManagedMeta("name", "twitter:title", metadata.openGraphTitle);
        appendManagedMeta("name", "twitter:description", metadata.description);
        appendManagedMeta("name", "twitter:image", metadata.socialImage);
      });
      return () => { active = false; };
    }

    document.title = pathname.startsWith("/dashboard")
      ? "Dashboard | ClashKing"
      : "ClashKing Dashboard";
    setMeta("description", "Configure your ClashKing bot settings");
    setMeta("robots", "noindex, nofollow");
    if (pathname === "/transcript") {
      document.title = "Ticket transcript | ClashKing";
      setMeta("referrer", "no-referrer");
    }
  }, [pathname]);

  return null;
}
