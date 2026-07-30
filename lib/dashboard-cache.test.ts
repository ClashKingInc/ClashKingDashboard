import { describe, expect, it } from "vitest";

import {
  dashboardCacheKeys,
  normalizeAllChannelsPayload,
  normalizeChannelsPayload,
  normalizeDiscordRolesPayload,
  normalizeServerSettingsPayload,
} from "./dashboard-cache";

describe("dashboardCacheKeys", () => {
  it("creates namespaced keys for shared dashboard resources", () => {
    expect(dashboardCacheKeys.channels("123")).toBe("dashboard-server-channels-123");
    expect(dashboardCacheKeys.discordRoles("123")).toBe("dashboard-discord-roles-123");
    expect(dashboardCacheKeys.settings("123")).toBe("dashboard-server-settings-123");
    expect(dashboardCacheKeys.serverRoles("123")).toBe("dashboard-server-roles-123");
  });
});

describe("dashboard cache payload normalization", () => {
  it("normalizes raw or wrapped channels payloads", () => {
    const channels = [{ id: "1", name: "general", type: 0 }];
    const normalizedChannels = [{ id: "1", name: "general", type: "0" }];

    expect(normalizeChannelsPayload(channels)).toEqual(normalizedChannels);
    expect(normalizeChannelsPayload({ data: channels })).toEqual(normalizedChannels);
    expect(normalizeChannelsPayload({ channels })).toEqual(normalizedChannels);
    expect(normalizeChannelsPayload(undefined)).toEqual([]);
  });

  it("keeps only text and announcement channels in channel selectors", () => {
    const channels = [
      { id: "1", name: "general", type: 0 },
      { id: "2", name: "announcements", type: "news" },
      { id: "3", name: "Staff", type: "category" },
      { id: "4", name: "Lobby", type: 2 },
    ];

    expect(normalizeChannelsPayload(channels).map((channel) => channel.id)).toEqual(["1", "2"]);
    expect(normalizeAllChannelsPayload(channels).map((channel) => channel.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("normalizes raw or wrapped discord roles payloads", () => {
    const roles = [
      { id: "1", name: "Leader", color: 123, position: 3, managed: false, mentionable: true },
      { id: "2", name: "ClashKing", color: 0, position: 2, managed: true, mentionable: false },
      { id: "3", name: "@everyone", color: 0, position: 0, managed: false, mentionable: false },
    ];
    const selectableRoles = [roles[0]];

    expect(normalizeDiscordRolesPayload({ roles, count: 3, server_id: "1" })).toEqual(selectableRoles);
    expect(normalizeDiscordRolesPayload({ data: { roles, count: 3, server_id: "1" } })).toEqual(selectableRoles);
    expect(normalizeDiscordRolesPayload(null)).toEqual([]);
  });

  it("normalizes raw or wrapped settings payloads", () => {
    const settings = { server: "1", embed_color: 12345 };

    expect(normalizeServerSettingsPayload(settings)).toEqual(settings);
    expect(normalizeServerSettingsPayload({ data: settings })).toEqual(settings);
    expect(normalizeServerSettingsPayload("nope")).toBeNull();
  });
});
