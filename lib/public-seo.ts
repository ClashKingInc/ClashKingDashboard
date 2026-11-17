import messages from "virtual:public-seo-copy";
import { PUBLIC_LOCALES, publicPath, type PublicLocale, type PublicPagePath } from "@/lib/locale-preference";

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

const localizedPages = new Set<PublicPage>(Object.keys(pagePaths) as PublicPage[]);

const openGraphLocales = Object.fromEntries(
  PUBLIC_LOCALES.map(locale => [locale, `${locale}_${new Intl.Locale(locale).maximize().region}`]),
) as Record<PublicLocale, string>;

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

  if (page !== "privacy" && page !== "terms") {
    const contentMessages = localized;
    const content = page === "features"
      ? { heading: contentMessages.FeaturesPage.hero.title, description: contentMessages.FeaturesPage.hero.subtitle }
      : page === "help"
        ? { heading: contentMessages.HelpPage.title, description: contentMessages.HelpPage.subtitle }
        : page === "open-source"
          ? { heading: contentMessages.OpenSourcePage.title, description: contentMessages.OpenSourcePage.subtitle }
          : { heading: contentMessages.SupportPage.title, description: contentMessages.SupportPage.subtitle };
    return {
      title: `${content.heading} | ClashKing`,
      openGraphTitle: content.heading,
      description: content.description,
      heading: content.heading,
      eyebrow: "ClashKing",
      imageAlt: contentMessages.PublicSeo.imageAlt,
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
        ...Object.fromEntries(PUBLIC_LOCALES.map(alternate => [
          alternate, `${SITE_ORIGIN}${publicPath(alternate, pagePath as PublicPagePath)}`,
        ])),
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
