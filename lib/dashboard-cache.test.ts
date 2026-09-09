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
  it("accepts only the canonical channel array and rejects numeric IDs", () => {
    const channels = [{ id: "1", name: "general", type: "text" }];
    const normalizedChannels = [{ id: "1", name: "general", type: "text" }];

    expect(normalizeChannelsPayload(channels)).toEqual(normalizedChannels);
    expect(() => normalizeChannelsPayload({ data: channels })).toThrow();
    expect(() => normalizeChannelsPayload({ channels })).toThrow();
    expect(() => normalizeChannelsPayload([{ id: 1, name: "general", type: "0" }])).toThrow();
    expect(() => normalizeChannelsPayload(undefined)).toThrow();
  });

  it("keeps only text and announcement channels in channel selectors", () => {
    const channels = [
      { id: "1", name: "general", type: "text" },
      { id: "2", name: "announcements", type: "news" },
      { id: "3", name: "Staff", type: "category" },
      { id: "4", name: "Forum", type: "forum" },
    ];

    expect(normalizeChannelsPayload(channels).map((channel) => channel.id)).toEqual(["1", "2"]);
    expect(normalizeAllChannelsPayload(channels).map((channel) => channel.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("filters canonical roles and rejects extra envelopes", () => {
    const roles = [
      { id: "1", name: "Leader", color: 123, position: 3, managed: false, mentionable: true },
      { id: "2", name: "ClashKing", color: 0, position: 2, managed: true, mentionable: false },
      { id: "3", name: "@everyone", color: 0, position: 0, managed: false, mentionable: false },
    ];
    const selectableRoles = [roles[0]];

    expect(normalizeDiscordRolesPayload({ roles, count: 3, server_id: "1" })).toEqual(selectableRoles);
    expect(() => normalizeDiscordRolesPayload({ data: { roles, count: 3, server_id: "1" } })).toThrow();
    expect(() => normalizeDiscordRolesPayload(null)).toThrow();
  });

  it("normalizes canonical settings and rejects extra envelopes", () => {
    const settings = { server_id: "1", server: "1", name: "Guild", countdowns: {}, server_roles: [], require_api_token_when_linking: false };

    expect(normalizeServerSettingsPayload(settings)).toEqual(settings);
    expect(() => normalizeServerSettingsPayload({ data: settings })).toThrow();
    expect(() => normalizeServerSettingsPayload("nope")).toThrow();
  });

  it("normalizes the API's decimal embed color string to a number", () => {
    expect(normalizeServerSettingsPayload({ server_id: "1", server: "1", name: "Guild", countdowns: {}, server_roles: [], require_api_token_when_linking: false, embed_color: "2829617" }))
      .toMatchObject({ server: "1", embed_color: 2829617 });
  });
});
