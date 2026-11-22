const ASSET_BASE_URL = "https://assets.clashk.ing";
const CLAN_BADGE_BASE_URL = "https://badges.clashk.ing";

export type ClanBadgeSize = "small" | "medium" | "large";
export type ClanBadgeFormat = "png" | "avif";

const BADGE_SIZE_ALIASES: Readonly<Record<string, ClanBadgeSize>> = {
  small: "small",
  medium: "medium",
  large: "large",
  "64": "small",
  "128": "medium",
  "256": "medium",
  "512": "large",
};

export function normalizeClanBadgeSize(value: string | null | undefined, fallback: ClanBadgeSize = "medium"): ClanBadgeSize {
  if (!value) return fallback;
  return BADGE_SIZE_ALIASES[value] ?? fallback;
}

export function clanBadgeUrl(tag: string, size: ClanBadgeSize = "medium", format: ClanBadgeFormat = "png"): string {
  const trimmed = tag.trim();
  const normalized = (trimmed.startsWith("#") ? trimmed.slice(1) : trimmed).toUpperCase();
  return normalized ? `${CLAN_BADGE_BASE_URL}/${encodeURIComponent(normalized)}.${format}?size=${size}` : "";
}

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

/** Normalize only our badge service; external artwork URLs remain untouched. */
export function clanBadgeSources(src: string): { png: string; avif: string } | null {
  let url: URL;
  try { url = new URL(src); } catch { return null; }
  if (url.origin !== CLAN_BADGE_BASE_URL) return null;
  let tag: string;
  try { tag = decodeURIComponent(url.pathname.slice(1)).replace(/\.(png|avif)$/i, ""); } catch { return null; }
  const size = normalizeClanBadgeSize(url.searchParams.get("size"), "medium");
  return { png: clanBadgeUrl(tag, size), avif: clanBadgeUrl(tag, size, "avif") };
}
