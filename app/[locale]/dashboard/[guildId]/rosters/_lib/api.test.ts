import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchRosters } from "./api";

describe("fetchRosters", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    fetchMock.mockReset();
  });

  it("returns rosters when the API responds with a rosters property", async () => {
    const rosters = [{ roster_id: "1", alias: "Main" }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ rosters }),
    });

    await expect(fetchRosters("123")).resolves.toEqual(rosters);
  });

  it("returns items when the API responds with an items property", async () => {
    const rosters = [{ roster_id: "2", alias: "Alt" }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ items: rosters }),
    });

    await expect(fetchRosters("123")).resolves.toEqual(rosters);
  });

  it("returns an array response directly", async () => {
    const rosters = [{ roster_id: "3", alias: "Direct" }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(rosters),
    });

    await expect(fetchRosters("123")).resolves.toEqual(rosters);
  });

  it("includes the auth token and group id when present", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ rosters: [] }),
    });
    localStorage.setItem("access_token", "token_123");

    await fetchRosters("123", "group-9");

    const [url, options] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe("/api/v2/roster/123/list?group_id=group-9");
    expect(options.headers.Authorization).toBe("Bearer token_123");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("throws the API error message on non-OK responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: "Backend failed" }),
    });

    await expect(fetchRosters("123")).rejects.toThrow("Backend failed");
  });
});
