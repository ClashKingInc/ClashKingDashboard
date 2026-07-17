import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the apiClient before importing logout
vi.mock("@/lib/api/client", () => ({
  apiClient: { clearTokens: vi.fn() },
}));

import { logout } from "./logout";
import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";

describe("logout", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "tok");
    localStorage.setItem("refresh_token", "ref");
    localStorage.setItem("user", JSON.stringify({ id: 1 }));
    sessionStorage.setItem("selected_guild", "cached");
    vi.mocked(apiClient.clearTokens).mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("removes access_token from localStorage", () => {
    logout();
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("removes refresh_token from localStorage", () => {
    logout();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });

  it("removes user from localStorage", () => {
    logout();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("calls apiClient.clearTokens()", () => {
    logout();
    expect(apiClient.clearTokens).toHaveBeenCalledTimes(1);
  });

  it("clears session storage and cached API responses", async () => {
    const fetcher = vi.fn().mockResolvedValue({ private: true });
    await apiCache.get("private-user-data", fetcher);
    logout();
    expect(sessionStorage.length).toBe(0);
    await apiCache.get("private-user-data", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
