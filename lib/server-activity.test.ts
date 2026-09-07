import { describe, expect, it } from "vitest";

import type { GuildInfo } from "@/lib/api/types/server";
import { dashboardGuilds, requiresServerReactivation } from "./server-activity";

const guild = (id: string, name: string, hasBot: boolean): GuildInfo => ({
  id,
  name,
  icon: null,
  owner: true,
  permissions: "8",
  role: "Owner",
  features: [],
  has_bot: hasBot,
  delegated: false,
  inactive: false,
});

describe("dashboardGuilds", () => {
  it("keeps only bot-present guilds and sorts them by name", () => {
    expect(dashboardGuilds([
      guild("1", "Zulu", true),
      guild("2", "Install elsewhere", false),
      guild("3", "Alpha", true),
    ]).map(({ id }) => id)).toEqual(["3", "1"]);
  });
});

describe("requiresServerReactivation", () => {
  it("requires activation for never-used and previously active guilds", () => {
    expect(requiresServerReactivation({ inactive: true, last_command_at: "2026-01-01T00:00:00Z" })).toBe(true);
    expect(requiresServerReactivation({ inactive: true, last_command_at: undefined })).toBe(true);
    expect(requiresServerReactivation({ inactive: false, last_command_at: "2026-01-01T00:00:00Z" })).toBe(false);
  });
});
