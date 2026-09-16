import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BasesPage from "./page";
import { apiCache } from "@/lib/api-cache";

const apiMock = vi.hoisted(() => ({
  list: vi.fn(),
  delete: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  uploadImage: vi.fn(),
  getDownloader: vi.fn(),
}));
const translateMock = vi.hoisted(() => (key: string) => key);
const serverMock = vi.hoisted(() => ({
  getChannels: vi.fn(),
}));

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});
HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock("@/lib/navigation", () => ({
  useParams: () => ({ guildId: "server-1", locale: "en" }),
  useSearchParams: () => new URLSearchParams("guildId=server-1"),
}));

vi.mock("use-intl", () => ({
  useTranslations: () => translateMock,
  useLocale: () => "en",
}));

vi.mock("@/components/app-image", () => ({
  default: ({ alt }: { alt: string }) => <span aria-label={alt} />,
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    bases: apiMock,
    servers: serverMock,
  },
}));

const base = {
  id: "101",
  serverId: "server-1",
  channelId: "channel-1",
  messageId: "message-1",
  baseLink: "https://link.clashofclans.com/en?action=OpenLayout&id=TH17%3AHV%3AAAAA",
  images: [],
  description: "Layout Alpha",
  downloadCount: 2,
  upvotes: 3,
  downvotes: 1,
  downloaders: ["user-1", "user-2"],
  createdAt: "2026-07-24T00:00:00Z",
  discordMessageUrl: "#discord-message",
};

describe("BasesPage manager deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiCache.clear();
    apiMock.list.mockResolvedValue({
      data: { items: [base], total: 1, limit: 50, offset: 0 },
      status: 200,
    });
    serverMock.getChannels.mockResolvedValue({
      data: [{ id: "channel-1", name: "base-share", type: "text" }],
      status: 200,
    });
  });

  it("confirms deletion and distinguishes an already-missing Discord message", async () => {
    apiMock.delete.mockResolvedValue({
      data: {
        baseId: "101",
        databaseDeleted: true,
        discordMessageCleanup: "alreadyMissing",
      },
      status: 200,
    });

    render(<BasesPage />);

    expect(await screen.findByText("Layout Alpha")).toBeInTheDocument();
    expect(screen.getByText("server-1")).toBeInTheDocument();
    expect(screen.getByText("channel-1")).toBeInTheDocument();
    expect(screen.getByText("message-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "delete.action" }));
    expect(screen.getByText("delete.confirmDescription")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "delete.confirmAction" }));

    await waitFor(() => {
      expect(apiMock.delete).toHaveBeenCalledWith("server-1", "101");
      expect(screen.getByText("delete.successAlreadyMissing")).toBeInTheDocument();
    });
  });

  it("keeps the confirmation open and surfaces fail-closed API details", async () => {
    const errorData = {
      code: "database_delete_failed",
      message: "Database delete failed",
      requestId: "request-1",
      baseId: "101",
      databaseDeleted: false,
      discordMessageCleanup: "deleted",
      retryable: true,
    };
    apiMock.delete.mockResolvedValue({
      error: errorData.message,
      errorData,
      status: 500,
    });

    render(<BasesPage />);

    expect(await screen.findByText("Layout Alpha")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "delete.action" }));
    fireEvent.click(screen.getByRole("button", { name: "delete.confirmAction" }));

    expect(await screen.findByText("delete.cleanupCompleteTitle")).toBeInTheDocument();
    expect(screen.getByText(errorData.message)).toBeInTheDocument();
    expect(screen.getByText("HTTP 500 · database_delete_failed · request request-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "delete.confirmAction" })).toBeInTheDocument();
  });

  it("resolves downloader identities without exposing voter identities", async () => {
    apiMock.getDownloader.mockResolvedValue({
      data: { userId: "user-1", displayName: "Builder", avatarUrl: null },
      status: 200,
    });

    render(<BasesPage />);

    expect(await screen.findByText("Layout Alpha")).toBeInTheDocument();
    expect(screen.getByText("counts.upvotes").previousElementSibling).toHaveTextContent("3");
    expect(screen.getByText("counts.downvotes").previousElementSibling).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "history.title" }));
    fireEvent.click(screen.getByRole("button", { name: /user-1/ }));

    await waitFor(() => {
      expect(apiMock.getDownloader).toHaveBeenCalledWith("server-1", "101", "user-1");
      expect(screen.getByText("Builder")).toBeInTheDocument();
    });
  });

  it("updates only the complete editable set and preserves source context", async () => {
    const editableBase = {
      ...base,
      images: ["https://api.clashk.ing/v2/media/base.webp"],
    };
    apiMock.list.mockResolvedValue({
      data: { items: [editableBase], total: 1, limit: 50, offset: 0 },
      status: 200,
    });
    apiMock.update.mockResolvedValue({ data: editableBase, status: 200 });

    render(<BasesPage />);

    expect(await screen.findByText("Layout Alpha")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "edit.action" }));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "form.removeImage" }));
    fireEvent.change(screen.getByLabelText("form.baseLink"), {
      target: { value: "https://link.clashofclans.com/en?action=OpenLayout&id=TH17%3AHV%3ABBBB" },
    });
    fireEvent.change(screen.getByLabelText("form.descriptionLabel"), {
      target: { value: "Updated layout" },
    });
    fireEvent.click(screen.getByRole("button", { name: "form.update" }));

    await waitFor(() => {
      expect(apiMock.update).toHaveBeenCalledWith("server-1", "101", {
        baseLink: "https://link.clashofclans.com/en?action=OpenLayout&id=TH17%3AHV%3ABBBB",
        description: "Updated layout",
        images: [],
      });
    });
    const body = apiMock.update.mock.calls[0]?.[2];
    expect(body).not.toHaveProperty("serverId");
    expect(body).not.toHaveProperty("channelId");
    expect(body).not.toHaveProperty("messageId");
    expect(body).not.toHaveProperty("downloaders");
    expect(body).not.toHaveProperty("upvotes");
    expect(body).not.toHaveProperty("downvotes");
  });

  it("keeps editing open when the API rejects the complete replacement", async () => {
    apiMock.update.mockResolvedValue({
      error: "Layout link is invalid",
      errorData: { code: "invalid_request", message: "Layout link is invalid" },
      status: 400,
    });

    render(<BasesPage />);

    expect(await screen.findByText("Layout Alpha")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "edit.action" }));
    fireEvent.click(screen.getByRole("button", { name: "form.update" }));

    expect(await screen.findByText("Layout link is invalid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "form.update" })).toBeInTheDocument();
    expect(apiMock.update).toHaveBeenCalledWith("server-1", "101", {
      baseLink: base.baseLink,
      description: base.description,
      images: [],
    });
  });

  it("creates from the server channel selector without a manager-supplied message ID", async () => {
    apiMock.create.mockResolvedValue({ data: base, status: 201 });

    render(<BasesPage />);

    expect(await screen.findByText("Layout Alpha")).toBeInTheDocument();
    await waitFor(() => expect(serverMock.getChannels).toHaveBeenCalledWith("server-1"));
    fireEvent.click(screen.getByRole("button", { name: "create" }));
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click((await screen.findAllByText("#base-share")).at(-1)!);
    fireEvent.change(screen.getByLabelText("form.baseLink"), {
      target: { value: "https://link.clashofclans.com/en?action=OpenLayout&id=TH17%3AHV%3AAAAA" },
    });
    fireEvent.change(screen.getByLabelText("form.descriptionLabel"), {
      target: { value: "Fresh layout" },
    });
    fireEvent.click(screen.getByRole("button", { name: "form.submit" }));

    await waitFor(() => {
      expect(apiMock.create).toHaveBeenCalledWith("server-1", {
        channelId: "channel-1",
        baseLink: "https://link.clashofclans.com/en?action=OpenLayout&id=TH17%3AHV%3AAAAA",
        images: [],
        description: "Fresh layout",
      });
    });
    expect(apiMock.uploadImage).not.toHaveBeenCalled();
  });

  it("keeps creation open and warns when Discord cleanup fails after message creation", async () => {
    const errorData = {
      code: "database_insert_failed",
      message: "Database insert failed after the Discord message was created",
      requestId: "request-create-1",
      databaseInserted: false,
      discordMessageCreated: true,
      discordMessageId: "message-orphan-1",
      discordMessageCleanup: "failed",
      retryable: false,
    };
    apiMock.create.mockResolvedValue({
      error: errorData.message,
      errorData,
      status: 500,
    });

    render(<BasesPage />);

    expect(await screen.findByText("Layout Alpha")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "create" }));
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click((await screen.findAllByText("#base-share")).at(-1)!);
    fireEvent.change(screen.getByLabelText("form.baseLink"), {
      target: { value: "https://link.clashofclans.com/en?action=OpenLayout&id=TH17%3AHV%3AAAAA" },
    });
    fireEvent.change(screen.getByLabelText("form.descriptionLabel"), {
      target: { value: "Fresh layout" },
    });
    fireEvent.click(screen.getByRole("button", { name: "form.submit" }));

    expect(await screen.findByText("form.createCleanupFailedTitle")).toBeInTheDocument();
    expect(screen.getByText(errorData.message)).toBeInTheDocument();
    expect(screen.getByText("form.notRetryable")).toBeInTheDocument();
    expect(screen.getByText("form.discordMessageId: message-orphan-1")).toBeInTheDocument();
    expect(screen.getByText(
      "HTTP 500 · database_insert_failed · request request-create-1",
    )).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "form.submit" })).toBeInTheDocument();
  });
});
