import { describe, expect, it } from "vitest";

import { loadedMembersDetail, playerLookupPath } from "./links-utils";

describe("links utilities", () => {
  it("uses the registered Clash API proxy route for player lookups", () => {
    expect(playerLookupPath("#2PP")).toBe("/proxy/v1/players/%232PP");
  });

  it("describes a capped member result against the full Discord count", () => {
    expect(loadedMembersDetail(5_000, 8_214)).toBe("5,000 of 8,214 server members loaded");
  });

  it("explains the cap when the full Discord count is unavailable", () => {
    expect(loadedMembersDetail(5_000)).toBe("Member loading is capped at 5,000");
  });

  it("keeps uncapped member results quiet", () => {
    expect(loadedMembersDetail(743, 743)).toBe("Current Discord members");
  });
});
