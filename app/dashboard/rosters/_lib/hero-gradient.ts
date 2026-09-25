export function heroGradient(percent: number, anchors: readonly [number, number, number] = [50, 75, 90]): string {
  const [red, yellow, green] = anchors;
  const value = Math.max(red, Math.min(green, percent));
  const hue = value <= yellow ? 60 * (value - red) / (yellow - red) : 60 + 60 * (value - yellow) / (green - yellow);
  return `hsl(${hue} 78% 52%)`;
}
