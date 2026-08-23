import type {
  BindingValues,
  DynamicImageElement,
  GraphicDocument,
  GraphicElement,
  GraphicPreviewMode,
  ShapeElement,
  TextElement,
} from "./graphic-document";
import { findDynamicField, getBindingsInText, PLACEHOLDER_BINDINGS } from "./dynamic-fields";
import { proxyClashApiAssetUrl } from "./asset-url";
import { layoutText } from "./text-layout";

const XML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ENTITIES[character]);
}

export function resolveTextElement(
  element: TextElement,
  mode: GraphicPreviewMode,
  bindings: BindingValues,
): string {
  return element.content.replace(/\{([a-z][a-z0-9_]*)\}/gi, (_token, key: string) => {
    const value = mode === "live" ? bindings[key] : PLACEHOLDER_BINDINGS[key];
    if (value !== null && value !== undefined && String(value) !== "") return String(value);
    return element.fallbacks[key] ?? findDynamicField(key)?.placeholder ?? "";
  });
}

export function resolveDynamicImage(
  element: DynamicImageElement,
  mode: GraphicPreviewMode,
  bindings: BindingValues,
): string | null {
  const liveSource = mode === "live" ? bindings[element.binding] : undefined;
  if (liveSource !== null && liveSource !== undefined && String(liveSource) !== "") return proxyClashApiAssetUrl(String(liveSource));
  if (mode === "placeholder" || element.fallback.behavior === "placeholder") return proxyClashApiAssetUrl(element.placeholder);
  if (element.fallback.behavior === "image") return proxyClashApiAssetUrl(element.fallback.source || element.placeholder);
  return null;
}

function renderTransform(element: GraphicElement): string {
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const scaleX = element.flipX ? -1 : 1;
  const scaleY = element.flipY ? -1 : 1;
  if (!element.rotation && scaleX === 1 && scaleY === 1) return "";
  return ` transform="translate(${centerX} ${centerY}) rotate(${element.rotation}) scale(${scaleX} ${scaleY}) translate(${-centerX} ${-centerY})"`;
}

function renderText(element: TextElement, mode: GraphicPreviewMode, bindings: BindingValues): string {
  const value = resolveTextElement(element, mode, bindings);
  const layout = layoutText(value, element);
  const anchor = element.align === "center" ? "middle" : element.align === "right" ? "end" : "start";
  const x = element.align === "center" ? element.x + element.width / 2 : element.align === "right" ? element.x + element.width : element.x;
  const tspans = layout.lines.map((line, index) => (
    `<tspan x="${x}" dy="${index === 0 ? element.fontSize : layout.lineHeight}">${escapeXml(line)}</tspan>`
  )).join("");

  const stroke = (element.strokeWidth ?? 0) > 0
    ? ` stroke="${escapeXml(element.strokeColor ?? "#000000")}" stroke-width="${element.strokeWidth}" paint-order="stroke fill" stroke-linejoin="round"`
    : "";
  return `<text data-element-id="${escapeXml(element.id)}" x="${x}" y="${element.y}" width="${element.width}" height="${element.height}" fill="${escapeXml(element.color)}" opacity="${element.opacity}" font-family="${escapeXml(element.fontFamily)}" font-size="${element.fontSize}" font-weight="${element.fontWeight}" font-style="${element.fontStyle ?? "normal"}" text-decoration="${element.textDecoration ?? "none"}" text-anchor="${anchor}"${stroke}${renderTransform(element)}>${tspans}</text>`;
}

function renderRasterizedText(element: TextElement, source: string): string {
  return `<image data-element-id="${escapeXml(element.id)}" href="${escapeXml(source)}" x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" opacity="${element.opacity}" preserveAspectRatio="none"${renderTransform(element)} />`;
}

function renderImage(element: GraphicElement & { source: string; fit: "contain" | "cover" }): string {
  return `<image data-element-id="${escapeXml(element.id)}" href="${escapeXml(proxyClashApiAssetUrl(element.source))}" x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" opacity="${element.opacity}" preserveAspectRatio="xMidYMid ${element.fit === "cover" ? "slice" : "meet"}"${renderTransform(element)} />`;
}

function renderShape(element: ShapeElement): string {
  const strokeWidth = Math.max(0, element.strokeWidth);
  const stroke = strokeWidth > 0 ? escapeXml(element.strokeColor) : "none";
  const dash = element.strokeDash === "dashed"
    ? ` stroke-dasharray="${strokeWidth * 4} ${strokeWidth * 2.5}"`
    : element.strokeDash === "dotted"
      ? ` stroke-dasharray="0 ${strokeWidth * 2.5}"`
      : "";
  const common = `data-element-id="${escapeXml(element.id)}" opacity="${element.opacity}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash} stroke-linecap="round" stroke-linejoin="round"${renderTransform(element)}`;
  if (element.shape === "rectangle") {
    const inset = strokeWidth / 2;
    const width = Math.max(0, element.width - strokeWidth);
    const height = Math.max(0, element.height - strokeWidth);
    const radius = Math.max(0, Math.min(element.cornerRadius, width / 2, height / 2));
    return `<rect ${common} x="${element.x + inset}" y="${element.y + inset}" width="${width}" height="${height}" rx="${radius}" fill="${element.fillEnabled ? escapeXml(element.fillColor) : "none"}" />`;
  }
  if (element.shape === "ellipse") {
    return `<ellipse ${common} cx="${element.x + element.width / 2}" cy="${element.y + element.height / 2}" rx="${Math.max(0, (element.width - strokeWidth) / 2)}" ry="${Math.max(0, (element.height - strokeWidth) / 2)}" fill="${element.fillEnabled ? escapeXml(element.fillColor) : "none"}" />`;
  }

  const markerId = `shape-arrow-${element.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const marker = `<defs><marker id="${markerId}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="${Math.max(4, strokeWidth * 1.8)}" markerHeight="${Math.max(4, strokeWidth * 1.8)}" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${escapeXml(element.strokeColor)}" /></marker></defs>`;
  const markerStart = element.arrowStart === "arrow" ? ` marker-start="url(#${markerId})"` : "";
  const markerEnd = element.arrowEnd === "arrow" || element.shape === "arrow" ? ` marker-end="url(#${markerId})"` : "";
  const arrowInset = Math.max(strokeWidth / 2, strokeWidth * 2);
  const centerY = element.y + element.height / 2;
  return `<g>${marker}<line ${common} x1="${element.x + arrowInset}" y1="${centerY}" x2="${element.x + element.width - arrowInset}" y2="${centerY}" fill="none"${markerStart}${markerEnd} /></g>`;
}

export function graphicDocumentToSvg(
  document: GraphicDocument,
  options: { mode?: GraphicPreviewMode; bindings?: BindingValues; rasterizedText?: Record<string, string> } = {},
): string {
  const mode = options.mode ?? "placeholder";
  const bindings = options.bindings ?? {};
  const backgroundImage = document.canvas.backgroundImage?.source
    ? `<image data-element-id="canvas-background" href="${escapeXml(proxyClashApiAssetUrl(document.canvas.backgroundImage.source))}" x="0" y="0" width="${document.canvas.width}" height="${document.canvas.height}" opacity="${document.canvas.backgroundImage.opacity}" preserveAspectRatio="xMidYMid ${document.canvas.backgroundImage.fit === "cover" ? "slice" : "meet"}" />`
    : "";
  const elements = document.elements.map((element) => {
    if (element.type === "text") return options.rasterizedText?.[element.id]
      ? renderRasterizedText(element, options.rasterizedText[element.id])
      : renderText(element, mode, bindings);
    if (element.type === "shape") return renderShape(element);
    if (element.type === "image") return renderImage(element);
    const source = resolveDynamicImage(element, mode, bindings);
    return source ? renderImage({ ...element, source }) : "";
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${document.canvas.width}" height="${document.canvas.height}" viewBox="0 0 ${document.canvas.width} ${document.canvas.height}"><rect width="100%" height="100%" fill="${escapeXml(document.canvas.background)}" />${backgroundImage}${elements}</svg>`;
}

export async function inlineSvgImages(svg: string): Promise<string> {
  const sources = [...new Set([...svg.matchAll(/href="([^"]+)"/g)].map((match) => decodeXmlAttribute(match[1])))];
  const replacements = await Promise.all(sources.map(async (source) => {
    if (source.startsWith("data:")) return [source, source] as const;
    const response = await fetch(proxyClashApiAssetUrl(source));
    if (!response.ok) throw new Error(`Could not load image (${response.status})`);
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    return [source, dataUrl] as const;
  }));
  return replacements.reduce((result, [source, dataUrl]) => result.replaceAll(`href="${escapeXml(source)}"`, `href="${dataUrl}"`), svg);
}

function decodeXmlAttribute(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

export function validateGraphicDocument(value: unknown): value is GraphicDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GraphicDocument>;
  if (candidate.version !== 1 || !candidate.canvas || !Array.isArray(candidate.elements)) return false;
  return Number.isFinite(candidate.canvas.width)
    && Number.isFinite(candidate.canvas.height)
    && typeof candidate.canvas.background === "string"
    && (!candidate.canvas.backgroundImage
      || (typeof candidate.canvas.backgroundImage.source === "string"
        && ["contain", "cover"].includes(candidate.canvas.backgroundImage.fit)
        && Number.isFinite(candidate.canvas.backgroundImage.opacity)))
    && candidate.elements.every((element) => Boolean(element)
      && typeof element.id === "string"
      && ["text", "image", "dynamic-image", "shape"].includes(element.type)
      && (element.type !== "shape"
        || (["rectangle", "ellipse", "line", "arrow"].includes(element.shape)
          && typeof element.fillEnabled === "boolean"
          && typeof element.fillColor === "string"
          && typeof element.strokeColor === "string"
          && Number.isFinite(element.strokeWidth)
          && ["solid", "dashed", "dotted"].includes(element.strokeDash)
          && Number.isFinite(element.cornerRadius)
          && ["none", "arrow"].includes(element.arrowStart)
          && ["none", "arrow"].includes(element.arrowEnd))));
}

export function listDocumentBindings(document: GraphicDocument): string[] {
  return [...new Set(document.elements.flatMap((element) => {
    if (element.type === "text") return getBindingsInText(element.content);
    if (element.type === "dynamic-image") return [element.binding];
    return [];
  }))];
}
