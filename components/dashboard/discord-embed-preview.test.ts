import { describe, expect, it } from "vitest";

import {
  discordCustomEmojiUrl,
  resolveDiscordChannelUrl,
} from "@/components/dashboard/discord-embed-preview";

const mentionContext = {
  channels: [
    { id: "1262451682193707108", name: "nos-clans" },
    { id: "1262452939566481418", name: "ouvrir-un-ticket" },
  ],
};

describe("resolveDiscordChannelUrl", () => {
  it("resolves a current-server channel link to its Discord channel name", () => {
    const url = "https://discord.com/channels/684667214347108386/1262451682193707108";

    expect(resolveDiscordChannelUrl(url, 0, mentionContext)).toEqual({
      href: url,
      channelId: "1262451682193707108",
      channelName: "nos-clans",
      length: url.length,
    });
  });

  it("keeps a message link clickable while naming its channel", () => {
    const url = "https://discord.com/channels/684667214347108386/1262452939566481418/1400000000000000000";

    expect(resolveDiscordChannelUrl(url, 0, mentionContext)).toMatchObject({
      href: url,
      channelName: "ouvrir-un-ticket",
      length: url.length,
    });
  });

  it("does not transform unknown channels or lookalike hosts", () => {
    expect(resolveDiscordChannelUrl(
      "https://discord.com/channels/684667214347108386/999999999999999999",
      0,
      mentionContext,
    )).toBeNull();
    expect(resolveDiscordChannelUrl(
      "https://discord.example/channels/684667214347108386/1262451682193707108",
      0,
      mentionContext,
    )).toBeNull();
  });
});

describe("discordCustomEmojiUrl", () => {
  it("uses Discord's static and animated emoji assets", () => {
    expect(discordCustomEmojiUrl("722088222766923847", false)).toBe(
      "https://cdn.discordapp.com/emojis/722088222766923847.webp?size=48&quality=lossless",
    );
    expect(discordCustomEmojiUrl("742256196295065661", true)).toBe(
      "https://cdn.discordapp.com/emojis/742256196295065661.gif?size=48&quality=lossless",
    );
  });

  it("rejects values that cannot be Discord emoji IDs", () => {
    expect(discordCustomEmojiUrl("not-an-id", false)).toBeNull();
  });
});
