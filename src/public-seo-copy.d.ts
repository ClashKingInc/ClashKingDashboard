declare module "virtual:public-seo-copy" {
  type Messages = typeof import("../messages/en.json");
  const copy: Record<"en" | "fr" | "nl", {
    ClanSignal: Pick<Messages["ClanSignal"], "metadata">;
    PublicSeo: Messages["PublicSeo"];
  }>;
  export default copy;
}
