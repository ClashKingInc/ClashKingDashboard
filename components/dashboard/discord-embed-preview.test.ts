import { describe, expect, it } from "vitest";

import { resolveDiscordChannelUrl } from "@/components/dashboard/discord-embed-preview";

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
