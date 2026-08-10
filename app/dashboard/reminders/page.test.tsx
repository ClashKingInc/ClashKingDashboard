import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, setAccessToken } from "@/lib/auth/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dashboardQueryClientConfig } from "@/lib/dashboard-query";

const fetchMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const fixtures = vi.hoisted(() => ({
  clans: [{ tag: "#ABC", name: "Alpha" }],
  reminders: {
    war_reminders: [] as Array<Record<string, unknown>>,
    capital_reminders: [] as Array<Record<string, unknown>>,
    clan_games_reminders: [] as Array<Record<string, unknown>>,
    inactivity_reminders: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ guildId: "123", locale: "en" }),
  useSearchParams: () => new URLSearchParams("guildId=123"),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/api-cache", () => ({
  apiCache: {
    get: (_key: string, loader: () => unknown) => loader(),
    invalidate: vi.fn(),
  },
}));

vi.mock("@/lib/api/client", () => ({
  getDefaultBaseUrl: () => "http://api.test",
  apiClient: {
    servers: {
      getServerClans: () => Promise.resolve({ data: fixtures.clans, status: 200 }),
      getChannels: () => Promise.resolve({ data: {
        channels: [
          { id: "100", name: "text", type: "text" },
          { id: "300", name: "forum", type: "forum" },
        ],
      }, status: 200 }),
      getThreads: () => Promise.resolve({ data: {
        threads: [{ id: "301", name: "forum post", parent_channel_id: "300" }],
      }, status: 200 }),
    },
  },
}));

vi.mock("@/components/ui/channel-combobox", () => ({
  ChannelCombobox: ({
    channels,
    onValueChange,
  }: {
    channels: Array<{ id: string; name: string }>;
    onValueChange: (value: string) => void;
  }) => (
    <div>
      {channels.map((channel) => (
        <button
          key={channel.id}
          type="button"
          onClick={() => onValueChange(channel.id)}
        >
          select-{channel.name}
        </button>
      ))}
    </div>
  ),
}));

import RemindersPage from "./page";

function renderRemindersPage() {
  const queryClient = new QueryClient(dashboardQueryClientConfig);
  return render(<QueryClientProvider client={queryClient}><RemindersPage /></QueryClientProvider>);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("RemindersPage Discord destinations", () => {
  beforeEach(() => {
    clearSession(false);
    setAccessToken("token", false);
    vi.clearAllMocks();
    fixtures.clans = [{ tag: "#ABC", name: "Alpha" }];
    fixtures.reminders = {
      war_reminders: [],
      capital_reminders: [],
      clan_games_reminders: [],
      inactivity_reminders: [],
    };
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("ResizeObserver", class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    localStorage.setItem("access_token", "token");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/channels")) {
        return Promise.resolve(jsonResponse({
          channels: [
            { id: "100", name: "text", type: "text" },
            { id: "300", name: "forum", type: "forum" },
          ],
        }));
      }
      if (url.endsWith("/threads")) {
        return Promise.resolve(jsonResponse({
          threads: [{ id: "301", name: "forum post", parent_channel_id: "300" }],
        }));
      }
      if (url.endsWith("/reminders") && !init?.method) {
        return Promise.resolve(jsonResponse(fixtures.reminders));
      }
      if (url.endsWith("/reminders") && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ reminder_id: "new" }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
  });

  it("blocks a forum parent until a forum post is selected", async () => {
    const screen = renderRemindersPage();
    fireEvent.click((await screen.findAllByRole("button", { name: "actions.addReminder" }))[0]);
    fireEvent.change(screen.getByLabelText(/card\.timeBefore/), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "select-forum" }));

    expect(screen.getByText("card.forumPostRequired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "dialog.addReminder" })).toBeDisabled();
  });

  it("allows a text parent without a thread and sends nullable thread_id", async () => {
    const screen = renderRemindersPage();
    fireEvent.click((await screen.findAllByRole("button", { name: "actions.addReminder" }))[0]);
    fireEvent.change(screen.getByLabelText(/card\.timeBefore/), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "select-text" }));
    fireEvent.click(screen.getByRole("button", { name: "dialog.addReminder" }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(post).toBeDefined();
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
        channel_id: "100",
        thread_id: null,
      });
    });
  });

  it("sends the selected forum post with its parent channel", async () => {
    const screen = renderRemindersPage();
    fireEvent.click((await screen.findAllByRole("button", { name: "actions.addReminder" }))[0]);
    fireEvent.change(screen.getByLabelText(/card\.timeBefore/), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "select-forum" }));
    fireEvent.click(screen.getByRole("combobox", { name: /card\.forumPost/ }));
    fireEvent.click(await screen.findByRole("option", { name: "forum post" }));
    fireEvent.click(screen.getByRole("button", { name: "dialog.addReminder" }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
        channel_id: "300",
        thread_id: "301",
      });
    });
  });

  it("clears a selected thread when the parent channel changes", async () => {
    const screen = renderRemindersPage();
    fireEvent.click((await screen.findAllByRole("button", { name: "actions.addReminder" }))[0]);
    fireEvent.change(screen.getByLabelText(/card\.timeBefore/), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "select-forum" }));
    fireEvent.click(screen.getByRole("combobox", { name: /card\.forumPost/ }));
    fireEvent.click(await screen.findByRole("option", { name: "forum post" }));
    fireEvent.click(screen.getByRole("button", { name: "select-text" }));
    fireEvent.click(screen.getByRole("button", { name: "dialog.addReminder" }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
        channel_id: "100",
        thread_id: null,
      });
    });
  });

  it("clones a reminder to a different clan without changing its settings", async () => {
    fixtures.clans = [
      { tag: "#ABC", name: "Alpha" },
      { tag: "#DEF", name: "Beta" },
    ];
    fixtures.reminders.war_reminders = [{
      id: "war-1",
      type: "War",
      clan_tag: "#ABC",
      channel_id: "100",
      thread_id: null,
      time: "6 hr",
      custom_text: "Use both attacks",
      war_types: ["Random", "CWL"],
    }];

    const screen = renderRemindersPage();
    fireEvent.pointerDown(await screen.findByRole("button", { name: "actions.more" }), { button: 0 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "actions.clone" }));
    fireEvent.click(screen.getByRole("combobox", { name: "clone.targetClan" }));
    fireEvent.click(await screen.findByRole("option", { name: /Beta/ }));
    fireEvent.click(screen.getByRole("button", { name: "clone.action" }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
        type: "War",
        clan_tag: "#DEF",
        channel_id: "100",
        thread_id: null,
        time: "6 hr",
        custom_text: "Use both attacks",
        war_types: ["Random", "CWL"],
      });
    });
  });

  it("lists broken reminder destinations and opens the affected reminder", async () => {
    fixtures.reminders.war_reminders = [{
      id: "war-1",
      type: "War",
      clan_tag: "#ABC",
      channel_id: "missing",
      thread_id: null,
      time: "6 hr",
      war_types: ["Random"],
    }];

    const screen = renderRemindersPage();
    expect(await screen.findByText("issues.title")).toBeInTheDocument();
    expect(screen.queryByText(/issues.channelMissing/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /issues.title/ }));
    expect(screen.getByText(/issues.channelMissing/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "issues.review" }));

    expect(screen.getByText("dialog.editTitle")).toBeInTheDocument();
  });
});
