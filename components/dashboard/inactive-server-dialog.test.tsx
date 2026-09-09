import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { InactiveServerDialog } from "./inactive-server-dialog";

const testState = vi.hoisted(() => ({
  reactivateServer: vi.fn(),
}));

vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => ({
    configure: "Configure",
    "inactive.title": "Re-enable server tracking?",
    "inactive.description": "Tracking was disabled.",
    "inactive.lastUsed": "Last command",
    "inactive.unknown": "No command history",
    "inactive.cancel": "Not now",
    "inactive.confirm": "Re-enable",
    "inactive.reactivating": "Re-enabling...",
  }[key] ?? key),
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    servers: { reactivateServer: testState.reactivateServer },
  },
}));

const inactiveGuild = {
  id: "inactive-server",
  name: "Sleeping Clan",
  icon: null,
  owner: true,
  permissions: "8",
  role: "Owner" as const,
  features: [],
  has_bot: true,
  inactive: true,
  last_command_at: "2026-01-01T00:00:00.000Z",
};

describe("InactiveServerDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.reactivateServer.mockResolvedValue({ data: { message: "ok" } });
  });

  it("reactivates the selected server before handing it back for navigation", async () => {
    const onReactivated = vi.fn();

    render(
      <InactiveServerDialog
        guild={inactiveGuild}
        locale="en"
        onClose={vi.fn()}
        onReactivated={onReactivated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Re-enable" }));

    await waitFor(() => expect(testState.reactivateServer).toHaveBeenCalledWith("inactive-server"));
    expect(onReactivated).toHaveBeenCalledWith(expect.objectContaining({
      id: "inactive-server",
      inactive: false,
    }));
  });

  it("offers first-time activation without claiming command history", async () => {
    const onReactivated = vi.fn();
    render(
      <InactiveServerDialog
        guild={{ ...inactiveGuild, last_command_at: undefined }}
        locale="en"
        onClose={vi.fn()}
        onReactivated={onReactivated}
      />,
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("No command history")).toBeInTheDocument();
    expect(screen.queryByText("Tracking was disabled.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Configure" }));
    await waitFor(() => expect(testState.reactivateServer).toHaveBeenCalledWith("inactive-server"));
    expect(onReactivated).toHaveBeenCalled();
  });
});
