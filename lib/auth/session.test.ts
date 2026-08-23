import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearSession,
  getAccessToken,
  refreshAccessToken,
  restoreAccessToken,
  setAccessToken,
  startAccessTokenRefresh,
} from "./session";

function jwtExpiringAt(epochSeconds: number): string {
  const payload = btoa(JSON.stringify({ exp: epochSeconds }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `header.${payload}.signature`;
}

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

  it("resolves the browser runtime for every operation after a document or HMR swap", () => {
    const target = window as Window & { __clashkingAuthRuntime?: unknown };
    const originalRuntime = target.__clashkingAuthRuntime;
    target.__clashkingAuthRuntime = {
      generation: 0,
      refreshPromise: null,
      listeners: new Set(),
      tabId: "replacement-runtime",
      channel: null,
      listening: true,
    };

    try {
      setAccessToken("replacement-access", false);
      expect(getAccessToken()).toBe("replacement-access");
    } finally {
      target.__clashkingAuthRuntime = originalRuntime;
    }
  });

  it("restores through the credentialed cookie endpoint without a JSON refresh token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "restored-access" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(refreshAccessToken("https://dev-api.clashk.ing")).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev-api.clashk.ing/v2/auth/web/refresh",
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

    const first = refreshAccessToken("https://dev-api.clashk.ing");
    const second = refreshAccessToken("https://dev-api.clashk.ing");
    resolveResponse(
      new Response(JSON.stringify({ access_token: "rotated-access" }), { status: 200 }),
    );

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes an idle session shortly before its access token expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T12:00:00Z"));
    const replacement = jwtExpiringAt(Math.floor(Date.now() / 1000) + 900);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: replacement }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    setAccessToken(jwtExpiringAt(Math.floor(Date.now() / 1000) + 120), false);
    const stop = startAccessTokenRefresh("https://dev-api.clashk.ing");

    await vi.advanceTimersByTimeAsync(59_999);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe(replacement);

    stop();
    vi.useRealTimers();
  });

  it("keeps the session recoverable when refresh infrastructure is unavailable", async () => {
    setAccessToken("existing-access", false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(restoreAccessToken("https://dev-api.clashk.ing")).resolves.toBe("unavailable");

    expect(getAccessToken()).toBe("existing-access");
  });

  it("clears the session only when the refresh credential is rejected", async () => {
    setAccessToken("expired-access", false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(restoreAccessToken("https://dev-api.clashk.ing")).resolves.toBe("anonymous");

    expect(getAccessToken()).toBeUndefined();
  });

  it("clears an expired session when proactive refresh returns forbidden", async () => {
    setAccessToken("expired-access", false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

    await expect(restoreAccessToken("https://dev-api.clashk.ing")).resolves.toBe("anonymous");

    expect(getAccessToken()).toBeUndefined();
  });

  it("does not let a stale rejected refresh clear a newer session", async () => {
    let resolveResponse!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(
      () => new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    ));

    const staleRefresh = restoreAccessToken("https://dev-api.clashk.ing");
    setAccessToken("newer-access", false);
    resolveResponse(new Response(null, { status: 401 }));

    await expect(staleRefresh).resolves.toBe("restored");
    expect(getAccessToken()).toBe("newer-access");
  });

  it("retries when a reload overlaps one-time refresh-token rotation", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        message: "Browser session was already refreshed",
      }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "replacement-access",
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const restoration = restoreAccessToken("https://dev-api.clashk.ing");
    await vi.advanceTimersByTimeAsync(200);

    await expect(restoration).resolves.toBe("restored");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getAccessToken()).toBe("replacement-access");
    vi.useRealTimers();
  });
});
