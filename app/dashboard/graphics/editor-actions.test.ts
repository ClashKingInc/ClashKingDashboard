import { describe, expect, it } from "vitest";
import type { GraphicDocument, GraphicElement, TextElement } from "./graphic-document";
import {
  alignElement,
  alignElements,
  applyElementStyle,
  applyStyleToElement,
  copyElementStyle,
  deleteElement,
  duplicateElement,
  moveElementWithKeyboard,
  moveElementsByDelta,
  moveElementsWithKeyboard,
  reorderElement,
  reorderElements,
  reorderElementsByLayerDrop,
  reorderSelectedElements,
  resizeCanvas,
  selectElementGroup,
  setElementsLocked,
} from "./editor-actions";

const text: TextElement = {
  id: "text",
  type: "text",
  name: "Heading",
  x: 20,
  y: 30,
  width: 100,
  height: 40,
  rotation: 0,
  opacity: 1,
  content: "Hello",
  color: "#fff",
  fontFamily: "Arial",
  fontSize: 20,
  fontWeight: 700,
  align: "left",
  lineHeight: 1.2,
  fallbacks: {},
};

const image: GraphicElement = {
  id: "image",
  type: "image",
  name: "Badge",
  x: 150,
  y: 80,
  width: 50,
  height: 60,
  rotation: 10,
  opacity: 0.8,
  source: "badge.png",
  fit: "contain",
};

const dynamicImage: GraphicElement = {
  id: "dynamic",
  type: "dynamic-image",
  name: "League",
  x: 240,
  y: 120,
  width: 40,
  height: 40,
  rotation: 0,
  opacity: 1,
  binding: "league",
  placeholder: "league.png",
  fit: "cover",
  fallback: { behavior: "hide" },
};

const shape: GraphicElement = {
  id: "shape",
  type: "shape",
  shape: "rectangle",
  name: "Box",
  x: 30,
  y: 40,
  width: 120,
  height: 80,
  rotation: 0,
  opacity: 1,
  fillEnabled: true,
  fillColor: "#ff0000",
  strokeColor: "#ffffff",
  strokeWidth: 4,
  strokeDash: "solid",
  cornerRadius: 12,
  arrowStart: "none",
  arrowEnd: "none",
};

function makeDocument(): GraphicDocument {
  return {
    version: 1,
    name: "Test",
    canvas: { width: 300, height: 200, background: "#000" },
    elements: [structuredClone(text), structuredClone(image), structuredClone(dynamicImage)],
  };
}

describe("editor element actions", () => {
  it("duplicates immediately above the source with a unique id and configurable offset", () => {
    const original = makeDocument();
    const result = duplicateElement(original, "image", {
      offset: { x: 7, y: -3 },
      createId: () => "text",
    });

    expect(result.elements.map((element) => element.id)).toEqual(["text", "image", "text-2", "dynamic"]);
    expect(result.elements[2]).toMatchObject({ name: "Badge copy", x: 157, y: 77, source: "badge.png" });
    expect(original).toEqual(makeDocument());
    expect(result.elements[1]).toBe(original.elements[1]);
  });

  it("uses the standard duplicate offset and leaves a missing selection untouched", () => {
    const original = makeDocument();
    expect(duplicateElement(original, "text", { createId: () => "copy" }).elements[1])
      .toMatchObject({ id: "copy", x: 36, y: 46 });
    expect(duplicateElement(original, "missing")).toBe(original);
  });

  it("deletes only the requested element without mutating the document", () => {
    const original = makeDocument();
    const result = deleteElement(original, "image");

    expect(result.elements.map((element) => element.id)).toEqual(["text", "dynamic"]);
    expect(original.elements).toHaveLength(3);
    expect(deleteElement(original, "missing")).toBe(original);
  });

  it.each([
    ["forward", "image", ["text", "dynamic", "image"]],
    ["backward", "image", ["image", "text", "dynamic"]],
    ["front", "text", ["image", "dynamic", "text"]],
    ["back", "dynamic", ["dynamic", "text", "image"]],
  ] as const)("moves an element %s in back-to-front layer order", (action, id, expected) => {
    const original = makeDocument();
    expect(reorderElement(original, id, action).elements.map((element) => element.id)).toEqual(expected);
    expect(original.elements.map((element) => element.id)).toEqual(["text", "image", "dynamic"]);
  });

  it("returns the same document when a layer action cannot move the element", () => {
    const original = makeDocument();
    expect(reorderElement(original, "text", "backward")).toBe(original);
    expect(reorderElement(original, "dynamic", "front")).toBe(original);
    expect(reorderElement(original, "missing", "front")).toBe(original);
  });

  it("reorders a multi-selection as one stable layer block", () => {
    const original = makeDocument();
    const result = reorderElements(original, ["dynamic", "text"], 1);
    expect(result.elements.map((element) => element.id)).toEqual(["image", "text", "dynamic"]);
    expect(result.elements[1]).toBe(original.elements[0]);
    expect(reorderElements(original, ["text", "image"], 0)).toBe(original);
  });

  it("moves a selected layer block to the front, back, or one level", () => {
    const original = makeDocument();
    expect(reorderSelectedElements(original, ["text", "image"], "front").elements.map((element) => element.id)).toEqual(["dynamic", "text", "image"]);
    expect(reorderSelectedElements(original, ["image", "dynamic"], "back").elements.map((element) => element.id)).toEqual(["image", "dynamic", "text"]);
    expect(reorderSelectedElements(original, ["text"], "forward").elements.map((element) => element.id)).toEqual(["image", "text", "dynamic"]);
  });

  it("converts front-to-back layer drops back into document order", () => {
    const original = makeDocument();
    expect(reorderElementsByLayerDrop(original, ["text"], "text", "dynamic").elements.map((element) => element.id)).toEqual(["image", "dynamic", "text"]);
    expect(reorderElementsByLayerDrop(original, ["dynamic"], "dynamic", "text").elements.map((element) => element.id)).toEqual(["dynamic", "text", "image"]);
  });

  it.each([
    ["top", { x: 20, y: 0 }],
    ["middle", { x: 20, y: 80 }],
    ["bottom", { x: 20, y: 160 }],
    ["left", { x: 0, y: 30 }],
    ["center", { x: 100, y: 30 }],
    ["right", { x: 200, y: 30 }],
  ] as const)("aligns %s to the canvas", (alignment, expected) => {
    const original = makeDocument();
    const result = alignElement(original, "text", alignment);
    expect(result.elements[0]).toMatchObject(expected);
    expect(original.elements[0]).toMatchObject({ x: 20, y: 30 });
  });
});

describe("multi-element actions", () => {
  it("moves a selection as one group when aligning it to the canvas", () => {
    const result = alignElements(makeDocument(), ["text", "image"], "center", "canvas");
    expect(result.elements[0].x).toBe(60);
    expect(result.elements[1].x).toBe(190);
  });

  it("aligns individual elements together inside selection bounds", () => {
    const result = alignElements(makeDocument(), ["text", "image"], "left", "selection");
    expect(result.elements[0].x).toBe(20);
    expect(result.elements[1].x).toBe(20);
  });

  it("selects every generated element sharing a group", () => {
    const document = makeDocument();
    document.elements[0] = { ...document.elements[0], groupId: "members" };
    document.elements[1] = { ...document.elements[1], groupId: "members" };
    expect(selectElementGroup(document, "text")).toEqual(["text", "image"]);
    expect(selectElementGroup(document, "dynamic")).toEqual(["dynamic"]);
  });

  it("moves selected elements by one shared delta while leaving locked elements in place", () => {
    const document = makeDocument();
    document.elements[1] = { ...document.elements[1], locked: true };
    const result = moveElementsByDelta(document, ["text", "image"], 15, 10);
    expect(result.elements[0]).toMatchObject({ x: 35, y: 40 });
    expect(result.elements[1]).toMatchObject({ x: 150, y: 80, locked: true });
    expect(result.elements[2]).toBe(document.elements[2]);
  });

  it("clamps a multi-element move as a group so spacing stays unchanged", () => {
    const result = moveElementsByDelta(makeDocument(), ["text", "image"], -100, 200);
    expect(result.elements[0]).toMatchObject({ x: 0, y: 90 });
    expect(result.elements[1]).toMatchObject({ x: 130, y: 140 });
  });

  it("locks and unlocks all selected elements", () => {
    const locked = setElementsLocked(makeDocument(), ["text", "dynamic"], true);
    expect(locked.elements.map((element) => Boolean(element.locked))).toEqual([true, false, true]);
    expect(setElementsLocked(locked, ["text", "dynamic"], false).elements.map((element) => Boolean(element.locked))).toEqual([false, false, false]);
    expect(setElementsLocked(makeDocument(), ["missing"], true)).toEqual(makeDocument());
  });
});

describe("canvas resizing", () => {
  it("preserves elements by default and clamps dimensions to configured bounds", () => {
    const original = makeDocument();
    const result = resizeCanvas(original, 20, 900, {
      minWidth: 100,
      maxHeight: 500,
    });

    expect(result.canvas).toEqual({ width: 100, height: 500, background: "#000" });
    expect(result.elements).toBe(original.elements);
    expect(original.canvas).toEqual({ width: 300, height: 200, background: "#000" });
  });

  it("keeps the current dimension for non-finite input", () => {
    const original = makeDocument();
    expect(resizeCanvas(original, Number.NaN, Infinity).canvas).toEqual(original.canvas);
    expect(resizeCanvas(original, Number.NaN, Infinity)).toBe(original);
  });

  it("clamps element positions inside a smaller canvas", () => {
    const result = resizeCanvas(makeDocument(), 180, 100, { elementMode: "clamp" });
    expect(result.elements[0]).toMatchObject({ x: 20, y: 30 });
    expect(result.elements[1]).toMatchObject({ x: 130, y: 40 });
    expect(result.elements[2]).toMatchObject({ x: 140, y: 60 });
  });

  it("scales positions and geometry, including text size, without changing text content", () => {
    const original = makeDocument();
    const result = resizeCanvas(original, 600, 100, { elementMode: "scale" });

    expect(result.elements[0]).toMatchObject({ x: 40, y: 15, width: 200, height: 20, fontSize: 10, content: "Hello" });
    expect(result.elements[1]).toMatchObject({ x: 300, y: 40, width: 100, height: 30, source: "badge.png" });
    expect(original.elements[0]).toEqual(text);
  });
});

describe("keyboard movement", () => {
  it("uses normal, accelerated, and precision movement increments", () => {
    const original = makeDocument();
    expect(moveElementWithKeyboard(original, "text", { key: "ArrowRight" }).elements[0].x).toBe(21);
    expect(moveElementWithKeyboard(original, "text", { key: "Down", shiftKey: true }).elements[0].y).toBe(40);
    expect(moveElementWithKeyboard(original, "text", { key: "ArrowLeft", altKey: true }).elements[0].x).toBe(19.75);
  });

  it("clamps to the canvas by default and can allow off-canvas movement", () => {
    const original = makeDocument();
    original.elements[0] = { ...original.elements[0], x: 0 };

    expect(moveElementWithKeyboard(original, "text", { key: "ArrowLeft" }).elements[0].x).toBe(0);
    expect(moveElementWithKeyboard(original, "text", { key: "ArrowLeft" }, { clampToCanvas: false }).elements[0].x).toBe(-1);
  });

  it("ignores unrelated keys and missing elements", () => {
    const original = makeDocument();
    expect(moveElementWithKeyboard(original, "text", { key: "Enter" })).toBe(original);
    expect(moveElementWithKeyboard(original, "missing", { key: "ArrowUp" })).toBe(original);
  });

  it("moves a keyboard selection together and skips locked members", () => {
    const original = makeDocument();
    original.elements[1] = { ...original.elements[1], locked: true };
    const result = moveElementsWithKeyboard(original, ["text", "image"], { key: "ArrowDown", shiftKey: true });
    expect(result.elements[0].y).toBe(40);
    expect(result.elements[1].y).toBe(80);
  });
});

describe("element styles", () => {
  it("copies shape presentation without replacing the target shape or geometry", () => {
    const style = copyElementStyle(shape);
    const target = { ...shape, shape: "ellipse" as const, x: 200, fillColor: "#000000", cornerRadius: 0 };
    const result = applyElementStyle(target, style);
    expect(result).toMatchObject({ type: "shape", shape: "ellipse", x: 200, fillColor: "#ff0000", cornerRadius: 12, strokeWidth: 4 });
  });

  it("copies and applies all text presentation properties while preserving content and geometry", () => {
    const source = {
      ...text,
      color: "#f00",
      fontFamily: "Clash",
      fontSize: 42,
      fontStyle: "italic" as const,
      textDecoration: "underline" as const,
      align: "center" as const,
      rotation: 12,
    };
    const target = { ...text, id: "target", content: "Keep me", x: 99 };
    const result = applyElementStyle(target, copyElementStyle(source));

    expect(result).toMatchObject({
      color: "#f00",
      fontFamily: "Clash",
      fontSize: 42,
      fontStyle: "italic",
      textDecoration: "underline",
      align: "center",
      rotation: 12,
    });
    expect(result).toMatchObject({ id: "target", content: "Keep me", x: 99 });
  });

  it("shares image fit between static and dynamic images without replacing their sources", () => {
    const style = copyElementStyle({ ...image, fit: "cover", opacity: 0.4 });
    const result = applyElementStyle(dynamicImage, style);

    expect(result).toMatchObject({ type: "dynamic-image", fit: "cover", opacity: 0.4, binding: "league" });
  });

  it("applies common styling across incompatible types and leaves type-specific data intact", () => {
    const result = applyStyleToElement(makeDocument(), "image", copyElementStyle({ ...text, rotation: 45, opacity: 0.3 }));
    expect(result.elements[1]).toMatchObject({ type: "image", rotation: 45, opacity: 0.3, fit: "contain", source: "badge.png" });
    expect(result.elements[0]).toEqual(text);
  });
});
