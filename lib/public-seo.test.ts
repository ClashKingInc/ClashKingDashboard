import { describe, expect, it } from "vitest";
import { getPublicMetadata } from "./public-seo";

describe("public SEO metadata", () => {
  it("creates canonical metadata without nonexistent locale alternates for information pages", () => {
    const metadata = getPublicMetadata("en", "support");

    expect(metadata.canonical).toBe("https://clashk.ing/support");
    expect(metadata.languageAlternates).toEqual({
      en: "https://clashk.ing/support",
      "x-default": "https://clashk.ing/support",
    });
    expect(metadata.alternateOpenGraphLocales).toEqual([]);
  });

  it("uses localized canonical and hreflang URLs", () => {
    const metadata = getPublicMetadata("fr", "privacy");

    expect(metadata.title).toBe("Politique de confidentialité | ClashKing");
    expect(metadata.canonical).toBe("https://clashk.ing/fr/privacy");
    expect(metadata.languageAlternates).toEqual({
      en: "https://clashk.ing/privacy",
      fr: "https://clashk.ing/fr/privacy",
      nl: "https://clashk.ing/nl/privacy",
      "x-default": "https://clashk.ing/privacy",
    });
  });

  it("localizes Open Graph metadata", () => {
    const metadata = getPublicMetadata("nl", "terms");
    expect(metadata.openGraphTitle).toBe("Servicevoorwaarden van ClashKing");
    expect(metadata.canonical).toBe("https://clashk.ing/nl/terms");
    expect(metadata.openGraphLocale).toBe("nl_NL");
  });
});
