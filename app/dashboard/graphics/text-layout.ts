import type { TextElement } from "./graphic-document";

export interface TextLayout {
  lines: string[];
  lineHeight: number;
  height: number;
  minWidth: number;
}

export type TextResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface TextResizeCanvas {
  width: number;
  height: number;
}

function graphemes(value: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...segmenter.segment(value)].map((part) => part.segment);
  }
  return Array.from(value);
}

function glyphWidth(glyph: string, fontSize: number, fontWeight: number): number {
  const weightScale = fontWeight >= 700 ? 1.04 : 1;
  if (/\s/u.test(glyph)) return fontSize * 0.33;
  if (/[ilI1|.,'!:;]/u.test(glyph)) return fontSize * 0.3 * weightScale;
  if (/[MW@#%&]/u.test(glyph)) return fontSize * 0.9 * weightScale;
  if (/\p{Extended_Pictographic}/u.test(glyph)) return fontSize;
  return fontSize * 0.58 * weightScale;
}

export function estimateTextWidth(value: string, fontSize: number, fontWeight: number): number {
  return graphemes(value).reduce((width, glyph) => width + glyphWidth(glyph, fontSize, fontWeight), 0);
}

export function minimumTextWidth(value: string, element: Pick<TextElement, "fontSize" | "fontWeight" | "strokeWidth">): number {
  const glyphs = graphemes(value.replace(/\s/gu, ""));
  const widest = Math.max(...(glyphs.length ? glyphs : ["M"]).map((glyph) => glyphWidth(glyph, element.fontSize, element.fontWeight)));
  return Math.ceil(widest + (element.strokeWidth ?? 0) * 2);
}

function breakWord(word: string, width: number, element: Pick<TextElement, "fontSize" | "fontWeight">): string[] {
  const chunks: string[] = [];
  let chunk = "";
  for (const glyph of graphemes(word)) {
    const candidate = chunk + glyph;
    if (chunk && estimateTextWidth(candidate, element.fontSize, element.fontWeight) > width) {
      chunks.push(chunk);
      chunk = glyph;
    } else {
      chunk = candidate;
    }
  }
  if (chunk || !chunks.length) chunks.push(chunk);
  return chunks;
}

export function layoutText(value: string, element: Pick<TextElement, "width" | "fontSize" | "fontWeight" | "lineHeight" | "strokeWidth">): TextLayout {
  const minWidth = minimumTextWidth(value, element);
  const width = Math.max(minWidth, element.width);
  const lines: string[] = [];
  for (const paragraph of value.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/u)) {
      const candidate = line ? `${line} ${word}` : word;
      if (estimateTextWidth(candidate, element.fontSize, element.fontWeight) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      const chunks = breakWord(word, width, element);
      line = chunks.pop() ?? "";
      lines.push(...chunks);
    }
    lines.push(line);
  }
  const lineHeight = element.fontSize * element.lineHeight;
  return {
    lines: lines.length ? lines : [""],
    lineHeight,
    height: Math.ceil(Math.max(1, lines.length) * lineHeight + (element.strokeWidth ?? 0) * 2),
    minWidth,
  };
}

export function withAutoTextHeight(element: TextElement, value: string): TextElement {
  const layout = layoutText(value, element);
  return { ...element, width: Math.max(element.width, layout.minWidth), height: layout.height };
}

function rounded(value: number, precision = 100): number {
  return Math.round(value * precision) / precision;
}

function isCornerHandle(handle: TextResizeHandle): boolean {
  return handle.length === 2;
}

/**
 * Resize a text frame using editor handle conventions. Corner handles scale
 * the text object as one proportional unit; edge handles keep the font size
 * fixed and resize the wrapping frame.
 */
export function resizeTextElement(
  element: TextElement,
  value: string,
  handle: TextResizeHandle,
  deltaX: number,
  deltaY: number,
  canvas: TextResizeCanvas,
  minimumElementSize = 24,
  minimumFontSize = 8,
): TextElement {
  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.includes("n");
  const south = handle.includes("s");

  if (isCornerHandle(handle)) {
    // Project the pointer movement onto the original diagonal. This lets
    // either pointer axis contribute while keeping width, height, and type in
    // the same proportion.
    const outwardX = (east ? deltaX : -deltaX);
    const outwardY = (south ? deltaY : -deltaY);
    const denominator = element.width ** 2 + element.height ** 2;
    const desiredScale = denominator > 0
      ? 1 + (outwardX * element.width + outwardY * element.height) / denominator
      : 1;
    const minimumScale = Math.max(
      Math.min(1, minimumElementSize / Math.max(1, element.width)),
      Math.min(1, minimumElementSize / Math.max(1, element.height)),
      Math.min(1, minimumFontSize / Math.max(1, element.fontSize)),
    );
    const availableWidth = east ? canvas.width - element.x : element.x + element.width;
    const availableHeight = south ? canvas.height - element.y : element.y + element.height;
    const maximumScale = Math.max(
      minimumScale,
      Math.min(availableWidth / element.width, availableHeight / element.height),
    );
    const scale = Math.max(minimumScale, Math.min(maximumScale, desiredScale));
    const oppositeX = element.x + element.width;
    const oppositeY = element.y + element.height;
    const scaled = withAutoTextHeight({
      ...element,
      width: rounded(element.width * scale),
      height: rounded(element.height * scale),
      fontSize: rounded(element.fontSize * scale),
    }, value);
    return {
      ...scaled,
      x: rounded(west ? oppositeX - scaled.width : element.x),
      y: rounded(north ? oppositeY - scaled.height : element.y),
    };
  }

  let x = element.x;
  let y = element.y;
  let width = element.width;
  let height = element.height;
  const minimumWidth = minimumTextWidth(value, element);
  if (east) width = Math.min(canvas.width - x, Math.max(minimumWidth, width + deltaX));
  if (south) height = Math.min(canvas.height - y, Math.max(minimumElementSize, height + deltaY));
  if (west) {
    const nextX = Math.max(0, Math.min(element.x + element.width - minimumWidth, element.x + deltaX));
    width = element.width + element.x - nextX;
    x = nextX;
  }
  if (north) {
    const nextY = Math.max(0, Math.min(element.y + element.height - minimumElementSize, element.y + deltaY));
    height = element.height + element.y - nextY;
    y = nextY;
  }
  return withAutoTextHeight({
    ...element,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  }, value);
}
