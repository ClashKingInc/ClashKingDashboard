import messages from "virtual:public-seo-copy";
import { publicPath, type PublicLocale, type PublicPagePath } from "@/lib/locale-preference";

export type PublicPage = "home" | "features" | "help" | "open-source" | "privacy" | "support" | "terms";

export interface PublicMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonical: string;
  readonly languageAlternates: Readonly<Record<string, string>>;
  readonly openGraphTitle: string;
  readonly openGraphLocale: string;
  readonly alternateOpenGraphLocales: readonly string[];
  readonly socialImage: string;
  readonly socialImageAlt: string;
}

const SITE_ORIGIN = "https://clashk.ing";
const SOCIAL_IMAGE = `${SITE_ORIGIN}/og/clashking-landing.png`;

const pagePaths = {
  home: "/",
  features: "/features",
  help: "/help",
  "open-source": "/open-source",
  privacy: "/privacy",
  support: "/support",
  terms: "/terms",
} as const;

const localizedPages = new Set<PublicPage>(["home", "privacy", "terms"]);

const openGraphLocales: Record<PublicLocale, string> = {
  en: "en_US",
  fr: "fr_FR",
  nl: "nl_NL",
};

export function getPublicPageCopy(locale: PublicLocale, page: PublicPage) {
  const localized = messages[locale];
  if (page === "home") {
    return {
      title: localized.ClanSignal.metadata.title,
      openGraphTitle: localized.ClanSignal.metadata.openGraphTitle,
      description: localized.ClanSignal.metadata.description,
      heading: "",
      eyebrow: "",
      imageAlt: localized.PublicSeo.imageAlt,
    };
  }

  if (!localizedPages.has(page)) {
    const english = messages.en;
    const content = page === "features"
      ? { heading: english.FeaturesPage.hero.title, description: english.FeaturesPage.hero.subtitle }
      : page === "help"
        ? { heading: english.HelpPage.title, description: english.HelpPage.subtitle }
        : page === "open-source"
          ? { heading: english.OpenSourcePage.title, description: english.OpenSourcePage.subtitle }
          : { heading: english.SupportPage.title, description: english.SupportPage.subtitle };
    return {
      title: `${content.heading} | ClashKing`,
      openGraphTitle: content.heading,
      description: content.description,
      heading: content.heading,
      eyebrow: "ClashKing",
      imageAlt: english.PublicSeo.imageAlt,
    };
  }

  return {
    ...localized.PublicSeo[page as "privacy" | "terms"],
    imageAlt: localized.PublicSeo.imageAlt,
  };
}

export function getPublicMetadata(locale: PublicLocale, page: PublicPage): PublicMetadata {
  const copy = getPublicPageCopy(locale, page);
  const pagePath = pagePaths[page];
  const isLocalized = localizedPages.has(page);
  const localizedPath = isLocalized ? publicPath(locale, pagePath as PublicPagePath) : pagePath;
  const canonical = `${SITE_ORIGIN}${localizedPath === "/" ? "/" : localizedPath}`;
  const languageAlternates: Readonly<Record<string, string>> = isLocalized
    ? {
        en: `${SITE_ORIGIN}${publicPath("en", pagePath as PublicPagePath)}`,
        fr: `${SITE_ORIGIN}${publicPath("fr", pagePath as PublicPagePath)}`,
        nl: `${SITE_ORIGIN}${publicPath("nl", pagePath as PublicPagePath)}`,
        "x-default": `${SITE_ORIGIN}${publicPath("en", pagePath as PublicPagePath)}`,
      }
    : { en: canonical, "x-default": canonical };

  return {
    title: copy.title,
    description: copy.description,
    canonical,
    languageAlternates,
    openGraphTitle: copy.openGraphTitle,
    openGraphLocale: isLocalized ? openGraphLocales[locale] : openGraphLocales.en,
    alternateOpenGraphLocales: isLocalized
      ? Object.values(openGraphLocales).filter((candidate) => candidate !== openGraphLocales[locale])
      : [],
    socialImage: SOCIAL_IMAGE,
    socialImageAlt: copy.imageAlt,
  };
}
