import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dashboardQueryClientConfig } from "@/lib/dashboard-query";

const apiClientMock = vi.hoisted(() => ({
  servers: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
  roles: {
    getDiscordRoles: vi.fn(),
  },
  familyRoles: {
    getFamilyRoles: vi.fn(),
    addFamilyRole: vi.fn(),
    removeFamilyRole: vi.fn(),
    updateFamilyRoleMode: vi.fn(),
  },
}));

vi.mock("@/lib/dashboard-route", () => ({ useGuildId: () => "123" }));
vi.mock("@/lib/api/client", () => ({ apiClient: apiClientMock }));
vi.mock("use-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import FamilySettingsPage from "./page";

function renderPage() {
  const queryClient = new QueryClient(dashboardQueryClientConfig);
  return render(
    <QueryClientProvider client={queryClient}>
      <FamilySettingsPage />
    </QueryClientProvider>,
  );
}

describe("FamilySettingsPage empty configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClientMock.servers.getSettings.mockResolvedValue({
      status: 200,
      data: {
        server_id: "123",
        server: "123",
        name: "Empty server",
        require_api_token_when_linking: false,
        change_nickname: true,
        nickname_rule: "[{player_clan_abbreviation}] {player_name}",
        non_family_nickname_rule: "{player_name}",
        countdowns: {},
        server_roles: [],
        clans: [],
      },
    });
    apiClientMock.roles.getDiscordRoles.mockResolvedValue({ status: 200, data: { roles: [] } });
    apiClientMock.familyRoles.getFamilyRoles.mockResolvedValue({
      status: 200,
      data: {
        server_id: "123",
        family_roles: [],
        not_family_roles: [],
        family_elder_roles: [],
        family_coleader_roles: [],
        family_leader_roles: [],
      },
    });
  });

  it("treats a server with no clans or family roles as a usable empty state", async () => {
    const screen = renderPage();

    await waitFor(() => expect(apiClientMock.servers.getSettings).toHaveBeenCalledWith("123", false, expect.any(AbortSignal)));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByText("familyRoles.noRolesConfigured")).toHaveLength(5);
    expect(screen.getByDisplayValue("[{player_clan_abbreviation}] {player_name}")).toBeEnabled();
  });
});
