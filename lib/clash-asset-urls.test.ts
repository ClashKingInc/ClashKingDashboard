import { describe, expect, it } from "vitest";

import { clanBadgeUrl } from "./clash-asset-urls";

describe("clanBadgeUrl", () => {
  it("matches the canonical badges Worker URL format", () => {
    expect(clanBadgeUrl(" #AbC ")).toBe("https://badges.clashk.ing/ABC");
  });

  it("returns an empty URL for an empty tag", () => {
    expect(clanBadgeUrl("  ")).toBe("");
  });
});
