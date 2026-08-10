import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, setAccessToken } from "@/lib/auth/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dashboardQueryClientConfig } from "@/lib/dashboard-query";

const fetchMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const translateMock = vi.hoisted(() => (key: string) => key);

vi.mock("next/navigation", () => ({
  useParams: () => ({ guildId: "123", locale: "en" }),
  useSearchParams: () => new URLSearchParams("guildId=123"),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => translateMock,
  useLocale: () => "en",
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
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
        <button key={channel.id} type="button" onClick={() => onValueChange(channel.id)}>
          select-{channel.name}
        </button>
      ))}
    </div>
  ),
}));

import AutoboardsPage from "./page";

function renderAutoboardsPage() {
  const queryClient = new QueryClient(dashboardQueryClientConfig);
  return render(<QueryClientProvider client={queryClient}><AutoboardsPage /></QueryClientProvider>);
}

const capability = {
  boardType: "registry-board",
  label: "Registry board",
  targetKind: "location",
  minTargets: 1,
  maxTargets: 1,
  allowedScopes: ["family", "custom"],
  allowedModes: ["refresh", "send"],
  refreshInterval: {
    minMinutes: 15,
    maxMinutes: 120,
    defaultMinutes: 30,
  },
  uiCapabilities: ["location-picker"],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyList() {
  return {
    items: [],
    total: 0,
    refreshCount: 0,
    sendCount: 0,
    limit: 10,
  };
}

describe("AutoboardsPage registry and Discord destinations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    clearSession(false);
    setAccessToken("token", false);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/autoboards/capabilities")) {
        return Promise.resolve(jsonResponse({ boardTypes: [capability] }));
      }
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
      if (url.endsWith("/autoboards") && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ item: { id: "board-1" } }, 201));
      }
      if (url.endsWith("/autoboards") && !init?.method) {
        return Promise.resolve(jsonResponse(emptyList()));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
  });

  it("blocks a forum parent until an exact child post is selected", async () => {
    const screen = renderAutoboardsPage();
    fireEvent.click(await screen.findByRole("button", { name: "actions.create" }));
    fireEvent.click(screen.getByRole("button", { name: "select-forum" }));
    fireEvent.click(screen.getAllByRole("button", { name: "actions.create" }).at(-1)!);

    expect(await screen.findByText("validation.destination")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("allows a text parent directly and sends channelId plus nullable threadId", async () => {
    const screen = renderAutoboardsPage();
    fireEvent.click(await screen.findByRole("button", { name: "actions.create" }));
    fireEvent.click(screen.getByRole("button", { name: "select-text" }));
    fireEvent.click(screen.getAllByRole("button", { name: "actions.create" }).at(-1)!);

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      const body = JSON.parse(String(post?.[1]?.body));
      expect(body).toMatchObject({
        boardType: "registry-board",
        targetScope: "family",
        targets: [],
        channelId: "100",
        threadId: null,
        deliveryMode: "refresh",
        intervalMinutes: 30,
        schedule: null,
      });
      expect(body).not.toHaveProperty("messageId");
    });
  });

  it("sends the selected forum post atomically with its parent", async () => {
    const screen = renderAutoboardsPage();
    fireEvent.click(await screen.findByRole("button", { name: "actions.create" }));
    fireEvent.click(screen.getByRole("button", { name: "select-forum" }));
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[comboboxes.length - 1]);
    fireEvent.click(await screen.findByRole("option", { name: "forum post" }));
    fireEvent.click(screen.getAllByRole("button", { name: "actions.create" }).at(-1)!);

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
        channelId: "300",
        threadId: "301",
      });
    });
  });

  it("clears a selected child when the parent changes", async () => {
    const screen = renderAutoboardsPage();
    fireEvent.click(await screen.findByRole("button", { name: "actions.create" }));
    fireEvent.click(screen.getByRole("button", { name: "select-forum" }));
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[comboboxes.length - 1]);
    fireEvent.click(await screen.findByRole("option", { name: "forum post" }));
    fireEvent.click(screen.getByRole("button", { name: "select-text" }));
    fireEvent.click(screen.getAllByRole("button", { name: "actions.create" }).at(-1)!);

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
        channelId: "100",
        threadId: null,
      });
    });
  });
});
