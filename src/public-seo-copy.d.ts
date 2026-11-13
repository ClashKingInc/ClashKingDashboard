declare module "virtual:public-seo-copy" {
  type Messages = typeof import("../messages/en.json");
  const copy: Record<import("../lib/locale-preference").PublicLocale, {
    ClanSignal: Pick<Messages["ClanSignal"], "metadata" | "languageSuggestion">;
    FeaturesPage: Pick<Messages["FeaturesPage"], "hero">;
    HelpPage: Pick<Messages["HelpPage"], "title" | "subtitle">;
    OpenSourcePage: Pick<Messages["OpenSourcePage"], "title" | "subtitle">;
    PublicSeo: Messages["PublicSeo"];
    SupportPage: Pick<Messages["SupportPage"], "title" | "subtitle">;
  }>;
  export default copy;
}
