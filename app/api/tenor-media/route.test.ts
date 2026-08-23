import { describe, expect, it } from "vitest";

import { extractTenorGifUrl } from "@/lib/tenor-media";

describe("extractTenorGifUrl", () => {
  it("extracts the direct animated image instead of the Tenor embed", () => {
    const html = '<meta class="dynamic" property="og:image" content="https://media1.tenor.com/m/exampleAAAAC/roster.gif">';

    expect(extractTenorGifUrl(html)).toBe("https://media1.tenor.com/m/exampleAAAAC/roster.gif");
  });

  it("ignores non-Tenor images", () => {
    expect(extractTenorGifUrl('<meta property="og:image" content="https://example.com/roster.gif">')).toBeNull();
  });
});
