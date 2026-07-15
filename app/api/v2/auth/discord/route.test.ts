import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

function makeUpstreamResponse(status: number, body: unknown) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { status, text: vi.fn().mockResolvedValue(text) };
}

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
    fetchMock.mockResolvedValue(
      makeUpstreamResponse(200, { access_token: "abc", refresh_token: "def" })
    );

    const body = JSON.stringify({
      code: "code",
      code_verifier: "verifier",
      redirect_uri: "http://localhost:3002/auth/callback",
    });
    const request = new Request("http://localhost/api/v2/auth/discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const response = await POST(request as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:8000/v2/auth/discord");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(body);

    await expect(response.json()).resolves.toEqual({ access_token: "abc", refresh_token: "def" });
    expect(response.status).toBe(200);
  });

  it("preserves the upstream status when the backend returns non-JSON", async () => {
    fetchMock.mockResolvedValue(makeUpstreamResponse(502, "<html>Bad Gateway</html>"));

    const request = new Request("http://localhost/api/v2/auth/discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "code" }),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Upstream returned a non-JSON response (HTTP 502)",
    });
  });

  it("returns a 502 response when the backend call fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));

    const request = new Request("http://localhost/api/v2/auth/discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "code" }),
    });

    const response = await POST(request as any);

    await expect(response.json()).resolves.toEqual({ error: "Failed to authenticate with Discord" });
    expect(response.status).toBe(502);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
