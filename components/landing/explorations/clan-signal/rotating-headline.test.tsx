import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RotatingHeadline } from "./rotating-headline";

const observedElements: Element[] = [];

class ResizeObserverMock {
  observe(element: Element) {
    observedElements.push(element);
  }

  disconnect() {}
}

describe("RotatingHeadline", () => {
  beforeEach(() => {
    observedElements.length = 0;
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
  });

  it("observes a fixed width sensor instead of resizing the observed heading", () => {
    render(
      <RotatingHeadline
        label="Run your clan with confidence"
        phrases={[["Run your clan", "with confidence"]]}
      />,
    );

    const heading = screen.getByRole("heading", { name: "Run your clan with confidence" });
    const widthSensor = heading.querySelector("[data-headline-width-sensor]");

    expect(widthSensor).not.toBeNull();
    expect(observedElements).toEqual([widthSensor]);
    expect(observedElements).not.toContain(heading);
  });
});
