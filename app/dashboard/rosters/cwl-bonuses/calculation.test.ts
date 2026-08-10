import { describe, expect, it } from "vitest";
import { calculateCwlPlayerPerformance, calculateCwlRewards, calculateCwlStandings, resolveCwlLeagueMovement, resolveCwlWarSize, selectableCwlSeasons, sortCwlMembersByPerformance } from "./calculation";
import type { CwlGroupResponse, CwlWarLeagueStaticItem } from "@/lib/api/types/war";

describe("CWL bonus calculation", () => {
  it("adds ten stars to each war winner and leaves exact ties tied", () => {
    const group = {
      season: "2026-07", state: "ended", warLeague: null,
      clans: ["#A", "#B", "#C"].map((tag) => ({ tag, name: tag, clanLevel: 1, badgeUrls: {}, members: [] })),
      rounds: [{ warTags: [
        { tag: "#W1", season: "2026-07", state: "warEnded", teamSize: 15, clan: { tag: "#A", name: "A", stars: 30, destructionPercentage: 90 }, opponent: { tag: "#B", name: "B", stars: 29, destructionPercentage: 99 } },
      ] }, { warTags: [
        { tag: "#W2", season: "2026-07", state: "warEnded", teamSize: 15, clan: { tag: "#B", name: "B", stars: 30, destructionPercentage: 90 }, opponent: { tag: "#C", name: "C", stars: 30, destructionPercentage: 90 } },
      ] }],
    } satisfies CwlGroupResponse;
    const result = calculateCwlStandings(group);
    expect(result.complete).toBe(true);
    expect(result.items.find((item) => item.clanTag === "#A")).toMatchObject({ stars: 40, wins: 1, rank: 2 });
    expect(result.items.find((item) => item.clanTag === "#B")).toMatchObject({ stars: 59, wins: 0, rank: 1 });
    expect(result.items.find((item) => item.clanTag === "#C")).toMatchObject({ stars: 30, wins: 0 });
  });

  it("stays incomplete when a round contains a missing-war placeholder", () => {
    const group = {
      season: "2026-07", state: "ended", warLeague: null,
      clans: ["#A", "#B"].map((tag) => ({ tag, name: tag, clanLevel: 1, badgeUrls: {}, members: [] })),
      rounds: [{ warTags: [
        { tag: "#W1", season: "2026-07", state: "warEnded", teamSize: 15, clan: { tag: "#A", name: "A", stars: 30, destructionPercentage: 90 }, opponent: { tag: "#B", name: "B", stars: 29, destructionPercentage: 99 } },
        { tag: "#MISSING" },
      ],
      }],
    } satisfies CwlGroupResponse;
    const result = calculateCwlStandings(group);
    expect(result.complete).toBe(false);
    expect(result.items.find((item) => item.clanTag === "#A")).toMatchObject({ stars: 40, wins: 1, rank: 1 });
  });

  it("doubles the base slots for 30v30 and snapshots bonus medals", () => {
    const rule = { cwl_medals: { minimum_bonus_amount: 3, bonus_reward: 85, first_place: 100, position_medal_diff: 4 } } as CwlWarLeagueStaticItem;
    expect(calculateCwlRewards(rule, { clanTag: "#A", stars: 0, destruction: 0, wins: 4, rank: 2 }, 30)).toEqual({ bonusSlots: 10, bonusMedals: 85, placementMedals: 96 });
  });

  it("falls back to a stored war when legacy season metadata has no war size", () => {
    const group = {
      season: "2026-07", state: "ended", warLeague: null, clans: [],
      rounds: [{ warTags: [
        { tag: "#W1", season: "2026-07", state: "warEnded", teamSize: 15, clan: { tag: "#A", name: "A", stars: 0, destructionPercentage: 0 }, opponent: { tag: "#B", name: "B", stars: 0, destructionPercentage: 0 } },
      ] }],
    } satisfies CwlGroupResponse;
    expect(resolveCwlWarSize(group, null)).toBe(15);
    expect(resolveCwlWarSize(group, 30)).toBe(30);
  });

  it("removes active wars from the season choices", () => {
    const seasons = [
      { season: "2026-08", state: "inWar", warSize: 15, warLeague: null },
      { season: "2026-07", state: "ended", warSize: 15, warLeague: null },
    ];
    expect(selectableCwlSeasons(seasons)).toEqual([seasons[1]]);
  });

  it("maps final rank to promotion, demotion, or unchanged", () => {
    const rule = { promotions: 2, demotions: 1 } as CwlWarLeagueStaticItem;
    expect(resolveCwlLeagueMovement(rule, 2)).toBe("promoted");
    expect(resolveCwlLeagueMovement(rule, 4)).toBe("unchanged");
    expect(resolveCwlLeagueMovement(rule, 8)).toBe("demoted");
    expect(resolveCwlLeagueMovement(undefined, undefined)).toBe("unchanged");
  });

  it("aggregates player stars and attacks across both stored war sides", () => {
    const attack = (attackerTag: string, stars: number) => ({
      attackerTag, defenderTag: "#D", stars, destructionPercentage: 100, order: 1, duration: 30,
    });
    const member = (tag: string, attacks: ReturnType<typeof attack>[]) => ({
      tag, name: tag, townhallLevel: 17, mapPosition: 1, attacks,
    });
    const group = {
      season: "2026-07", state: "ended", warLeague: null, clans: [],
      rounds: [{ warTags: [{
        tag: "#W1", season: "2026-07", state: "warEnded", teamSize: 15,
        clan: { tag: "#A", name: "A", stars: 3, destructionPercentage: 100, members: [member("#ONE", [attack("#ONE", 3)])] },
        opponent: { tag: "#B", name: "B", stars: 2, destructionPercentage: 90, members: [member("#TWO", [attack("#TWO", 2)])] },
      }] }, { warTags: [{
        tag: "#W2", season: "2026-07", state: "warEnded", teamSize: 15,
        clan: { tag: "#A", name: "A", stars: 2, destructionPercentage: 90, members: [member("#ONE", [attack("#ONE", 2)])] },
        opponent: { tag: "#C", name: "C", stars: 0, destructionPercentage: 0, members: [] },
      }] }],
    } satisfies CwlGroupResponse;

    expect(calculateCwlPlayerPerformance(group)).toEqual({
      "#ONE": { stars: 5, attacks: 2 },
      "#TWO": { stars: 2, attacks: 1 },
    });
  });

  it("sorts by stars, then Town Hall, then player name", () => {
    const members = [
      { tag: "#A", name: "Zulu", townHallLevel: 16 },
      { tag: "#B", name: "Beta", townHallLevel: 17 },
      { tag: "#C", name: "Alpha", townHallLevel: 17 },
      { tag: "#D", name: "Delta", townHallLevel: 15 },
    ];
    const performance = {
      "#A": { stars: 12, attacks: 7 },
      "#B": { stars: 12, attacks: 7 },
      "#C": { stars: 12, attacks: 6 },
      "#D": { stars: 15, attacks: 7 },
    };
    expect(sortCwlMembersByPerformance(members, performance).map((member) => member.tag)).toEqual(["#D", "#C", "#B", "#A"]);
  });
});
