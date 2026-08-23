import { render, screen } from "@testing-library/react";

import { dashboardHref, useGuildId, useRosterId } from "./dashboard-route";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function DashboardParams() {
  return (
    <>
      <span data-testid="guild-id">{useGuildId()}</span>
      <span data-testid="roster-id">{useRosterId()}</span>
    </>
  );
}

describe("dashboard route state", () => {
  it("reads query state from the browser when Vinext provides an empty static snapshot", () => {
    globalThis.history.replaceState(
      {},
      "",
      "/dashboard/rosters/detail?guildId=123456789&rosterId=roster-42",
    );

    render(<DashboardParams />);

    expect(screen.getByTestId("guild-id")).toHaveTextContent("123456789");
    expect(screen.getByTestId("roster-id")).toHaveTextContent("roster-42");
  });

  it("builds locale-neutral dashboard URLs with the selected guild", () => {
    expect(dashboardHref("roles", "123456789")).toBe(
      "/dashboard/roles?guildId=123456789",
    );
  });

  it("restores the selected guild after Stripe returns without a query string", () => {
    globalThis.history.replaceState({}, "", "/dashboard/settings?checkout=success");
    sessionStorage.setItem("selected_guild", JSON.stringify({ id: "987654321", name: "Clan" }));

    render(<DashboardParams />);

    expect(screen.getByTestId("guild-id")).toHaveTextContent("987654321");
  });
});
