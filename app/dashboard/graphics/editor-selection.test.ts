import { describe, expect, it } from "vitest";

import type { GraphicElement } from "./graphic-document";
import {
  mergeSelectionIds,
  resolveElementSelection,
  selectElementIdsInRect,
  selectionRectBetween,
} from "./editor-selection";

const element = (id: string, x: number, y: number, width = 40, height = 40, rotation = 0): GraphicElement => ({
  id,
  type: "image",
  name: id,
  x,
  y,
  width,
  height,
  rotation,
  opacity: 1,
  source: `${id}.png`,
  fit: "contain",
});

describe("graphic editor selection", () => {
  it("normalizes marquee rectangles dragged in either direction", () => {
    expect(selectionRectBetween({ x: 90, y: 70 }, { x: 20, y: 10 })).toEqual({
      x: 20,
      y: 10,
      width: 70,
      height: 60,
    });
  });

  it("selects intersecting elements in document order, including rotated bounds", () => {
    const elements = [
      element("first", 10, 10),
      element("rotated", 80, 80, 40, 40, 45),
      element("outside", 180, 180),
    ];
    expect(selectElementIdsInRect(elements, { x: 0, y: 0, width: 102, height: 102 })).toEqual(["first", "rotated"]);
    expect(selectElementIdsInRect(elements, { x: 55, y: 55, width: 10, height: 10 })).toEqual([]);
  });

  it("uses Ctrl, Command, and Shift to toggle individual elements", () => {
    expect(resolveElementSelection(["first"], "second", { ctrlKey: true })).toEqual(["first", "second"]);
    expect(resolveElementSelection(["first", "second"], "first", { metaKey: true })).toEqual(["second"]);
    expect(resolveElementSelection(["first"], "second", { shiftKey: true })).toEqual(["first", "second"]);
    expect(resolveElementSelection(["first", "second"], "second", {})).toEqual(["first", "second"]);
    expect(resolveElementSelection(["first", "second"], "third", {})).toEqual(["third"]);
  });

  it("merges additive marquee results without duplicates", () => {
    expect(mergeSelectionIds(["first", "second"], ["second", "third"])).toEqual(["first", "second", "third"]);
  });
});
