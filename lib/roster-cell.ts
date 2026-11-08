/** A computed label can sort by domain strength instead of alphabetically.
 * Keep this wire shape in sync with the API roster comparator. */
export function isLabeledRosterCell(value: unknown): value is {label: string; sortValue: string | number} {
  return value !== null && typeof value === "object" && "label" in value && typeof value.label === "string" &&
    "sortValue" in value && (typeof value.sortValue === "string" || typeof value.sortValue === "number");
}
