import type { GraphicElement } from "./graphic-document";

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasRect extends CanvasPoint {
  width: number;
  height: number;
}

export interface SelectionModifiers {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export function hasSelectionModifier(modifiers: SelectionModifiers): boolean {
  return Boolean(modifiers.shiftKey || modifiers.ctrlKey || modifiers.metaKey);
}

export function resolveElementSelection(
  selectedIds: readonly string[],
  elementId: string,
  modifiers: SelectionModifiers,
): string[] {
  if (!hasSelectionModifier(modifiers)) {
    return selectedIds.includes(elementId) ? [...selectedIds] : [elementId];
  }
  return selectedIds.includes(elementId)
    ? selectedIds.filter((id) => id !== elementId)
    : [...selectedIds, elementId];
}

export function selectionRectBetween(start: CanvasPoint, end: CanvasPoint): CanvasRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function elementBounds(element: GraphicElement): CanvasRect {
  const radians = element.rotation * Math.PI / 180;
  const halfWidth = element.width / 2;
  const halfHeight = element.height / 2;
  const rotatedHalfWidth = Math.abs(Math.cos(radians)) * halfWidth + Math.abs(Math.sin(radians)) * halfHeight;
  const rotatedHalfHeight = Math.abs(Math.sin(radians)) * halfWidth + Math.abs(Math.cos(radians)) * halfHeight;
  const centerX = element.x + halfWidth;
  const centerY = element.y + halfHeight;
  return {
    x: centerX - rotatedHalfWidth,
    y: centerY - rotatedHalfHeight,
    width: rotatedHalfWidth * 2,
    height: rotatedHalfHeight * 2,
  };
}

export function rectsIntersect(left: CanvasRect, right: CanvasRect): boolean {
  return left.x <= right.x + right.width
    && left.x + left.width >= right.x
    && left.y <= right.y + right.height
    && left.y + left.height >= right.y;
}

export function overlappingElementIds(elements: readonly GraphicElement[], selectedIds: readonly string[]): string[] {
  const selected = new Set(selectedIds);
  const selectedBounds = elements.filter((element) => selected.has(element.id)).map(elementBounds);
  if (!selectedBounds.length) return [];
  return elements
    .filter((element) => selected.has(element.id) || selectedBounds.some((bounds) => rectsIntersect(elementBounds(element), bounds)))
    .map((element) => element.id);
}

export function selectElementIdsInRect(elements: readonly GraphicElement[], rect: CanvasRect): string[] {
  if (rect.width === 0 && rect.height === 0) return [];
  return elements.filter((element) => rectsIntersect(elementBounds(element), rect)).map((element) => element.id);
}

export function mergeSelectionIds(initialIds: readonly string[], addedIds: readonly string[]): string[] {
  const merged = [...initialIds];
  const seen = new Set(initialIds);
  for (const id of addedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return merged;
}
