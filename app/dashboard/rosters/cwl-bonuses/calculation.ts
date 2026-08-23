import type { CwlGroupMember, CwlGroupResponse, CwlSeasonItem, CwlStoredWar, CwlWarLeagueStaticItem, CwlWarPlaceholder } from "@/lib/api/types/war";

export interface CwlClanStanding {
  clanTag: string;
  stars: number;
  destruction: number;
  wins: number;
  rank: number;
}

function winner(war: CwlStoredWar): "clan" | "opponent" | null {
  if (war.clan.stars !== war.opponent.stars) return war.clan.stars > war.opponent.stars ? "clan" : "opponent";
  if (war.clan.destructionPercentage !== war.opponent.destructionPercentage) {
    return war.clan.destructionPercentage > war.opponent.destructionPercentage ? "clan" : "opponent";
  }
  return null;
}

function isStoredWar(war: CwlStoredWar | CwlWarPlaceholder): war is CwlStoredWar {
  return "clan" in war && "opponent" in war;
}

export interface CwlPlayerPerformance {
  stars: number;
  attacks: number;
}

export function calculateCwlPlayerPerformance(group: CwlGroupResponse): Record<string, CwlPlayerPerformance> {
  const performance: Record<string, CwlPlayerPerformance> = {};
  for (const war of group.rounds.flatMap((round) => round.warTags)) {
    if (!isStoredWar(war)) continue;
    for (const side of [war.clan, war.opponent]) {
      for (const member of side.members ?? []) {
        const current = performance[member.tag] ?? { stars: 0, attacks: 0 };
        const attacks = member.attacks ?? [];
        current.stars += attacks.reduce((total, attack) => total + attack.stars, 0);
        current.attacks += attacks.length;
        performance[member.tag] = current;
      }
    }
  }
  return performance;
}

export function sortCwlMembersByPerformance(
  members: CwlGroupMember[],
  performance: Record<string, CwlPlayerPerformance>,
): CwlGroupMember[] {
  return [...members].sort((left, right) =>
    (performance[right.tag]?.stars ?? 0) - (performance[left.tag]?.stars ?? 0)
    || right.townHallLevel - left.townHallLevel
    || left.name.localeCompare(right.name),
  );
}

export function calculateCwlStandings(group: CwlGroupResponse): { complete: boolean; items: CwlClanStanding[] } {
  const wars = group.rounds
    .flatMap((round) => round.warTags)
    .filter((war) => war.tag && war.tag !== "#0");
  const complete = group.state === "ended" && wars.length > 0 && wars.every((war) =>
    isStoredWar(war) && (war.state === "warEnded" || war.state === "ended"),
  );
  const totals = new Map(group.clans.map((clan) => [clan.tag, { clanTag: clan.tag, stars: 0, destruction: 0, wins: 0, rank: 0 }]));

  for (const war of wars) {
    if (!isStoredWar(war) || (war.state !== "warEnded" && war.state !== "ended")) continue;
    const result = winner(war);
    for (const [side, opponent] of [[war.clan, false], [war.opponent, true]] as const) {
      const standing = totals.get(side.tag) ?? { clanTag: side.tag, stars: 0, destruction: 0, wins: 0, rank: 0 };
      const won = result === (opponent ? "opponent" : "clan");
      standing.stars += side.stars + (won ? 10 : 0);
      standing.destruction += side.destructionPercentage;
      if (won) standing.wins += 1;
      totals.set(side.tag, standing);
    }
  }

  const items = [...totals.values()].sort((left, right) => right.stars - left.stars || right.destruction - left.destruction);
  items.forEach((item, index) => {
    const prior = items[index - 1];
    item.rank = prior && prior.stars === item.stars && prior.destruction === item.destruction ? prior.rank : index + 1;
  });
  return { complete, items };
}

export function calculateCwlRewards(rule: CwlWarLeagueStaticItem, standing: CwlClanStanding, warSize: number) {
  const baseSlots = rule.cwl_medals.minimum_bonus_amount * (warSize === 30 ? 2 : 1);
  return {
    bonusSlots: baseSlots + standing.wins,
    bonusMedals: rule.cwl_medals.bonus_reward,
    placementMedals: Math.max(0, rule.cwl_medals.first_place - (standing.rank - 1) * rule.cwl_medals.position_medal_diff),
  };
}

export type CwlLeagueMovement = "promoted" | "demoted" | "unchanged";

export function resolveCwlLeagueMovement(
  rule: CwlWarLeagueStaticItem | undefined,
  rank: number | undefined,
): CwlLeagueMovement {
  if (!rule || !rank) return "unchanged";
  if ((rule.promotions ?? 0) > 0 && rank <= (rule.promotions ?? 0)) return "promoted";
  if ((rule.demotions ?? 0) > 0 && rank > 8 - (rule.demotions ?? 0)) return "demoted";
  return "unchanged";
}

export function resolveCwlWarSize(group: CwlGroupResponse | undefined, storedWarSize: number | null | undefined): number | undefined {
  if (storedWarSize) return storedWarSize;
  for (const round of group?.rounds ?? []) {
    for (const war of round.warTags) {
      if (isStoredWar(war) && war.teamSize) return war.teamSize;
    }
  }
  return undefined;
}

export function selectableCwlSeasons(items: CwlSeasonItem[]): CwlSeasonItem[] {
  return items.filter((item) => item.state !== "inWar");
}
