import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dashboardQueryClientConfig } from "@/lib/dashboard-query";

const fetchMock = vi.hoisted(() => vi.fn());
const fixtures = vi.hoisted(() => ({
  channels: [{ id: "456", name: "logs", type: "text" }],
  threads: [] as Array<{ id: string; name: string; parent_channel_id: string }>,
  clans: [{ tag: "#ABC", name: "Alpha" }],
  logs: [] as Array<Record<string, unknown>>,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ guildId: "123" }),
  useSearchParams: () => new URLSearchParams("guildId=123"),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/api-cache", () => ({
  apiCache: {
    get: (_key: string, loader: () => unknown) => loader(),
    invalidate: vi.fn(),
  },
}));

vi.mock("@/components/ui/channel-combobox", () => ({
  ChannelCombobox: ({
    channels,
    onValueChange,
    placeholder,
    value,
  }: {
    channels: Array<{ id: string; name: string }>;
    onValueChange: (value: string) => void;
    placeholder: string;
    value: string;
  }) => (
    <div>
      <span>selected-{value}</span>
      {channels.map((channel) => (
        <button
          key={channel.id}
          type="button"
          aria-label={`${placeholder}-${channel.id}`}
          onClick={() => onValueChange(channel.id)}
        >
          {channel.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/ui/clan-combobox", () => ({
  ClanCombobox: ({
    clans,
    id,
    onValueChange,
    specialOptions = [],
    value,
  }: {
    clans: Array<{ tag: string; name: string }>;
    id?: string;
    onValueChange: (value: string) => void;
    specialOptions?: Array<{ value: string; label: string }>;
    value: string;
  }) => (
    <select id={id} value={value} onChange={(event) => onValueChange(event.target.value)}>
      {specialOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      {clans.map((clan) => <option key={clan.tag} value={clan.tag}>{clan.name}</option>)}
    </select>
  ),
}));

import LogsPage from "./page";

function renderLogsPage() {
  const queryClient = new QueryClient(dashboardQueryClientConfig);
  return render(<QueryClientProvider client={queryClient}><LogsPage /></QueryClientProvider>);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function getPutBody(): Record<string, unknown> | undefined {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
  return call ? JSON.parse(String(call[1]?.body)) as Record<string, unknown> : undefined;
}

async function chooseThread(screen: ReturnType<typeof render>, name: string) {
  const comboboxes = screen.getAllByRole("combobox");
  fireEvent.click(comboboxes[comboboxes.length - 1]);
  fireEvent.click(await screen.findByRole("option", { name: new RegExp(name) }));
}

async function selectServerScope(screen: ReturnType<typeof render>) {
  fireEvent.change(await screen.findByRole("combobox", { name: "source.label" }), { target: { value: "__server__" } });
}

describe("LogsPage Discord destinations and family summaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    localStorage.setItem("access_token", "token");
    fixtures.channels = [{ id: "456", name: "logs", type: "text" }];
    fixtures.threads = [];
    fixtures.clans = [{ tag: "#ABC", name: "Alpha" }];
    fixtures.logs = [];
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "PUT") return Promise.resolve(jsonResponse({ message: "updated" }));
      if (url.endsWith("/countdowns") && (init?.method === "POST" || init?.method === "DELETE")) {
        return Promise.resolve(jsonResponse({ message: "updated", channel_id: init.method === "POST" ? "789" : undefined }));
      }
      if (url.endsWith("/channels")) return Promise.resolve(jsonResponse({ channels: fixtures.channels }));
      if (url.endsWith("/panel")) return Promise.resolve(jsonResponse({
        embed_name: null,
        buttons: [],
        button_color: "Grey",
        welcome_channel: null,
      }));
      if (url.endsWith("/embeds")) return Promise.resolve(jsonResponse({ items: [] }));
      if (url.endsWith("/v2/guild/123")) return Promise.resolve(jsonResponse({
        id: "123",
        name: "Test Server",
        icon: null,
      }));
      if (url.endsWith("/threads")) return Promise.resolve(jsonResponse({ threads: fixtures.threads }));
      if (url.endsWith("/clans")) return Promise.resolve(jsonResponse(fixtures.clans));
      if (url.endsWith("/logs")) return Promise.resolve(jsonResponse({ logs: fixtures.logs, count: fixtures.logs.length }));
      if (url.includes("/clan/%23ABC/countdowns")) return Promise.resolve(jsonResponse({
        countdowns: [
          { type: "war_score", name: "War score", enabled: false, channel_id: null },
          { type: "war_timer", name: "War timer", enabled: false, channel_id: null },
        ],
      }));
      if (url.endsWith("/countdowns")) return Promise.resolve(jsonResponse({
        countdowns: [
          { type: "clan_games_timer", name: "Clan Games", enabled: false, channel_id: null },
          { type: "cwl_timer", name: "CWL", enabled: false, channel_id: null },
        ],
      }));
      throw new Error(`Unexpected request: ${url}`);
    });
  });

  it("configures reddit_feed in server scope without clan_tag", async () => {
    const screen = renderLogsPage();
    await selectServerScope(screen);
    fireEvent.click(await screen.findByRole("switch", { name: "serverLogs.redditFeed.label" }));
    fireEvent.click(screen.getByRole("button", { name: "logCard.channelPlaceholder-456" }));
    fireEvent.click(screen.getByRole("button", { name: "logCard.saveDestination" }));

    await waitFor(() => expect(getPutBody()).toEqual({
      channel_id: "456",
      thread_id: null,
      log_types: ["reddit_feed"],
    }));
  });

  it("configures ban_alert in the selected clan scope", async () => {
    const screen = renderLogsPage();
    fireEvent.click(await screen.findByRole("switch", { name: "clanLogs.banAlert.label" }));
    fireEvent.click(screen.getByRole("button", { name: "logCard.channelPlaceholder-456" }));
    fireEvent.click(screen.getByRole("button", { name: "logCard.saveDestination" }));

    await waitFor(() => expect(getPutBody()).toEqual({
      clan_tag: "#ABC",
      channel_id: "456",
      thread_id: null,
      log_types: ["ban_alert"],
    }));
  });

  it("resolves a migrated forum parent and stored child post", async () => {
    fixtures.channels = [{
      id: "1127708751479197806",
      name: "migrated-forum",
      type: "forum",
    }];
    fixtures.threads = [{
      id: "1128181917582364704",
      name: "migrated post",
      parent_channel_id: "1127708751479197806",
    }];
    fixtures.logs = [{
      clan_tag: "#ABC",
      type: "join_log",
      webhook_id: "1128181917582364703",
      channel_id: "1127708751479197806",
      thread_id: "1128181917582364704",
      disabled: false,
    }];

    const screen = renderLogsPage();

    expect(await screen.findByText("selected-1127708751479197806")).toBeInTheDocument();
    expect(screen.getByText(/migrated post/)).toBeInTheDocument();
    expect(screen.queryByText("logCard.channelDeleted")).not.toBeInTheDocument();
  });

  it("links an unavailable saved forum post to Discord with recovery guidance", async () => {
    fixtures.channels = [{ id: "300", name: "forum", type: "forum" }];
    fixtures.logs = [{
      clan_tag: "#ABC",
      type: "join_log",
      webhook_id: "1",
      channel_id: "300",
      thread_id: "301",
      disabled: false,
    }];

    const screen = renderLogsPage();
    const warning = await screen.findByRole("link", { name: "logCard.invalidThread" });

    expect(warning).toHaveAttribute("href", "https://discord.com/channels/123/301");
    expect(warning).toHaveAttribute("target", "_blank");
  });

  it("blocks a forum parent until a child post is selected", async () => {
    fixtures.channels = [{ id: "300", name: "forum", type: "forum" }];
    fixtures.threads = [{ id: "301", name: "forum post", parent_channel_id: "300" }];
    const screen = renderLogsPage();
    fireEvent.click(await screen.findByRole("switch", { name: "clanLogs.joinLog.label" }));
    fireEvent.click(screen.getByRole("button", { name: "logCard.channelPlaceholder-300" }));

    expect(screen.getByText("logCard.forumPostRequired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "logCard.saveDestination" })).toBeDisabled();
    expect(getPutBody()).toBeUndefined();
  });

  it("allows an optional child thread for a text channel", async () => {
    fixtures.threads = [{ id: "457", name: "text thread", parent_channel_id: "456" }];
    const screen = renderLogsPage();
    fireEvent.click(await screen.findByRole("switch", { name: "clanLogs.joinLog.label" }));
    fireEvent.click(screen.getByRole("button", { name: "logCard.channelPlaceholder-456" }));
    await chooseThread(screen, "text thread");
    fireEvent.click(screen.getByRole("button", { name: "logCard.saveDestination" }));

    await waitFor(() => expect(getPutBody()).toMatchObject({
      channel_id: "456",
      thread_id: "457",
    }));
  });

  it("clears the selected child when the parent channel changes", async () => {
    fixtures.channels = [
      { id: "300", name: "forum", type: "forum" },
      { id: "456", name: "logs", type: "text" },
    ];
    fixtures.threads = [{ id: "301", name: "forum post", parent_channel_id: "300" }];
    const screen = renderLogsPage();
    fireEvent.click(await screen.findByRole("switch", { name: "clanLogs.joinLog.label" }));
    fireEvent.click(screen.getByRole("button", { name: "logCard.channelPlaceholder-300" }));
    await chooseThread(screen, "forum post");
    fireEvent.click(screen.getByRole("button", { name: "logCard.channelPlaceholder-456" }));
    fireEvent.click(screen.getByRole("button", { name: "logCard.saveDestination" }));

    await waitFor(() => expect(getPutBody()).toMatchObject({
      channel_id: "456",
      thread_id: null,
    }));
  });

  it("lists broken destinations with their log and clan, then opens the affected configuration", async () => {
    fixtures.clans = [
      { tag: "#ABC", name: "Alpha" },
      { tag: "#OTHER", name: "Other Clan" },
    ];
    fixtures.logs = [
      { clan_tag: "#ABC", type: "join_log", webhook_id: "1", channel_id: "456", disabled: false },
      { type: "reddit_feed", webhook_id: "3", channel_id: "456", disabled: false },
      { clan_tag: "#OTHER", type: "leave_log", webhook_id: "4", channel_id: "missing", disabled: false },
    ];
    const screen = renderLogsPage();

    expect(await screen.findByText("issues.title")).toBeInTheDocument();
    expect(screen.queryByText(/Other Clan · #OTHER/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /issues.title/ }));

    expect(screen.getAllByText("clanLogs.leaveLog.label")).toHaveLength(2);
    expect(screen.getByText(/Other Clan · #OTHER/)).toBeInTheDocument();
    expect(screen.getByText(/issues.channelMissing/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "issues.review" }));

    await waitFor(() => expect(screen.getByRole("combobox", { name: "source.label" })).toHaveValue("#OTHER"));
    expect(screen.getByRole("switch", { name: "clanLogs.leaveLog.label" })).toBeInTheDocument();
  });

  it("loads and enables clan countdowns for the selected clan", async () => {
    const screen = renderLogsPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: "tabs.countdowns" }), { button: 0 });
    fireEvent.click((await screen.findAllByRole("switch", { name: "toggle" }))[0]);

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith("/countdowns") && init?.method === "POST");
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({
        countdown_type: "war_score",
        clan_tag: "#ABC",
      });
    });
  });

  it("loads and enables server countdowns without a clan tag", async () => {
    const screen = renderLogsPage();
    await selectServerScope(screen);
    fireEvent.mouseDown(await screen.findByRole("tab", { name: "serverTabs.countdowns" }), { button: 0 });
    fireEvent.click((await screen.findAllByRole("switch", { name: "toggle" }))[0]);

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith("/countdowns") && init?.method === "POST");
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ countdown_type: "clan_games_timer" });
    });
  });

  it("configures the channel-only join panel from the server tabs", async () => {
    const screen = renderLogsPage();
    await selectServerScope(screen);
    fireEvent.mouseDown(await screen.findByRole("tab", { name: "serverTabs.joinPanel" }), { button: 0 });

    fireEvent.click(await screen.findByRole("switch", { name: "enabled" }));
    fireEvent.click(await screen.findByRole("button", { name: "welcomeChannelPlaceholder-456" }));

    await waitFor(() => expect(getPutBody()).toEqual({
      embed_name: null,
      buttons: [],
      button_color: "Grey",
      welcome_channel: "456",
    }));
  });
});
