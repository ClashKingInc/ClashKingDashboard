import type {
  DashboardGetRosterEndpoint,
  DashboardGetRosterGroupEndpoint,
  DashboardListRosterAutomationsEndpoint,
  DashboardListRosterGroupsEndpoint,
  DashboardListRostersEndpoint,
  DashboardRefreshRostersEndpoint,
  DashboardUpdateRosterEndpoint,
  DashboardUpdateRosterGroupEndpoint,
  EndpointResponse,
} from "@clashking/api-contracts";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { CreateRosterAutomationModel, RosterViewSpec } from "../types/roster";
import { RosterClient } from "./roster-client";

describe("RosterClient inferred response contracts", () => {
  type ResponseData<M extends keyof Pick<RosterClient, "get" | "update" | "list" | "refresh" | "getGroup" | "updateGroup" | "listGroups" | "listAutomation">> =
    NonNullable<Awaited<ReturnType<RosterClient[M]>>["data"]>;

  it("retains the shared roster, group, and automation types through facade mappings", () => {
    expectTypeOf<ResponseData<"get">["roster"]>().toEqualTypeOf<EndpointResponse<typeof DashboardGetRosterEndpoint>["roster"]>();
    expectTypeOf<ResponseData<"update">["roster"]>().toEqualTypeOf<EndpointResponse<typeof DashboardUpdateRosterEndpoint>["roster"]>();
    expectTypeOf<ResponseData<"list">["items"][number]>().toEqualTypeOf<EndpointResponse<typeof DashboardListRostersEndpoint>["rosters"][number]>();
    expectTypeOf<ResponseData<"refresh">["refreshed_rosters"][number]>().toEqualTypeOf<EndpointResponse<typeof DashboardRefreshRostersEndpoint>["refreshed_rosters"][number]>();
    expectTypeOf<ResponseData<"getGroup">["group"]>().toEqualTypeOf<EndpointResponse<typeof DashboardGetRosterGroupEndpoint>["group"]>();
    expectTypeOf<ResponseData<"updateGroup">["group"]>().toEqualTypeOf<EndpointResponse<typeof DashboardUpdateRosterGroupEndpoint>["group"]>();
    expectTypeOf<ResponseData<"listGroups">["items"][number]>().toEqualTypeOf<EndpointResponse<typeof DashboardListRosterGroupsEndpoint>["items"][number]>();
    expectTypeOf<ResponseData<"listAutomation">["items"][number]>().toEqualTypeOf<EndpointResponse<typeof DashboardListRosterAutomationsEndpoint>["items"][number]>();
  });

  const client = new RosterClient({ baseUrl: "https://api.example.test", accessToken: "token" });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["get", () => client.get("roster-1", "123456789012345678"), { roster: { id: "roster-1" } }],
    ["update", () => client.update("roster-1", "123456789012345678", {}), { message: "updated", roster: { id: "roster-1" } }],
    ["list", () => client.list("123456789012345678"), { rosters: [{ id: "roster-1" }], count: 1 }],
    ["refresh", () => client.refresh("123456789012345678"), { message: "refreshed", refreshed_rosters: [{ id: "roster-1" }] }],
    ["getGroup", () => client.getGroup("group-1", "123456789012345678"), { group: { group_id: "group-1" } }],
    ["updateGroup", () => client.updateGroup("group-1", "123456789012345678", {}), { message: "updated", group: { group_id: "group-1" } }],
    ["listGroups", () => client.listGroups("123456789012345678"), { items: [{ group_id: "group-1" }], total: 1 }],
    ["listAutomation", () => client.listAutomation("123456789012345678"), { items: [{ automation_id: "automation-1" }], total: 1 }],
  ] as const)("rejects malformed nested %s response records", async (_method, call, payload) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(payload));
    vi.stubGlobal("fetch", fetchMock);

    const result = await call();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.status).toBe(0);
  });
});

describe("RosterClient saved view contract", () => {
  const fetchMock = vi.fn();
  const client = new RosterClient({ baseUrl: "https://api.example.test", accessToken: "token" });
  const spec: RosterViewSpec = {
    schemaVersion: 1,
    columns: [{ id: "name", label: "Name", metricId: "player.name" }],
  };
  const sourceCode = `async () => ({ name: "Best", columns: [], rows: [] })`;
  const storedView = {
    id: "view-1",
    shareId: "short-share",
    serverId: "server-1",
    name: "Best",
    sourceCode,
    sourceVersion: 1,
    createdBy: "user-1",
    spec,
    createdAt: "2026-08-02T00:00:00Z",
    updatedAt: "2026-08-02T00:00:00Z",
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("stores only reusable source while previewing runtime output separately", async () => {
    fetchMock.mockImplementation((request: Request) => {
      if (request.url.endsWith("/v2/roster/views?server_id=server-1") && request.method === "GET") {
        return Promise.resolve(new Response(JSON.stringify([storedView]), { status: 200 }));
      }
      if (request.url.endsWith("/v2/roster/views/preview?server_id=server-1")) {
        return Promise.resolve(new Response(JSON.stringify({
          view: storedView,
          result: {
            viewId: "view-1",
            rosterIds: ["roster-1"],
            schemaVersion: 1,
            rows: [],
            cachedMetricIds: [],
            evaluatedAt: "2026-08-02T00:00:00Z",
          },
        }), { status: 200 }));
      }
      if (request.url.endsWith("/v2/roster/metrics/query?server_id=server-1")) {
        return Promise.resolve(new Response(JSON.stringify({
          metricId: "war.hit_rate",
          parameters: { windowDays: 15 },
          rows: [],
          cached: false,
          evaluatedAt: "2026-08-02T00:00:00Z",
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(storedView), { status: 200 }));
    });

    await client.listViews("server-1");
    await client.createView("server-1", { name: "Best", sourceCode, sourceVersion: 1 });
    await client.updateView("view/1", "server-1", { name: "Best", sourceCode, sourceVersion: 1 });
    await client.resolveSharedView("short-share");
    await client.previewView("server-1", {
      id: "",
      serverId: "server-1",
      name: "Preview",
      shareId: "short-share",
      sourceCode,
      sourceVersion: 1,
      spec,
      createdAt: "2026-08-02T00:00:00Z",
      updatedAt: "2026-08-02T00:00:00Z",
    }, ["roster-1"]);
    await client.queryMetric("server-1", { rosterIds: ["roster-1"], metricId: "war.hit_rate", parameters: { windowDays: 15 } });

    const requests = fetchMock.mock.calls.map(([request]) => request as Request);
    expect(requests.map((request) => request.url)).toEqual([
      "https://api.example.test/v2/roster/views?server_id=server-1",
      "https://api.example.test/v2/roster/views?server_id=server-1",
      "https://api.example.test/v2/roster/views/view%2F1?server_id=server-1",
      "https://api.example.test/v2/roster/views/shared/short-share",
      "https://api.example.test/v2/roster/views/preview?server_id=server-1",
      "https://api.example.test/v2/roster/metrics/query?server_id=server-1",
    ]);
    expect(requests[1].method).toBe("POST");
    await expect(requests[1].clone().json()).resolves.toEqual({ name: "Best", sourceCode, sourceVersion: 1 });
    expect(requests[2].method).toBe("PATCH");
    await expect(requests[2].clone().json()).resolves.toEqual({ name: "Best", sourceCode, sourceVersion: 1 });
    expect(requests[4].method).toBe("POST");
    await expect(requests[4].clone().json()).resolves.toEqual({
        serverId: "server-1",
        rosterIds: ["roster-1"],
        name: "Preview",
        sourceCode,
        sourceVersion: 1,
        columns: spec.columns,
        filters: [],
        sort: [],
        highlights: [],
        limit: null,
    });
    expect(requests[5].method).toBe("POST");
    await expect(requests[5].clone().json()).resolves.toEqual({
      rosterIds: ["roster-1"], metricId: "war.hit_rate", parameters: { windowDays: 15 }, force: false,
    });
  });
});

describe("RosterClient automation contract", () => {
  const fetchMock = vi.fn();
  const client = new RosterClient({ baseUrl: "https://api.example.test", accessToken: "token" });

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("places server_id in the create query instead of the request body", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      message: "created",
      automation_id: "automation-1",
      rule: {
        automation_id: "automation-1",
        server_id: "server-1",
        roster_id: "roster-1",
        action_type: "roster_signup",
        trigger_type: "schedule",
        scheduled_at: "2026-08-24T20:00:00.000Z",
        active: true,
        executed: false,
        created_at: "2026-08-02T00:00:00Z",
        updated_at: "2026-08-02T00:00:00Z",
      },
    }), { status: 201 }));
    const automation: CreateRosterAutomationModel = {
      server_id: "server-1",
      roster_id: "roster-1",
      action_type: "roster_signup",
      scheduled_at: "2026-08-24T20:00:00.000Z",
    };

    await client.createAutomation(automation);

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe("https://api.example.test/v2/roster-automation?server_id=server-1");
    expect(await request.clone().json()).toEqual({
      roster_id: "roster-1",
      action_type: "roster_signup",
      scheduled_at: "2026-08-24T20:00:00.000Z",
    });
  });
});
