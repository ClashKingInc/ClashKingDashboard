import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WarClient } from "./war-client";

describe("WarClient CWL contract", () => {
  const fetchMock = vi.fn();
  const client = new WarClient({ baseUrl: "https://api.example.test", accessToken: "token" });

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      state: "ended",
      season: "2026-07",
      warLeague: null,
      clans: [],
      rounds: [],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("preserves exact season IDs across group and bonus recipient requests", async () => {
    fetchMock.mockImplementation((request: Request) => Promise.resolve(new Response(JSON.stringify(
      request.url.includes("bonus-recipients")
        ? { items: [] }
        : { state: "ended", season: "2026-09-03", warLeague: null, clans: [], rounds: [] },
    ), { status: 200 })));

    await client.getStoredCwl("#92G9J8CG", "2026-09-03");
    await client.getCwlBonusRecipients("123", "#92G9J8CG", "2026-09-03");
    await client.replaceCwlBonusRecipients("123", "#92G9J8CG", "2026-09-03", []);

    const requests = fetchMock.mock.calls.map(([request]) => request as Request);
    expect(requests.map(({ url }) => url)).toEqual([
      "https://api.example.test/v2/cwl/%2392G9J8CG/group?season=2026-09-03",
      "https://api.example.test/v2/server/123/cwl/%2392G9J8CG/bonus-recipients?season=2026-09-03",
      "https://api.example.test/v2/server/123/cwl/%2392G9J8CG/bonus-recipients?season=2026-09-03",
    ]);
    expect(requests.map(({ method }) => method)).toEqual(["GET", "GET", "PUT"]);
  });
});
