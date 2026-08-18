import { describe, expect, it } from "vitest";
import { proxyClashApiAssetUrl } from "./asset-url";

describe("proxyClashApiAssetUrl", () => {
  it("routes official Clash API artwork through the CORS-safe proxy", () => {
    expect(proxyClashApiAssetUrl("https://api-assets.clashofclans.com/badges/512/example.png?x=1"))
      .toBe("https://assets-proxy.clashk.ing/badges/512/example.png?x=1");
  });

  it("leaves ClashKing, fan-kit, data, and malformed sources alone", () => {
    expect(proxyClashApiAssetUrl("https://assets.clashk.ing/icon.png")).toBe("https://assets.clashk.ing/icon.png");
    expect(proxyClashApiAssetUrl("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
    expect(proxyClashApiAssetUrl("not a URL")).toBe("not a URL");
  });
});

