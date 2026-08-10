import { describe, expect, it } from "vitest";
import { isGiveaway, isGiveawaysResponse } from "./server";

const giveaway = {
  id: "giveaway-1",
  serverId: "123",
  prize: "Gold pass",
  status: "ongoing" as const,
  start: "2026-07-24T12:00:00Z",
  end: "2026-07-25T12:00:00Z",
  winners: 1,
  mentions: ["789"],
  textAboveEmbed: "Enter now",
  textInEmbed: "Click the button",
  textOnEnd: "Thanks",
  profilePictureRequired: true,
  cocAccountRequired: false,
  rolesMode: "allow" as const,
  roles: ["role-1"],
  boosters: [{ value: 2, roles: ["role-1"] }],
  entries: ["user-1", "user-1", "user-2"],
  updated: false,
  winnersList: [{
    userId: "user-1",
    username: "Winner",
    avatarUrl: null,
    inServer: true,
    status: "winner",
    timestamp: "2026-07-25T12:00:00Z",
    reason: null,
  }],
  createdAt: "2026-07-24T11:00:00Z",
  updatedAt: "2026-07-24T11:00:00Z",
};

describe("giveaway response contract", () => {
  it("accepts the exact Go API giveaway collection, including omitted optional fields", () => {
    expect(isGiveaway(giveaway)).toBe(true);
    expect(isGiveawaysResponse({
      ongoing: [giveaway],
      upcoming: [],
      ended: [],
      total: 1,
    })).toBe(true);
  });

  it("rejects stale dashboard field names and removed data wrappers", () => {
    const stale = {
      ...giveaway,
      start: undefined,
      end: undefined,
      entries: undefined,
      startTime: giveaway.start,
      endTime: giveaway.end,
      entryCount: giveaway.entries.length,
    };
    expect(isGiveaway(stale)).toBe(false);
    expect(isGiveawaysResponse({
      data: {
        ongoing: [giveaway],
        upcoming: [],
        ended: [],
        total: 1,
      },
    })).toBe(false);
  });
});
