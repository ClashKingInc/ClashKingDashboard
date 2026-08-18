import type { Cell, SheetData } from "write-excel-file/browser";

import type { RosterViewColumn, RosterViewResult } from "@/lib/api/types/roster";

type RosterViewRow = RosterViewResult["rows"][number];

const MAX_COLUMN_WIDTH = 42;
const MIN_COLUMN_WIDTH = 12;

function safeJson(value: object): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function rosterViewCellValue(metricId: string, value: unknown): string | number | boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (metricId === "player.league_trophies" && typeof value === "object") {
    const trophies = (value as { trophies?: unknown }).trophies;
    if (typeof trophies === "number" && Number.isFinite(trophies)) return trophies;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => rosterViewCellValue(metricId, item))
      .filter((item) => item !== null)
      .join(", ");
  }
  if (typeof value === "object") return safeJson(value);
  return String(value);
}

function excelCell(column: RosterViewColumn, value: unknown): Cell {
  const cellValue = rosterViewCellValue(column.metricId, value);
  if (cellValue === null) return null;
  if ((column.format === "percent" || column.metricId === "player.max_percent") && typeof cellValue === "number") {
    return { value: cellValue, type: Number, format: '0.0"%"' };
  }
  return cellValue;
}

function cellText(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "value" in value) return String(value.value ?? "");
  return String(value);
}

export function rosterViewSheetData(columns: RosterViewColumn[], rows: RosterViewRow[]): SheetData {
  const header = columns.map((column) => ({
    value: column.label,
    type: String,
    fontWeight: "bold" as const,
    backgroundColor: "#E8E8EA",
    textColor: "#171719",
    alignVertical: "center" as const,
    wrap: true,
  }));
  return [
    header,
    ...rows.map((row) => columns.map((column) => excelCell(column, row.values[column.id]))),
  ];
}

function safeBaseName(viewName: string): string {
  return viewName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "roster-view";
}

export function rosterViewFileName(viewName: string): string {
  return `${safeBaseName(viewName)}.xlsx`;
}

function worksheetName(viewName: string): string {
  return viewName.replace(/[\\/?*:[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Roster view";
}

export async function downloadRosterViewExcel(
  viewName: string,
  columns: RosterViewColumn[],
  rows: RosterViewRow[],
): Promise<void> {
  const data = rosterViewSheetData(columns, rows);
  const columnWidths = columns.map((column, columnIndex) => ({
    width: Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(MIN_COLUMN_WIDTH, ...data.map((row) => cellText(row[columnIndex]).length + 2)),
    ),
  }));
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(data, {
    sheet: worksheetName(viewName),
    columns: columnWidths,
    stickyRowsCount: 1,
  }).toFile(rosterViewFileName(viewName));
}
