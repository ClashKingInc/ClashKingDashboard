import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import LogsPage from "./page";

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
      if (url.endsWith("/channels")) return Promise.resolve(jsonResponse({ channels: fixtures.channels }));
      if (url.endsWith("/threads")) return Promise.resolve(jsonResponse({ threads: fixtures.threads }));
      if (url.endsWith("/clans")) return Promise.resolve(jsonResponse(fixtures.clans));
      if (url.endsWith("/logs")) return Promise.resolve(jsonResponse({ logs: fixtures.logs, count: fixtures.logs.length }));
      throw new Error(`Unexpected request: ${url}`);
    });
  });

  it("configures reddit_feed in server scope without clan_tag", async () => {
    const screen = render(<LogsPage />);
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /tabs\.server/ }), { button: 0 });
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
    const screen = render(<LogsPage />);
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

    const screen = render(<LogsPage />);

    expect(await screen.findByText("selected-1127708751479197806")).toBeInTheDocument();
    expect(screen.getByText(/migrated post/)).toBeInTheDocument();
    expect(screen.queryByText("logCard.channelDeleted")).not.toBeInTheDocument();
  });

  it("blocks a forum parent until a child post is selected", async () => {
    fixtures.channels = [{ id: "300", name: "forum", type: "forum" }];
    fixtures.threads = [{ id: "301", name: "forum post", parent_channel_id: "300" }];
    const screen = render(<LogsPage />);
    fireEvent.click(await screen.findByRole("switch", { name: "clanLogs.joinLog.label" }));
    fireEvent.click(screen.getByRole("button", { name: "logCard.channelPlaceholder-300" }));

    expect(screen.getByText("logCard.forumPostRequired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "logCard.saveDestination" })).toBeDisabled();
    expect(getPutBody()).toBeUndefined();
  });

  it("allows an optional child thread for a text channel", async () => {
    fixtures.threads = [{ id: "457", name: "text thread", parent_channel_id: "456" }];
    const screen = render(<LogsPage />);
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
    const screen = render(<LogsPage />);
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

  it("counts active logs and issues across every clan plus server scope", async () => {
    fixtures.logs = [
      { clan_tag: "#ABC", type: "join_log", webhook_id: "1", channel_id: "456", disabled: false },
      { clan_tag: "#DEF", type: "join_log", webhook_id: "2", channel_id: "456", disabled: false },
      { type: "reddit_feed", webhook_id: "3", channel_id: "456", disabled: false },
      { clan_tag: "#OTHER", type: "leave_log", webhook_id: "4", channel_id: "missing", disabled: false },
    ];
    const screen = render(<LogsPage />);

    const activeCard = (await screen.findByText("stats.activeLogs")).parentElement?.parentElement;
    const issuesCard = screen.getByText("stats.issues").parentElement?.parentElement;
    expect(activeCard).not.toBeNull();
    expect(issuesCard).not.toBeNull();
    expect(within(activeCard as HTMLElement).getByText("4")).toBeInTheDocument();
    expect(within(issuesCard as HTMLElement).getByText("1")).toBeInTheDocument();
    expect(screen.getByText("stats.activeLogsDesc")).toBeInTheDocument();
    expect(screen.getByText("stats.issuesDesc")).toBeInTheDocument();
  });
});
