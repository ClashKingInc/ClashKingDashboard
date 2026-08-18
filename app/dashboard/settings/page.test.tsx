import { render, screen, waitFor } from "@testing-library/react";

import AccountSettingsPage, { formatUsd } from "./page";

const testState = vi.hoisted(() => ({
  getSubscription: vi.fn(),
  getUsage: vi.fn(),
  getGuilds: vi.fn(),
  createCheckout: vi.fn(),
  createPortal: vi.fn(),
  updateAssignment: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      title: "Account settings",
      description: "Manage your account.",
      "profile.title": "Profile",
      "appearance.theme": "Theme",
      "appearance.language": "Language",
      "appearance.browserLanguage": "Use browser language",
      "appearance.themes.system": "System",
      "appearance.themes.light": "Light",
      "appearance.themes.dark": "Dark",
      "billing.supportTitle": "Support ClashKing ❤️",
      "billing.subscribe": "$6.99/month",
      "billing.learnMore": "Learn more",
      "billing.assignServer": "Subscription server",
      "billing.selectServer": "Select a server",
      "billing.subscriptionRequired": "Subscribe to choose a server.",
      "billing.checkoutUnavailable": "Subscriptions are not available yet.",
      "usage.title": "AI assistant usage",
      "usage.serverName": `Usage for ${values?.name ?? "server"} this month.`,
      "usage.used": "used this month",
      "usage.of": `of ${values?.limit ?? "$0.00"}`,
      "usage.available": "Usage available",
      "usage.infoLabel": "How free usage works",
      "usage.freePoolInfo": "Shared free usage details",
      "usage.progressLabel": "Usage progress",
      "usage.resets": "Resets soon",
    };
    return messages[key] ?? key;
  },
}));

vi.mock("@/components/auth-session-provider", () => ({
  useAuthSession: () => ({ user: { username: "Magic Jr.", avatar_url: "" } }),
}));

vi.mock("@/lib/dashboard-route", () => ({
  useGuildId: () => "923764211845312533",
  dashboardHref: (path: string, guildId: string) => `/dashboard/${path}?guildId=${guildId}`,
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    billing: {
      getSubscription: testState.getSubscription,
      getUsage: testState.getUsage,
      createCheckout: testState.createCheckout,
      createPortal: testState.createPortal,
      updateAssignment: testState.updateAssignment,
    },
    servers: { getGuilds: testState.getGuilds },
  },
}));

describe("AccountSettingsPage", () => {
  it("shows thousandths for free usage while keeping paid usage at cents", () => {
    expect(formatUsd(0.004, 3)).toBe("$0.004");
    expect(formatUsd(0.0004, 3)).toBe("<$0.001");
    expect(formatUsd(0.004)).toBe("<$0.01");
    expect(formatUsd(5)).toBe("$5.00");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    testState.getSubscription.mockResolvedValue({ data: { active: false, checkoutEnabled: false, assignedServerId: null } });
    testState.getUsage.mockResolvedValue({
      data: {
        serverSpentUsd: 0,
        serverLimitUsd: 0.05,
        assignedSubscriberCount: 0,
        globalFreeAvailable: true,
        resetsAt: "2026-09-01T00:00:00Z",
      },
    });
    testState.getGuilds.mockResolvedValue({
      data: [{
        id: "923764211845312533",
        name: "ClashKing",
        icon: null,
        has_bot: true,
        inactive: false,
      }],
    });
  });

  it("renders without LocaleProvider, locks assignment on the free plan, and never exposes the server ID", async () => {
    render(<AccountSettingsPage />);

    expect(await screen.findByText("Support ClashKing ❤️")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$6.99/month" })).toBeDisabled();
    expect(screen.getByText("Subscriptions are not available yet.")).toBeInTheDocument();
    expect(screen.queryByText("Subscription details")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Subscription server")).toBeDisabled());
    expect(screen.getByRole("link", { name: /Learn more/ })).toHaveAttribute(
      "href",
      "/dashboard/support-us?guildId=923764211845312533",
    );
    expect(screen.getByText("Usage for ClashKing this month.")).toBeInTheDocument();
    expect(screen.queryByText("923764211845312533")).not.toBeInTheDocument();
  });
});
