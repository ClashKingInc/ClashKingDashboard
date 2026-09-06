import { describe, expect, it, vi } from "vitest";
import { loadRoleMaxLevels } from "./role-max-levels";

describe("independent role-building limits", () => {
  it("keeps both successful building limits", async () => {
    const request = vi.fn(async (building: string) => ({ max_level: building === "Town Hall" ? 19 : 11 }));
    expect(await loadRoleMaxLevels(request)).toEqual([
      { status: "fulfilled", value: { max_level: 19 } },
      { status: "fulfilled", value: { max_level: 11 } },
    ]);
    expect(request.mock.calls).toEqual([["Town Hall"], ["Builder Hall"]]);
  });

  it.each(["Town Hall", "Builder Hall"])("keeps the other response when %s fails", async (failedBuilding) => {
    const error = new Error("Service unavailable");
    const results = await loadRoleMaxLevels(async (building) => {
      if (building === failedBuilding) throw error;
      return { max_level: building === "Town Hall" ? 19 : 11 };
    });
    const failedIndex = failedBuilding === "Town Hall" ? 0 : 1;
    expect(results[failedIndex]).toEqual({ status: "rejected", reason: error });
    expect(results[1 - failedIndex]).toEqual({
      status: "fulfilled", value: { max_level: failedBuilding === "Town Hall" ? 11 : 19 },
    });
  });
});
