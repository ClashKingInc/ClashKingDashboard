import { endpoints } from "@clashking/api-contracts";

describe("coordinated API contracts", () => {
  it.each([
    ["homeActivity", "/v2/home/activity"],
    ["statsArmies", "/v2/stats/armies"],
    ["statsItems", "/v2/stats/items"],
    ["statsRanked", "/v2/stats/ranked"],
    ["statsWar", "/v2/stats/war"],
    ["statsCwl", "/v2/stats/cwl"],
  ] as const)("keeps %s on its body-based POST route", (name, path) => {
    expect(endpoints[name]).toMatchObject({ method: "POST", path, bodyMode: "json" });
  });

});
