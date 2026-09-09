import {
  ArmyHash,
  ArmySearchEndpoint,
  LeagueHitRateHistoryEndpoint,
  LeagueTierStatisticsEndpoint,
  LegendBattlelogEndpoint,
  PlayerLeaderboardResponse,
  RankedBattlelogEndpoint,
  RankedBattlelogResponse,
  StatsCwlEndpoint,
  StatsRankedEndpoint,
  StatsWarEndpoint,
  endpoints,
} from "@clashking/api-contracts";
import { Schema } from "effect";

describe("coordinated API contracts", () => {
  it("keeps homeActivity on its body-based POST route", () => {
    expect(endpoints.homeActivity).toMatchObject({ method: "POST", path: "/v2/home/activity", bodyMode: "json" });
  });

  it.each([
    ["rankedBattlelog", RankedBattlelogEndpoint, "/v2/player/:playerTag/ranked/:seasonId/battlelog"],
    ["legendBattlelog", LegendBattlelogEndpoint, "/v2/player/:playerTag/legend/:day/battlelog"],
    ["armySearch", ArmySearchEndpoint, "/v2/stats/armies"],
    ["statsArmies", ArmySearchEndpoint, "/v2/stats/armies"],
    ["statsRanked", StatsRankedEndpoint, "/v2/stats/ranked"],
    ["statsWar", StatsWarEndpoint, "/v2/stats/war"],
    ["statsCwl", StatsCwlEndpoint, "/v2/stats/cwl"],
    ["leagueHitRateHistory", LeagueHitRateHistoryEndpoint, "/v2/stats/league/hit-rates"],
    ["leagueTierStatistics", LeagueTierStatisticsEndpoint, "/v2/stats/league/tournaments/:seasonId/tiers/:leagueTierId"],
  ] as const)("keeps %s on its query-based GET route", (name, endpoint, path) => {
    expect(endpoints[name]).toBe(endpoint);
    expect(endpoint).toMatchObject({ method: "GET", path, bodyMode: "none" });
  });

  it("uses camelCase query fields for retained statistics reads", () => {
    const ranked = Schema.decodeUnknownSync(StatsRankedEndpoint.query)({
      startDate: "2026-09-01",
      endDate: "2026-09-07",
      townHallLevel: 18,
      leagueTierId: 105000032,
    });
    expect(ranked).toMatchObject({ townHallLevel: 18, leagueTierId: 105000032 });
    expect(() => Schema.decodeUnknownSync(StatsRankedEndpoint.query)({
      townhall_level: 18,
      ranked_league_tier_id: 105000032,
    })).toThrow();
  });

  it("does not expose the removed generic item statistics endpoint", () => {
    expect(endpoints).not.toHaveProperty("statsItems");
  });

  it("accepts the final Legend army discovery query", () => {
    const query = Schema.decodeUnknownSync(ArmySearchEndpoint.query)({
      "time[after]": "2026-09-07T00:00:00.000Z",
      "time[before]": "2026-09-08T00:00:00.000Z",
      heroIds: "1,2",
      equipmentIds: "3,4",
      minimumAttacks: 100,
      minimumPlayers: 20,
      minimumTripleRate: 0.5,
      sort: "tripleRate",
      direction: "desc",
      limit: 25,
    });

    expect(query).toMatchObject({ heroIds: "1,2", minimumAttacks: 100, sort: "tripleRate", direction: "desc" });
  });

  it("accepts only lowercase 64-hex ArmyHash v2 values", () => {
    const hash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    expect(Schema.decodeUnknownSync(ArmyHash)(hash)).toBe(hash);
    expect(() => Schema.decodeUnknownSync(ArmyHash)(hash.toUpperCase())).toThrow();
    expect(() => Schema.decodeUnknownSync(ArmyHash)("army-1")).toThrow();
  });

  it("decodes camelCase Ranked battles, completeness metadata, and automatic defenses", () => {
    const battle = {
      time: "2026-09-07T12:00:00.000Z",
      duration: 141,
      townHallLevel: 17,
      opponent: { tag: "#DEFENDER", name: "Defender", townHallLevel: 17 },
      stars: 3,
      destructionPercentage: 100,
      lootedResources: { gold: 1_000_000, elixir: 900_000, darkElixir: 8_000 },
      armyHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      shareCode: "u1x10-s1x2",
      trophies: 40,
    };
    const response = Schema.decodeUnknownSync(RankedBattlelogResponse)({
      tag: "#PLAYER",
      seasonId: "2026-09",
      leagueGroupId: "#GROUP",
      league: { id: 1, name: "Gold League" },
      registeredAttacks: 7,
      registeredDefenses: 8,
      maxBattles: 8,
      attackTrophies: 280,
      defenseTrophies: -120,
      trophies: 160,
      attacks: [battle],
      defenses: [battle, { trophies: -20, automatic: true }],
    });

    expect(response.attacks[0]).toMatchObject({
      time: battle.time,
      townHallLevel: 17,
    });
    expect(response).toMatchObject({ leagueGroupId: "#GROUP", maxBattles: 8, registeredAttacks: 7 });
    expect(response.defenses[1]).toEqual({ trophies: -20, automatic: true });
  });

  it("requires leagueGroupId on realtime Town Hall and league leaderboard players", () => {
    const player = {
      rank: 1,
      tag: "#PLAYER",
      name: "Player",
      leagueGroupId: "#GROUP",
      townhall_level: 17,
      trophies: 5_500,
    };
    const response = Schema.decodeUnknownSync(PlayerLeaderboardResponse)({ items: [player], count: 1 });

    expect(response.items[0]?.leagueGroupId).toBe("#GROUP");
    expect(() => {
      const { leagueGroupId: _leagueGroupId, ...missingGroup } = player;
      Schema.decodeUnknownSync(PlayerLeaderboardResponse)({ items: [missingGroup], count: 1 });
    }).toThrow();
  });
});
