import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WarClient } from "./war-client";

describe("WarClient CWL contract", () => {
  const fetchMock = vi.fn();
  const client = new WarClient({ baseUrl: "", accessToken: "token" });

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("loads a stored CWL group from the API group route", async () => {
    await client.getStoredCwl("#92G9J8CG", "2026-07");

    expect(fetchMock).toHaveBeenCalledWith(
      "/v2/cwl/%2392G9J8CG/group?season=2026-07",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
