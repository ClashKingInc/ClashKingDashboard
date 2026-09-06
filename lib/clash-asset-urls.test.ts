import { describe, expect, it } from "vitest";

import { clanBadgeUrl, clanBadgeSources } from "./clash-asset-urls";

describe("clanBadgeUrl", () => {
  it("matches the canonical badges Worker URL format", () => {
    expect(clanBadgeUrl(" #AbC ")).toBe("https://badges.clashk.ing/ABC.png?size=128");
  });

  it("returns an empty URL for an empty tag", () => {
    expect(clanBadgeUrl("  ")).toBe("");
  });
});

 describe("clanBadgeSources", () => {
  it.each(["small", "medium", "large", 64, 128, 256, 512] as const)("supports size %s", (size) => {
    expect(clanBadgeUrl("#P0Y", size, "avif")).toBe(`https://badges.clashk.ing/P0Y.avif?size=${size}`);
  });
  it("normalizes legacy service URLs and removes non-cache parameters", () => {
    expect(clanBadgeSources("https://badges.clashk.ing/P0Y?size=64&unused=value")).toEqual({
      png: "https://badges.clashk.ing/P0Y.png?size=64",
      avif: "https://badges.clashk.ing/P0Y.avif?size=64",
    });
  });
  it("leaves unrelated images untouched", () => {
    expect(clanBadgeSources("https://api-assets.clashofclans.com/badges/512/token.png")).toBeNull();
    expect(clanBadgeSources("/icon.png")).toBeNull();
  });
});
