import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, setAccessToken } from "@/lib/auth/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dashboardQueryClientConfig } from "@/lib/dashboard-query";

const fetchMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const translateMock = vi.hoisted(() => (key: string) => key);
const fixtures = vi.hoisted(() => ({
  clans: [{ tag: "#ABC", name: "Alpha" }],
  failDiscordMetadata: false,
  reminderLoadFailure: null as null | { status: number; message: string },
  failRefreshAfterSave: false,
  reminders: {
    war_reminders: [] as Array<Record<string, unknown>>,
    capital_reminders: [] as Array<Record<string, unknown>>,
    clan_games_reminders: [] as Array<Record<string, unknown>>,
    inactivity_reminders: [] as Array<Record<string, unknown>>,
    roster_reminders: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock("@/lib/navigation", () => ({
  useParams: () => ({ guildId: "123", locale: "en" }),
  useSearchParams: () => new URLSearchParams("guildId=123"),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("use-intl", () => ({
  useTranslations: () => translateMock,
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
      getChannels: () => Promise.resolve({ data: [
          { id: "100", name: "text", type: "text" },
          { id: "300", name: "forum", type: "forum" },
        ], status: 200 }),
      getThreads: () => Promise.resolve({ data: [{ id: "301", name: "forum post", parent_channel_id: "300", parent_channel_name: "forum", archived: false }], status: 200 }),
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

function capturedRequest(method: string): Request | undefined {
  const call = fetchMock.mock.calls.find(([input, init]) => {
    const request = input instanceof Request ? input : new Request(input, init);
    return request.method === method;
  });
  if (!call) return undefined;
  const [input, init] = call;
  return input instanceof Request ? input : new Request(input, init);
}

function reminderPayload() {
  return Object.fromEntries(Object.entries(fixtures.reminders).map(([key, items]) => [
    key,
    items.map((item) => ({ disabled: false, ...item })),
  ]));
}

describe("RemindersPage Discord destinations", () => {
  beforeEach(() => {
    clearSession(false);
    setAccessToken("token", false);
    vi.clearAllMocks();
    fixtures.clans = [{ tag: "#ABC", name: "Alpha" }];
    fixtures.failDiscordMetadata = false;
    fixtures.reminderLoadFailure = null;
    fixtures.failRefreshAfterSave = false;
    fixtures.reminders = {
      war_reminders: [],
      capital_reminders: [],
      clan_games_reminders: [],
      inactivity_reminders: [],
      roster_reminders: [],
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
      const request = input instanceof Request ? input : new Request(input, init);
      const url = request.url;
      if (url.endsWith("/channels")) {
        if (fixtures.failDiscordMetadata) {
          return Promise.resolve(jsonResponse({ message: "Discord guild authorization failed" }, 503));
        }
        return Promise.resolve(jsonResponse({
          channels: [
            { id: "100", name: "text", type: "text" },
            { id: "300", name: "forum", type: "forum" },
          ],
        }));
      }
      if (url.endsWith("/threads")) {
        if (fixtures.failDiscordMetadata) {
          return Promise.resolve(jsonResponse({ message: "Discord guild authorization failed" }, 503));
        }
        return Promise.resolve(jsonResponse({
          threads: [{ id: "301", name: "forum post", parent_channel_id: "300" }],
        }));
      }
      if (url.endsWith("/reminders") && request.method === "GET") {
        if (fixtures.reminderLoadFailure) {
          return Promise.resolve(jsonResponse(
            { message: fixtures.reminderLoadFailure.message },
            fixtures.reminderLoadFailure.status,
          ));
        }
        if (fixtures.failRefreshAfterSave && capturedRequest("POST")) {
          return Promise.resolve(jsonResponse({ message: "Temporarily unavailable" }, 503));
        }
        return Promise.resolve(jsonResponse(reminderPayload()));
      }
      if (url.endsWith("/reminders") && request.method === "POST") {
        return Promise.resolve(jsonResponse({ message: "created", reminder_id: "new", server_id: "123" }));
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

  it("renders the empty reminder page when no clans are configured", async () => {
    fixtures.clans = [];
    const screen = renderRemindersPage();

    expect((await screen.findAllByRole("button", { name: "actions.addReminder" })).length).toBeGreaterThan(0);
    expect(screen.queryByText("Discord guild authorization failed")).not.toBeInTheDocument();
  });

  it("keeps reminders visible when Discord destination metadata is temporarily unavailable", async () => {
    fixtures.failDiscordMetadata = true;
    fixtures.reminders.war_reminders = [{
      id: "war-1",
      type: "War",
      clan_tag: "#ABC",
      channel_id: "100",
      thread_id: null,
      time: "6 hr",
      war_types: ["Random"],
    }];
    const screen = renderRemindersPage();

    expect(await screen.findByText("6 card.hoursRemaining")).toBeInTheDocument();
    expect(screen.queryByText("Discord guild authorization failed")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "actions.retry" })).not.toBeInTheDocument();
    expect(screen.queryByText("issues.title")).not.toBeInTheDocument();
  });

  it("does not present a provider failure as a Discord authorization denial", async () => {
    fixtures.reminderLoadFailure = { status: 503, message: "Discord guild authorization failed" };
    const screen = renderRemindersPage();

    expect(await screen.findByText("toast.errorLoadingReminders")).toBeInTheDocument();
    expect(screen.queryByText("Discord guild authorization failed")).not.toBeInTheDocument();
  });

  it("preserves a real authorization denial from the reminders endpoint", async () => {
    fixtures.reminderLoadFailure = { status: 403, message: "Discord guild authorization failed" };
    const screen = renderRemindersPage();

    expect(await screen.findByText("Discord guild authorization failed")).toBeInTheDocument();
  });

  it("keeps a disabled reminder visible with its reason and repair action", async () => {
    fixtures.reminders.war_reminders = [{
      id: "disabled-war",
      type: "War",
      clan_tag: "#ABC",
      channel_id: "100",
      thread_id: null,
      time: "6 hr",
      war_types: ["Random"],
      disabled: true,
      disabled_reason: "Discord channel was deleted",
    }];
    const screen = renderRemindersPage();

    const reason = await screen.findByText("Discord channel was deleted");
    const card = reason.closest("article");
    expect(card).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "actions.edit" }));
    expect(await screen.findByText("dialog.editTitle")).toBeInTheDocument();
  });

  it("allows a text parent without a thread and sends nullable thread_id", async () => {
    const screen = renderRemindersPage();
    fireEvent.click((await screen.findAllByRole("button", { name: "actions.addReminder" }))[0]);
    fireEvent.change(screen.getByLabelText(/card\.timeBefore/), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "select-text" }));
    fireEvent.click(screen.getByRole("button", { name: "dialog.addReminder" }));

    await waitFor(() => {
      const post = capturedRequest("POST");
      expect(post).toBeDefined();
    });
    await expect(capturedRequest("POST")!.clone().json()).resolves.toMatchObject({
        channel_id: "100",
        thread_id: null,
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
      expect(capturedRequest("POST")).toBeDefined();
    });
    await expect(capturedRequest("POST")!.clone().json()).resolves.toMatchObject({
        channel_id: "300",
        thread_id: "301",
    });
  });

  it("closes a successful create even when the follow-up list request fails", async () => {
    fixtures.failRefreshAfterSave = true;
    const screen = renderRemindersPage();
    fireEvent.click((await screen.findAllByRole("button", { name: "actions.addReminder" }))[0]);
    fireEvent.change(screen.getByLabelText(/card\.timeBefore/), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "select-text" }));
    fireEvent.click(screen.getByRole("button", { name: "dialog.addReminder" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ description: "toast.reminderAdded" }));
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
    expect(fetchMock.mock.calls.filter(([input]) => input instanceof Request && input.method === "POST")).toHaveLength(1);
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
      expect(capturedRequest("POST")).toBeDefined();
    });
    await expect(capturedRequest("POST")!.clone().json()).resolves.toMatchObject({
        channel_id: "100",
        thread_id: null,
    });
  });

  it.each([false, true])("clones without changing settings and closes after success (refresh failure: %s)", async (failRefresh) => {
    fixtures.failRefreshAfterSave = failRefresh;
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
      expect(capturedRequest("POST")).toBeDefined();
    });
    await expect(capturedRequest("POST")!.clone().json()).resolves.toMatchObject({
        type: "War",
        clan_tag: "#DEF",
        channel_id: "100",
        thread_id: null,
        time: "6 hr",
        custom_text: "Use both attacks",
        war_types: ["Random", "CWL"],
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ description: "toast.reminderCloned" }));
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
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
