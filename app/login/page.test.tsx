import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  authStatus: "restoring" as "restoring" | "authenticated" | "anonymous",
  replace: vi.fn(),
  initiateDiscordLogin: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: testState.replace }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/auth-session-provider", () => ({
  useAuthSession: () => ({ status: testState.authStatus }),
}));

vi.mock("@/lib/auth/discord-login", () => ({
  initiateDiscordLogin: testState.initiateDiscordLogin,
}));

vi.mock("@/components/ui/loading-screen-with-messages", () => ({
  default: () => <div>loading</div>,
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    testState.authStatus = "restoring";
    vi.clearAllMocks();
  });

  it("waits for cookie restoration before starting Discord OAuth", () => {
    const view = render(<LoginPage />);

    expect(testState.initiateDiscordLogin).not.toHaveBeenCalled();

    testState.authStatus = "anonymous";
    view.rerender(<LoginPage />);
    expect(testState.initiateDiscordLogin).toHaveBeenCalledOnce();
  });

  it("returns an already-restored session to the server list", () => {
    testState.authStatus = "authenticated";

    render(<LoginPage />);

    expect(testState.replace).toHaveBeenCalledWith("/servers");
    expect(testState.initiateDiscordLogin).not.toHaveBeenCalled();
  });
});
