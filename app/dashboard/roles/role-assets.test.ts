import { describe, expect, it } from "vitest";
import {
  builderHallImageUrl,
  builderLeagueImageUrl,
  parseRoleLevel,
  roleCriteriaImageUrl,
} from "./role-assets";

describe("role asset helpers", () => {
  it("normalizes numeric and prefixed role criteria", () => {
    expect(parseRoleLevel(10)).toBe(10);
    expect(parseRoleLevel("th18")).toBe(18);
    expect(parseRoleLevel("BH 10")).toBe(10);
    expect(parseRoleLevel("unknown")).toBeNull();
  });

  it("uses asset-repo paths for Builder Hall and Builder Base leagues", () => {
    expect(builderHallImageUrl(10)).toBe(
      "https://assets.clashk.ing/buildings/builder-base/builder_hall/level_10.webp"
    );
    expect(builderLeagueImageUrl("Ruby II")).toBe(
      "https://assets.clashk.ing/leagues/builder-base/ruby_league_2.png"
    );
    expect(builderLeagueImageUrl("Diamond")).toBe(
      "https://assets.clashk.ing/leagues/builder-base/diamond_league.png"
    );
  });

  it("resolves criteria artwork from the stored role value", () => {
    expect(roleCriteriaImageUrl("townhall", "th17")).toContain("/town_hall/level_17.webp");
    expect(roleCriteriaImageUrl("builderhall", "bh10")).toContain("/builder_hall/level_10.webp");
    expect(roleCriteriaImageUrl("builder_league", "Emerald III")).toContain("/emerald_league_3.png");
  });
});
