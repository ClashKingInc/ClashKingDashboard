import { fireEvent, render, screen } from "@testing-library/react";
import RostersPage from "./page";

const mocks = vi.hoisted(() => ({
  clans: [] as { tag: string; name: string }[],
  createRoster: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/lib/dashboard-route", () => ({
  useGuildId: () => "server-1",
  dashboardHref: (path: string, guildId: string) => `/dashboard/${path}?guildId=${guildId}`,
}));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("use-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/auth-session-provider", () => ({ useAuthSession: () => ({ user: null }) }));
vi.mock("./_hooks", () => ({ useRosters: () => ({
  rosters: [], clans: mocks.clans, loading: false, error: null,
  createRoster: mocks.createRoster, refresh: vi.fn(),
}) }));
vi.mock("./_lib/api", () => ({ fetchGroups: async () => [], fetchChannels: async () => [] }));
vi.mock("@/components/ui/clan-combobox", () => ({
  ClanCombobox: ({ clans, value, onValueChange }: {
    clans: { tag: string; name: string }[]; value: string; onValueChange: (value: string) => void;
  }) => <select aria-label="clan" value={value} onChange={event => onValueChange(event.target.value)}>
    <option value="">Choose clan</option>
    {clans.map(clan => <option key={clan.tag} value={clan.tag}>{clan.name}</option>)}
  </select>,
}));

describe("roster creation", () => {
  beforeEach(() => { mocks.clans = []; vi.clearAllMocks(); });

  it("requires adding a server clan before creation", () => {
    render(<RostersPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "createRoster" })[0]);
    fireEvent.change(screen.getByLabelText(/aliasLabel/), { target: { value: "CWL" } });
    expect(screen.getByText("getStartedAdding")).toBeInTheDocument();
    expect(screen.queryByText("createDialog.typeLabel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "addFirstClan" }));
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/clans?guildId=server-1");
    expect(mocks.createRoster).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "createDialog.create" })).toBeDisabled();
  });

  it("requires selecting a configured clan even when clans exist", () => {
    mocks.clans = [{ tag: "#P0Y", name: "Clan" }];
    render(<RostersPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "createRoster" })[0]);
    fireEvent.change(screen.getByLabelText(/aliasLabel/), { target: { value: "CWL" } });
    expect(screen.queryByText("getStartedAdding")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "createDialog.create" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "clan" }), { target: { value: "#P0Y" } });
    expect(screen.getByRole("combobox", { name: "clan" })).toHaveValue("#P0Y");
    expect(screen.getByRole("button", { name: "createDialog.create" })).toBeEnabled();
    expect(screen.getByText("createDialog.scopeAnyone")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "createDialog.create" }));
    expect(mocks.createRoster).toHaveBeenCalledWith(expect.objectContaining({ signup_scope: "anyone", clan_tag: "#P0Y" }));
  });
});
