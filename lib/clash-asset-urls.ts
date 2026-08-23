const ASSET_BASE_URL = "https://assets.clashk.ing";

export function townHallImageUrl(level: number): string {
  return `${ASSET_BASE_URL}/buildings/home-village/town_hall/level_${level}.webp`;
}

export function playerLeagueImageUrl(name: string): string {
  const normalized = name.trim().toLowerCase();
  const tier = normalized.match(/\s+(i|ii|iii|iv|v|\d+)$/);
  const romanTier: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
  const source = tier ? normalized.slice(0, tier.index) : normalized;
  const baseSlug = source.replaceAll(" ", "_").replaceAll(".", "");
  const slug = baseSlug === "legend" ? "legend_league" : baseSlug;
  const tierNumber = tier ? (romanTier[tier[1]] ?? Number(tier[1])) : null;
  const filename = tierNumber ? `${slug}_${tierNumber}` : slug;
  return `${ASSET_BASE_URL}/leagues/league-tier/${filename || "unranked"}.png`;
}
