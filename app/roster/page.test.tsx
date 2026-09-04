import { cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import SharedRosterPage from "./page";

const now = Date.parse("2026-09-04T05:30:00Z");
beforeEach(() => {
  window.history.replaceState({}, "", "/roster?view=PublicRosterFixture2026");
  vi.spyOn(Date, "now").mockReturnValue(now);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });

it("retains fresh and stale members while showing their distinct TH status through the shared contract", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
    id: "PublicRosterFixture2026", name: "Shared roster", updatedAt: "2026-09-04T05:29:00Z", minTownhall: 16, maxTownhall: 18,
    members: [
      { playerTag: "#2PP", name: "Fresh player", townhall: 15, refreshedAt: "2026-09-04T05:29:00Z" },
      { playerTag: "#2PQ", name: "Old snapshot", townhall: 19, refreshedAt: "2026-09-03T05:29:00Z" },
    ],
  })));
  render(<IntlProvider locale="en" messages={messages}><SharedRosterPage /></IntlProvider>);
  expect(await screen.findByText("TH 15 is below the roster minimum (TH 16)")).toBeInTheDocument();
  expect(screen.getByText("Refresh player data to check Town Hall eligibility.")).toBeInTheDocument();
  expect(screen.queryByText("TH 19 is above the roster maximum (TH 18)")).not.toBeInTheDocument();
  expect(screen.getByText("Fresh player")).toBeInTheDocument();
  expect(screen.getByText("Old snapshot")).toBeInTheDocument();
});
