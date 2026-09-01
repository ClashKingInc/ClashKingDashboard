import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  authStatus: "authenticated" as "restoring" | "authenticated" | "anonymous",
  replace: vi.fn(),
  push: vi.fn(),
  getApplication: vi.fn(),
  getGrant: vi.fn(),
  updateGrant: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: testState.replace, push: testState.push }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt || "decorative"} />,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === "title") return `Connect ${values?.application}`;
    if (key === "shareAccount") return `Share ${values?.name}`;
    if (key === "result.connectedTitle") return "App connected";
    if (key === "result.connectedDescription") return `${values?.application} connected`;
    return key;
  },
}));

vi.mock("@/components/auth-session-provider", () => ({
  useAuthSession: () => ({ status: testState.authStatus }),
}));

vi.mock("@/lib/theme", () => ({
  clashKingAssets: { logos: { darkBgPng: "/logo.png" } },
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    connectedApps: {
      getApplication: testState.getApplication,
      getGrant: testState.getGrant,
      updateGrant: testState.updateGrant,
    },
  },
}));

import ConnectApplicationPage from "./page";

describe("ConnectApplicationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    testState.authStatus = "authenticated";
    vi.stubGlobal("location", {
      href: "https://connect.clashk.ing/app_123?state=opaque",
      pathname: "/app_123",
      search: "?state=opaque",
      hostname: "connect.clashk.ing",
      assign: vi.fn(),
    });
    testState.getApplication.mockResolvedValue({
      data: { application: { id: "app_123", name: "Roster Tool", developer_name: "Example Dev" } },
    });
    testState.getGrant.mockResolvedValue({
      data: {
        application: { id: "app_123", name: "Roster Tool", developer_name: "Example Dev" },
        accounts: [
          { player_tag: "#AAA", name: "Alpha", is_verified: true, hidden: false },
          { player_tag: "#BBB", name: "Beta", is_verified: false, hidden: true },
        ],
        grant: null,
      },
    });
    testState.updateGrant.mockResolvedValue({ data: { access_mode: "selected" } });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("sends anonymous visitors through existing login and preserves the full connect URL", async () => {
    testState.authStatus = "anonymous";

    render(<ConnectApplicationPage />);

    await waitFor(() => expect(testState.replace).toHaveBeenCalledWith("/login"));
    expect(sessionStorage.getItem("auth_return_to")).toBe("/app_123?state=opaque");
    expect(testState.getApplication).not.toHaveBeenCalled();
  });

  it("validates metadata, snapshots all current accounts, and shows the ClashKing result", async () => {
    render(<ConnectApplicationPage />);

    expect(await screen.findByRole("heading", { name: "Connect Roster Tool" })).toBeInTheDocument();
    expect(testState.getApplication).toHaveBeenCalledWith("app_123", undefined);
    fireEvent.click(screen.getByRole("radio", { name: /modes\.all_current\.title/ }));
    fireEvent.click(screen.getByRole("button", { name: "connect" }));

    await waitFor(() => {
      expect(testState.updateGrant).toHaveBeenCalledWith("app_123", {
        access_mode: "selected",
        player_tags: ["#AAA", "#BBB"],
      });
    });
    expect(await screen.findByRole("heading", { name: "App connected" })).toBeInTheDocument();
  });

  it("sends dynamic access without account tags", async () => {
    render(<ConnectApplicationPage />);

    await screen.findByRole("heading", { name: "Connect Roster Tool" });
    expect(screen.getByRole("radio", { name: /modes\.all_current_and_future\.title/ })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "connect" }));

    await waitFor(() => {
      expect(testState.updateGrant).toHaveBeenCalledWith("app_123", {
        access_mode: "all_current_and_future",
      });
    });
  });

  it("allows explicit selection of an unverified hidden account", async () => {
    render(<ConnectApplicationPage />);

    await screen.findByRole("heading", { name: "Connect Roster Tool" });
    fireEvent.click(screen.getByRole("radio", { name: /modes\.selected\.title/ }));
    expect(screen.getByText("status.unverified")).toBeInTheDocument();
    expect(screen.getByText("status.hidden")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Share Beta" }));
    fireEvent.click(screen.getByRole("button", { name: "connect" }));

    await waitFor(() => {
      expect(testState.updateGrant).toHaveBeenCalledWith("app_123", {
        access_mode: "selected",
        player_tags: ["#BBB"],
      });
    });
  });
});
