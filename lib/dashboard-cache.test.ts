import { describe, expect, it } from "vitest";

import {
  dashboardCacheKeys,
  normalizeAllRolesPayload,
  normalizeChannelsPayload,
  normalizeDiscordRolesPayload,
  normalizeServerSettingsPayload,
} from "./dashboard-cache";

describe("dashboardCacheKeys", () => {
  it("creates namespaced keys for shared dashboard resources", () => {
    expect(dashboardCacheKeys.channels("123")).toBe("dashboard-server-channels-123");
    expect(dashboardCacheKeys.discordRoles("123")).toBe("dashboard-discord-roles-123");
    expect(dashboardCacheKeys.settings("123")).toBe("dashboard-server-settings-123");
    expect(dashboardCacheKeys.allRoles("123")).toBe("dashboard-all-roles-123");
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

  it("normalizes raw or wrapped discord roles payloads", () => {
    const roles = [{ id: "1", name: "Leader", color: 123 }];

    expect(normalizeDiscordRolesPayload({ roles, count: 1, server_id: "1" })).toEqual(roles);
    expect(normalizeDiscordRolesPayload({ data: { roles, count: 1, server_id: "1" } })).toEqual(roles);
    expect(normalizeDiscordRolesPayload(null)).toEqual([]);
  });

  it("normalizes raw or wrapped settings payloads", () => {
    const settings = { server: "1", embed_color: 12345 };

    expect(normalizeServerSettingsPayload(settings)).toEqual(settings);
    expect(normalizeServerSettingsPayload({ data: settings })).toEqual(settings);
    expect(normalizeServerSettingsPayload("nope")).toBeNull();
  });

  it("normalizes raw or wrapped all roles payloads", () => {
    const payload = {
      server_id: "1",
      roles: {
        townhall: [],
        league: [],
        builderhall: [],
        builder_league: [],
        achievement: [],
        status: [{ id: "1", months: 6 }],
        family_position: [],
      },
      total_count: 1,
    };

    expect(normalizeAllRolesPayload(payload)).toEqual(payload);
    expect(normalizeAllRolesPayload({ data: payload })).toEqual(payload);
    expect(normalizeAllRolesPayload({ data: [] })).toBeNull();
  });
});
