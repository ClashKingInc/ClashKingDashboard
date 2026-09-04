import { describe, expect, it } from "vitest";

import {
  destinationNeedsThread,
  isDestinationValid,
  normalizeDestinationChannels,
  normalizeDestinationThreads,
} from "./discord-destinations";

const channels = normalizeDestinationChannels([
    { id: "1", name: "general", type: "text" },
    { id: "2", name: "announcements", type: "news" },
    { id: "3", name: "reminders", type: "forum" },
    { id: "4", name: "category", type: "category" },
]);

const threads = normalizeDestinationThreads([
    { id: "10", name: "general thread", parent_channel_id: "1", parent_channel_name: "general", archived: false },
    { id: "30", name: "forum post", parent_channel_id: "3", parent_channel_name: "reminders", archived: false },
]);

describe("Discord reminder destinations", () => {
  it("includes text, announcement, and forum parents without broadening to voice", () => {
    expect(channels.map((channel) => channel.id)).toEqual(["1", "2", "3"]);
    expect(destinationNeedsThread("3", channels)).toBe(true);
  });

  it("allows direct or threaded text and announcement destinations", () => {
    expect(isDestinationValid("1", undefined, channels, threads)).toBe(true);
    expect(isDestinationValid("1", "10", channels, threads)).toBe(true);
    expect(isDestinationValid("2", undefined, channels, threads)).toBe(true);
  });

  it("requires a forum post and rejects a thread from another parent", () => {
    expect(isDestinationValid("3", undefined, channels, threads)).toBe(false);
    expect(isDestinationValid("3", "10", channels, threads)).toBe(false);
    expect(isDestinationValid("3", "30", channels, threads)).toBe(true);
  });
});
