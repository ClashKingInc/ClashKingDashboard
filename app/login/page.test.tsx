import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  authStatus: "restoring" as "restoring" | "authenticated" | "anonymous",
  replace: vi.fn(),
  initiateDiscordLogin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: testState.replace }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("@/components/auth-session-provider", () => ({
  useAuthSession: () => ({ status: testState.authStatus }),
}));

vi.mock("@/lib/auth/discord-login", () => ({
  initiateDiscordLogin: testState.initiateDiscordLogin,
}));

import LoginRedirect from "./page";

describe("LoginRedirect", () => {
  beforeEach(() => {
    testState.authStatus = "restoring";
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("waits for session restoration, then starts Discord OAuth for an anonymous visitor", async () => {
    const view = render(<LoginRedirect />);

    expect(testState.initiateDiscordLogin).not.toHaveBeenCalled();

    testState.authStatus = "anonymous";
    view.rerender(<LoginRedirect />);

    await waitFor(() => {
      expect(testState.initiateDiscordLogin).toHaveBeenCalledOnce();
    });
    expect(testState.initiateDiscordLogin).toHaveBeenCalledWith("en");
    expect(testState.replace).not.toHaveBeenCalled();
  });

  it("sends an authenticated session directly to the server list", async () => {
    testState.authStatus = "authenticated";

    render(<LoginRedirect />);

    await waitFor(() => {
      expect(testState.replace).toHaveBeenCalledWith("/servers");
    });
    expect(testState.initiateDiscordLogin).not.toHaveBeenCalled();
  });

  it("preserves a safe return destination for an authenticated session", async () => {
    sessionStorage.setItem("auth_return_to", "/dashboard/settings?guild=123");
    testState.authStatus = "authenticated";

    render(<LoginRedirect />);

    await waitFor(() => {
      expect(testState.replace).toHaveBeenCalledWith("/dashboard/settings?guild=123");
    });
    expect(sessionStorage.getItem("auth_return_to")).toBeNull();
  });
});
