import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraphicEditor } from "./graphic-editor";
import { graphicProjectsStorageKey } from "./graphic-project-storage";
import { createGraphicProject, parseGraphicProjects } from "./graphic-projects";

vi.mock("@/components/auth-session-provider", () => ({
  useAuthSession: () => ({ user: { user_id: "user-1" } }),
}));

vi.mock("@/lib/dashboard-route", () => ({
  useGuildId: () => "guild-1",
}));

vi.mock("./asset-browser", () => ({
  readLibraryAssetDragData: () => null,
  writeLibraryAssetDragData: vi.fn(),
  useAssetLibrary: () => ({ result: null, assets: [], loading: false, error: null, retry: vi.fn() }),
}));

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

describe("GraphicEditor project persistence", () => {
  const storageKey = graphicProjectsStorageKey("user-1", "guild-1");

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("flushes the latest edit when the editor unmounts before autosave fires", async () => {
    const project = createGraphicProject("player");
    project.document.name = "Original graphic";
    localStorage.setItem(storageKey, JSON.stringify([project]));

    const view = render(<GraphicEditor />);
    const projectName = await screen.findByText("Original graphic");
    fireEvent.click(projectName.closest("button")!);

    const nameInput = await screen.findByRole("textbox", { name: "Graphic name" });
    fireEvent.change(nameInput, { target: { value: "Latest graphic" } });
    view.unmount();

    await waitFor(() => {
      const stored = parseGraphicProjects(JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown);
      expect(stored[0]?.document.name).toBe("Latest graphic");
    });
  });
});
