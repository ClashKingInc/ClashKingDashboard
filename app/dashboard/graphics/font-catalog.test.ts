import { describe, expect, it } from "vitest";
import { editorFontStack, googleFontStylesheetUrl } from "./font-catalog";

describe("graphic editor font catalog", () => {
  it("creates a Google Fonts stylesheet URL for catalog fonts", () => {
    expect(googleFontStylesheetUrl("Bebas Neue")).toContain("family=Bebas+Neue");
  });

  it("keeps system fonts local", () => {
    expect(googleFontStylesheetUrl("Arial")).toBeNull();
    expect(editorFontStack("Arial")).toBe("'Arial', sans-serif");
  });
});
