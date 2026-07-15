/**
 * Format a count into a compact display label, e.g. 12534 -> "12.5k".
 */
export function formatCompactCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "0";
  if (count < 1000) return String(Math.floor(count));

  const thousands = count / 1000;
  const rounded = Math.floor(thousands * 10) / 10;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label}k`;
}
