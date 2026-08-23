import { describe, expect, it } from "vitest";
import {
  AUTOBOARD_FREE_LIMIT,
  AUTOBOARD_SUBSCRIBER_LIMIT,
} from "./subscription-entitlements";

describe("subscription entitlements", () => {
  it("keeps the AutoBoard plan limits in one configurable source", () => {
    expect(AUTOBOARD_FREE_LIMIT).toBe(10);
    expect(AUTOBOARD_SUBSCRIBER_LIMIT).toBe(30);
    expect(AUTOBOARD_SUBSCRIBER_LIMIT).toBeGreaterThan(AUTOBOARD_FREE_LIMIT);
  });
});
