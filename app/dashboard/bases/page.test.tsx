import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BasesPage from "./page";
import { apiCache } from "@/lib/api-cache";

const apiMock = vi.hoisted(() => ({
  list: vi.fn(),
  delete: vi.fn(),
  create: vi.fn(),
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

vi.mock("next/navigation", () => ({
  useParams: () => ({ guildId: "server-1", locale: "en" }),
  useSearchParams: () => new URLSearchParams("guildId=server-1"),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => translateMock,
  useLocale: () => "en",
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span aria-label={alt} />,
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    bases: apiMock,
    servers: serverMock,
  },
}));

const base = {
  id: "base-1",
  serverId: "server-1",
  channelId: "channel-1",
  messageId: "message-1",
  baseLink: "#layout",
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
      data: [{ id: "channel-1", name: "base-share", type: "0" }],
      status: 200,
    });
  });

  it("confirms deletion and distinguishes an already-missing Discord message", async () => {
    apiMock.delete.mockResolvedValue({
      data: {
        baseId: "base-1",
        databaseDeleted: true,
        discordMessageCleanup: "alreadyMissing",
      },
      status: 200,
    });

    render(<BasesPage />);

    expect(await screen.findByText("Layout Alpha")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "delete.action" }));
    expect(screen.getByText("delete.confirmDescription")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "delete.confirmAction" }));

    await waitFor(() => {
      expect(apiMock.delete).toHaveBeenCalledWith("server-1", "base-1");
      expect(screen.getByText("delete.successAlreadyMissing")).toBeInTheDocument();
    });
  });

  it("keeps the confirmation open and surfaces fail-closed API details", async () => {
    const errorData = {
      code: "database_delete_failed",
      message: "Database delete failed",
      requestId: "request-1",
      baseId: "base-1",
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

  it("creates from the server channel selector without a manager-supplied message ID", async () => {
    apiMock.create.mockResolvedValue({ data: base, status: 201 });

    render(<BasesPage />);

    expect(await screen.findByText("Layout Alpha")).toBeInTheDocument();
    await waitFor(() => expect(serverMock.getChannels).toHaveBeenCalledWith("server-1"));
    fireEvent.click(screen.getByRole("button", { name: "create" }));
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByText("#base-share"));
    fireEvent.change(screen.getByLabelText("form.baseLink"), {
      target: { value: "https://link.clashofclans.com/new-layout" },
    });
    fireEvent.change(screen.getByLabelText("form.descriptionLabel"), {
      target: { value: "Fresh layout" },
    });
    fireEvent.click(screen.getByRole("button", { name: "form.submit" }));

    await waitFor(() => {
      expect(apiMock.create).toHaveBeenCalledWith("server-1", {
        channelId: "channel-1",
        baseLink: "https://link.clashofclans.com/new-layout",
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
    fireEvent.click(await screen.findByText("#base-share"));
    fireEvent.change(screen.getByLabelText("form.baseLink"), {
      target: { value: "https://link.clashofclans.com/new-layout" },
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
