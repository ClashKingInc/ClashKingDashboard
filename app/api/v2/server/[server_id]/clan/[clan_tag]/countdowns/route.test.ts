import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("clan countdowns route", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encodes a clan tag before it calls the API", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ clan_tag: "#2PP", countdowns: [] }), { status: 200 })
    );
    const request = new Request(
      "http://localhost/api/v2/server/123/clan/%232PP/countdowns",
      { headers: { authorization: "Bearer token" } }
    );

    const response = await GET(request as any, {
      params: Promise.resolve({ server_id: "123", clan_tag: "#2PP" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v2/server/123/clan/%232PP/countdowns",
      expect.objectContaining({ method: "GET" })
    );
    expect(response.status).toBe(200);
  });
});
