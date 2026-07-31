import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  token: undefined as string | undefined,
  refreshAccessToken: vi.fn<() => Promise<boolean>>(),
}));

vi.mock("@/lib/auth/session", () => ({
  getAccessToken: () => auth.token,
  refreshAccessToken: auth.refreshAccessToken,
}));

vi.mock("@/lib/api/client", () => ({
  getDefaultBaseUrl: () => "https://api.example.com",
}));

import { apiFetch } from "./fetch";

describe("apiFetch", () => {
  beforeEach(() => {
    auth.token = undefined;
    auth.refreshAccessToken.mockReset();
    vi.restoreAllMocks();
  });

  it("restores a cookie-backed session before the first protected request", async () => {
    auth.refreshAccessToken.mockImplementation(async () => {
      auth.token = "restored-token";
      return true;
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    await apiFetch("/v2/server/123/settings");

    expect(auth.refreshAccessToken).toHaveBeenCalledWith("https://api.example.com");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer restored-token");
  });

  it("replaces a blank bearer header after restoring the session", async () => {
    auth.refreshAccessToken.mockImplementation(async () => {
      auth.token = "restored-token";
      return true;
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    await apiFetch("/v2/server/123/settings", {
      headers: { Authorization: "Bearer " },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer restored-token");
  });

  it("does not attempt a refresh for auth endpoints", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    await apiFetch("/v2/auth/web/refresh", { method: "POST" });

    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
  });
});
