import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardEndpoints } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import {
  addRosterMembers,
  clearRosterMembers,
  createGroup,
  deleteRoster,
  deleteGroup,
  fetchAutomations,
  fetchChannels,
  fetchClans,
  fetchGroups,
  fetchMissingMembers,
  fetchServerMembers,
  refreshRoster,
  refreshRosterDiscordIdentity,
  refreshRosterMember,
  removeRosterMember,
  updateGroup,
  updateRoster,
} from "./api";

vi.mock("@/lib/api/shared-client", () => ({ executeSharedEndpoint: vi.fn() }));

const execute = vi.mocked(executeSharedEndpoint);
const roster = {
  id: "roster-1", server_id: "server-1", alias: "Main", roster_type: "clan",
  signup_scope: "clan-only", columns: [], sort: [], members: [], revision: 1,
  created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z",
};

describe("roster endpoint adapters", () => {
  beforeEach(() => execute.mockReset());

  it("uses distinct delete, clear, add, and remove operations", async () => {
    execute.mockResolvedValue({ message: "ok" } as never);

    await deleteRoster("roster-1", "server-1");
    await clearRosterMembers("roster-1", "server-1");
    await addRosterMembers("roster-1", "server-1", ["#ONE", "#TWO"]);
    await removeRosterMember("roster-1", "server-1", "#ONE");

    expect(execute).toHaveBeenNthCalledWith(1, dashboardEndpoints.dashboardDeleteRoster, {
      path: { rosterId: "roster-1" }, query: { server_id: "server-1" }, body: {},
    });
    expect(execute).toHaveBeenNthCalledWith(2, dashboardEndpoints.dashboardDeleteRoster, {
      path: { rosterId: "roster-1" }, query: { server_id: "server-1", members_only: true }, body: {},
    });
    expect(execute).toHaveBeenNthCalledWith(3, dashboardEndpoints.dashboardManageRosterMembers, {
      path: { rosterId: "roster-1" }, query: { server_id: "server-1" },
      body: { add: [{ tag: "#ONE" }, { tag: "#TWO" }] },
    });
    expect(execute).toHaveBeenNthCalledWith(4, dashboardEndpoints.dashboardRemoveRosterMember, {
      path: { rosterId: "roster-1", memberTag: "#ONE" }, query: { server_id: "server-1" }, body: {},
    });
  });

  it("falls back to the canonical roster read when refresh omits the requested roster", async () => {
    execute
      .mockResolvedValueOnce({ refreshed_rosters: [] } as never)
      .mockResolvedValueOnce({ roster } as never);

    await expect(refreshRoster("roster-1", "server-1")).resolves.toMatchObject({ id: "roster-1" });
    expect(execute).toHaveBeenNthCalledWith(2, dashboardEndpoints.dashboardGetRoster, {
      path: { rosterId: "roster-1" }, query: { server_id: "server-1" }, body: {},
    });
  });

  it("returns updated and refreshed roster payloads without an unnecessary follow-up read", async () => {
    execute
      .mockResolvedValueOnce({ roster } as never)
      .mockResolvedValueOnce({ refreshed_rosters: [roster] } as never);

    await expect(updateRoster("roster-1", "server-1", { alias: "Main" })).resolves.toMatchObject({ id: "roster-1" });
    await expect(refreshRoster("roster-1", "server-1")).resolves.toMatchObject({ id: "roster-1" });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("falls back to a read when an accepted update has no roster representation", async () => {
    execute
      .mockResolvedValueOnce({ message: "accepted" } as never)
      .mockResolvedValueOnce({ roster } as never);

    await expect(updateRoster("roster-1", "server-1", { alias: "Renamed" })).resolves.toMatchObject({ id: "roster-1" });
    expect(execute).toHaveBeenNthCalledWith(2, dashboardEndpoints.dashboardGetRoster, {
      path: { rosterId: "roster-1" }, query: { server_id: "server-1" }, body: {},
    });
  });

  it("projects Discord identity and missing-member response fields", async () => {
    execute
      .mockResolvedValueOnce({
        playerTag: "#ONE", discordUserId: "42", discordUsername: "member", discordAvatarUrl: "avatar",
      } as never)
      .mockResolvedValueOnce({
        results: [{ roster_id: "roster-1", roster_name: "Main", missing_members: ["#ONE"] }],
      } as never);

    await expect(refreshRosterDiscordIdentity("roster-1", "server-1", "#ONE")).resolves.toEqual({
      discord: "42", discord_username: "member", discord_avatar_url: "avatar",
    });
    await expect(fetchMissingMembers("server-1", "roster-1", "group-1")).resolves.toMatchObject({
      results: [{ missing_members: ["#ONE"] }],
    });
  });

  it("projects refreshed member timestamps, league, heroes, and signup answers", async () => {
    execute.mockResolvedValue({ member: {
      tag: "#ONE", name: "Member", townhall: 18, hero_level_sum: 240, league_name: "Legend League",
      last_online: "2026-09-01T12:00:00Z", added_at: null, last_updated: "invalid",
      answers: { availability: "yes" },
    } } as never);

    await expect(refreshRosterMember("roster-1", "server-1", "#ONE")).resolves.toMatchObject({
      tag: "#ONE", hero_lvs: 240, current_league: "Legend League",
      last_online: Date.parse("2026-09-01T12:00:00Z") / 1000,
      added_at: undefined, last_updated: undefined, signup_answers: { availability: "yes" },
    });
  });

  it("copies server member and clan collection responses into UI models", async () => {
    const member = { tag: "#ONE", name: "Member", townhall: 18 };
    execute
      .mockResolvedValueOnce({ members: [member] } as never)
      .mockResolvedValueOnce([{ tag: "#CLAN", name: "Clan", badge_url: "badge" }] as never);

    await expect(fetchServerMembers("server-1")).resolves.toEqual([member]);
    await expect(fetchClans("server-1")).resolves.toEqual([
      { tag: "#CLAN", name: "Clan", badge_url: "badge" },
    ]);
  });

  it("maps automation records and rejects unsupported action values", async () => {
    const rule = {
      automation_id: "automation-1", server_id: "server-1", roster_id: "roster-1",
      action_type: "roster_post", scheduled_at: "2026-09-02T00:00:00Z", active: true,
      executed: false, execution_status: "processing",
    };
    execute.mockResolvedValueOnce({ items: [rule] } as never);
    await expect(fetchAutomations("server-1", "roster-1", "group-1")).resolves.toMatchObject([
      { automation_id: "automation-1", action_type: "roster_post", execution_status: "processing" },
    ]);
    expect(execute).toHaveBeenLastCalledWith(dashboardEndpoints.dashboardListRosterAutomations, {
      path: {}, query: { server_id: "server-1", roster_id: "roster-1", group_id: "group-1" }, body: {},
    });

    execute.mockResolvedValueOnce({ items: [{ ...rule, action_type: "unknown" }] } as never);
    await expect(fetchAutomations("server-1")).rejects.toThrow("Unsupported roster automation action");
  });

  it("maps group summaries and preserves create, update, and delete endpoint inputs", async () => {
    const group = {
      group_id: "group-1", server_id: "server-1", name: "Fallback name", alias: null,
      description: "Group", max_accounts_per_user: 2, min_signups: 10,
      rosters: [{ id: "roster-1", alias: "Main", clan_name: null, updated_at: "2026-09-01T00:00:00Z" }],
    };
    execute
      .mockResolvedValueOnce({ items: [group] } as never)
      .mockResolvedValueOnce({ group: { ...group, alias: "Created" } } as never)
      .mockResolvedValueOnce({ group: { ...group, alias: "Updated" } } as never)
      .mockResolvedValueOnce({ message: "deleted" } as never);

    await expect(fetchGroups("server-1")).resolves.toMatchObject([{ alias: "Fallback name", roster_count: 1 }]);
    await expect(createGroup("server-1", "Created")).resolves.toMatchObject({ alias: "Created" });
    await expect(updateGroup("group-1", "server-1", { description: "Updated" })).resolves.toMatchObject({ alias: "Updated" });
    await deleteGroup("group-1", "server-1");

    expect(execute).toHaveBeenLastCalledWith(dashboardEndpoints.dashboardDeleteRosterGroup, {
      path: { groupId: "group-1" }, query: { server_id: "server-1" }, body: {},
    });
  });

  it("copies channel records returned by the server channel endpoint", async () => {
    execute.mockResolvedValue([{ id: "channel-1", name: "general", type: 0 }] as never);
    await expect(fetchChannels("server-1")).resolves.toEqual([{ id: "channel-1", name: "general", type: 0 }]);
    expect(execute).toHaveBeenCalledWith(dashboardEndpoints.serverChannels, {
      path: { serverId: "server-1" }, query: {}, body: {},
    });
  });
});
