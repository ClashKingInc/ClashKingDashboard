import { render, waitFor } from "@testing-library/react";
import AuthCallbackPage from "@/app/[locale]/auth/callback/page";

const navigationMock = vi.hoisted(() => ({
  locale: "en",
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

const apiMock = vi.hoisted(() => ({
  authenticateWithDiscord: vi.fn(),
  getGuilds: vi.fn(),
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMock.push }),
  useSearchParams: () => ({
    get: (key: string) => navigationMock.searchParams.get(key),
  }),
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
    setAccessToken: apiMock.setAccessToken,
    setRefreshToken: apiMock.setRefreshToken,
  },
}));

describe("AuthCallbackPage PKCE cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMock.locale = "en";
    navigationMock.searchParams = new URLSearchParams();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("device_id", "device-id");
  });

  it("clears the PKCE verifier for Discord error callbacks", async () => {
    navigationMock.searchParams = new URLSearchParams("error=server_error");
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
    navigationMock.searchParams = new URLSearchParams("code=auth-code");

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(apiMock.authenticateWithDiscord).not.toHaveBeenCalled();
      expect(sessionStorage.getItem("discord_code_verifier")).toBeNull();
    });
  });

  it("clears the PKCE verifier after backend authentication failures", async () => {
    navigationMock.searchParams = new URLSearchParams("code=auth-code");
    sessionStorage.setItem("discord_code_verifier", "verifier");
    apiMock.authenticateWithDiscord.mockResolvedValue({
      data: null,
      error: "backend failed",
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(apiMock.authenticateWithDiscord).toHaveBeenCalled();
      expect(sessionStorage.getItem("discord_code_verifier")).toBeNull();
    });
  });
});
