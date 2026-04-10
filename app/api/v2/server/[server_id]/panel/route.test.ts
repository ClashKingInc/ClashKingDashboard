import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PUT } from "./route";

describe("panel route", () => {
  const fetchMock = vi.fn();
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    fetchMock.mockReset();
    consoleErrorSpy.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards GET requests to the backend with the auth header", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });

    const request = new Request("http://localhost/api/v2/server/123/panel", {
      headers: { authorization: "Bearer abc" },
    });

    const response = await GET(request as any, {
      params: Promise.resolve({ server_id: "123" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v2/server/123/panel",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer abc",
          "Content-Type": "application/json",
        },
      }
    );
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
  });

  it("forwards PUT requests including the JSON body", async () => {
    fetchMock.mockResolvedValue({
      status: 202,
      json: vi.fn().mockResolvedValue({ saved: true }),
    });

    const request = new Request("http://localhost/api/v2/server/123/panel", {
      method: "PUT",
      headers: {
        authorization: "Bearer xyz",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "New Panel" }),
    });

    const response = await PUT(request as any, {
      params: Promise.resolve({ server_id: "123" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v2/server/123/panel",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer xyz",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "New Panel" }),
      }
    );
    await expect(response.json()).resolves.toEqual({ saved: true });
    expect(response.status).toBe(202);
  });

  it("returns a 500 response when the backend call fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));

    const request = new Request("http://localhost/api/v2/server/123/panel");

    const response = await GET(request as any, {
      params: Promise.resolve({ server_id: "123" }),
    });

    await expect(response.json()).resolves.toEqual({ error: "Failed to fetch panel" });
    expect(response.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
