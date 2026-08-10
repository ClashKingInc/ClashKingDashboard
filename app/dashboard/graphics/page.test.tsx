import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("./graphic-editor", () => ({
  GraphicEditor: () => <div>graphic-editor</div>,
}));

import GraphicsPage from "./page";

function mockViewport(desktop: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
    matches: desktop,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

describe("GraphicsPage", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("does not mount the graphics editor below the desktop breakpoint", () => {
    mockViewport(false);
    render(<GraphicsPage />);

    expect(screen.getByText("desktopOnlyTitle")).toBeInTheDocument();
    expect(screen.queryByText("graphic-editor")).not.toBeInTheDocument();
  });

  it("mounts the graphics editor on a desktop viewport", async () => {
    mockViewport(true);
    render(<GraphicsPage />);

    expect(await screen.findByText("graphic-editor")).toBeInTheDocument();
  });
});
