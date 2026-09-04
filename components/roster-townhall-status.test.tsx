import { cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { afterEach, describe, expect, it } from "vitest";
import messages from "@/messages/en.json";
import { RosterTownhallStatus } from "./roster-townhall-status";

const now = Date.parse("2026-09-04T05:30:00Z");
afterEach(cleanup);
describe("roster Town Hall status", () => {
  it("renders the specific ineligibility reason as visible accessible text", () => {
    render(<IntlProvider locale="en" messages={messages}><RosterTownhallStatus townhall={15} minTownhall={16}
      refreshedAt="2026-09-04T05:29:00Z" now={now} /></IntlProvider>);
    expect(screen.getByRole("note")).toHaveTextContent("TH 15 is below the roster minimum (TH 16)");
  });
  it("labels old data as needing refresh instead of claiming ineligibility", () => {
    render(<IntlProvider locale="en" messages={messages}><RosterTownhallStatus townhall={15} minTownhall={16}
      refreshedAt="2026-09-04T04:00:00Z" now={now} /></IntlProvider>);
    expect(screen.getByRole("note")).toHaveTextContent("Refresh player data to check Town Hall eligibility.");
    expect(screen.queryByText(/below the roster minimum/)).not.toBeInTheDocument();
  });
  it("does not add a warning to an eligible or unrestricted roster member", () => {
    render(<IntlProvider locale="en" messages={messages}><RosterTownhallStatus townhall={16} minTownhall={16}
      refreshedAt="2026-09-04T05:29:00Z" now={now} /></IntlProvider>);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
