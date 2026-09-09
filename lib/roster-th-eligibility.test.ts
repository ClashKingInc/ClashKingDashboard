import { describe, expect, it } from "vitest";
import { rosterTownhallEligibility } from "./roster-th-eligibility";

const now = Date.parse("2026-09-04T05:30:00Z");
describe("roster Town Hall eligibility", () => {
  it("identifies a fresh snapshot below the current roster requirement", () => {
    expect(rosterTownhallEligibility({ townhall: 15, minTownhall: 16, maxTownhall: 18,
      refreshedAt: "2026-09-04T05:29:00Z", now })).toEqual({ status: "below_minimum", townhall: 15, limit: 16 });
  });
  it("keeps inclusive bounds and distinguishes above-maximum snapshots", () => {
    const input = { minTownhall: 16, maxTownhall: 18, refreshedAt: "2026-09-04T05:29:00Z", now };
    expect(rosterTownhallEligibility({ ...input, townhall: 16 })).toEqual({ status: "eligible" });
    expect(rosterTownhallEligibility({ ...input, townhall: 18 })).toEqual({ status: "eligible" });
    expect(rosterTownhallEligibility({ ...input, townhall: 19 })).toEqual({ status: "above_maximum", townhall: 19, limit: 18 });
  });
  it.each([undefined, null, "invalid", "2026-09-04T05:14:59Z", "2026-09-04T05:31:00Z"])(
    "does not confirm ineligibility with missing, stale, or future freshness (%s)", (refreshedAt) => {
      expect(rosterTownhallEligibility({ townhall: 15, minTownhall: 16, refreshedAt, now })).toEqual({ status: "unknown" });
    },
  );
  it("does not infer player data or requirements from invalid values", () => {
    const input = { townhall: 15, minTownhall: 16, refreshedAt: "2026-09-04T05:29:00Z", now };
    for (const townhall of [0, -1, 15.5, Number.NaN, null, undefined]) expect(rosterTownhallEligibility({ ...input, townhall })).toEqual({ status: "unknown" });
    expect(rosterTownhallEligibility({ ...input, maxTownhall: 14 })).toEqual({ status: "unknown" });
    expect(rosterTownhallEligibility({ townhall: 0, now })).toEqual({ status: "unrestricted" });
  });
});
