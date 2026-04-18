import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

describe("auth discord route", () => {
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

  it("forwards POST requests to the backend", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ access_token: "abc", refresh_token: "def" }),
    });

    const request = new Request("http://localhost/api/v2/auth/discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "code",
        code_verifier: "verifier",
        redirect_uri: "http://localhost:3002/auth/callback",
      }),
    });

    const response = await POST(request as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v2/auth/discord",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "code",
          code_verifier: "verifier",
          redirect_uri: "http://localhost:3002/auth/callback",
        }),
      }
    );
    await expect(response.json()).resolves.toEqual({ access_token: "abc", refresh_token: "def" });
    expect(response.status).toBe(200);
  });

  it("returns a 500 response when the backend call fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));

    const request = new Request("http://localhost/api/v2/auth/discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "code" }),
    });

    const response = await POST(request as any);

    await expect(response.json()).resolves.toEqual({ error: "Failed to authenticate with Discord" });
    expect(response.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
