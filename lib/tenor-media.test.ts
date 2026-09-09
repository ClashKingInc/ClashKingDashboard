// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { extractTenorGifUrl, isSupportedTenorUrl, resolveTenorMedia } from "./tenor-media";

afterEach(() => vi.unstubAllGlobals());

const source = "https://tenor.com/view/example-42";
const request = (url = source) => new Request(`https://dash.clashk.ing/api/tenor-media?url=${encodeURIComponent(url)}`);

describe("original Dashboard Tenor resolver", () => {
  it.each([source, "https://www.tenor.com/view/example-42/"])("accepts the supported URL %s", (url) => {
    expect(isSupportedTenorUrl(url)).toBe(true);
  });

  it.each(["http://tenor.com/view/example-42", "https://example.com/view/example-42", "https://tenor.com/search/cat", "not a url"])("rejects %s before calling a provider", async (url) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await resolveTenorMedia(request(url));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid Tenor URL" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a missing URL", async () => {
    const response = await resolveTenorMedia(new Request("https://dash.clashk.ing/api/tenor-media"));
    expect(response.status).toBe(400);
  });

  it("preserves the public GET redirect, request header, and cache lifetime", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('<meta class="dynamic" property="og:image" content="https://media1.tenor.com/m/exampleAAAAC/roster.gif">'));
    vi.stubGlobal("fetch", fetch);
    const response = await resolveTenorMedia(request());
    expect(fetch).toHaveBeenCalledWith(source, { headers: { "User-Agent": "ClashKingDashboard/1.0" } });
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://media1.tenor.com/m/exampleAAAAC/roster.gif");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400, stale-while-revalidate=604800");
    expect(await response.text()).toBe("");
  });

  it("does not redirect to a non-Tenor media URL", async () => {
    const html = '<meta property="og:image" content="https://example.com/roster.gif">';
    expect(extractTenorGifUrl(html)).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(html)));
    const response = await resolveTenorMedia(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "GIF media not found" });
  });

  it.each(["POST", "HEAD", "DELETE"])("keeps %s unsupported", async (method) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await resolveTenorMedia(new Request(request(), { method }));
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([new Response(null, { status: 503 }), new Error("offline")])("reports a provider failure without success", async (result) => {
    const fetch = vi.fn();
    if (result instanceof Error) fetch.mockRejectedValue(result);
    else fetch.mockResolvedValue(result);
    vi.stubGlobal("fetch", fetch);
    const response = await resolveTenorMedia(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Unable to load GIF" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
