import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

function makeRequest(url?: string): any {
  const base = "http://localhost/api/v2/app/discohook-resolve";
  const fullUrl = url ? `${base}?url=${encodeURIComponent(url)}` : base;
  return Object.assign(new Request(fullUrl), { nextUrl: new URL(fullUrl) });
}

describe("discohook-resolve route", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when url param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("Invalid") });
  });

  it("returns 400 when host is not allowed", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("Invalid") });
  });

  it("returns 400 for malformed url", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("Invalid") });
  });

  it("fetches share API for discohook.app/?share=<id> and returns unwrapped payload", async () => {
    const innerData = { messages: [{ data: { content: "hello" } }] };
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: innerData }),
      headers: { get: () => "application/json" },
      url: "https://discohook.app/api/v1/share/abc123",
    });

    const res = await GET(makeRequest("https://discohook.app/?share=abc123"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ payload: innerData });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://discohook.app/api/v1/share/abc123",
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": "ClashKingDashboard/1.0" }) })
    );
  });

  it("returns 422 when discohook share API responds with non-ok status", async () => {
    fetchMock.mockResolvedValue({ ok: false });

    const res = await GET(makeRequest("https://discohook.app/?share=notfound"));
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toMatchObject({ error: "Discohook share not found" });
  });

  it("returns resolvedUrl when redirect lands on a ?data= URL", async () => {
    const dataUrl = "https://discohook.app/?data=eyJtZXNzYWdlcyI6W119";
    fetchMock.mockResolvedValue({
      ok: true,
      url: dataUrl,
      headers: { get: () => "text/html" },
    });

    const res = await GET(makeRequest("https://share.discohook.app/go/abc"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ resolvedUrl: dataUrl });
  });

  it("returns payload when response is JSON", async () => {
    const payload = { messages: [] };
    fetchMock.mockResolvedValue({
      ok: true,
      url: "https://share.discohook.app/api/something",
      headers: { get: () => "application/json; charset=utf-8" },
      json: vi.fn().mockResolvedValue(payload),
    });

    const res = await GET(makeRequest("https://share.discohook.app/api/something"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ payload });
  });

  it("returns 422 when no usable data found", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      url: "https://discohook.app/",
      headers: { get: () => "text/html" },
    });

    const res = await GET(makeRequest("https://discohook.app/"));
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("extract") });
  });

  it("returns 500 when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const res = await GET(makeRequest("https://discohook.app/"));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("Failed") });
  });
});
