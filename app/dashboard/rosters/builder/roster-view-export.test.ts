import type { RosterViewColumn, RosterViewResult } from "@/lib/api/types/roster";

import { rosterViewCellValue, rosterViewFileName, rosterViewSheetData } from "./roster-view-export";

const columns: RosterViewColumn[] = [
  { id: "name", label: "Player", metricId: "player.name", format: "player" },
  { id: "townhall", label: "Town Hall", metricId: "player.townhall", format: "number" },
  { id: "max", label: "Maxed", metricId: "player.max_percent", format: "percent" },
  { id: "league", label: "League trophies", metricId: "player.league_trophies", format: "number" },
];

const rows: RosterViewResult["rows"] = [{
  rosterId: "roster-1",
  playerTag: "#PLAYER",
  values: {
    name: "Clashy",
    townhall: 17,
    max: 94.5,
    league: { leagueName: "Legend League", trophies: 5_321 },
  },
}];

describe("roster view Excel export", () => {
  it("keeps spreadsheet-friendly primitive values", () => {
    expect(rosterViewCellValue("player.townhall", 17)).toBe(17);
    expect(rosterViewCellValue("player.league_trophies", { leagueName: "Legend League", trophies: 5_321 })).toBe(5_321);
    expect(rosterViewCellValue("player.name", true)).toBe(true);
    expect(rosterViewCellValue("player.name", null)).toBeNull();
    expect(rosterViewCellValue("custom", { attacks: 8 })).toBe('{"attacks":8}');
  });

  it("builds a styled header and typed data rows in display-column order", () => {
    const sheet = rosterViewSheetData(columns, rows);

    expect(sheet[0].map((cell) => typeof cell === "object" && cell ? cell.value : cell)).toEqual([
      "Player",
      "Town Hall",
      "Maxed",
      "League trophies",
    ]);
    expect(sheet[1]).toEqual([
      "Clashy",
      17,
      { value: 94.5, type: Number, format: '0.0"%"' },
      5_321,
    ]);
  });

  it("creates a safe Excel filename from the view name", () => {
    expect(rosterViewFileName("  CWL Élites / August  ")).toBe("cwl-elites-august.xlsx");
    expect(rosterViewFileName("***")).toBe("roster-view.xlsx");
  });
});
