import { describe, expect, it } from "vitest";

import { layoutText, minimumTextWidth, resizeTextElement, withAutoTextHeight } from "./text-layout";
import type { TextElement } from "./graphic-document";

const textStyle = { width: 120, fontSize: 20, fontWeight: 600, lineHeight: 1.2, strokeWidth: 0 };

describe("text box layout", () => {
  it("wraps words and grows the box height", () => {
    const layout = layoutText("Home village member", textStyle);
    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.height).toBe(Math.ceil(layout.lines.length * 24));
  });

  it("breaks a long token down to graphemes without dropping characters", () => {
    const layout = layoutText("ABCDEFGHIJ", { ...textStyle, width: 18 });
    expect(layout.lines.join("")).toBe("ABCDEFGHIJ");
    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.every((line) => line.length > 0)).toBe(true);
  });

  it("preserves explicit blank lines", () => {
    expect(layoutText("First\n\nThird", { ...textStyle, width: 500 }).lines).toEqual(["First", "", "Third"]);
  });

  it("sets the minimum width to one usable glyph", () => {
    const minWidth = minimumTextWidth("Milo", textStyle);
    expect(minWidth).toBeGreaterThan(0);
    expect(layoutText("Milo", { ...textStyle, width: 1 }).minWidth).toBe(minWidth);
  });

  it("scales font and frame proportionally from a corner without changing line breaks", () => {
    const element = withAutoTextHeight({
      id: "text",
      type: "text",
      name: "Roster row",
      x: 100,
      y: 80,
      width: 120,
      height: 40,
      rotation: 0,
      opacity: 1,
      content: "Home village member",
      color: "#fff",
      fontFamily: "Arial",
      fontSize: 20,
      fontWeight: 600,
      align: "left",
      lineHeight: 1.2,
      fallbacks: {},
    } satisfies TextElement, "Home village member");
    const resized = resizeTextElement(
      element,
      element.content,
      "se",
      element.width / 2,
      element.height / 2,
      { width: 1000, height: 1000 },
    );

    expect(resized.width).toBe(element.width * 1.5);
    expect(resized.fontSize).toBe(element.fontSize * 1.5);
    expect(resized.height).toBeCloseTo(element.height * 1.5, 0);
    expect(layoutText(element.content, resized).lines).toEqual(layoutText(element.content, element).lines);
  });

  it("keeps the opposite corner anchored when scaling from the northwest", () => {
    const element = {
      id: "text",
      type: "text",
      name: "Title",
      x: 100,
      y: 80,
      width: 200,
      height: 48,
      rotation: 0,
      opacity: 1,
      content: "War title",
      color: "#fff",
      fontFamily: "Arial",
      fontSize: 40,
      fontWeight: 700,
      align: "left",
      lineHeight: 1.2,
      fallbacks: {},
    } satisfies TextElement;
    const resized = resizeTextElement(element, element.content, "nw", -50, -12, { width: 1000, height: 1000 });

    expect(resized.x + resized.width).toBeCloseTo(element.x + element.width, 2);
    expect(resized.y + resized.height).toBeCloseTo(element.y + element.height, 2);
    expect(resized.fontSize).toBeGreaterThan(element.fontSize);
  });

  it("uses an edge handle as a wrapping-width control without scaling the font", () => {
    const element = {
      id: "text",
      type: "text",
      name: "Details",
      x: 50,
      y: 50,
      width: 240,
      height: 24,
      rotation: 0,
      opacity: 1,
      content: "One two three four",
      color: "#fff",
      fontFamily: "Arial",
      fontSize: 20,
      fontWeight: 600,
      align: "left",
      lineHeight: 1.2,
      fallbacks: {},
    } satisfies TextElement;
    const resized = resizeTextElement(element, element.content, "e", -140, 0, { width: 500, height: 500 });

    expect(resized.fontSize).toBe(element.fontSize);
    expect(resized.width).toBe(100);
    expect(resized.height).toBeGreaterThan(element.height);
  });

  it("clamps corner scaling to usable text and canvas bounds", () => {
    const element = {
      id: "text",
      type: "text",
      name: "Small",
      x: 10,
      y: 10,
      width: 100,
      height: 24,
      rotation: 0,
      opacity: 1,
      content: "M",
      color: "#fff",
      fontFamily: "Arial",
      fontSize: 20,
      fontWeight: 600,
      align: "left",
      lineHeight: 1.2,
      fallbacks: {},
    } satisfies TextElement;
    const tiny = resizeTextElement(element, element.content, "se", -1000, -1000, { width: 500, height: 500 });
    const large = resizeTextElement(element, element.content, "se", 1000, 1000, { width: 160, height: 100 });

    expect(tiny.fontSize).toBeGreaterThanOrEqual(8);
    expect(tiny.width).toBeGreaterThanOrEqual(24);
    expect(tiny.height).toBeGreaterThanOrEqual(24);
    expect(large.x + large.width).toBeLessThanOrEqual(160);
    expect(large.y + large.height).toBeLessThanOrEqual(100);
  });
});
