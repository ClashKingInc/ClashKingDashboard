import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dashboardQueryClientConfig } from "@/lib/dashboard-query";

import DashboardEntryPage from "./page";

const testState = vi.hoisted(() => ({
  guildId: "123456789",
  replace: vi.fn(),
  getServerClans: vi.fn(),
  getDashboardCapabilities: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: testState.replace }),
}));

vi.mock("@/lib/dashboard-route", () => ({
  useGuildId: () => testState.guildId,
  dashboardHref: (path: string, guildId: string) => `/dashboard/${path}?guildId=${guildId}`,
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    servers: {
      getServerClans: testState.getServerClans,
      getDashboardCapabilities: testState.getDashboardCapabilities,
    },
  },
}));

describe("DashboardEntryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.getDashboardCapabilities.mockResolvedValue({
      data: { server_id: "123456789", full_access: true, sections: {} },
      status: 200,
    });
  });

  const renderPage = () => {
    const queryClient = new QueryClient(dashboardQueryClientConfig);
    return render(<QueryClientProvider client={queryClient}><DashboardEntryPage /></QueryClientProvider>);
  };

  it("opens Clans when the server has no clans configured", async () => {
    testState.getServerClans.mockResolvedValue({ data: [] });

    renderPage();

    await waitFor(() => {
      expect(testState.replace).toHaveBeenCalledWith("/dashboard/clans?guildId=123456789");
    });
  });

  it("opens Clans for an empty wrapped clan collection", async () => {
    testState.getServerClans.mockResolvedValue({ data: { items: [] } });

    renderPage();

    await waitFor(() => {
      expect(testState.replace).toHaveBeenCalledWith("/dashboard/clans?guildId=123456789");
    });
  });

  it("opens General Settings when the server already has a clan", async () => {
    testState.getServerClans.mockResolvedValue({ data: [{ tag: "#CLAN" }] });

    renderPage();

    await waitFor(() => {
      expect(testState.replace).toHaveBeenCalledWith("/dashboard/general?guildId=123456789");
    });
  });

  it("falls back to General Settings when clan lookup fails", async () => {
    testState.getServerClans.mockResolvedValue({ error: "Unavailable" });

    renderPage();

    await waitFor(() => {
      expect(testState.replace).toHaveBeenCalledWith("/dashboard/general?guildId=123456789");
    });
  });

  it("falls back to General Settings when clan lookup rejects", async () => {
    testState.getServerClans.mockRejectedValue(new Error("Unavailable"));

    renderPage();

    await waitFor(() => {
      expect(testState.replace).toHaveBeenCalledWith("/dashboard/general?guildId=123456789");
    });
  });

  it("routes delegated users to their first authorized section without querying clans", async () => {
    testState.getDashboardCapabilities.mockResolvedValue({
      data: { server_id: "123456789", full_access: false, sections: { roles: "view" } },
      status: 200,
    });

    renderPage();

    await waitFor(() => {
      expect(testState.replace).toHaveBeenCalledWith("/dashboard/roles?guildId=123456789");
    });
    expect(testState.getServerClans).not.toHaveBeenCalled();
  });
});
