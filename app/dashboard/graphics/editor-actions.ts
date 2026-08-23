import {
  createElementId,
  type GraphicDocument,
  type GraphicElement,
  type ShapeElement,
  type TextElement,
} from "./graphic-document";

export type LayerAction = "forward" | "backward" | "front" | "back";
export type CanvasAlignment = "top" | "middle" | "bottom" | "left" | "center" | "right";
export type AlignmentTarget = "canvas" | "selection";
export type CanvasResizeMode = "preserve" | "clamp" | "scale";

export interface DuplicateElementOptions {
  offset?: number | { x: number; y: number };
  createId?: () => string;
}

export interface ResizeCanvasOptions {
  elementMode?: CanvasResizeMode;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface KeyboardMovement {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
}

export interface KeyboardMovementOptions {
  step?: number;
  acceleratedStep?: number;
  precisionStep?: number;
  clampToCanvas?: boolean;
}

export interface MoveElementsOptions {
  clampToCanvas?: boolean;
}

interface CommonElementStyle {
  opacity: number;
  rotation: number;
}

export type GraphicElementStyle =
  | (CommonElementStyle & {
      type: "text";
      color: string;
      fontFamily: string;
      fontSize: number;
      fontWeight: number;
      fontStyle: TextElement["fontStyle"];
      textDecoration: TextElement["textDecoration"];
      strokeColor: TextElement["strokeColor"];
      strokeWidth: TextElement["strokeWidth"];
      align: TextElement["align"];
      lineHeight: number;
    })
  | (CommonElementStyle & { type: "image"; fit: "contain" | "cover" })
  | (CommonElementStyle & { type: "dynamic-image"; fit: "contain" | "cover" })
  | (CommonElementStyle & {
      type: "shape";
      fillEnabled: boolean;
      fillColor: string;
      strokeColor: string;
      strokeWidth: number;
      strokeDash: ShapeElement["strokeDash"];
      cornerRadius: number;
      arrowStart: ShapeElement["arrowStart"];
      arrowEnd: ShapeElement["arrowEnd"];
    });

function mapElement(
  document: GraphicDocument,
  id: string,
  update: (element: GraphicElement) => GraphicElement,
): GraphicDocument {
  const index = document.elements.findIndex((element) => element.id === id);
  if (index < 0) return document;

  const elements = [...document.elements];
  elements[index] = update(elements[index]);
  return { ...document, elements };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function clampElementToCanvas(element: GraphicElement, document: GraphicDocument): GraphicElement {
  return {
    ...element,
    x: clamp(element.x, 0, Math.max(0, document.canvas.width - element.width)),
    y: clamp(element.y, 0, Math.max(0, document.canvas.height - element.height)),
  };
}

function uniqueId(document: GraphicDocument, requested: string): string {
  const ids = new Set(document.elements.map((element) => element.id));
  if (!ids.has(requested)) return requested;

  let suffix = 2;
  while (ids.has(`${requested}-${suffix}`)) suffix += 1;
  return `${requested}-${suffix}`;
}

export function duplicateElement(
  document: GraphicDocument,
  id: string,
  options: DuplicateElementOptions = {},
): GraphicDocument {
  const index = document.elements.findIndex((element) => element.id === id);
  if (index < 0) return document;

  const source = document.elements[index];
  const offset = options.offset ?? 16;
  const xOffset = typeof offset === "number" ? offset : offset.x;
  const yOffset = typeof offset === "number" ? offset : offset.y;
  const nextId = uniqueId(document, (options.createId ?? createElementId)());
  const copy: GraphicElement = {
    ...source,
    id: nextId,
    name: `${source.name} copy`,
    x: source.x + xOffset,
    y: source.y + yOffset,
  };
  const elements = [...document.elements];
  elements.splice(index + 1, 0, copy);
  return { ...document, elements };
}

export function deleteElement(document: GraphicDocument, id: string): GraphicDocument {
  if (!document.elements.some((element) => element.id === id)) return document;
  return { ...document, elements: document.elements.filter((element) => element.id !== id) };
}

export function deleteElements(document: GraphicDocument, ids: readonly string[]): GraphicDocument {
  const selected = new Set(ids);
  if (!document.elements.some((element) => selected.has(element.id))) return document;
  return { ...document, elements: document.elements.filter((element) => !selected.has(element.id)) };
}

export function reorderElement(
  document: GraphicDocument,
  id: string,
  action: LayerAction,
): GraphicDocument {
  const from = document.elements.findIndex((element) => element.id === id);
  if (from < 0) return document;

  const last = document.elements.length - 1;
  const to = action === "forward"
    ? Math.min(from + 1, last)
    : action === "backward"
      ? Math.max(from - 1, 0)
      : action === "front"
        ? last
        : 0;
  if (from === to) return document;

  const elements = [...document.elements];
  const [element] = elements.splice(from, 1);
  elements.splice(to, 0, element);
  return { ...document, elements };
}

export function reorderElements(
  document: GraphicDocument,
  ids: readonly string[],
  insertionIndex: number,
): GraphicDocument {
  const selectedIds = new Set(ids);
  const block = document.elements.filter((element) => selectedIds.has(element.id));
  if (!block.length) return document;
  const remaining = document.elements.filter((element) => !selectedIds.has(element.id));
  const index = clamp(Math.trunc(insertionIndex), 0, remaining.length);
  const elements = [...remaining.slice(0, index), ...block, ...remaining.slice(index)];
  if (elements.every((element, elementIndex) => element === document.elements[elementIndex])) return document;
  return { ...document, elements };
}

export function reorderSelectedElements(
  document: GraphicDocument,
  ids: readonly string[],
  action: LayerAction,
): GraphicDocument {
  const selectedIds = new Set(ids);
  const selected = document.elements.filter((element) => selectedIds.has(element.id));
  if (!selected.length) return document;
  const remaining = document.elements.filter((element) => !selectedIds.has(element.id));
  if (action === "back") return reorderElements(document, ids, 0);
  if (action === "front") return reorderElements(document, ids, remaining.length);

  const firstSelectedIndex = document.elements.findIndex((element) => selectedIds.has(element.id));
  const remainingBefore = document.elements.slice(0, firstSelectedIndex).filter((element) => !selectedIds.has(element.id)).length;
  return reorderElements(document, ids, action === "forward" ? remainingBefore + 1 : remainingBefore - 1);
}

export function reorderElementsByLayerDrop(
  document: GraphicDocument,
  selectedIds: readonly string[],
  activeId: string,
  overId: string,
): GraphicDocument {
  if (activeId === overId) return document;
  const frontToBack = [...document.elements].reverse();
  const active = frontToBack.find((element) => element.id === activeId);
  const over = frontToBack.find((element) => element.id === overId);
  if (!active || !over || active.locked) return document;
  const requested = new Set(selectedIds.includes(activeId) ? selectedIds : [activeId]);
  const movingIds = frontToBack.filter((element) => requested.has(element.id) && !element.locked).map((element) => element.id);
  const movingSet = new Set(movingIds);
  if (!movingIds.length || movingSet.has(overId)) return document;

  const remainingFrontToBack = frontToBack.filter((element) => !movingSet.has(element.id));
  const overIndex = remainingFrontToBack.findIndex((element) => element.id === overId);
  if (overIndex < 0) return document;
  const activeIndex = frontToBack.findIndex((element) => element.id === activeId);
  const originalOverIndex = frontToBack.findIndex((element) => element.id === overId);
  const frontToBackBoundary = activeIndex < originalOverIndex ? overIndex + 1 : overIndex;
  const backToFrontInsertion = remainingFrontToBack.length - frontToBackBoundary;
  return reorderElements(document, movingIds, backToFrontInsertion);
}

export function alignElement(
  document: GraphicDocument,
  id: string,
  alignment: CanvasAlignment,
): GraphicDocument {
  return mapElement(document, id, (element) => {
    switch (alignment) {
      case "top": return { ...element, y: 0 };
      case "middle": return { ...element, y: (document.canvas.height - element.height) / 2 };
      case "bottom": return { ...element, y: document.canvas.height - element.height };
      case "left": return { ...element, x: 0 };
      case "center": return { ...element, x: (document.canvas.width - element.width) / 2 };
      case "right": return { ...element, x: document.canvas.width - element.width };
    }
  });
}

export function alignElements(
  document: GraphicDocument,
  ids: readonly string[],
  alignment: CanvasAlignment,
  target: AlignmentTarget = "canvas",
): GraphicDocument {
  const selectedIds = new Set(ids);
  const selected = document.elements.filter((element) => selectedIds.has(element.id) && !element.locked);
  if (!selected.length) return document;

  const left = Math.min(...selected.map((element) => element.x));
  const top = Math.min(...selected.map((element) => element.y));
  const right = Math.max(...selected.map((element) => element.x + element.width));
  const bottom = Math.max(...selected.map((element) => element.y + element.height));
  const width = right - left;
  const height = bottom - top;

  if (target === "canvas") {
    const dx = alignment === "left" ? -left
      : alignment === "center" ? (document.canvas.width - width) / 2 - left
        : alignment === "right" ? document.canvas.width - right : 0;
    const dy = alignment === "top" ? -top
      : alignment === "middle" ? (document.canvas.height - height) / 2 - top
        : alignment === "bottom" ? document.canvas.height - bottom : 0;
    if (dx === 0 && dy === 0) return document;
    return {
      ...document,
      elements: document.elements.map((element) => selectedIds.has(element.id) && !element.locked
        ? { ...element, x: element.x + dx, y: element.y + dy }
        : element),
    };
  }

  return {
    ...document,
    elements: document.elements.map((element) => {
      if (!selectedIds.has(element.id) || element.locked) return element;
      if (alignment === "left") return { ...element, x: left };
      if (alignment === "center") return { ...element, x: left + (width - element.width) / 2 };
      if (alignment === "right") return { ...element, x: right - element.width };
      if (alignment === "top") return { ...element, y: top };
      if (alignment === "middle") return { ...element, y: top + (height - element.height) / 2 };
      return { ...element, y: bottom - element.height };
    }),
  };
}

export function selectElementGroup(document: GraphicDocument, id: string): string[] {
  const element = document.elements.find((candidate) => candidate.id === id);
  if (!element) return [];
  if (!element.groupId) return [element.id];
  return document.elements.filter((candidate) => candidate.groupId === element.groupId).map((candidate) => candidate.id);
}

export function setElementsLocked(
  document: GraphicDocument,
  ids: readonly string[],
  locked: boolean,
): GraphicDocument {
  const selectedIds = new Set(ids);
  if (!document.elements.some((element) => selectedIds.has(element.id) && Boolean(element.locked) !== locked)) return document;
  return {
    ...document,
    elements: document.elements.map((element) => selectedIds.has(element.id) ? { ...element, locked } : element),
  };
}

export function moveElementsByDelta(
  document: GraphicDocument,
  ids: readonly string[],
  dx: number,
  dy: number,
  options: MoveElementsOptions = {},
): GraphicDocument {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return document;
  const selectedIds = new Set(ids);
  const movable = document.elements.filter((element) => selectedIds.has(element.id) && !element.locked);
  if (!movable.length) return document;

  let nextDx = dx;
  let nextDy = dy;
  if (options.clampToCanvas !== false) {
    const left = Math.min(...movable.map((element) => element.x));
    const top = Math.min(...movable.map((element) => element.y));
    const right = Math.max(...movable.map((element) => element.x + element.width));
    const bottom = Math.max(...movable.map((element) => element.y + element.height));
    const minimumDx = -left;
    const maximumDx = document.canvas.width - right;
    const minimumDy = -top;
    const maximumDy = document.canvas.height - bottom;
    nextDx = minimumDx <= maximumDx ? clamp(dx, minimumDx, maximumDx) : 0;
    nextDy = minimumDy <= maximumDy ? clamp(dy, minimumDy, maximumDy) : 0;
  }
  if (nextDx === 0 && nextDy === 0) return document;

  return {
    ...document,
    elements: document.elements.map((element) => selectedIds.has(element.id) && !element.locked
      ? { ...element, x: element.x + nextDx, y: element.y + nextDy }
      : element),
  };
}

function boundedDimension(value: number, current: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return current;
  return clamp(value, minimum, Math.max(minimum, maximum));
}

export function resizeCanvas(
  document: GraphicDocument,
  width: number,
  height: number,
  options: ResizeCanvasOptions = {},
): GraphicDocument {
  const nextWidth = boundedDimension(width, document.canvas.width, options.minWidth ?? 1, options.maxWidth ?? Infinity);
  const nextHeight = boundedDimension(height, document.canvas.height, options.minHeight ?? 1, options.maxHeight ?? Infinity);
  if (nextWidth === document.canvas.width && nextHeight === document.canvas.height) return document;

  const resized: GraphicDocument = {
    ...document,
    canvas: { ...document.canvas, width: nextWidth, height: nextHeight },
    elements: document.elements,
  };
  const mode = options.elementMode ?? "preserve";
  if (mode === "preserve") return resized;

  if (mode === "clamp") {
    return { ...resized, elements: document.elements.map((element) => clampElementToCanvas(element, resized)) };
  }

  const scaleX = nextWidth / document.canvas.width;
  const scaleY = nextHeight / document.canvas.height;
  return {
    ...resized,
    elements: document.elements.map((element) => {
      const scaled = {
        ...element,
        x: element.x * scaleX,
        y: element.y * scaleY,
        width: element.width * scaleX,
        height: element.height * scaleY,
      };
      if (element.type === "text") return { ...scaled, fontSize: element.fontSize * scaleY };
      if (element.type === "shape") {
        const visualScale = Math.min(scaleX, scaleY);
        return { ...scaled, strokeWidth: element.strokeWidth * visualScale, cornerRadius: element.cornerRadius * visualScale };
      }
      return scaled;
    }),
  };
}

export function moveElementWithKeyboard(
  document: GraphicDocument,
  id: string,
  movement: KeyboardMovement,
  options: KeyboardMovementOptions = {},
): GraphicDocument {
  return moveElementsWithKeyboard(document, [id], movement, options);
}

export function moveElementsWithKeyboard(
  document: GraphicDocument,
  ids: readonly string[],
  movement: KeyboardMovement,
  options: KeyboardMovementOptions = {},
): GraphicDocument {
  const direction = movement.key.startsWith("Arrow") ? movement.key.slice(5) : movement.key;
  if (!(["Left", "Right", "Up", "Down"] as string[]).includes(direction)) return document;

  const distance = movement.altKey
    ? (options.precisionStep ?? 0.25)
    : movement.shiftKey
      ? (options.acceleratedStep ?? 10)
      : (options.step ?? 1);
  const dx = direction === "Left" ? -distance : direction === "Right" ? distance : 0;
  const dy = direction === "Up" ? -distance : direction === "Down" ? distance : 0;

  return moveElementsByDelta(document, ids, dx, dy, { clampToCanvas: options.clampToCanvas });
}

export function copyElementStyle(element: GraphicElement): GraphicElementStyle {
  const common = { opacity: element.opacity, rotation: element.rotation };
  if (element.type === "text") {
    return {
      ...common,
      type: "text",
      color: element.color,
      fontFamily: element.fontFamily,
      fontSize: element.fontSize,
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      textDecoration: element.textDecoration,
      strokeColor: element.strokeColor,
      strokeWidth: element.strokeWidth,
      align: element.align,
      lineHeight: element.lineHeight,
    };
  }
  if (element.type === "shape") {
    return {
      ...common,
      type: "shape",
      fillEnabled: element.fillEnabled,
      fillColor: element.fillColor,
      strokeColor: element.strokeColor,
      strokeWidth: element.strokeWidth,
      strokeDash: element.strokeDash,
      cornerRadius: element.cornerRadius,
      arrowStart: element.arrowStart,
      arrowEnd: element.arrowEnd,
    };
  }
  return { ...common, type: element.type, fit: element.fit };
}

export function applyElementStyle(element: GraphicElement, style: GraphicElementStyle): GraphicElement {
  if (element.type === "text") {
    if (style.type !== "text") {
      return { ...element, opacity: style.opacity, rotation: style.rotation };
    }
    return {
      ...element,
      opacity: style.opacity,
      rotation: style.rotation,
      color: style.color,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      textDecoration: style.textDecoration,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth,
      align: style.align,
      lineHeight: style.lineHeight,
    };
  }
  if (element.type === "shape") {
    if (style.type !== "shape") return { ...element, opacity: style.opacity, rotation: style.rotation };
    return {
      ...element,
      opacity: style.opacity,
      rotation: style.rotation,
      fillEnabled: style.fillEnabled,
      fillColor: style.fillColor,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth,
      strokeDash: style.strokeDash,
      cornerRadius: style.cornerRadius,
      arrowStart: style.arrowStart,
      arrowEnd: style.arrowEnd,
    };
  }
  if (style.type === "text" || style.type === "shape") {
    return { ...element, opacity: style.opacity, rotation: style.rotation };
  }
  return {
    ...element,
    opacity: style.opacity,
    rotation: style.rotation,
    fit: style.fit,
  };
}

export function applyStyleToElement(
  document: GraphicDocument,
  id: string,
  style: GraphicElementStyle,
): GraphicDocument {
  return mapElement(document, id, (element) => applyElementStyle(element, style));
}
