import { describe, expect, it } from "vitest";

import { buildConnectReturnUrl, postAuthFallbackPath, readConnectRequest } from "./connected-apps";

describe("postAuthFallbackPath", () => {
  it("keeps the standalone host out of dashboard routes", () => {
    expect(postAuthFallbackPath("connect.clashk.ing")).toBe("/");
    expect(postAuthFallbackPath("dash.clashk.ing")).toBe("/servers");
  });
});

describe("readConnectRequest", () => {
  it("reads the permanent application URL and preserves opaque state", () => {
    expect(readConnectRequest(new URL(
      "https://connect.clashk.ing/app_123?redirect_uri=https%3A%2F%2Fexample.com%2Fcallback%3Fsource%3Dck&state=a%2Bb%26c",
    ))).toEqual({
      applicationId: "app_123",
      redirectUri: "https://example.com/callback?source=ck",
      state: "a+b&c",
    });
  });

  it("allows a permanent URL without redirect state", () => {
    expect(readConnectRequest(new URL("https://connect.clashk.ing/app_123"))).toEqual({
      applicationId: "app_123",
    });
  });

  it.each([
    "https://dash.clashk.ing/connect",
    "https://dash.clashk.ing/connect/app_123",
    "https://dash.clashk.ing/connect/app_123/extra",
    "https://dash.clashk.ing/connected/app_123",
    "https://dash.clashk.ing/connect/%2F",
    "https://connect.clashk.ing/connect/app_123",
    "https://connect.clashk.ing/app_123/extra",
  ])("rejects malformed connect URL %s", (url) => {
    expect(readConnectRequest(new URL(url))).toBeNull();
  });
});

describe("buildConnectReturnUrl", () => {
  it("returns only status and unchanged state while preserving registered query values", () => {
    expect(buildConnectReturnUrl(
      "https://example.com/callback?source=discord&ck_status=old&state=old",
      "connected",
      "opaque +& value",
    )).toBe(
      "https://example.com/callback?source=discord&ck_status=connected&state=opaque+%2B%26+value",
    );
  });

  it("does not invent state when the connect URL omitted it", () => {
    expect(buildConnectReturnUrl("https://example.com/callback", "denied")).toBe(
      "https://example.com/callback?ck_status=denied",
    );
  });
});
