import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const clientRoot = resolve("dist/client");
const baseShell = await readFile(join(clientRoot, "index.html"), "utf8");
const siteOrigin = "https://clashk.ing";
const socialImage = `${siteOrigin}/og/clashking-landing.png`;

const locales = {
  en: { prefix: "", openGraph: "en_US" },
  fr: { prefix: "/fr", openGraph: "fr_FR" },
  nl: { prefix: "/nl", openGraph: "nl_NL" },
};

const pagePaths = {
  home: "",
  features: "/features",
  help: "/help",
  "open-source": "/open-source",
  privacy: "/privacy",
  support: "/support",
  terms: "/terms",
};

const localizedPages = new Set(["home", "privacy", "terms"]);

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

function pageCopy(messages, page) {
  if (page === "home") {
    return {
      title: messages.ClanSignal.metadata.title,
      openGraphTitle: messages.ClanSignal.metadata.openGraphTitle,
      description: messages.ClanSignal.metadata.description,
      imageAlt: messages.PublicSeo.imageAlt,
    };
  }
  if (!localizedPages.has(page)) {
    const content = page === "features"
      ? { heading: messages.FeaturesPage.hero.title, description: messages.FeaturesPage.hero.subtitle }
      : page === "help"
        ? { heading: messages.HelpPage.title, description: messages.HelpPage.subtitle }
        : page === "open-source"
          ? { heading: messages.OpenSourcePage.title, description: messages.OpenSourcePage.subtitle }
          : { heading: messages.SupportPage.title, description: messages.SupportPage.subtitle };
    return {
      title: `${content.heading} | ClashKing`,
      openGraphTitle: content.heading,
      description: content.description,
      imageAlt: messages.PublicSeo.imageAlt,
    };
  }
  return { ...messages.PublicSeo[page], imageAlt: messages.PublicSeo.imageAlt };
}

function localizedPath(locale, page) {
  return `${locales[locale].prefix}${pagePaths[page]}` || "/";
}

for (const [locale, localeConfig] of Object.entries(locales)) {
  const messages = JSON.parse(await readFile(resolve(`messages/${locale}.json`), "utf8"));
  for (const page of Object.keys(pagePaths)) {
    if (locale !== "en" && !localizedPages.has(page)) continue;
    const copy = pageCopy(messages, page);
    const pathname = localizedPath(locale, page);
    const canonical = `${siteOrigin}${pathname}`;
    const alternates = localizedPages.has(page)
      ? [
          ...Object.keys(locales).map((alternateLocale) =>
            `<link rel="alternate" hreflang="${alternateLocale}" href="${siteOrigin}${localizedPath(alternateLocale, page)}" />`),
          `<link rel="alternate" hreflang="x-default" href="${siteOrigin}${localizedPath("en", page)}" />`,
        ].join("\n    ")
      : `<link rel="alternate" hreflang="en" href="${canonical}" />\n    <link rel="alternate" hreflang="x-default" href="${canonical}" />`;
    const alternateOpenGraph = localizedPages.has(page)
      ? Object.values(locales)
          .map(({ openGraph }) => openGraph)
          .filter((openGraph) => openGraph !== localeConfig.openGraph)
          .map((openGraph) => `<meta property="og:locale:alternate" content="${openGraph}" />`)
          .join("\n    ")
      : "";
    const head = `
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
    ${alternates}
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(copy.openGraphTitle)}" />
    <meta property="og:description" content="${escapeHtml(copy.description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:locale" content="${localeConfig.openGraph}" />
    ${alternateOpenGraph}
    <meta property="og:image" content="${socialImage}" />
    <meta property="og:image:alt" content="${escapeHtml(copy.imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(copy.openGraphTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(copy.description)}" />
    <meta name="twitter:image" content="${socialImage}" />`;
    const shell = baseShell
      .replace('<html lang="en"', `<html lang="${locale}"`)
      .replace(/<title>.*?<\/title>/u, `<title>${escapeHtml(copy.title)}</title>`)
      .replace(/<meta name="description" content=".*?" \/>/u, `<meta name="description" content="${escapeHtml(copy.description)}" />`)
      .replace("  </head>", `${head}\n  </head>`);
    const output = pathname === "/"
      ? join(clientRoot, "index.html")
      : join(clientRoot, `${pathname.slice(1)}.html`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, shell);
  }
}

console.log("Generated public HTML shells for landing, information, privacy, and terms pages.");
