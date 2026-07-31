import { describe, expect, it } from "vitest";
import { giveawayToFormState } from "./GiveawaysClient";
import type { Giveaway } from "@/lib/api/types/server";

const giveaway: Giveaway = {
  id: "giveaway-1",
  serverId: "123",
  prize: "Gold pass",
  channelId: "456",
  status: "ongoing",
  startTime: "2026-07-24T12:00:00Z",
  endTime: "2026-07-25T12:00:00Z",
  winners: 2,
  mentions: ["role-1"],
  textAboveEmbed: "Enter now",
  textInEmbed: "Click below",
  textOnEnd: "Finished",
  imageUrl: "https://cdn.example/giveaway.png",
  profilePictureRequired: true,
  cocAccountRequired: true,
  rolesMode: "allow",
  roles: ["role-2"],
  boosters: [{ value: 2, roles: ["role-3"] }],
  entryCount: 5,
  updated: true,
  messageId: "message-1",
  winnersList: [],
  eventPending: "giveaway_update",
  eventPendingAt: "2026-07-24T12:01:00Z",
  createdAt: "2026-07-24T11:00:00Z",
  updatedAt: "2026-07-24T12:01:00Z",
};

describe("giveawayToFormState", () => {
  it("preserves all visible editable behavior from camelCase responses", () => {
    const form = giveawayToFormState(giveaway, false, () => "booster-1");

    expect(form).toEqual(expect.objectContaining({
      prize: giveaway.prize,
      channelId: giveaway.channelId,
      winners: "2",
      mentions: giveaway.mentions,
      textAbove: giveaway.textAboveEmbed,
      textEmbed: giveaway.textInEmbed,
      textEnd: giveaway.textOnEnd,
      profileRequired: true,
      accountRequired: true,
      rolesMode: "allow",
      roles: giveaway.roles,
      imagePreview: giveaway.imageUrl,
      boosters: [{ id: "booster-1", value: 2, roles: ["role-3"] }],
    }));
    expect(form.startTime).not.toBe("");
    expect(form.endTime).not.toBe("");
  });

  it("duplicates configuration while clearing schedule identity", () => {
    const form = giveawayToFormState(giveaway, true, () => "booster-2");

    expect(form.startTime).toBe("");
    expect(form.endTime).toBe("");
    expect(form.prize).toBe(giveaway.prize);
    expect(form.channelId).toBe(giveaway.channelId);
  });
});
