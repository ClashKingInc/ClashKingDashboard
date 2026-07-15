import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxyApiRequest, upstreamJsonResponse } from "./api-proxy";

function upstream(status: number, body: unknown) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { status, text: vi.fn().mockResolvedValue(text) } as unknown as Response;
}

describe("proxyApiRequest", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("forwards method, query string and authorization header", async () => {
    fetchMock.mockResolvedValue(upstream(200, { ok: true }));

    const request = new NextRequest("http://localhost/api/v2/thing?limit=5&flag=a&flag=b", {
      headers: { authorization: "Bearer token-123" },
    });

    const response = await proxyApiRequest(request, "/v2/thing");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:8000/v2/thing?limit=5&flag=a&flag=b");
    expect(init.method).toBe("GET");
    expect(init.headers.get("Authorization")).toBe("Bearer token-123");
    expect(response.status).toBe(200);
  });

  it("forwards a JSON body with its content type", async () => {
    fetchMock.mockResolvedValue(upstream(201, { created: true }));

    const request = new NextRequest("http://localhost/api/v2/thing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "x" }),
    });

    const response = await proxyApiRequest(request, "/v2/thing");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(JSON.stringify({ name: "x" }));
    expect(init.headers.get("Content-Type")).toContain("application/json");
    expect(response.status).toBe(201);
  });

  it("returns the configured error message with a 502 on network failure", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));

    const request = new NextRequest("http://localhost/api/v2/thing");
    const response = await proxyApiRequest(request, "/v2/thing", {
      errorMessage: "Failed to fetch thing",
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Failed to fetch thing" });
  });

  it("sets extra response headers when provided", async () => {
    fetchMock.mockResolvedValue(upstream(200, { ok: true }));

    const request = new NextRequest("http://localhost/api/v2/thing");
    const response = await proxyApiRequest(request, "/v2/thing", {
      responseHeaders: { "Cache-Control": "public, max-age=3600" },
    });

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });
});

describe("upstreamJsonResponse", () => {
  it("passes JSON bodies through with the upstream status", async () => {
    const response = await upstreamJsonResponse(upstream(404, { detail: "not found" }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ detail: "not found" });
  });

  it("keeps the upstream status for non-JSON bodies", async () => {
    const response = await upstreamJsonResponse(upstream(502, "<html>bad gateway</html>"));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Upstream returned a non-JSON response (HTTP 502)",
    });
  });

  it("returns an empty response for empty upstream bodies", async () => {
    const response = await upstreamJsonResponse(upstream(204, ""));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
