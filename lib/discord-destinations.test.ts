import { describe, expect, it } from "vitest";

import {
  destinationNeedsThread,
  isDestinationValid,
  normalizeDestinationChannels,
  normalizeDestinationThreads,
} from "./discord-destinations";

const channels = normalizeDestinationChannels({
  channels: [
    { id: 1, name: "general", type: 0 },
    { id: 2, name: "announcements", type: 5 },
    { id: 3, name: "reminders", type: 15 },
    { id: 4, name: "voice", type: 2 },
  ],
});

const threads = normalizeDestinationThreads({
  threads: [
    { id: 10, name: "general thread", parent_channel_id: 1 },
    { id: 30, name: "forum post", parent_channel_id: 3 },
  ],
});

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
