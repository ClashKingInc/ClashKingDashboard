import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RosterBuilderPage from "./page";

const testState = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: testState.replace }),
}));

vi.mock("@/components/auth-session-provider", () => ({
  useAuthSession: () => ({
    status: "authenticated",
    user: { user_id: "999999999999999999" },
  }),
}));

vi.mock("@/lib/dashboard-route", () => ({
  useGuildId: () => "guild-1",
  dashboardHref: (path: string, guildId: string) => `/dashboard/${path}?guildId=${guildId}`,
}));

describe("RosterBuilderPage access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects authenticated users outside the developer preview before mounting the builder", async () => {
    render(<RosterBuilderPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Opening rosters…");
    await waitFor(() => {
      expect(testState.replace).toHaveBeenCalledWith("/dashboard/rosters?guildId=guild-1");
    });
  });
});
