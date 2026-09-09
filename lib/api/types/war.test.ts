import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { CwlWarLeaguesStaticResponse } from "./war";

const decode = Schema.decodeUnknownSync(CwlWarLeaguesStaticResponse);
const league = {
  _id: 48000001, name: "Bronze League III", "15v15_only": false,
  cwl_medals: { first_place: 46, position_medal_diff: 2, bonus_reward: 42, minimum_bonus_amount: 1 },
  promotions: 3, demotions: 0,
};

describe("CWL static medal data", () => {
  it("validates the Assets generator's response before bonus calculations", () => {
    expect(decode({ items: [league] }).items[0]).toEqual(league);
  });

  it("rejects malformed nested medal numbers and alternate envelopes", () => {
    expect(() => decode({ items: [{ ...league, cwl_medals: { ...league.cwl_medals, bonus_reward: "42" } }] })).toThrow();
    expect(() => decode({ data: [league] })).toThrow();
  });
});
