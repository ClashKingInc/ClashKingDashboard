import type { EndpointResponse, ServerAnalyticsEndpoint } from "@clashking/api-contracts";

export type AnalyticsReport = EndpointResponse<typeof ServerAnalyticsEndpoint>;
export type Metric = keyof AnalyticsReport["totals"];
export type ActivityMetric = Metric | "totalLoot";
export function activityValue(metrics: AnalyticsReport["totals"], metric: ActivityMetric): number {
  return metric === "totalLoot" ? totalLoot(metrics) : metrics[metric];
}
export const metricColors: Record<Metric, string> = {
  gold: "#E8A524", elixir: "#C56FE3", darkElixir: "#8D63D9", attacks: "#026CC2", donated: "#14A37F",
  received: "#2A9FD6", active: "#026CC2", upgrades: "#E85D9E", joins: "#14A37F", leaves: "#E35D4F", capital: "#E56B2F", clanGames: "#E8A524",
};
export const resourceArtwork: Partial<Record<Metric, string>> = {
  gold: "https://assets.clashk.ing/resources/gold.webp", elixir: "https://assets.clashk.ing/resources/elixir.webp",
  darkElixir: "https://assets.clashk.ing/resources/dark_elixir.webp", capital: "https://assets.clashk.ing/resources/capital_gold.webp",
  attacks: "https://assets.clashk.ing/bot/icons/clash_sword.png",
  donated: "https://assets.clashk.ing/bot/icons/clan_castle.png",
  received: "https://assets.clashk.ing/bot/icons/troop.png",
  active: "https://assets.clashk.ing/bot/icons/people.png",
  upgrades: "https://assets.clashk.ing/magic_items/hammer_of_building.webp",
  clanGames: "https://assets.clashk.ing/bot/icons/clan_games.png",
};
export const farmingGroups = {
  loot: ["gold", "elixir", "darkElixir"],
  attacks: ["attacks"],
  donations: ["donated", "received"],
  activity: ["active", "capital", "clanGames", "upgrades"],
} as const satisfies Record<string, readonly Metric[]>;
export function contributorCount(players: AnalyticsReport["players"], metrics: readonly Metric[]) {
  return players.filter(player => metrics.some(metric => player.metrics[metric] > 0)).length;
}
export const utcDate = (date: Date) => date.toISOString().slice(0, 10);
export const nextDay = (day: string) => utcDate(new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000));
export function presetRange(preset: string, now = new Date()) {
  const today = new Date(`${utcDate(now)}T00:00:00Z`), end = nextDay(utcDate(now));
  const start = preset === "month" ? `${utcDate(now).slice(0, 7)}-01`
    : utcDate(new Date(+today - (Number(preset) - 1) * 86_400_000));
  return { start, end };
}
export function comparisonRange(start: string, end: string) {
  const duration = Date.parse(end) - Date.parse(start);
  return {start: utcDate(new Date(Date.parse(start) - duration)), end: start};
}
export function heatmapCells(days: AnalyticsReport["days"]) {
  if (!days.length) return [];
  const offset = (new Date(`${days[0].day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return [...Array.from({length: offset}, () => null), ...days];
}
export function townHallComposition(players: AnalyticsReport["players"]) {
  const counts = new Map<number, number>();
  for (const player of players) if (player.currentMember && player.townHall > 0) counts.set(player.townHall, (counts.get(player.townHall) ?? 0) + 1);
  return [...counts].sort((a,b) => b[0]-a[0]).map(([level,count]) => ({level,count}));
}
export function rankedPlayers(players: AnalyticsReport["players"], metric: ActivityMetric) {
  return [...players].filter(player => activityValue(player.metrics, metric) > 0).sort((a,b) => activityValue(b.metrics, metric)-activityValue(a.metrics, metric) || a.name.localeCompare(b.name));
}
export function cwlLeague(id: number) {
  const index = id - 48000001;
  if (index < 0 || index > 17) return null;
  const names = ["Bronze", "Silver", "Gold", "Crystal", "Master", "Champion"];
  const group = names[Math.floor(index/3)], tier = 3-index%3;
  return { name: `${group} ${["", "I", "II", "III"][tier]}`, artwork: `https://assets.clashk.ing/bot/cwl/War${group}${["", "I", "II", "III"][tier]}.png` };
}
export const totalLoot = (metrics: Pick<AnalyticsReport["totals"], "gold" | "elixir" | "darkElixir">) => metrics.gold + metrics.elixir + metrics.darkElixir;
export const graphNumber = (value: number, locale: string) => new Intl.NumberFormat(locale).format(value);
export const pageWindow = (count: number, requestedPage: number, limit = 10) => {
  const pages = Math.max(1, Math.ceil(count / limit));
  const page = Math.min(pages - 1, Math.max(0, requestedPage));
  return { page, pages, offset: page * limit, limit };
};
