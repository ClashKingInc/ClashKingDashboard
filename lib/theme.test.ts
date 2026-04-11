import { describe, it, expect } from "vitest";
import {
  clashKingColors,
  darkTheme,
  cssVariables,
  applyThemeVariables,
  townHallImageUrl,
  theme,
} from "./theme";

describe("clashKingColors", () => {
  it("has the correct primary color", () => {
    expect(clashKingColors.primary).toBe("#D90709");
  });

  it("has the correct dark and light variants", () => {
    expect(clashKingColors.primaryDark).toBe("#BF0000");
    expect(clashKingColors.primaryLight).toBe("#FF1A1C");
  });

  it("has a red scale from 50 to 900", () => {
    expect(clashKingColors.red[50]).toBeDefined();
    expect(clashKingColors.red[500]).toBe("#D90709");
    expect(clashKingColors.red[900]).toBeDefined();
  });
});

describe("darkTheme", () => {
  it("has background properties", () => {
    expect(darkTheme.background.primary).toBeDefined();
    expect(darkTheme.background.secondary).toBeDefined();
  });

  it("has text properties", () => {
    expect(darkTheme.text.primary).toBe("#FFFFFF");
    expect(darkTheme.text.secondary).toBeDefined();
  });

  it("has border properties", () => {
    expect(darkTheme.border.primary).toBeDefined();
  });

  it("has state properties", () => {
    expect(darkTheme.state.success).toBeDefined();
    expect(darkTheme.state.error).toBeDefined();
    expect(darkTheme.state.warning).toBeDefined();
    expect(darkTheme.state.info).toBeDefined();
  });

  it("accent.primary matches clashKingColors.primary", () => {
    expect(darkTheme.accent.primary).toBe(clashKingColors.primary);
  });
});

describe("cssVariables", () => {
  it("contains --ck-primary", () => {
    expect(cssVariables["--ck-primary"]).toBe("#D90709");
  });

  it("contains background variables", () => {
    expect(cssVariables["--bg-primary"]).toBe("#0F0F0F");
    expect(cssVariables["--bg-secondary"]).toBeDefined();
  });

  it("contains spacing variables", () => {
    expect(cssVariables["--spacing-xs"]).toBeDefined();
    expect(cssVariables["--spacing-md"]).toBeDefined();
    expect(cssVariables["--spacing-xl"]).toBeDefined();
  });

  it("contains radius variables", () => {
    expect(cssVariables["--radius-sm"]).toBeDefined();
    expect(cssVariables["--radius-lg"]).toBeDefined();
  });

  it("contains transition variables", () => {
    expect(cssVariables["--transition-fast"]).toBeDefined();
    expect(cssVariables["--transition-normal"]).toBeDefined();
  });
});

describe("townHallImageUrl", () => {
  it("returns the correct URL for a given level", () => {
    expect(townHallImageUrl(15)).toBe(
      "https://assets.clashk.ing/home-base/town-hall-pics/town-hall-15.png"
    );
  });

  it("works for level 1", () => {
    expect(townHallImageUrl(1)).toBe(
      "https://assets.clashk.ing/home-base/town-hall-pics/town-hall-1.png"
    );
  });
});

describe("applyThemeVariables", () => {
  it("sets CSS variables on the provided element", () => {
    const element = document.createElement("div");
    applyThemeVariables(element);
    expect(element.style.getPropertyValue("--ck-primary")).toBe("#D90709");
    expect(element.style.getPropertyValue("--bg-primary")).toBe("#0F0F0F");
    expect(element.style.getPropertyValue("--text-primary")).toBe("#FFFFFF");
  });

  it("sets all cssVariables entries on the element", () => {
    const element = document.createElement("div");
    applyThemeVariables(element);
    for (const key of Object.keys(cssVariables)) {
      expect(element.style.getPropertyValue(key)).toBeTruthy();
    }
  });

  it("uses document.documentElement as default target", () => {
    // Should not throw when called without argument
    expect(() => applyThemeVariables()).not.toThrow();
    expect(document.documentElement.style.getPropertyValue("--ck-primary")).toBe("#D90709");
  });
});

describe("theme default export", () => {
  it("exposes colors", () => {
    expect(theme.colors).toBe(clashKingColors);
  });

  it("exposes dark theme", () => {
    expect(theme.dark).toBe(darkTheme);
  });

  it("exposes variables", () => {
    expect(theme.variables).toBe(cssVariables);
  });

  it("exposes apply function", () => {
    expect(typeof theme.apply).toBe("function");
  });

  it("has a logos asset entry", () => {
    expect(theme.assets.logos.darkBg).toContain("ClashKing");
  });
});
