import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAutomation, fetchClanMembers, fetchRoster, fetchRosters } from "./api";
import { clearSession, setAccessToken } from "@/lib/auth/session";
import { getDefaultBaseUrl } from "@/lib/api/client";

describe("fetchRosters", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    clearSession(false);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    fetchMock.mockReset();
  });

  it("returns rosters when the API responds with a rosters property", async () => {
    const rosters = [{ roster_id: "1", alias: "Main" }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ rosters }),
    });

    await expect(fetchRosters("123")).resolves.toEqual(rosters);
  });

  it("returns items when the API responds with an items property", async () => {
    const rosters = [{ roster_id: "2", alias: "Alt" }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ items: rosters }),
    });

    await expect(fetchRosters("123")).resolves.toEqual(rosters);
  });

  it("returns an array response directly", async () => {
    const rosters = [{ roster_id: "3", alias: "Direct" }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(rosters),
    });

    await expect(fetchRosters("123")).resolves.toEqual(rosters);
  });

  it("includes the auth token and group id when present", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ rosters: [] }),
    });
    setAccessToken("token_123", false);

    await fetchRosters("123", "group-9");

    const [url, options] = fetchMock.mock.calls[0] as [string, { headers: Headers }];
    expect(url).toBe(`${getDefaultBaseUrl()}/v2/roster/123/list?group_id=group-9`);
    expect(options.headers.get("Authorization")).toBe("Bearer token_123");
    expect(options.headers.get("Content-Type")).toBe("application/json");
  });

  it("throws the API error message on non-OK responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: "Backend failed" }),
    });

    await expect(fetchRosters("123")).rejects.toThrow("Backend failed");
  });
});

describe("fetchClanMembers", () => {
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

  const member = { tag: "#ABC", name: "Test" };

  it("returns an array response directly", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([member]) });
    await expect(fetchClanMembers("#ABC")).resolves.toEqual([member]);
  });

  it("returns data.items when present", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ items: [member] }) });
    await expect(fetchClanMembers("#ABC")).resolves.toEqual([member]);
  });

  it("returns data.members when items is absent", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ members: [member] }) });
    await expect(fetchClanMembers("#ABC")).resolves.toEqual([member]);
  });

  it("returns empty array when neither items nor members exist", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) });
    await expect(fetchClanMembers("#ABC")).resolves.toEqual([]);
  });
});

describe("fetchRoster", () => {
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

  it("uses the canonical roster UUID", async () => {
    const roster = { id: "019c1e4a-5be7-7a6d-82a3-81d014eb21d7", alias: "alpha" };
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ roster }) });

    await expect(fetchRoster(roster.id, "server-1")).resolves.toEqual(roster);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${getDefaultBaseUrl()}/v2/roster/019c1e4a-5be7-7a6d-82a3-81d014eb21d7?server_id=server-1`,
    );
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

  it("sends server_id in the query and returns the created rule", async () => {
    const rule = { automation_id: "automation-1", server_id: "123", action_type: "roster_signup" };
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({ message: "created", automation_id: "automation-1", rule }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    ));

    await expect(createAutomation({
      server_id: "123",
      roster_id: "roster-1",
      action_type: "roster_signup",
      scheduled_at: "2026-08-24T20:00:00.000Z",
      active: true,
    })).resolves.toEqual(rule);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getDefaultBaseUrl()}/v2/roster-automation?server_id=123`);
    expect(JSON.parse(String(options.body))).toEqual({
      roster_id: "roster-1",
      action_type: "roster_signup",
      scheduled_at: "2026-08-24T20:00:00.000Z",
      active: true,
    });
  });

  it("returns a direct automation response for legacy API compatibility", async () => {
    const rule = { automation_id: "automation-2", server_id: "123", action_type: "roster_signup" };
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify(rule),
      { status: 201, headers: { "Content-Type": "application/json" } },
    ));

    await expect(createAutomation({
      server_id: "123",
      roster_id: "roster-1",
      action_type: "roster_signup",
      scheduled_at: "2026-08-24T20:00:00.000Z",
      active: true,
    })).resolves.toEqual(rule);
  });
});
