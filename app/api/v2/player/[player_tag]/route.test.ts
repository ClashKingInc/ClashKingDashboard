import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("player route", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("percent-encodes a decoded player tag before forwarding it", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ name: "Magic Jr.", tag: "#2J8V28GV0", townHallLevel: 18 }),
    });

    const request = new Request("http://localhost/api/v2/player/%232J8V28GV0", {
      headers: { authorization: "Bearer abc" },
    });
    const response = await GET(request as never, {
      params: Promise.resolve({ player_tag: "#2J8V28GV0" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/proxy/v1/players/%232J8V28GV0",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer abc",
          "Content-Type": "application/json",
        },
      }
    );
    await expect(response.json()).resolves.toEqual({ name: "Magic Jr.", tag: "#2J8V28GV0", townHallLevel: 18 });
  });

  it("preserves an upstream player not-found response", async () => {
    fetchMock.mockResolvedValue({
      status: 404,
      json: vi.fn().mockResolvedValue({ reason: "notFound" }),
    });

    const response = await GET(new Request("http://localhost/api/v2/player/%23LLLL") as never, {
      params: Promise.resolve({ player_tag: "#LLLL" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ reason: "notFound" });
  });
});
