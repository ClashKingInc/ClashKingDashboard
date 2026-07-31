import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearSession,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "./session";

describe("browser auth session", () => {
  beforeEach(() => {
    clearSession(false);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    clearSession(false);
  });

  it("keeps access tokens in memory and removes legacy token storage", () => {
    localStorage.setItem("access_token", "legacy-access");
    localStorage.setItem("refresh_token", "legacy-refresh");

    setAccessToken("memory-access", false);

    expect(getAccessToken()).toBe("memory-access");
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });

  it("restores through the credentialed cookie endpoint without a JSON refresh token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "restored-access" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(refreshAccessToken("https://v2-api.clashk.ing")).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://v2-api.clashk.ing/v2/auth/web/refresh",
      { method: "POST", credentials: "include" },
    );
    expect(getAccessToken()).toBe("restored-access");
  });

  it("uses one in-flight refresh for concurrent 401 recovery", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = refreshAccessToken("https://v2-api.clashk.ing");
    const second = refreshAccessToken("https://v2-api.clashk.ing");
    resolveResponse(
      new Response(JSON.stringify({ access_token: "rotated-access" }), { status: 200 }),
    );

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
