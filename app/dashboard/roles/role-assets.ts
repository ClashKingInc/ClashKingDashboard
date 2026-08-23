import type { RoleType } from "@/lib/api/types/roles";
import { clashKingAssets, playerLeagueImageUrl, townHallImageUrl } from "@/lib/theme";

const ROMAN_TIERS: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };

export function parseRoleLevel(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const level = Number.parseInt(match[0], 10);
  return level > 0 ? level : null;
}

export function builderHallImageUrl(level: number): string {
  return `${clashKingAssets.baseUrl}/buildings/builder-base/builder_hall/level_${level}.webp`;
}

export function builderLeagueImageUrl(name: string): string {
  const normalized = name.trim().toLowerCase();
  const tier = normalized.match(/\s+(i|ii|iii|iv|v|\d+)$/);
  const source = (tier ? normalized.slice(0, tier.index) : normalized).replace(/\s+league$/, "");
  const slug = source.replaceAll(" ", "_").replaceAll(".", "");
  const tierNumber = tier ? (ROMAN_TIERS[tier[1]] ?? Number(tier[1])) : null;
  const filename = tierNumber ? `${slug}_league_${tierNumber}` : `${slug}_league`;
  return `${clashKingAssets.baseUrl}/leagues/builder-base/${filename}.png`;
}

export function roleTypeImageUrl(type: RoleType, townHallMax: number, builderHallMax: number): string {
  switch (type) {
    case "townhall": return townHallImageUrl(townHallMax);
    case "league": return playerLeagueImageUrl("Legend League");
    case "builderhall": return builderHallImageUrl(builderHallMax);
    case "builder_league": return builderLeagueImageUrl("Diamond");
    default: return clashKingAssets.logos.crownRed;
  }
}

export function roleCriteriaImageUrl(type: RoleType, value: unknown): string | null {
  if (type === "townhall") {
    const level = parseRoleLevel(value);
    return level ? townHallImageUrl(level) : null;
  }
  if (type === "builderhall") {
    const level = parseRoleLevel(value);
    return level ? builderHallImageUrl(level) : null;
  }
  if (type === "league" && typeof value === "string" && value.trim()) return playerLeagueImageUrl(value);
  if (type === "builder_league" && typeof value === "string" && value.trim()) return builderLeagueImageUrl(value);
  return null;
}
