import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dashboardQueryClientConfig } from "@/lib/dashboard-query";

const { getPanels, getEmbeds, getChannels, getDiscordRoles } = vi.hoisted(() => ({
  getPanels: vi.fn(),
  getEmbeds: vi.fn(),
  getChannels: vi.fn(),
  getDiscordRoles: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ guildId: "123" }),
  useSearchParams: () => new URLSearchParams("guildId=123"),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/lib/api-cache", () => ({
  apiCache: {
    get: (_key: string, loader: () => unknown) => loader(),
    invalidate: vi.fn(),
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    tickets: {
      getPanels,
      getEmbeds,
    },
    servers: {
      getChannels,
      getDiscordRoles,
    },
  },
}));

import TicketsPage from "./page";

describe("TicketsPage after open-ticket retirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPanels.mockResolvedValue({
      data: {
        items: [],
        total: 0,
        available_embeds: [],
        townhall_requirement_fields: [],
      },
    });
    getEmbeds.mockResolvedValue({ data: { items: [], total: 0 } });
    getChannels.mockResolvedValue({ data: [] });
    getDiscordRoles.mockResolvedValue({ data: { roles: [] } });
  });

  it("loads panel and embed management directly without an open-ticket request", async () => {
    const queryClient = new QueryClient(dashboardQueryClientConfig);
    const { getByText, queryByText } = render(
      <QueryClientProvider client={queryClient}><TicketsPage /></QueryClientProvider>,
    );

    await waitFor(() => {
      expect(getPanels).toHaveBeenCalledWith("123");
      expect(getEmbeds).toHaveBeenCalledWith("123");
    });

    expect(getByText("noPanels")).toBeInTheDocument();
    expect(queryByText("tabTickets")).not.toBeInTheDocument();
  });

  it("keeps ticket previews collapsed until their summary is expanded", async () => {
    getPanels.mockResolvedValue({
      data: {
        items: [{
          name: "Recruitment",
          embed_name: "Welcome",
          components: [],
          approve_messages: [],
          button_settings: {},
          open_category: null,
          sleep_category: null,
          closed_category: null,
          status_change_log: null,
          ticket_button_click_log: null,
          ticket_close_log: null,
        }],
        total: 1,
        available_embeds: ["Welcome"],
        townhall_requirement_fields: [],
      },
    });
    getEmbeds.mockResolvedValue({
      data: {
        items: [{ name: "Welcome", data: { embeds: [{ description: "Preview body" }] } }],
        total: 1,
      },
    });

    const queryClient = new QueryClient(dashboardQueryClientConfig);
    const { findByText, getByText, queryByText } = render(
      <QueryClientProvider client={queryClient}><TicketsPage /></QueryClientProvider>,
    );

    const panelName = await findByText("Recruitment");
    expect(queryByText("Preview body")).not.toBeInTheDocument();

    const summaryButton = panelName.closest("button");
    expect(summaryButton).not.toBeNull();
    fireEvent.click(summaryButton!);

    expect(getByText("Preview body")).toBeInTheDocument();
    expect(summaryButton).toHaveAttribute("aria-expanded", "true");
  });
});
