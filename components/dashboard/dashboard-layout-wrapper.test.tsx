import { act, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";

import { DashboardLayoutWrapper } from "./dashboard-layout-wrapper";
import { dispatchGraphicsEditorMode, GRAPHICS_EDITOR_MODE_EVENT } from "@/lib/graphics-editor-shell";

const testState = vi.hoisted(() => ({
  authStatus: "restoring" as "restoring" | "authenticated" | "anonymous",
  pathname: "/dashboard",
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => testState.pathname,
  useRouter: () => ({ push: testState.push, replace: testState.replace }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/auth-session-provider", () => ({
  useAuthSession: () => ({ status: testState.authStatus, user: undefined }),
}));

vi.mock("@/components/settings-dropdown", () => ({
  SettingsDropdown: () => <div>Settings</div>,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarImage: () => null,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/lib/auth/logout", () => ({ logout: vi.fn() }));

describe("DashboardLayoutWrapper", () => {
  beforeEach(() => {
    testState.authStatus = "restoring";
    testState.pathname = "/dashboard";
    testState.push.mockReset();
    testState.replace.mockReset();
    dispatchGraphicsEditorMode(false);
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it("leaves authentication redirects to the dashboard shell", () => {
    render(
      <DashboardLayoutWrapper sidebar={<div>Sidebar</div>}>
        <div>Dashboard</div>
      </DashboardLayoutWrapper>,
    );

    expect(testState.replace).not.toHaveBeenCalled();
  });

  it("does not independently redirect when the shared status changes", () => {
    testState.authStatus = "anonymous";

    render(
      <DashboardLayoutWrapper sidebar={<div>Sidebar</div>}>
        <div>Dashboard</div>
      </DashboardLayoutWrapper>,
    );

    expect(testState.replace).not.toHaveBeenCalled();
  });

  it("reserves the desktop header for contextual roster-builder controls", () => {
    testState.pathname = "/dashboard/rosters/builder";

    const { container, queryAllByText } = render(
      <DashboardLayoutWrapper sidebar={<div>Sidebar</div>}>
        <div>Roster builder</div>
      </DashboardLayoutWrapper>,
    );

    expect(container.querySelector("#dashboard-header-actions")).not.toBeNull();
    expect(queryAllByText("Settings")).toHaveLength(0);
  });

  it("provides theme and language shortcuts in the desktop and mobile headers", () => {
    const { queryAllByText } = render(
      <DashboardLayoutWrapper sidebar={<div>Sidebar</div>}>
        <div>Dashboard</div>
      </DashboardLayoutWrapper>,
    );

    expect(queryAllByText("Settings")).toHaveLength(2);
  });

  it("keeps dashboard navigation on the graphics project list and hides it only inside an editor", () => {
    testState.pathname = "/dashboard/graphics";
    const { queryAllByText, container } = render(
      <DashboardLayoutWrapper sidebar={<div>Sidebar</div>}>
        <div>Graphics projects</div>
      </DashboardLayoutWrapper>,
    );

    expect(queryAllByText("Sidebar")).toHaveLength(1);
    expect(container.querySelector("#dashboard-header-actions")).not.toBeNull();

    act(() => window.dispatchEvent(new CustomEvent(GRAPHICS_EDITOR_MODE_EVENT, { detail: true })));
    expect(queryAllByText("Sidebar")).toHaveLength(0);
    expect(container.querySelector("#dashboard-header-actions")).toBeNull();

    act(() => window.dispatchEvent(new CustomEvent(GRAPHICS_EDITOR_MODE_EVENT, { detail: false })));
    expect(queryAllByText("Sidebar")).toHaveLength(1);
  });

  it("provides both desktop and mobile contextual header hosts to the roster builder", () => {
    testState.pathname = "/dashboard/rosters/builder";

    const { container } = render(
      <DashboardLayoutWrapper sidebar={<div>Sidebar</div>}>
        <div>Roster builder</div>
      </DashboardLayoutWrapper>,
    );

    expect(container.querySelector("#dashboard-header-actions")).not.toBeNull();
    expect(container.querySelector("#dashboard-mobile-header-actions")).not.toBeNull();
  });

  it("puts mobile sidebar dismissal in a dedicated header", () => {
    const { container } = render(
      <DashboardLayoutWrapper sidebar={<div>Sidebar navigation</div>}>
        <div>Dashboard</div>
      </DashboardLayoutWrapper>,
    );

    const menuButton = container.querySelector("button");
    expect(menuButton).not.toBeNull();
    fireEvent.click(menuButton!);

    expect(document.querySelector("[data-slot='mobile-sidebar-header']")).not.toBeNull();
  });
});
