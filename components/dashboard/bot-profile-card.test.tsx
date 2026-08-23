import { render, screen, waitFor } from "@testing-library/react";

import { BotProfileCard } from "./bot-profile-card";

const apiMocks = vi.hoisted(() => ({
  getBotGuildProfile: vi.fn(),
  getSubscription: vi.fn(),
  updateBotGuildProfile: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    servers: {
      getBotGuildProfile: apiMocks.getBotGuildProfile,
      updateBotGuildProfile: apiMocks.updateBotGuildProfile,
    },
    billing: { getSubscription: apiMocks.getSubscription },
  },
}));

vi.mock("./dashboard-access-provider", () => ({
  useDashboardAccess: () => ({ canManage: () => true }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const profile = {
  name: "ClashKing",
  avatar_url: null,
  banner_url: null,
  bio: "Server description",
  name_inherited: true,
  avatar_inherited: true,
  banner_inherited: true,
  bio_inherited: true,
};

describe("BotProfileCard subscription access", () => {
  beforeEach(() => {
    apiMocks.getBotGuildProfile.mockReset().mockResolvedValue({ data: profile });
    apiMocks.getSubscription.mockReset();
    apiMocks.updateBotGuildProfile.mockReset();
  });

  it("keeps name editing free and locks paid profile fields", async () => {
    apiMocks.getSubscription.mockResolvedValue({ data: { active: false } });
    render(<BotProfileCard guildId="123" />);

    expect(await screen.findByRole("button", { name: "Edit bot server name" })).toBeInTheDocument();
    expect(screen.queryByText("Change banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit bot server bio" })).not.toBeInTheDocument();
    expect(screen.getByText("Unlock profile customization")).toBeInTheDocument();
  });

  it("enables avatar, banner, and bio controls for active subscribers", async () => {
    apiMocks.getSubscription.mockResolvedValue({ data: { active: true } });
    render(<BotProfileCard guildId="123" />);

    await waitFor(() => expect(screen.getByText("Change banner")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Edit bot server name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit bot server bio" })).toBeInTheDocument();
    expect(screen.queryByText("Unlock profile customization")).not.toBeInTheDocument();
  });

  it("stacks the profile body and wraps long bios on narrow screens", async () => {
    apiMocks.getBotGuildProfile.mockResolvedValue({
      data: {
        ...profile,
        bio: "Website: https://docs.clashk.ing/a-very-long-path-that-must-not-widen-the-dashboard",
      },
    });
    apiMocks.getSubscription.mockResolvedValue({ data: { active: false } });
    const { container } = render(<BotProfileCard guildId="123" />);

    const bio = await screen.findByText(/a-very-long-path/);
    expect(container.querySelector("[data-slot='bot-profile-card']")).toHaveClass("max-w-full", "overflow-hidden");
    expect(container.querySelector("[data-slot='bot-profile-body']")).toHaveClass("flex-col", "sm:flex-row");
    expect(bio).toHaveClass("break-words", "[overflow-wrap:anywhere]");
    expect(screen.getByText("Unlock profile customization").closest("a")).toHaveClass("max-w-full", "flex-wrap");
  });
});
