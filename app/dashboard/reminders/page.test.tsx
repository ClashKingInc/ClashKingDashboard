import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, setAccessToken } from "@/lib/auth/session";

const fetchMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());

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
      getServerClans: () => Promise.resolve({ data: [{ tag: "#ABC", name: "Alpha" }] }),
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
    Element.prototype.scrollIntoView = vi.fn();
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
        return Promise.resolve(jsonResponse({
          war_reminders: [],
          capital_reminders: [],
          clan_games_reminders: [],
          inactivity_reminders: [],
        }));
      }
      if (url.endsWith("/reminders") && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ reminder_id: "new" }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
  });

  it("blocks a forum parent until a forum post is selected", async () => {
    const screen = render(<RemindersPage />);
    fireEvent.click((await screen.findAllByRole("button", { name: "actions.addReminder" }))[0]);
    fireEvent.change(screen.getByLabelText(/card\.timeBefore/), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "select-forum" }));

    expect(screen.getByText("card.forumPostRequired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "dialog.addReminder" })).toBeDisabled();
  });

  it("allows a text parent without a thread and sends nullable thread_id", async () => {
    const screen = render(<RemindersPage />);
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
    const screen = render(<RemindersPage />);
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
    const screen = render(<RemindersPage />);
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
});
