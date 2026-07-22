import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH, PUT } from "./route";

describe("server logs route", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards an independent clan log update", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ updated_log_types: ["war_log"] }), { status: 200 }));
    const body = {
      clan_tag: "#2PP",
      channel_id: "456",
      thread_id: null,
      log_types: ["war_log"],
    };
    const request = new Request("http://localhost/api/v2/server/123/logs", {
      method: "PUT",
      headers: { authorization: "Bearer token", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await PUT(request as any, { params: Promise.resolve({ server_id: "123" }) });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v2/server/123/logs",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(body) })
    );
    expect(response.status).toBe(200);
  });

  it("forwards the clan scope when a log is deleted", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const request = new Request(
      "http://localhost/api/v2/server/123/logs?clan_tag=%232PP&log_types=war_log",
      { method: "DELETE", headers: { authorization: "Bearer token" } }
    );

    const response = await DELETE(request as any, { params: Promise.resolve({ server_id: "123" }) });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v2/server/123/logs?clan_tag=%232PP&log_types=war_log",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("forwards a disabled-state change without deleting the setup", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ updated_log_types: ["war_log"] }), { status: 200 }));
    const body = { clan_tag: "#2PP", log_types: ["war_log"], disabled: true };
    const request = new Request("http://localhost/api/v2/server/123/logs", {
      method: "PATCH",
      headers: { authorization: "Bearer token", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await PATCH(request as any, { params: Promise.resolve({ server_id: "123" }) });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v2/server/123/logs",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify(body) })
    );
    expect(response.status).toBe(200);
  });
});
