import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BasesClient } from "./bases-client";

describe("BasesClient", () => {
  const fetchMock = vi.fn();
  const client = new BasesClient({ baseUrl: "", accessToken: "token" });

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("uses the server-scoped list and read contracts", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "base-1" }), { status: 200 }));

    await client.list("123", 50, 0);
    await client.get("123", "base/1");

    expect(fetchMock.mock.calls[0][0]).toBe("/v2/server/123/bases?limit=50&offset=0");
    expect(fetchMock.mock.calls[1][0]).toBe("/v2/server/123/bases/base%2F1");
  });

  it("creates an immutable base without engagement fields", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      id: "base-1",
      downloadCount: 0,
      upvotes: 0,
      downvotes: 0,
      downloaders: [],
    }), { status: 201 }));
    const body = {
      channelId: "channel-1",
      baseLink: "https://link.clashofclans.com/layout",
      images: ["https://cdn.clashk.ing/base.webp"],
      description: "Layout",
    };

    await client.create("123", body);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(body);
    expect(init.body).not.toContain("downloadCount");
    expect(init.body).not.toContain("upvotes");
    expect(init.body).not.toContain("downvotes");
    expect(init.body).not.toContain("messageId");
  });

  it("uploads images and resolves one downloader through narrow endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        url: "https://cdn.clashk.ing/base.webp",
        filename: "base.webp",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        userId: "456",
        displayName: "Builder",
        avatarUrl: null,
      }), { status: 200 }));

    await client.uploadImage("123", new File(["image"], "base.webp", { type: "image/webp" }));
    await client.getDownloader("123", "base-1", "456");

    expect(fetchMock.mock.calls[0][0]).toBe("/v2/server/123/bases/images");
    expect(fetchMock.mock.calls[0][1].body).toBeInstanceOf(FormData);
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Content-Type");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/v2/server/123/bases/base-1/downloaders/456",
    );
  });

  it("deletes through the server-scoped manager route", async () => {
    const body = {
      baseId: "base-1",
      databaseDeleted: true,
      discordMessageCleanup: "deleted",
    };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

    const response = await client.delete("123", "base/1");

    expect(fetchMock.mock.calls[0][0]).toBe("/v2/server/123/bases/base%2F1");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    expect(response.data).toEqual(body);
  });

  it("retains the structured fail-closed delete response", async () => {
    const body = {
      code: "discord_unavailable",
      message: "Discord integration unavailable",
      requestId: "request-1",
      baseId: "base-1",
      databaseDeleted: false,
      discordMessageCleanup: "failed",
      retryable: true,
    };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 503 }));

    const response = await client.delete("123", "base-1");

    expect(response.status).toBe(503);
    expect(response.error).toBe(body.message);
    expect(response.errorData).toEqual(body);
  });
});
