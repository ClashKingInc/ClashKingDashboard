import { describe, expect, it } from "vitest";
import {
  DEVELOPER_DISCORD_IDS,
  isDeveloperUserId,
} from "./developer-access";

describe("isDeveloperUserId", () => {
  it("returns true for each known developer ID", () => {
    for (const id of DEVELOPER_DISCORD_IDS) {
      expect(isDeveloperUserId(id)).toBe(true);
    }
  });

  it("returns false for an unknown Discord ID", () => {
    expect(isDeveloperUserId("999999999999999999")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isDeveloperUserId("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isDeveloperUserId(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDeveloperUserId(undefined)).toBe(false);
  });
});
