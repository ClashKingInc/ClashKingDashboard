import type { CSSProperties } from "react";
import type { RosterViewColumn, RosterViewResult, RosterViewSpec } from "@/lib/api/types/roster";

type Highlight = NonNullable<RosterViewSpec["highlights"]>[number];

export function gradientHighlightStyle(rule: Highlight | undefined, values: Record<string, unknown>): CSSProperties | undefined {
  const gradient = rule?.gradient;
  if (!gradient) return undefined;
  const value = values[gradient.columnId];
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isFinite(gradient.min)
    || !Number.isFinite(gradient.max) || gradient.min >= gradient.max) return undefined;
  if (![gradient.from, gradient.to].every((color) => /^#[0-9a-f]{6}$/i.test(color))) return undefined;
  const fraction = Math.max(0, Math.min(1, (value - gradient.min) / (gradient.max - gradient.min)));
  const channel = (color: string, offset: number) => parseInt(color.slice(offset, offset + 2), 16);
  const rgb = [1, 3, 5].map((offset) => Math.round(channel(gradient.from, offset)
    + fraction * (channel(gradient.to, offset) - channel(gradient.from, offset))));
  // A subdued background preserves foreground contrast in both themes.
  return { backgroundColor: `rgba(${rgb.join(", ")}, 0.2)` };
}

export function rosterColumnPresentation(column: RosterViewColumn, rows: RosterViewResult["rows"]): { width: number; paragraph: boolean } {
  const values = rows.map((row) => row.values[column.id]).filter((value) => value != null && value !== "");
  const text = values.filter((value): value is string => typeof value === "string");
  const paragraph = text.some((value) => value.length > 72 || value.includes("\n"))
    || values.some((value) => typeof value === "object" && column.metricId !== "player.league_trophies");
  const headerWidth = Math.min(240, Math.max(120, Math.min(column.label.length, 25) * 7 + 44));
  if (paragraph) return { width: Math.max(320, headerWidth), paragraph: true };
  if (column.metricId === "player.name" || column.metricId === "discord.username") return { width: Math.max(200, headerWidth), paragraph: false };
  if (text.length > 0 || column.metricId === "signup.answer") {
    const length = Math.max(0, ...text.map((value) => value.length));
    return { width: Math.max(headerWidth, Math.min(280, length * 7 + 40)), paragraph: false };
  }
  return { width: headerWidth, paragraph: false };
}
