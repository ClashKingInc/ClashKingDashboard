import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutomation, fetchClanMembers, fetchRoster, fetchRosters } from "./api";
import { clearSession, setAccessToken } from "@/lib/auth/session";
import { getDefaultBaseUrl } from "@/lib/api/client";

const serverId = "9007199254740993123";
const roster = {
  id: "019c1e4a-5be7-7a6d-82a3-81d014eb21d7", server_id: serverId, alias: "Main",
  roster_type: "clan", signup_scope: "clan-only", columns: [], sort: [], revision: 1,
  created_at: "2026-09-03T00:00:00Z", updated_at: "2026-09-03T00:00:00Z",
  members: [{ name: "Test", tag: "#ABC", townhall: 17, hero_level_sum: 200,
    refreshed_at: "2026-09-03T00:00:00Z",
    last_updated: "2026-09-03T00:00:00Z", answers: { availability: "yes" } }],
};
const jsonResponse = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json" },
});

describe("roster contract callers", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    clearSession(false);
    setAccessToken("token_123", false);
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    clearSession(false);
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("decodes the canonical list envelope and projects member fields", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ rosters: [roster], count: 1 }));
    const result = await fetchRosters(serverId, "group-9");
    expect(result).toMatchObject([{ id: roster.id, server_id: serverId, members: [{
      hero_lvs: 200, last_updated: Date.parse("2026-09-03T00:00:00Z") / 1000,
      signup_answers: { availability: "yes" },
      refreshed_at: "2026-09-03T00:00:00Z",
    }] }]);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe(`${getDefaultBaseUrl()}/v2/roster/${serverId}/list?group_id=group-9`);
    expect(request.headers.get("Authorization")).toBe("Bearer token_123");
  });

  it.each([{ items: [roster] }, [roster], { rosters: [{ id: roster.id }], count: 1 }])(
    "rejects legacy or malformed list responses", async (payload) => {
      fetchMock.mockResolvedValue(jsonResponse(payload));
      await expect(fetchRosters(serverId)).rejects.toThrow();
    },
  );

  it("uses the canonical roster UUID and response envelope", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ roster }));
    await expect(fetchRoster(roster.id, serverId)).resolves.toMatchObject({ id: roster.id });
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe(`${getDefaultBaseUrl()}/v2/roster/${roster.id}?server_id=${serverId}`);
  });

  it("surfaces unsuccessful API responses", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Backend failed" }, 500));
    await expect(fetchRosters(serverId)).rejects.toThrow();
  });

  it("loads canonical proxy clan data and supplies clan context", async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      tag: "#CLAN", name: "Clan", type: "inviteOnly", description: "", isFamilyFriendly: true,
      badgeUrls: { small: "https://example.test/s.png", medium: "https://example.test/m.png", large: "https://example.test/l.png" },
      clanLevel: 10, clanPoints: 1000, clanBuilderBasePoints: 1000, clanCapitalPoints: 1000,
      clanCapital: { clanGoldSinkTotal: 0 },
      requiredTrophies: 0, warFrequency: "always", warWinStreak: 0, warWins: 10, isWarLogPublic: true,
      members: 1, labels: [], memberList: [{ tag: "#ABC", name: "Test", role: "member", townHallLevel: 17,
        expLevel: 200, trophies: 5000, donations: 0, donationsReceived: 0, clanRank: 1, previousClanRank: 1 }],
    }));
    await expect(fetchClanMembers("#CLAN")).resolves.toEqual([{
      tag: "#ABC", name: "Test", townhall: 17, clan_tag: "#CLAN", clan_name: "Clan",
    }]);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe(`${getDefaultBaseUrl()}/proxy/v1/clans/%23CLAN`);
  });

  it("rejects the old unvalidated member-list envelope", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [{ tag: "#ABC", name: "Test" }] }));
    await expect(fetchClanMembers("#CLAN")).rejects.toThrow();
  });
});

describe("createAutomation", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken("token_123", false);
  });

  afterEach(() => {
    clearSession(false);
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("keeps a snowflake above 2^53 as a decimal string in the query", async () => {
    const serverId = "9007199254740993123";
    const rule = {
      automation_id: "automation-1",
      server_id: serverId,
      roster_id: "roster-1",
      action_type: "roster_signup",
      trigger_type: "scheduled",
      scheduled_at: "2026-08-24T20:00:00.000Z",
      active: true,
      executed: false,
      created_at: "2026-08-20T20:00:00.000Z",
      updated_at: "2026-08-20T20:00:00.000Z",
    };
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({ message: "created", automation_id: "automation-1", rule }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    ));

    await expect(createAutomation({
      server_id: serverId,
      roster_id: "roster-1",
      action_type: "roster_signup",
      scheduled_at: "2026-08-24T20:00:00.000Z",
      active: true,
    })).resolves.toMatchObject({
      automation_id: "automation-1",
      server_id: serverId,
      roster_id: "roster-1",
      action_type: "roster_signup",
    });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request).toBeInstanceOf(Request);
    expect(request.url).toBe(`${getDefaultBaseUrl()}/v2/roster-automation?server_id=${serverId}`);
    expect(new URL(request.url).searchParams.get("server_id")).toBe(serverId);
    await expect(request.clone().json()).resolves.toEqual({
      roster_id: "roster-1",
      action_type: "roster_signup",
      scheduled_at: "2026-08-24T20:00:00.000Z",
      active: true,
    });
  });

  it("rejects a response that does not match the shared contract", async () => {
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({ automation_id: "automation-2", server_id: "123", action_type: "roster_signup" }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    ));

    await expect(createAutomation({
      server_id: "123",
      roster_id: "roster-1",
      action_type: "roster_signup",
      scheduled_at: "2026-08-24T20:00:00.000Z",
      active: true,
    })).rejects.toThrow();
  });
});
