import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  listGrants: vi.fn(),
  revokeGrant: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      title: "Connected apps",
      description: "Review connected apps.",
      byDeveloper: `By ${values?.developer}`,
      dynamicAccess: "All current and future accounts",
      selectedAccess: `${values?.count} selected accounts`,
      connectedOn: `Connected ${values?.date}`,
      revoke: "Revoke access",
      confirmTitle: `Revoke ${values?.application}?`,
      confirmDescription: "Access ends immediately.",
      confirmRevoke: "Confirm revoke",
      cancel: "Cancel",
      empty: "No connected apps.",
    };
    return messages[key] ?? key;
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    connectedApps: {
      listGrants: testState.listGrants,
      revokeGrant: testState.revokeGrant,
    },
  },
}));

import { ConnectedAppsSettings } from "./connected-apps-settings";

describe("ConnectedAppsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.listGrants.mockResolvedValue({
      data: {
        items: [{
          application: { id: "app_123", name: "Roster Tool", developer_name: "Example Dev" },
          grant: {
            access_mode: "selected",
            selected_player_tags: ["#AAA", "#BBB"],
            connected_at: "2026-08-20T00:00:00Z",
            updated_at: "2026-08-20T00:00:00Z",
          },
        }],
      },
    });
    testState.revokeGrant.mockResolvedValue({ status: 204 });
  });

  it("lists the shared access and revokes it after confirmation", async () => {
    render(<ConnectedAppsSettings />);

    expect(await screen.findByText("Roster Tool")).toBeInTheDocument();
    expect(screen.getByText("2 selected accounts")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revoke access" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm revoke" }));

    await waitFor(() => expect(testState.revokeGrant).toHaveBeenCalledWith("app_123"));
    expect(await screen.findByText("No connected apps.")).toBeInTheDocument();
  });
});
