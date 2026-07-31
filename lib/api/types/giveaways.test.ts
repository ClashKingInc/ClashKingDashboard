import { describe, expect, it } from "vitest";
import { isGiveaway, isGiveawaysResponse } from "./server";

const giveaway = {
  id: "giveaway-1",
  serverId: "123",
  prize: "Gold pass",
  channelId: "456",
  status: "ongoing" as const,
  startTime: "2026-07-24T12:00:00Z",
  endTime: "2026-07-25T12:00:00Z",
  winners: 1,
  mentions: ["789"],
  textAboveEmbed: "Enter now",
  textInEmbed: "Click the button",
  textOnEnd: "Thanks",
  imageUrl: null,
  profilePictureRequired: true,
  cocAccountRequired: false,
  rolesMode: "allow" as const,
  roles: ["role-1"],
  boosters: [{ value: 2, roles: ["role-1"] }],
  entryCount: 7,
  updated: false,
  messageId: "message-1",
  winnersList: [{
    userId: "user-1",
    username: "Winner",
    avatarUrl: null,
    status: "winner",
    timestamp: "2026-07-25T12:00:00Z",
    reason: null,
  }],
  eventPending: null,
  eventPendingAt: null,
  createdAt: "2026-07-24T11:00:00Z",
  updatedAt: "2026-07-24T11:00:00Z",
};

describe("giveaway response contract", () => {
  it("accepts the exact camelCase giveaway collection", () => {
    expect(isGiveaway(giveaway)).toBe(true);
    expect(isGiveawaysResponse({
      ongoing: [giveaway],
      upcoming: [],
      ended: [],
      total: 1,
    })).toBe(true);
  });

  it("rejects stale snake_case and removed data wrappers", () => {
    const stale = {
      ...giveaway,
      channelId: undefined,
      channel_id: "456",
      entryCount: undefined,
      entry_count: 7,
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
