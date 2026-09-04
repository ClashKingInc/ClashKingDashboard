import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dashboardQueryClientConfig } from "@/lib/dashboard-query";
import type { ApproveMessage, TicketPanel } from "@/lib/api/types/tickets";
import germanMessages from "@/messages/de.json";

const { getPanels, getEmbeds, getChannels, getDiscordRoles, updateApproveMessages, toast, translations } = vi.hoisted(() => ({
  getPanels: vi.fn(),
  getEmbeds: vi.fn(),
  getChannels: vi.fn(),
  getDiscordRoles: vi.fn(),
  updateApproveMessages: vi.fn(),
  toast: vi.fn(),
  translations: { german: false },
}));

vi.mock("@/lib/navigation", () => ({
  useParams: () => ({ guildId: "123" }),
  useSearchParams: () => new URLSearchParams("guildId=123"),
}));

vi.mock("use-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("use-intl")>();
  return {
    ...actual,
    useTranslations: (namespace: string) => translations.german
      ? actual.createTranslator({ locale: "de", messages: germanMessages, namespace })
      : (key: string) => key,
    useLocale: () => translations.german ? "de" : "en",
  };
});

vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast }) }));

vi.mock("@/lib/api-cache", () => ({
  apiCache: {
    get: (_key: string, loader: () => unknown) => loader(),
    invalidate: vi.fn(),
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    tickets: {
      getPanels,
      getEmbeds,
      updateApproveMessages,
    },
    servers: {
      getChannels,
      getDiscordRoles,
    },
  },
}));

import TicketsPage, { MessagesTab } from "./page";

const templates = (count: number): ApproveMessage[] => Array.from({ length: count }, (_, i) => ({
  name: `Template ${i + 1}`,
  message: `  Content ${i + 1}\nKeep whitespace.  `,
}));

function renderMessages(messages: ApproveMessage[]) {
  const panel: TicketPanel = {
    id: "018f1d6b-8c50-7e8d-9c31-aef6f6f1a100", name: "Recruitment / EU", server_id: "123",
    components: [], button_settings: {}, approve_messages: messages,
  };
  const view = render(<MessagesTab panel={panel} guildId="123" />);
  fireEvent.click(view.getByRole("button", { name: translations.german
    ? germanMessages.TicketsSettingsPage.editMessagesButton : "editMessagesButton" }));
  return { ...view, editor: within(view.getByRole("dialog")) };
}

describe("approval and denial message editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    translations.german = false;
    updateApproveMessages.mockResolvedValue({ data: { message: "updated" } });
  });

  it.each([0, 1, 25])("saves all %i messages in order without local IDs or content changes", async (count) => {
    const messages = templates(count);
    const view = renderMessages(messages);
    expect(view.editor.getByRole("button", { name: "addMessage" }).hasAttribute("disabled")).toBe(count === 25);
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    await waitFor(() => expect(updateApproveMessages).toHaveBeenCalledWith("123", "Recruitment / EU", { messages }));
    await waitFor(() => expect(view.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps all 26 loaded rows, blocks saving, and allows removing the last row to recover", async () => {
    const messages = templates(26);
    const view = renderMessages(messages);
    expect(view.editor.getAllByRole("button", { name: /^delete:/ })).toHaveLength(26);
    expect(view.editor.getByRole("button", { name: "addMessage" })).toBeDisabled();
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    expect(updateApproveMessages).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: "messagesInvalid" }));
    fireEvent.click(view.editor.getByRole("button", { name: "delete: 26. Template 26" }));
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    await waitFor(() => expect(updateApproveMessages).toHaveBeenCalledWith("123", "Recruitment / EU", { messages: messages.slice(0, 25) }));
  });

  it("adds, edits, reorders, and removes nonfirst rows using stable local identity", async () => {
    const view = renderMessages(templates(2));
    fireEvent.click(view.editor.getByRole("button", { name: "Template 2", exact: true }));
    fireEvent.change(view.editor.getByRole("textbox", { name: "messageName: 2" }), { target: { value: "  Denial  " } });
    fireEvent.change(view.editor.getByRole("textbox", { name: "contentLabel: 2" }), { target: { value: "\nSorry, try again.  " } });
    fireEvent.click(view.editor.getByRole("button", { name: "moveMessageUp: 2. Denial" }));
    expect(view.editor.getByRole("textbox", { name: "contentLabel: 1" })).toHaveValue("\nSorry, try again.  ");
    fireEvent.click(view.editor.getByRole("button", { name: "addMessage" }));
    fireEvent.change(view.editor.getByRole("textbox", { name: "messageName: 3" }), { target: { value: "Approved" } });
    fireEvent.change(view.editor.getByRole("textbox", { name: "contentLabel: 3" }), { target: { value: "Welcome!" } });
    fireEvent.click(view.editor.getByRole("button", { name: "delete: 2. Template 1" }));
    expect(view.editor.getByRole("textbox", { name: "contentLabel: 2" })).toHaveValue("Welcome!");
    fireEvent.click(view.editor.getByRole("button", { name: "moveMessageDown: 1. Denial" }));
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    await waitFor(() => expect(updateApproveMessages).toHaveBeenCalledWith("123", "Recruitment / EU", { messages: [
      { name: "Approved", message: "Welcome!" }, { name: "  Denial  ", message: "\nSorry, try again.  " },
    ] }));
    await waitFor(() => expect(view.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(view.getByRole("button", { name: "editMessagesButton" }));
    fireEvent.click(within(view.getByRole("dialog")).getByRole("button", { name: "Denial", exact: true }));
    expect(view.getByRole("textbox", { name: "messageName: 2" })).toHaveValue("Denial");
  });

  it.each([
    [{ name: " ", message: "Content" }],
    [{ name: "Name", message: "\n " }],
    [{ name: "x".repeat(101), message: "Content" }],
    [{ name: "Name", message: "x".repeat(2001) }],
    [{ name: "Name", message: "One" }, { name: " Name ", message: "Two" }],
  ])("rejects invalid drafts without dropping or truncating rows: %j", async (...messages) => {
    const view = renderMessages(messages);
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    expect(updateApproveMessages).not.toHaveBeenCalled();
    expect(view.editor.getAllByRole("button", { name: /^delete:/ })).toHaveLength(messages.length);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: "messagesInvalid" }));
  });

  it("preserves oversized typed content and accepts exact limits with case-sensitive names", async () => {
    const messages = [{ name: "A".repeat(100), message: "x".repeat(2000) }, { name: "a".repeat(100), message: "Other" }];
    const view = renderMessages(messages);
    fireEvent.click(view.editor.getByRole("button", { name: messages[0].name, exact: true }));
    const input = view.editor.getByRole("textbox", { name: "contentLabel: 1" });
    fireEvent.change(input, { target: { value: "x".repeat(2001) } });
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    expect(input).toHaveValue("x".repeat(2001));
    expect(updateApproveMessages).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: messages[0].message } });
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    await waitFor(() => expect(updateApproveMessages).toHaveBeenCalledWith("123", "Recruitment / EU", { messages }));
  });

  it("preserves a failed draft, blocks changes and dismissal during save, and retries unchanged", async () => {
    let fail!: (value: { error: string }) => void;
    updateApproveMessages.mockReturnValueOnce(new Promise((resolve) => { fail = resolve; }));
    const view = renderMessages(templates(2));
    fireEvent.click(view.editor.getByRole("button", { name: "delete: 2. Template 2" }));
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    expect(view.editor.getByRole("button", { name: "addMessage" })).toBeDisabled();
    expect(view.editor.getByRole("button", { name: "cancel" })).toBeDisabled();
    fireEvent.click(view.editor.getByRole("button", { name: "close" }));
    expect(view.getByRole("dialog")).toBeInTheDocument();
    fail({ error: "API unavailable" });
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: "API unavailable" })));
    expect(view.editor.getAllByRole("button", { name: /^delete:/ })).toHaveLength(1);
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    await waitFor(() => expect(updateApproveMessages).toHaveBeenCalledTimes(2));
    expect(updateApproveMessages.mock.calls[1]).toEqual(updateApproveMessages.mock.calls[0]);
  });

  it("can delete the only template and explicitly save an empty list", async () => {
    const view = renderMessages(templates(1));
    fireEvent.click(view.editor.getByRole("button", { name: "delete: 1. Template 1" }));
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    await waitFor(() => expect(updateApproveMessages).toHaveBeenCalledWith("123", "Recruitment / EU", { messages: [] }));
  });

  it("keeps the editor open for an empty error message from a contract failure", async () => {
    updateApproveMessages.mockResolvedValueOnce({ error: "", status: 0 });
    const view = renderMessages(templates(1));
    fireEvent.click(view.editor.getByRole("button", { name: "save" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: "loadError" })));
    expect(view.getByRole("dialog")).toBeInTheDocument();
  });

  it("localizes row actions, field labels, validation, and the close button", () => {
    translations.german = true;
    const view = renderMessages(templates(2));
    const t = germanMessages.TicketsSettingsPage;
    expect(view.editor.getByRole("button", { name: `${t.moveMessageUp}: 2. Template 2` })).toBeEnabled();
    expect(view.editor.getByRole("button", { name: `${t.moveMessageDown}: 1. Template 1` })).toBeEnabled();
    expect(view.editor.getByRole("button", { name: germanMessages.Common.close })).toBeInTheDocument();
    fireEvent.click(view.editor.getByRole("button", { name: "Template 2", exact: true }));
    fireEvent.change(view.editor.getByRole("textbox", { name: `${t.contentLabel}: 2` }), { target: { value: "" } });
    fireEvent.click(view.editor.getByRole("button", { name: germanMessages.Common.save }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: t.messagesInvalid }));
    translations.german = false;
  });
});

describe("TicketsPage after open-ticket retirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPanels.mockResolvedValue({
      data: {
        items: [],
        total: 0,
        available_embeds: [],
        townhall_requirement_fields: [],
      },
    });
    getEmbeds.mockResolvedValue({ data: { items: [], total: 0 } });
    getChannels.mockResolvedValue({ data: [] });
    getDiscordRoles.mockResolvedValue({ data: { roles: [] } });
  });

  it("loads panel and embed management directly without an open-ticket request", async () => {
    const queryClient = new QueryClient(dashboardQueryClientConfig);
    const { getByText, queryByText } = render(
      <QueryClientProvider client={queryClient}><TicketsPage /></QueryClientProvider>,
    );

    await waitFor(() => {
      expect(getPanels).toHaveBeenCalledWith("123");
      expect(getEmbeds).toHaveBeenCalledWith("123");
    });

    expect(getByText("noPanels")).toBeInTheDocument();
    expect(queryByText("tabTickets")).not.toBeInTheDocument();
  });

  it("keeps ticket previews collapsed until their summary is expanded", async () => {
    getPanels.mockResolvedValue({
      data: {
        items: [{
          id: "018f1d6b-8c50-7e8d-9c31-aef6f6f1a100",
          name: "Recruitment",
          server_id: "123",
          embed_name: "Welcome",
          components: [],
          approve_messages: [],
          button_settings: {},
          open_category: null,
          sleep_category: null,
          closed_category: null,
          status_change_log: null,
          ticket_button_click_log: null,
          ticket_close_log: null,
        }],
        total: 1,
        available_embeds: ["Welcome"],
        townhall_requirement_fields: [],
      },
    });
    getEmbeds.mockResolvedValue({
      data: {
        items: [{ name: "Welcome", data: { embeds: [{ description: "Preview body" }] } }],
        total: 1,
      },
    });

    const queryClient = new QueryClient(dashboardQueryClientConfig);
    const { findByText, getByText, queryByText } = render(
      <QueryClientProvider client={queryClient}><TicketsPage /></QueryClientProvider>,
    );

    const panelName = await findByText("Recruitment");
    expect(queryByText("Preview body")).not.toBeInTheDocument();

    const summaryButton = panelName.closest("button");
    expect(summaryButton).not.toBeNull();
    fireEvent.click(summaryButton!);

    expect(getByText("Preview body")).toBeInTheDocument();
    expect(summaryButton).toHaveAttribute("aria-expanded", "true");
  });
});
