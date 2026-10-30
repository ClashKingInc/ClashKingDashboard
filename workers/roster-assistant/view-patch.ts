import type { RosterViewColumn, RosterViewSpec } from "../../lib/api/types/roster";

type Highlight = NonNullable<RosterViewSpec["highlights"]>[number];
export type RosterViewPatch = {
  name?: string;
  upsertColumns?: RosterViewColumn[];
  removeColumnIds?: string[];
  columnOrder?: string[];
  sort?: NonNullable<RosterViewSpec["sort"]>;
  upsertHighlights?: Highlight[];
  removeHighlightIds?: string[];
};
const marker = "// clashking-view-patch-v1:";

export function patchRosterViewSource(sourceCode: string, patch: RosterViewPatch): string {
  let baseSource = sourceCode;
  let patches: RosterViewPatch[] = [];
  const metadataLine = sourceCode.split("\n").reverse().find((line) => line.startsWith(marker));
  if (metadataLine) {
    const decoded = JSON.parse(decodeURIComponent(escape(atob(metadataLine.slice(marker.length))))) as { baseSource: string; patches: RosterViewPatch[] };
    if (typeof decoded.baseSource !== "string" || !Array.isArray(decoded.patches)) throw new Error("Invalid view patch metadata");
    baseSource = decoded.baseSource;
    patches = decoded.patches;
  }
  const merged: RosterViewPatch = {};
  const columns = new Map<string, RosterViewColumn>();
  const removedColumns = new Set<string>();
  const highlights = new Map<string, Highlight>();
  const removedHighlights = new Set<string>();
  for (const change of [...patches, patch]) {
    if (change.name !== undefined) merged.name = change.name;
    if (change.sort !== undefined) merged.sort = change.sort;
    if (change.columnOrder !== undefined) merged.columnOrder = change.columnOrder;
    for (const id of change.removeColumnIds ?? []) { removedColumns.add(id); columns.delete(id); }
    for (const column of change.upsertColumns ?? []) { columns.set(column.id, column); removedColumns.delete(column.id); }
    for (const id of change.removeHighlightIds ?? []) { removedHighlights.add(id); highlights.delete(id); }
    for (const rule of change.upsertHighlights ?? []) { highlights.set(rule.id, rule); removedHighlights.delete(rule.id); }
  }
  merged.upsertColumns = [...columns.values()];
  merged.removeColumnIds = [...removedColumns];
  merged.upsertHighlights = [...highlights.values()];
  merged.removeHighlightIds = [...removedHighlights];
  if (merged.sort) merged.sort = merged.sort.filter((rule) => !removedColumns.has(rule.columnId));
  if (merged.columnOrder) merged.columnOrder = merged.columnOrder.filter((id) => !removedColumns.has(id));
  patches = [merged];
  const metadata = btoa(unescape(encodeURIComponent(JSON.stringify({ baseSource, patches }))));
  const source = `async () => {
  const view = await (${baseSource}\n)();
  const patches = ${JSON.stringify(patches)};
  for (const patch of patches) {
    if (patch.name !== undefined) view.name = patch.name;
    const removed = new Set(patch.removeColumnIds ?? []);
    view.columns = view.columns.filter(column => !removed.has(column.id));
    view.sort = (view.sort ?? []).filter(rule => !removed.has(rule.columnId));
    view.highlights = (view.highlights ?? []).filter(rule => !removed.has(rule.columnId) && !removed.has(rule.when?.columnId) && !removed.has(rule.gradient?.columnId));
    if ((view.filters ?? []).some(rule => removed.has(rule.columnId))) throw new Error("Cannot remove a filtered column; rebuild the view to change its filters.");
    for (const column of patch.upsertColumns ?? []) {
      const index = view.columns.findIndex(item => item.id === column.id);
      const previous = view.columns[index];
      if (!previous || previous.metricId !== column.metricId || JSON.stringify(previous.parameters ?? {}) !== JSON.stringify(column.parameters ?? {})) {
        if (column.metricId === "view.computed") throw new Error("New calculated columns require a view program.");
        const metric = await codemode.getRosterMetric({ metricId: column.metricId, parameters: column.parameters ?? {} });
        for (const row of view.rows) {
          const match = metric.rows.find(item => item.rosterId === row.rosterId && item.playerTag === row.playerTag);
          row.values[column.id] = match?.value ?? null;
        }
      }
      if (index < 0) view.columns.push(column); else view.columns[index] = column;
    }
    if (patch.columnOrder) {
      const order = new Map(patch.columnOrder.map((id, index) => [id, index]));
      if (order.size !== patch.columnOrder.length || patch.columnOrder.some(id => !view.columns.some(column => column.id === id))) throw new Error("Column order contains duplicate or unknown IDs.");
      view.columns.sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999));
    }
    if (patch.sort !== undefined) view.sort = patch.sort;
    const removedHighlights = new Set(patch.removeHighlightIds ?? []);
    view.highlights = view.highlights.filter(rule => !removedHighlights.has(rule.id));
    for (const rule of patch.upsertHighlights ?? []) {
      const index = view.highlights.findIndex(item => item.id === rule.id);
      if (index < 0) view.highlights.push(rule); else view.highlights[index] = rule;
    }
  }
  return view;
}
${marker}${metadata}`;
  if (source.length > 65_536) throw new Error("Patched view exceeds the saved source size limit; rebuild the view.");
  return source;
}
