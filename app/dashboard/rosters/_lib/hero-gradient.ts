export function heroGradient(percent: number, anchors: readonly [number, number, number] = [50, 75, 90]): string {
  const [red, yellow, green] = anchors.every(Number.isFinite)
    && 0 <= anchors[0] && anchors[0] < anchors[1] && anchors[1] < anchors[2] && anchors[2] <= 100
    ? anchors : [50, 75, 90];
  const value = Number.isFinite(percent) ? Math.max(red, Math.min(green, percent)) : red;
  const hue = value <= yellow ? 60 * (value - red) / (yellow - red) : 60 + 60 * (value - yellow) / (green - yellow);
  return `hsl(${hue} 78% 52%)`;
}
