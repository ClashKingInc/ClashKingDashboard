import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthMeEndpoint, DashboardQueryRosterMetricEndpoint, DashboardRefreshRosterDiscordIdentityEndpoint } from "@clashking/api-contracts";
import { executeAssistantEndpoint } from "./api-client";

const serverId = "123456789012345678";
const identity = { user_id: serverId, username: "Developer", avatar_url: "", auth_methods: ["discord"], account_summary: { follower_count: 0 } };

afterEach(() => vi.unstubAllGlobals());

describe("roster assistant shared transport", () => {
  it("uses each request's bearer without browser state or refresh replay", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(identity));
    vi.stubGlobal("fetch", fetcher);
    await executeAssistantEndpoint("https://api.example.com/", "user-token", AuthMeEndpoint, { path: {}, query: {}, body: {} });
    const request = fetcher.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("https://api.example.com/v2/auth/me");
    expect(request.headers.get("authorization")).toBe("Bearer user-token");
    fetcher.mockResolvedValue(Response.json({ message: "Expired" }, { status: 401 }));
    await expect(executeAssistantEndpoint("https://api.example.com", "expired-token", AuthMeEndpoint, { path: {}, query: {}, body: {} })).rejects.toMatchObject({ status: 401, message: "Expired" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("uses the exact shared method/path/query/body and preserves large server IDs", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ metricId: "player.name", parameters: {}, rows: [{ rosterId: "roster", playerTag: "#2PP", value: "Player" }], cached: false, evaluatedAt: "2026-09-03T00:00:00Z" }));
    vi.stubGlobal("fetch", fetcher);
    const result = await executeAssistantEndpoint("https://api.example.com", "token", DashboardQueryRosterMetricEndpoint, {
      path: {}, query: { server_id: serverId }, body: { rosterIds: ["roster"], metricId: "player.name", parameters: {}, force: false },
    });
    const request = fetcher.mock.calls[0]?.[0] as Request;
    expect(request.method).toBe("POST");
    expect(new URL(request.url).searchParams.get("server_id")).toBe(serverId);
    expect(await request.json()).toEqual({ rosterIds: ["roster"], metricId: "player.name", parameters: {}, force: false });
    expect(result.rows[0]?.value).toBe("Player");
  });

  it("rejects malformed nested data instead of passing it to tools", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ metricId: "player.name", parameters: {}, rows: [{ rosterId: 42, playerTag: "#2PP", value: "Player" }], cached: false, evaluatedAt: "now" })));
    await expect(executeAssistantEndpoint("https://api.example.com", "token", DashboardQueryRosterMetricEndpoint, {
      path: {}, query: { server_id: serverId }, body: { rosterIds: ["roster"], metricId: "player.name", force: false },
    })).rejects.toMatchObject({ status: 502, message: "Roster API response is invalid" });
  });

  it("encodes dynamic roster paths through the descriptor", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ message: "No identity" }, { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(executeAssistantEndpoint("https://api.example.com", "token", DashboardRefreshRosterDiscordIdentityEndpoint, {
      path: { serverId, rosterId: "roster/name" }, query: {}, body: { playerTag: "#2PP" },
    })).rejects.toMatchObject({ status: 404 });
    const request = fetcher.mock.calls[0]![0] as Request;
    expect(request.url).toContain(`/server/${serverId}/rosters/roster%2Fname/discord-identity/refresh`);
  });

  it("propagates the caller abort signal without retrying", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async (request: Request) => {
      controller.abort();
      request.signal.throwIfAborted();
      return Response.json(identity);
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(executeAssistantEndpoint("https://api.example.com", "token", AuthMeEndpoint, { path: {}, query: {}, body: {} }, controller.signal)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0].signal.aborted).toBe(true);
  });
});
