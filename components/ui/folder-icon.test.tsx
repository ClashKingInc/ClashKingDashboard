import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FolderIcon } from "./folder-icon";

const themeState = vi.hoisted(() => ({
  resolvedTheme: "light" as "light" | "dark",
  theme: "system",
}));

vi.mock("next-themes", () => ({
  useTheme: () => themeState,
}));

describe("FolderIcon", () => {
  beforeEach(() => {
    themeState.resolvedTheme = "light";
  });

  it("uses the white folder in light mode", () => {
    render(<FolderIcon data-testid="folder" size={16} />);

    expect(screen.getByTestId("folder")).toHaveAttribute("data-folder-color", "white");
    expect(screen.getByTestId("folder")).toHaveStyle({ width: "16px", height: "16px" });
  });

  it("uses the black folder in dark mode", () => {
    themeState.resolvedTheme = "dark";
    render(<FolderIcon data-testid="folder" />);

    expect(screen.getByTestId("folder")).toHaveAttribute("data-folder-color", "black");
  });

  it("includes bounded hover animation targets", () => {
    render(<FolderIcon data-testid="folder" />);

    const folder = screen.getByTestId("folder");
    expect(folder).toHaveAttribute("data-folder-animated", "true");
    expect(folder.querySelectorAll("[data-folder-paper]")).toHaveLength(3);
    expect(folder.querySelector("[data-folder-flap]")).not.toBeNull();
  });
});
