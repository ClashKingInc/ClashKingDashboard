import { describe, expect, it } from "vitest";
import { parseProxyResponseBody } from "./api-proxy";

describe("parseProxyResponseBody", () => {
  it("preserves structured API errors", () => {
    expect(parseProxyResponseBody('{"detail":"Invalid server"}', 400, "application/json")).toEqual({ detail: "Invalid server" });
  });

  it("does not expose upstream HTML error pages", () => {
    expect(parseProxyResponseBody("<!DOCTYPE html><html>Cloudflare 502</html>", 502, "text/html")).toEqual({
      detail: "The API is temporarily unavailable. Please try again.",
    });
  });
});
