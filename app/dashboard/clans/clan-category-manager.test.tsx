import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  ClanCategoryManager,
  normalizeClanCategoryName,
  validateClanCategoryName,
} from "./clan-category-manager";

const apiMock = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  previewDelete: vi.fn(),
  delete: vi.fn(),
}));
const toastMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  apiClient: { clanCategories: apiMock },
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (!values) return key;
    const suffix = Object.entries(values)
      .map(([name, value]) => `${name}=${String(value)}`)
      .join(" ");
    return `${key} ${suffix}`;
  },
}));

const category = {
  id: "category-1",
  serverId: "server-1",
  name: "Competitive",
  clanCount: 2,
};

describe("clan category names", () => {
  it("matches API whitespace and Unicode-rune validation", () => {
    expect(normalizeClanCategoryName("  Clan   Family \n CWL ")).toBe("Clan Family CWL");
    expect(validateClanCategoryName("  Clan   Family ")).toBe(true);
    expect(validateClanCategoryName(" \n ")).toBe(false);
    expect(validateClanCategoryName("bad\u0007name")).toBe(false);
    expect(validateClanCategoryName("😀".repeat(64))).toBe(true);
    expect(validateClanCategoryName("😀".repeat(65))).toBe(false);
  });
});

describe("ClanCategoryManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.list.mockResolvedValue({
      data: { items: [category], total: 1 },
      status: 200,
    });
  });

  it("refreshes category and clan state after create and rename", async () => {
    const refreshClans = vi.fn().mockResolvedValue(undefined);
    apiMock.create.mockResolvedValue({
      data: { category: { ...category, id: "category-2", name: "Events", clanCount: 0 } },
      status: 201,
    });
    apiMock.rename.mockResolvedValue({
      data: { category: { ...category, name: "CWL" } },
      status: 200,
    });

    render(
      <ClanCategoryManager
        serverId="server-1"
        refreshVersion={0}
        onCategoriesChange={vi.fn()}
        onRefreshClans={refreshClans}
      />,
    );

    expect(await screen.findByText("Competitive")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("createLabel"), {
      target: { value: "  Events  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "create" }));

    await waitFor(() => {
      expect(apiMock.create).toHaveBeenCalledWith("server-1", "  Events  ");
      expect(refreshClans).toHaveBeenCalledTimes(1);
      expect(apiMock.list).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole("button", { name: "renameAction name=Competitive" }));
    fireEvent.change(screen.getByLabelText("name"), { target: { value: "CWL" } });
    fireEvent.click(screen.getByRole("button", { name: "saveRename" }));

    await waitFor(() => {
      expect(apiMock.rename).toHaveBeenCalledWith("server-1", "category-1", "CWL");
      expect(refreshClans).toHaveBeenCalledTimes(2);
      expect(apiMock.list).toHaveBeenCalledTimes(3);
    });
  });

  it("waits for a real preview before warning and renders the actual delete count", async () => {
    const refreshClans = vi.fn().mockResolvedValue(undefined);
    let resolvePreview: ((value: unknown) => void) | undefined;
    apiMock.previewDelete.mockReturnValue(new Promise((resolve) => {
      resolvePreview = resolve;
    }));
    apiMock.delete.mockResolvedValue({
      data: {
        categoryId: "category-1",
        name: "Competitive",
        deleted: true,
        uncategorizedClanCount: 3,
      },
      status: 200,
    });

    render(
      <ClanCategoryManager
        serverId="server-1"
        refreshVersion={0}
        onCategoriesChange={vi.fn()}
        onRefreshClans={refreshClans}
      />,
    );

    expect(await screen.findByText("Competitive")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "deleteAction name=Competitive" }));
    expect(apiMock.previewDelete).toHaveBeenCalledWith("server-1", "category-1");
    expect(screen.queryByText("deleteTitle")).not.toBeInTheDocument();

    await act(async () => {
      resolvePreview?.({
        data: {
          category,
          affectedClanCount: 2,
        },
        status: 200,
      });
    });

    expect(await screen.findByText("deleteWarning name=Competitive count=2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "confirmDelete" }));

    expect(await screen.findByText(
      "deleteSuccessDescription count=3",
    )).toBeInTheDocument();
    expect(apiMock.delete).toHaveBeenCalledWith("server-1", "category-1");
    expect(refreshClans).toHaveBeenCalledTimes(1);
    expect(apiMock.list).toHaveBeenCalledTimes(2);
  });

  it("forwards shared API errors without refreshing stale state", async () => {
    const refreshClans = vi.fn().mockResolvedValue(undefined);
    apiMock.create.mockResolvedValue({
      error: "Clan category already exists",
      errorData: {
        code: "conflict",
        message: "Clan category already exists",
        requestId: "request-1",
      },
      status: 409,
    });

    render(
      <ClanCategoryManager
        serverId="server-1"
        refreshVersion={0}
        onCategoriesChange={vi.fn()}
        onRefreshClans={refreshClans}
      />,
    );

    await screen.findByText("Competitive");
    fireEvent.change(screen.getByLabelText("createLabel"), {
      target: { value: "Competitive" },
    });
    fireEvent.click(screen.getByRole("button", { name: "create" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        description: "Clan category already exists",
        variant: "destructive",
      }));
    });
    expect(refreshClans).not.toHaveBeenCalled();
  });
});
