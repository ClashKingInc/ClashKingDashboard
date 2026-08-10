import { afterEach, describe, expect, it, vi } from "vitest";

import type { GraphicDocument, TextElement } from "./graphic-document";
import { rasterizeGraphicText } from "./text-rasterizer";

function textElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: "title",
    type: "text",
    name: "Title",
    x: 0,
    y: 0,
    width: 200,
    height: 80,
    rotation: 0,
    opacity: 1,
    content: "Clan title",
    color: "#ffffff",
    fontFamily: "Arial",
    fontSize: 24,
    fontWeight: 700,
    align: "left",
    lineHeight: 1.2,
    fallbacks: {},
    ...overrides,
  };
}

function graphicDocument(elements: GraphicDocument["elements"]): GraphicDocument {
  return {
    version: 1,
    name: "Export",
    canvas: { width: 1200, height: 630, background: "#111214" },
    elements,
  };
}

function canvasContext() {
  return {
    scale: vi.fn(),
    strokeText: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 72 })),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("graphic text rasterization", () => {
  it("rasterizes every text alignment while ignoring non-text elements", async () => {
    const context = canvasContext();
    const loadFont = vi.fn().mockRejectedValue(new Error("font unavailable"));
    Object.defineProperty(document, "fonts", { configurable: true, value: { load: loadFont } });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,text");

    const result = await rasterizeGraphicText(graphicDocument([
      textElement(),
      textElement({ id: "center", align: "center", strokeWidth: 2, strokeColor: "#000000", textDecoration: "underline" }),
      textElement({ id: "right", align: "right", width: 0, height: 0, fontStyle: "italic" }),
      {
        id: "shape",
        type: "shape",
        name: "Shape",
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        rotation: 0,
        opacity: 1,
        shape: "rectangle",
        fillEnabled: true,
        fillColor: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 0,
        strokeDash: "solid",
        cornerRadius: 0,
        arrowStart: "none",
        arrowEnd: "none",
      },
    ]), "placeholder", {});

    expect(result).toEqual({
      title: "data:image/png;base64,text",
      center: "data:image/png;base64,text",
      right: "data:image/png;base64,text",
    });
    expect(loadFont).toHaveBeenCalledTimes(3);
    expect(context.scale).toHaveBeenCalledWith(2, 2);
    expect(context.fillText).toHaveBeenCalled();
    expect(context.strokeText).toHaveBeenCalled();
    expect(context.measureText).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
  });

  it("returns an empty map when the document has no text", async () => {
    await expect(rasterizeGraphicText(graphicDocument([]), "live", {})).resolves.toEqual({});
  });

  it("reports when the browser cannot create a canvas renderer", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    await expect(rasterizeGraphicText(
      graphicDocument([textElement()]),
      "placeholder",
      {},
    )).rejects.toThrow("Could not initialize the browser text renderer.");
  });
});
