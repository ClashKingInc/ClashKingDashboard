import { act, render, screen } from "@testing-library/react";

import { AuthSessionProvider, useAuthSession } from "./auth-session-provider";

const authMock = vi.hoisted(() => {
  let listener: (() => void) | undefined;
  let token: string | undefined;
  return {
    getAccessToken: () => token,
    getCachedUser: () => undefined,
    refreshAccessToken: vi.fn(() => new Promise<boolean>(() => undefined)),
    subscribeSession: vi.fn((next: () => void) => {
      listener = next;
      return () => {
        listener = undefined;
      };
    }),
    cacheUser: vi.fn(),
    setToken: (next: string | undefined) => {
      token = next;
    },
    notify: () => listener?.(),
  };
});

vi.mock("@/lib/auth/session", () => ({
  cacheUser: authMock.cacheUser,
  getAccessToken: authMock.getAccessToken,
  getCachedUser: authMock.getCachedUser,
  refreshAccessToken: authMock.refreshAccessToken,
  subscribeSession: authMock.subscribeSession,
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: { auth: { getCurrentUser: vi.fn() } },
  getDefaultBaseUrl: () => "https://local-api.clashk.ing",
}));

function SessionStatus() {
  return <span>{useAuthSession().status}</span>;
}

describe("AuthSessionProvider", () => {
  it("tracks token changes broadcast by another browser tab", () => {
    render(
      <AuthSessionProvider>
        <SessionStatus />
      </AuthSessionProvider>,
    );

    expect(screen.getByText("restoring")).toBeInTheDocument();

    act(() => {
      authMock.setToken("access-token");
      authMock.notify();
    });
    expect(screen.getByText("authenticated")).toBeInTheDocument();

    act(() => {
      authMock.setToken(undefined);
      authMock.notify();
    });
    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });
});
