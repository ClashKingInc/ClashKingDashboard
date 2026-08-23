import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateRosterAutomationModel, RosterViewSpec } from "../types/roster";
import { RosterClient } from "./roster-client";

describe("RosterClient saved view contract", () => {
  const fetchMock = vi.fn();
  const client = new RosterClient({ baseUrl: "", accessToken: "token" });
  const spec: RosterViewSpec = {
    schemaVersion: 1,
    columns: [{ id: "name", label: "Name", metricId: "player.name" }],
  };
  const sourceCode = `async () => ({ name: "Best", columns: [], rows: [] })`;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("stores only reusable source while previewing runtime output separately", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

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

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/v2/roster/views?server_id=server-1",
      "/v2/roster/views?server_id=server-1",
      "/v2/roster/views/view%2F1?server_id=server-1",
      "/v2/roster/views/shared/short-share",
      "/v2/roster/views/preview?server_id=server-1",
      "/v2/roster/metrics/query?server_id=server-1",
    ]);
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "Best", sourceCode, sourceVersion: 1 }),
    }));
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ name: "Best", sourceCode, sourceVersion: 1 }),
    }));
    expect(fetchMock.mock.calls[4][1]).toEqual(expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
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
      }),
    }));
    expect(fetchMock.mock.calls[5][1]).toEqual(expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ rosterIds: ["roster-1"], metricId: "war.hit_rate", parameters: { windowDays: 15 }, force: false }),
    }));
  });
});

describe("RosterClient automation contract", () => {
  const fetchMock = vi.fn();
  const client = new RosterClient({ baseUrl: "", accessToken: "token" });

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("places server_id in the create query instead of the request body", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "created", automation_id: "automation-1" }), { status: 201 }));
    const automation: CreateRosterAutomationModel = {
      server_id: "server-1",
      roster_id: "roster-1",
      action_type: "roster_signup",
      scheduled_at: "2026-08-24T20:00:00.000Z",
    };

    await client.createAutomation(automation);

    expect(fetchMock.mock.calls[0][0]).toBe("/v2/roster-automation?server_id=server-1");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({
      roster_id: "roster-1",
      action_type: "roster_signup",
      scheduled_at: "2026-08-24T20:00:00.000Z",
    });
  });
});
