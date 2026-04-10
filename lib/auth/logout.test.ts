import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the apiClient before importing logout
vi.mock("@/lib/api/client", () => ({
  apiClient: { clearTokens: vi.fn() },
}));

import { logout } from "./logout";
import { apiClient } from "@/lib/api/client";

describe("logout", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "tok");
    localStorage.setItem("refresh_token", "ref");
    localStorage.setItem("user", JSON.stringify({ id: 1 }));
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
});
