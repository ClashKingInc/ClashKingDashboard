import { act, render, screen } from "@testing-library/react";
import { beforeEach } from "vitest";

import { AuthSessionProvider, useAuthSession } from "./auth-session-provider";

const authMock = vi.hoisted(() => {
  let listener: ((event: "authenticated" | "anonymous" | "user") => void) | undefined;
  let token: string | undefined;
  return {
    getAccessToken: () => token,
    getCachedUser: () => undefined,
    restoreAccessToken: vi.fn(() => new Promise<"restored" | "anonymous" | "unavailable">(() => undefined)),
    subscribeSession: vi.fn((next: (event: "authenticated" | "anonymous" | "user") => void) => {
      listener = next;
      return () => {
        listener = undefined;
      };
    }),
    cacheUser: vi.fn(),
    startAccessTokenRefresh: vi.fn(() => vi.fn()),
    setToken: (next: string | undefined) => {
      token = next;
    },
    notify: (event: "authenticated" | "anonymous" | "user") => listener?.(event),
  };
});

vi.mock("@/lib/auth/session", () => ({
  cacheUser: authMock.cacheUser,
  getAccessToken: authMock.getAccessToken,
  getCachedUser: authMock.getCachedUser,
  restoreAccessToken: authMock.restoreAccessToken,
  startAccessTokenRefresh: authMock.startAccessTokenRefresh,
  subscribeSession: authMock.subscribeSession,
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: { auth: { getCurrentUser: vi.fn().mockResolvedValue({}) } },
  getDefaultBaseUrl: () => "https://dev-api.clashk.ing",
}));

function SessionStatus() {
  return <span>{useAuthSession().status}</span>;
}

describe("AuthSessionProvider", () => {
  beforeEach(() => {
    authMock.setToken(undefined);
    authMock.restoreAccessToken.mockReset();
    authMock.restoreAccessToken.mockImplementation(
      () => new Promise<"restored" | "anonymous" | "unavailable">(() => undefined),
    );
  });

  it("tracks token changes broadcast by another browser tab", () => {
    render(
      <AuthSessionProvider>
        <SessionStatus />
      </AuthSessionProvider>,
    );

    expect(screen.getByText("restoring")).toBeInTheDocument();

    act(() => {
      authMock.setToken("access-token");
      authMock.notify("authenticated");
    });
    expect(screen.getByText("authenticated")).toBeInTheDocument();

    act(() => {
      authMock.setToken(undefined);
      authMock.notify("user");
    });
    expect(screen.getByText("authenticated")).toBeInTheDocument();

    act(() => {
      authMock.notify("anonymous");
    });
    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });

  it("keeps restoring and retries after a temporary API failure", async () => {
    vi.useFakeTimers();
    authMock.restoreAccessToken
      .mockResolvedValueOnce("unavailable")
      .mockResolvedValueOnce("anonymous");

    render(
      <AuthSessionProvider>
        <SessionStatus />
      </AuthSessionProvider>,
    );

    await act(async () => Promise.resolve());
    expect(screen.getByText("restoring")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(screen.getByText("anonymous")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("reuses an in-memory token when the provider remounts", async () => {
    authMock.setToken("existing-token");

    render(
      <AuthSessionProvider>
        <SessionStatus />
      </AuthSessionProvider>,
    );

    await act(async () => Promise.resolve());
    expect(authMock.restoreAccessToken).not.toHaveBeenCalled();
    expect(screen.getByText("authenticated")).toBeInTheDocument();
  });

  it("trusts a successful cookie restoration instead of a second token snapshot", async () => {
    authMock.restoreAccessToken.mockResolvedValueOnce("restored");

    render(
      <AuthSessionProvider>
        <SessionStatus />
      </AuthSessionProvider>,
    );

    await act(async () => Promise.resolve());
    expect(screen.getByText("authenticated")).toBeInTheDocument();
  });
});
