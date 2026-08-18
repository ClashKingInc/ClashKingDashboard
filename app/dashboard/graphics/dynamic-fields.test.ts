import { describe, expect, it } from "vitest";

import {
  findDynamicField,
  getDynamicFieldsForDocument,
  getDynamicFieldsForKind,
  mapClanApiData,
  mapWarApiData,
} from "./dynamic-fields";

function keys(fields: ReturnType<typeof getDynamicFieldsForKind>): string[] {
  return fields.map((field) => field.key);
}

describe("graphic dynamic field catalogs", () => {
  it("offers only practical player profile fields", () => {
    const playerKeys = keys(getDynamicFieldsForKind("player"));

    expect(playerKeys).toEqual(expect.arrayContaining([
      "player_name",
      "player_townhall",
      "player_best_trophies",
      "player_attack_wins",
      "player_experience_level",
      "player_league_icon",
      "player_clan_name",
      "player_clan_tag",
      "player_clan_badge",
    ]));
    expect(playerKeys).not.toContain("player_clan");
    expect(playerKeys.some((key) => key.startsWith("discord_"))).toBe(false);
    expect(playerKeys.some((key) => /troop|hero|achievement|_id$/.test(key))).toBe(false);
  });

  it("keeps clan fields scalar and separate from player and war fields", () => {
    const clanKeys = keys(getDynamicFieldsForKind("clan"));

    expect(clanKeys).toEqual(expect.arrayContaining([
      "clan_name",
      "clan_description",
      "clan_members",
      "clan_war_league",
      "clan_capital_hall",
      "clan_badge",
    ]));
    expect(clanKeys.some((key) => key.startsWith("clan_member_"))).toBe(false);
    expect(clanKeys.some((key) => key.startsWith("player_") || key.startsWith("war_"))).toBe(false);
  });

  it("bounds war member slots to the document's supported war size", () => {
    const warKeys = getDynamicFieldsForDocument({ kind: "war", warSize: 3 }).map((field) => field.key);

    expect(warKeys).toEqual(expect.arrayContaining([
      "war_clan_name",
      "war_opponent_badge",
      "war_clan_member_3_name",
      "war_opponent_member_3_map_position",
    ]));
    expect(warKeys).not.toContain("war_clan_member_4_name");
    expect(warKeys.some((key) => key.startsWith("player_") || /^clan_/.test(key))).toBe(false);
  });

  it("falls back to five member slots for unsupported legacy war sizes", () => {
    const warKeys = getDynamicFieldsForDocument({ kind: "war", warSize: 30 }).map((field) => field.key);
    expect(warKeys).toContain("war_clan_member_5_name");
    expect(warKeys).not.toContain("war_clan_member_6_name");
  });

  it("keeps the old player clan binding resolvable without exposing it", () => {
    expect(findDynamicField("player_clan")?.placeholder).toBe("ClashKing");
    expect(keys(getDynamicFieldsForKind("player"))).not.toContain("player_clan");
  });

  it("reads the Capital Hall from the Capital Peak district", () => {
    expect(mapClanApiData({
      clanCapital: {
        districts: [
          { name: "Capital Peak", districtHallLevel: 10 },
          { name: "Barbarian Camp", districtHallLevel: 5 },
        ],
      },
    }).clan_capital_hall).toBe(10);
  });

  it("defaults war member bindings to the supported 5v5 size", () => {
    const members = Array.from({ length: 10 }, (_, index) => ({ name: `Player ${index + 1}` }));
    const bindings = mapWarApiData({ clan: { members }, opponent: { members } });

    expect(bindings.war_clan_member_5_name).toBe("Player 5");
    expect(bindings.war_clan_member_6_name).toBeUndefined();
  });
});
