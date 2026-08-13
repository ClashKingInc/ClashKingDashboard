import type { Metadata } from "next";
import englishMessages from "@/messages/en.json";
import frenchMessages from "@/messages/fr.json";
import dutchMessages from "@/messages/nl.json";
import { publicPath, type PublicLocale } from "@/lib/locale-preference";

export type PublicPage = "home" | "privacy" | "terms";

const SITE_ORIGIN = "https://clashk.ing";
const SOCIAL_IMAGE = `${SITE_ORIGIN}/og/clashking-landing.png`;

const messages = {
  en: englishMessages,
  fr: frenchMessages,
  nl: dutchMessages,
} satisfies Record<PublicLocale, typeof englishMessages>;

const pagePaths = {
  home: "/",
  privacy: "/privacy",
  terms: "/terms",
} as const;

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

  return {
    ...localized.PublicSeo[page],
    imageAlt: localized.PublicSeo.imageAlt,
  };
}

export function getPublicMetadata(locale: PublicLocale, page: PublicPage): Metadata {
  const copy = getPublicPageCopy(locale, page);
  const pagePath = pagePaths[page];
  const localizedPath = publicPath(locale, pagePath);
  const canonical = `${SITE_ORIGIN}${localizedPath === "/" ? "/" : localizedPath}`;
  const languageAlternates = {
    en: `${SITE_ORIGIN}${publicPath("en", pagePath)}`,
    fr: `${SITE_ORIGIN}${publicPath("fr", pagePath)}`,
    nl: `${SITE_ORIGIN}${publicPath("nl", pagePath)}`,
    "x-default": `${SITE_ORIGIN}${publicPath("en", pagePath)}`,
  };

  return {
    title: copy.title,
    description: copy.description,
    robots: { index: true, follow: true },
    alternates: {
      canonical,
      languages: languageAlternates,
    },
    openGraph: {
      title: copy.openGraphTitle,
      description: copy.description,
      type: "website",
      siteName: "ClashKing",
      url: canonical,
      locale: openGraphLocales[locale],
      alternateLocale: Object.values(openGraphLocales).filter(
        (candidate) => candidate !== openGraphLocales[locale],
      ),
      images: [
        {
          url: SOCIAL_IMAGE,
          width: 1200,
          height: 630,
          alt: copy.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.openGraphTitle,
      description: copy.description,
      images: [SOCIAL_IMAGE],
    },
    other: {
      "content-language": locale,
    },
  };
}
