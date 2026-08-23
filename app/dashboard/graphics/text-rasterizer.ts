import type { BindingValues, GraphicDocument, GraphicPreviewMode, TextElement } from "./graphic-document";
import { resolveTextElement } from "./svg-renderer";
import { layoutText } from "./text-layout";

const EXPORT_TEXT_SCALE = 2;

function canvasFont(element: TextElement): string {
  return `${element.fontStyle ?? "normal"} ${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
}

async function rasterizeTextElement(
  element: TextElement,
  mode: GraphicPreviewMode,
  bindings: BindingValues,
): Promise<string> {
  if (typeof globalThis.document === "undefined") throw new Error("Text export requires a browser canvas.");
  const font = canvasFont(element);
  try {
    await globalThis.document.fonts?.load(font);
  } catch {
    // The canvas fallback family still gives the export readable text.
  }

  const canvas = globalThis.document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(element.width * EXPORT_TEXT_SCALE));
  canvas.height = Math.max(1, Math.ceil(element.height * EXPORT_TEXT_SCALE));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not initialize the browser text renderer.");

  context.scale(EXPORT_TEXT_SCALE, EXPORT_TEXT_SCALE);
  context.font = font;
  context.textBaseline = "top";
  context.textAlign = element.align;
  context.fillStyle = element.color;
  context.globalAlpha = 1;
  context.lineJoin = "round";
  context.lineCap = "round";

  const x = element.align === "center" ? element.width / 2 : element.align === "right" ? element.width : 0;
  const layout = layoutText(resolveTextElement(element, mode, bindings), element);
  layout.lines.forEach((line, index) => {
    const y = index * layout.lineHeight;
    if ((element.strokeWidth ?? 0) > 0) {
      context.strokeStyle = element.strokeColor ?? "#000000";
      context.lineWidth = element.strokeWidth ?? 0;
      context.strokeText(line, x, y);
    }
    context.fillText(line, x, y);
  });

  if (element.textDecoration === "underline") {
    context.strokeStyle = element.color;
    context.lineWidth = Math.max(1, element.fontSize / 16);
    layout.lines.forEach((line, index) => {
      const metrics = context.measureText(line);
      const startX = element.align === "center" ? x - metrics.width / 2 : element.align === "right" ? x - metrics.width : x;
      const y = index * layout.lineHeight + element.fontSize * 1.02;
      context.beginPath();
      context.moveTo(startX, y);
      context.lineTo(startX + metrics.width, y);
      context.stroke();
    });
  }

  return canvas.toDataURL("image/png");
}

/** Rasterizes text with the browser's loaded fonts before resvg handles the final PNG. */
export async function rasterizeGraphicText(
  document: GraphicDocument,
  mode: GraphicPreviewMode,
  bindings: BindingValues,
): Promise<Record<string, string>> {
  const entries = await Promise.all(document.elements
    .filter((element): element is TextElement => element.type === "text")
    .map(async (element) => [element.id, await rasterizeTextElement(element, mode, bindings)] as const));
  return Object.fromEntries(entries);
}
