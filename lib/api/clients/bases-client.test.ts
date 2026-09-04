import { File as NodeFile } from "node:buffer";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BasesClient } from "./bases-client";

describe("BasesClient", () => {
  const fetchMock = vi.fn();
  const client = new BasesClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

  const base = {
    id: "base-1",
    serverId: "123",
    channelId: "channel-1",
    messageId: "message-1",
    baseLink: "https://link.clashofclans.com/layout",
    images: ["https://api.clashk.ing/v2/media/base.webp"],
    description: "Layout",
    downloadCount: 0,
    upvotes: 0,
    downvotes: 0,
    downloaders: [],
    createdAt: "2026-09-03T12:00:00Z",
    discordMessageUrl: "https://discord.com/channels/123/channel-1/message-1",
  };

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
      .mockResolvedValueOnce(new Response(JSON.stringify(base), { status: 200 }));

    await client.list("123", 50, 0);
    await client.get("123", "base/1");

    const listRequest = fetchMock.mock.calls[0]?.[0] as Request;
    const getRequest = fetchMock.mock.calls[1]?.[0] as Request;
    expect(listRequest.url).toBe("http://dashboard.test/v2/server/123/bases?limit=50&offset=0");
    expect(listRequest.method).toBe("GET");
    expect(getRequest.url).toBe("http://dashboard.test/v2/server/123/bases/base%2F1");
  });

  it("creates an immutable base without engagement fields", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(base), { status: 201 }));
    const body = {
      channelId: "channel-1",
      baseLink: "https://link.clashofclans.com/layout",
      images: ["https://api.clashk.ing/v2/media/base.webp"],
      description: "Layout",
    };

    await client.create("123", body);

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    const requestText = await request.text();
    expect(request.method).toBe("POST");
    expect(JSON.parse(requestText)).toEqual(body);
    expect(requestText).not.toContain("downloadCount");
    expect(requestText).not.toContain("upvotes");
    expect(requestText).not.toContain("downvotes");
    expect(requestText).not.toContain("messageId");
  });

  it("uploads images and resolves one downloader through narrow endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        url: "https://api.clashk.ing/v2/media/base.webp",
        filename: "base.webp",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        userId: "456",
        displayName: "Builder",
        avatarUrl: null,
      }), { status: 200 }));

    const file = new NodeFile(["image"], "base.webp", { type: "image/webp" }) as unknown as File;
    const upload = await client.uploadImage("123", file);
    await client.getDownloader("123", "base-1", "456");

    const uploadRequest = fetchMock.mock.calls[0]?.[0] as Request;
    const downloaderRequest = fetchMock.mock.calls[1]?.[0] as Request;
    expect(uploadRequest.url).toBe("http://dashboard.test/v2/server/123/bases/images");
    expect(uploadRequest.headers.get("Content-Type")).toContain("multipart/form-data");
    expect(upload.data).toEqual({ url: "https://api.clashk.ing/v2/media/base.webp", filename: "base.webp" });
    expect(downloaderRequest.url).toBe(
      "http://dashboard.test/v2/server/123/bases/base-1/downloaders/456",
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

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/server/123/bases/base%2F1");
    expect(request.method).toBe("DELETE");
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
