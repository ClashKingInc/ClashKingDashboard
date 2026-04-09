import { describe, it, expect } from "vitest";
import { getLoginUrl, getServersUrl, getAuthCallbackUrl } from "./redirect";

describe("getLoginUrl", () => {
  it("returns /login regardless of locale", () => {
    expect(getLoginUrl("en")).toBe("/login");
    expect(getLoginUrl("fr")).toBe("/login");
    expect(getLoginUrl("nl")).toBe("/login");
  });
});

describe("getServersUrl", () => {
  it("returns /servers regardless of locale", () => {
    expect(getServersUrl("en")).toBe("/servers");
    expect(getServersUrl("fr")).toBe("/servers");
  });
});

describe("getAuthCallbackUrl", () => {
  it("returns /auth/callback regardless of locale", () => {
    expect(getAuthCallbackUrl("en")).toBe("/auth/callback");
    expect(getAuthCallbackUrl("fr")).toBe("/auth/callback");
  });
});
