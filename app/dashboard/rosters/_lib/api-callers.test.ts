import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardEndpoints } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import {
  addRosterMembers,
  clearRosterMembers,
  deleteRoster,
  fetchClans,
  fetchMissingMembers,
  fetchServerMembers,
  refreshRoster,
  refreshRosterDiscordIdentity,
  removeRosterMember,
} from "./api";

vi.mock("@/lib/api/shared-client", () => ({ executeSharedEndpoint: vi.fn() }));

const execute = vi.mocked(executeSharedEndpoint);

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
    const roster = {
      id: "roster-1", server_id: "server-1", alias: "Main", roster_type: "clan",
      signup_scope: "clan-only", columns: [], sort: [], members: [], revision: 1,
      created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z",
    };
    execute
      .mockResolvedValueOnce({ refreshed_rosters: [] } as never)
      .mockResolvedValueOnce({ roster } as never);

    await expect(refreshRoster("roster-1", "server-1")).resolves.toMatchObject({ id: "roster-1" });
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
});
