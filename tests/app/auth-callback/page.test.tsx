import { render, waitFor } from "@testing-library/react";
import AuthCallbackPage from "@/app/auth/callback/page";

const navigationMock = vi.hoisted(() => ({
  locale: "en",
  push: vi.fn(),
}));

const apiMock = vi.hoisted(() => ({
  authenticateWithDiscord: vi.fn(),
  getGuilds: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMock.push }),
  // Model Vinext's empty static search-param snapshot. The callback must use
  // the actual browser URL, which already contains Discord's response.
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: navigationMock.locale }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values?.reason ? `${key}:${values.reason}` : key,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-testid={`image-${alt}`} />,
}));

vi.mock("@/components/ui/loading-screen-with-messages", () => ({
  default: () => <div data-testid="loading" />,
}));

vi.mock("@/lib/theme", () => ({
  clashKingAssets: {
    logos: {
      darkBgPng: "/dark-logo.png",
      textDarkBg: "/dark-text-logo.png",
      whiteBgPng: "/white-logo.png",
      textWhiteBg: "/white-text-logo.png",
    },
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    auth: {
      authenticateWithDiscord: apiMock.authenticateWithDiscord,
    },
    servers: {
      getGuilds: apiMock.getGuilds,
    },
  },
}));

describe("AuthCallbackPage PKCE cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMock.locale = "en";
    window.history.replaceState({}, "", "/auth/callback");
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("device_id", "device-id");
  });

  it("clears the PKCE verifier for Discord error callbacks", async () => {
    window.history.replaceState({}, "", "/auth/callback?error=server_error");
    sessionStorage.setItem("discord_code_verifier", "verifier");

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(sessionStorage.getItem("discord_code_verifier")).toBeNull();
    });
    expect(apiMock.authenticateWithDiscord).not.toHaveBeenCalled();
  });

  it("clears the PKCE verifier when the authorization code is missing", async () => {
    sessionStorage.setItem("discord_code_verifier", "verifier");

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(sessionStorage.getItem("discord_code_verifier")).toBeNull();
    });
    expect(apiMock.authenticateWithDiscord).not.toHaveBeenCalled();
  });

  it("clears the PKCE verifier when the stored verifier is missing", async () => {
    window.history.replaceState({}, "", "/auth/callback?code=auth-code");

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(apiMock.authenticateWithDiscord).not.toHaveBeenCalled();
      expect(sessionStorage.getItem("discord_code_verifier")).toBeNull();
    });
  });

  it("uses the browser callback URL and clears PKCE after backend authentication failures", async () => {
    window.history.replaceState(
      {},
      "",
      "/auth/callback?code=auth-code&state=expected-state",
    );
    sessionStorage.setItem("discord_code_verifier", "verifier");
    sessionStorage.setItem("discord_oauth_state", "expected-state");
    apiMock.authenticateWithDiscord.mockResolvedValue({
      data: null,
      error: "backend failed",
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(apiMock.authenticateWithDiscord).toHaveBeenCalledWith({
        code: "auth-code",
        code_verifier: "verifier",
        device_id: "device-id",
        redirect_uri: "http://localhost:3000/auth/callback",
      });
      expect(sessionStorage.getItem("discord_code_verifier")).toBeNull();
    });
  });
});
