import { describe, expect, it } from "vitest";
import { getPublicMetadata } from "./public-seo";

describe("public SEO metadata", () => {
  it("uses localized canonical and hreflang URLs", () => {
    const metadata = getPublicMetadata("fr", "privacy");

    expect(metadata.title).toBe("Politique de confidentialité | ClashKing");
    expect(metadata.alternates?.canonical).toBe("https://clashk.ing/fr/privacy");
    expect(metadata.alternates?.languages).toEqual({
      en: "https://clashk.ing/privacy",
      fr: "https://clashk.ing/fr/privacy",
      nl: "https://clashk.ing/nl/privacy",
      "x-default": "https://clashk.ing/privacy",
    });
  });

  it("localizes Open Graph metadata", () => {
    const metadata = getPublicMetadata("nl", "terms");
    const openGraph = metadata.openGraph;

    expect(openGraph?.title).toBe("Servicevoorwaarden van ClashKing");
    expect(openGraph?.url).toBe("https://clashk.ing/nl/terms");
    expect(openGraph && "locale" in openGraph ? openGraph.locale : undefined).toBe("nl_NL");
  });
});
