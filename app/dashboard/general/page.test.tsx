import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import GeneralSettingsPage from "./page";

const state = vi.hoisted(() => ({ editable: true, getSettings: vi.fn(), updateSettings: vi.fn() }));
vi.mock("@/lib/dashboard-route", () => ({ useGuildId: () => "9007199254740993123" }));
vi.mock("@/components/dashboard/dashboard-access-provider", () => ({
  useDashboardAccess: () => ({ capabilities: { full_access: false }, canManage: () => state.editable }),
}));
vi.mock("@/components/dashboard/bot-profile-card", () => ({ BotProfileCard: () => null }));
vi.mock("@/components/dashboard/dashboard-access-settings", () => ({ DashboardAccessSettings: () => null }));
vi.mock("@/lib/api/client", () => ({ apiClient: {
  servers: { getSettings: state.getSettings, updateSettings: state.updateSettings },
  roles: { getDiscordRoles: async () => ({ data: { server_id: "9007199254740993123", roles: [], count: 0 } }), getServerRoles: async () => ({ data: { roles: [] } }) },
} }));

beforeEach(() => {
  state.editable = true;
  state.getSettings.mockResolvedValue({ data: {
    server_id: "9007199254740993123", server: "Fixture", name: "Fixture", countdowns: {}, server_roles: [],
  } });
  state.updateSettings.mockResolvedValue({ data: { message: "Updated", server_id: "9007199254740993123", updated_fields: 1 } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
  <IntlProvider locale="en" messages={messages}><GeneralSettingsPage /></IntlProvider>
</QueryClientProvider>);

it("does not expose a server linking-token policy", async () => {
  mount();
  await screen.findByLabelText("Full Whitelist Role");
  expect(screen.queryByRole("switch", { name: "Require an in-game API token when linking" })).not.toBeInTheDocument();
  expect(state.updateSettings).not.toHaveBeenCalled();
});
