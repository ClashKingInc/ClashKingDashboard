import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { DashboardLayoutWrapper } from "./dashboard-layout-wrapper";

const testState = vi.hoisted(() => ({
  authStatus: "restoring" as "restoring" | "authenticated" | "anonymous",
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
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
  SettingsDropdown: () => null,
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

describe("DashboardLayoutWrapper authentication", () => {
  beforeEach(() => {
    testState.authStatus = "restoring";
    testState.push.mockReset();
    testState.replace.mockReset();
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it("does not redirect while the refresh-cookie session is restoring", () => {
    render(
      <DashboardLayoutWrapper sidebar={<div>Sidebar</div>}>
        <div>Dashboard</div>
      </DashboardLayoutWrapper>,
    );

    expect(testState.replace).not.toHaveBeenCalled();
  });

  it("redirects only after restoration resolves as anonymous", async () => {
    testState.authStatus = "anonymous";

    render(
      <DashboardLayoutWrapper sidebar={<div>Sidebar</div>}>
        <div>Dashboard</div>
      </DashboardLayoutWrapper>,
    );

    await waitFor(() => expect(testState.replace).toHaveBeenCalledWith("/login"));
  });
});
