import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

describe("internal proxy stats route", () => {
  const fetchMock = vi.fn();
  const consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  beforeEach(() => {
    fetchMock.mockReset();
    consoleErrorSpy.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeRequest(
    url = "http://localhost/api/v2/internal/proxy/stats",
    headers: Record<string, string> = {}
  ) {
    return new NextRequest(url, { headers });
  }

  // ── Auth checks ──────────────────────────────────────────────

  it("returns 401 when no authorization header is provided", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the upstream status when /v2/auth/me fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({ error: "service down" }),
    });

    const response = await GET(
      makeRequest(undefined, { authorization: "Bearer bad" })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "service down" });
  });

  it("returns a fallback error when /v2/auth/me body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: vi.fn().mockRejectedValue(new SyntaxError("bad json")),
    });

    const response = await GET(
      makeRequest(undefined, { authorization: "Bearer x" })
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to validate developer access",
    });
  });

  it("returns 403 when the user is not a developer", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi
        .fn()
        .mockResolvedValue({ user_id: "111111111111111111" }),
    });

    const response = await GET(
      makeRequest(undefined, { authorization: "Bearer tok" })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  // ── Happy path ───────────────────────────────────────────────

  it("proxies the upstream response for an authorised developer", async () => {
    // /v2/auth/me
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi
        .fn()
        .mockResolvedValue({ user_id: "506210109790093342" }),
    });
    // proxy.clashk.ing/stats
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: vi.fn().mockResolvedValue({ now: "2025-01-01T00:00:00Z" }),
    });

    const response = await GET(
      makeRequest(undefined, { authorization: "Bearer dev" })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      now: "2025-01-01T00:00:00Z",
    });

    // Verify the upstream call was made to the correct URL
    const upstreamCall = fetchMock.mock.calls[1];
    const upstreamUrl = upstreamCall[0] as URL;
    expect(upstreamUrl.origin).toBe("https://proxy.clashk.ing");
    expect(upstreamUrl.pathname).toBe("/stats");
  });

  it("forwards allowed query parameters to the upstream URL", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi
        .fn()
        .mockResolvedValue({ user_id: "506210109790093342" }),
    });
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });

    const url =
      "http://localhost/api/v2/internal/proxy/stats?series=5m&lookback=6h&endpoints=24h&limit=10&secret=bad";

    const response = await GET(
      makeRequest(url, { authorization: "Bearer dev" })
    );

    expect(response.status).toBe(200);

    const upstreamUrl = fetchMock.mock.calls[1][0] as URL;
    expect(upstreamUrl.searchParams.get("series")).toBe("5m");
    expect(upstreamUrl.searchParams.get("lookback")).toBe("6h");
    expect(upstreamUrl.searchParams.get("endpoints")).toBe("24h");
    expect(upstreamUrl.searchParams.get("limit")).toBe("10");
    // Non-allowed keys must not be forwarded
    expect(upstreamUrl.searchParams.has("secret")).toBe(false);
  });

  it("returns a fallback error when upstream body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi
        .fn()
        .mockResolvedValue({ user_id: "506210109790093342" }),
    });
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError("not json")),
    });

    const response = await GET(
      makeRequest(undefined, { authorization: "Bearer dev" })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid response from proxy stats upstream",
    });
  });

  // ── Error handling ───────────────────────────────────────────

  it("returns 500 and logs the error when an unexpected exception occurs", async () => {
    fetchMock.mockRejectedValue(new Error("network failure"));

    const response = await GET(
      makeRequest(undefined, { authorization: "Bearer dev" })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch proxy stats",
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
