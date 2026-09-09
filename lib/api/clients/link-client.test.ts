import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LinkClient } from "./link-client";

describe("LinkClient Discord snowflake contract", () => {
  const fetchMock = vi.fn();
  const client = new LinkClient({ baseUrl: "https://api.example.test", accessToken: "token" });

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("preserves a user snowflake larger than Number.MAX_SAFE_INTEGER", async () => {
    await client.getLinkedAccounts("9007199254740993");

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe("https://api.example.test/v2/links/9007199254740993");
  });
});
