import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    const { getByText, queryByText } = render(<TicketsPage />);

    await waitFor(() => {
      expect(getPanels).toHaveBeenCalledWith("123");
      expect(getEmbeds).toHaveBeenCalledWith("123");
    });

    expect(getByText("noPanels")).toBeInTheDocument();
    expect(queryByText("tabTickets")).not.toBeInTheDocument();
  });
});
