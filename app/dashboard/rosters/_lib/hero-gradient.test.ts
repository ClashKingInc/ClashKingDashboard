import { describe, expect, it } from "vitest";
import { heroGradient } from "./hero-gradient";
describe("hero percentage gradient", () => {
  it("interpolates and clamps the three anchors", () => {
    expect(heroGradient(0)).toBe("hsl(0 78% 52%)");
    expect(heroGradient(50)).toBe("hsl(0 78% 52%)");
    expect(heroGradient(62.5)).toBe("hsl(30 78% 52%)");
    expect(heroGradient(75)).toBe("hsl(60 78% 52%)");
    expect(heroGradient(82.5)).toBe("hsl(90 78% 52%)");
    expect(heroGradient(100)).toBe("hsl(120 78% 52%)");
    expect(heroGradient(40, [20, 40, 80])).toBe("hsl(60 78% 52%)");
  });
});
