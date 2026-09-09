import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    server_id: "9007199254740993123", server: "Fixture", name: "Fixture", countdowns: {}, server_roles: [], require_api_token_when_linking: false,
  } });
  state.updateSettings.mockResolvedValue({ data: { message: "Updated", server_id: "9007199254740993123", updated_fields: 1 } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
  <IntlProvider locale="en" messages={messages}><GeneralSettingsPage /></IntlProvider>
</QueryClientProvider>);

it("defaults linking verification off and saves explicit on/off changes without overwriting other settings", async () => {
  mount();
  const control = await screen.findByRole("switch", { name: "Require an in-game API token when linking" });
  await waitFor(() => expect(control).toBeEnabled());
  expect(control).not.toBeChecked();
  fireEvent.click(control);
  await waitFor(() => expect(state.updateSettings).toHaveBeenCalledWith("9007199254740993123", { require_api_token_when_linking: true }));
  await waitFor(() => expect(control).toBeEnabled());
  fireEvent.click(control);
  await waitFor(() => expect(state.updateSettings).toHaveBeenLastCalledWith("9007199254740993123", { require_api_token_when_linking: false }));
});

it("restores the previous value on save failure and allows retry", async () => {
  state.updateSettings.mockResolvedValueOnce({ error: "Could not save token policy" });
  mount();
  const control = await screen.findByRole("switch", { name: "Require an in-game API token when linking" });
  await waitFor(() => expect(control).toBeEnabled());
  fireEvent.click(control);
  expect(await screen.findByText("Could not save token policy")).toBeInTheDocument();
  expect(control).not.toBeChecked();
  expect(control).toBeEnabled();
  fireEvent.click(control);
  await waitFor(() => expect(state.updateSettings).toHaveBeenCalledTimes(2));
  expect(control).toBeChecked();
});

it("prevents viewers from changing the linking-token policy", async () => {
  state.editable = false;
  mount();
  const control = await screen.findByRole("switch", { name: "Require an in-game API token when linking" });
  expect(control).toBeDisabled();
  fireEvent.click(control);
  expect(state.updateSettings).not.toHaveBeenCalled();
});

it("loads an enabled policy without sending a default-off update", async () => {
  state.getSettings.mockResolvedValueOnce({ data: {
    server_id: "9007199254740993123", server: "Fixture", name: "Fixture", countdowns: {}, server_roles: [], require_api_token_when_linking: true,
  } });
  mount();
  const control = await screen.findByRole("switch", { name: "Require an in-game API token when linking" });
  await waitFor(() => expect(control).toBeChecked());
  expect(state.updateSettings).not.toHaveBeenCalled();
});
