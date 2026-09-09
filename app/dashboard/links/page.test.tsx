import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setAccessToken, clearSession } from "@/lib/auth/session";
import LinksManagementPage from "./page";

vi.mock("@/lib/dashboard-route", () => ({ useGuildId: () => "9007199254740993123" }));
vi.mock("@/lib/api/client", () => ({ apiClient: { servers: { getGuilds: async () => ({ data: [] }) } } }));
const requests: Request[] = [];

function linksResponse(displayName = "Member") {
  return {
    members: [{ user_id: "9007199254740993124", username: displayName.toLowerCase(), display_name: displayName, avatar_url: "", linked_accounts: [], account_count: 0 }],
    roles: [], total_members: 1, filtered_members: 1, members_with_links: 0, total_linked_accounts: 0, verified_accounts: 0,
  };
}

beforeEach(() => {
  setAccessToken("fixture-session", false);
  vi.stubGlobal("fetch", vi.fn(async (request: Request) => {
    requests.push(request.clone());
    return Response.json(request.method === "POST" ? { message: "Linked", player_tag: "#8QQ", user_id: "9007199254740993124" } : linksResponse());
  }));
});
afterEach(() => { cleanup(); clearSession(false); vi.unstubAllGlobals(); requests.length = 0; });

it("forwards a supplied in-game token through the shared contract and clears it after closing", async () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LinksManagementPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByText("Member"));
  fireEvent.click(screen.getByRole("button", { name: "Add account" }));
  fireEvent.change(screen.getByPlaceholderText("#PLAYER_TAG"), { target: { value: "#8QQ" } });
  const token = screen.getByLabelText("In-game API token");
  expect(token).toHaveAttribute("type", "password");
  fireEvent.change(token, { target: { value: " fixture-token " } });
  fireEvent.click(screen.getByRole("button", { name: "Add link" }));
  await waitFor(() => expect(requests.some((request) => request.method === "POST")).toBe(true));
  const submitted = requests.find((request) => request.method === "POST")!;
  expect(new URL(submitted.url).pathname).toBe("/v2/links/server/9007199254740993123");
  expect(await submitted.json()).toEqual({ playerTag: "#8QQ", userID: "9007199254740993124", api_token: "fixture-token" });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Add account" }));
  expect(screen.getByLabelText("In-game API token")).toHaveValue("");
  fireEvent.change(screen.getByPlaceholderText("#PLAYER_TAG"), { target: { value: "#8QP" } });
  fireEvent.click(screen.getByRole("button", { name: "Add link" }));
  await waitFor(() => expect(requests.filter((request) => request.method === "POST")).toHaveLength(2));
  expect(await requests.filter((request) => request.method === "POST")[1]!.json())
    .toEqual({ playerTag: "#8QP", userID: "9007199254740993124" });
});

it("keeps the current member list mounted while a debounced search loads", async () => {
  let linksCalls = 0;
  let resolveSearch: ((response: Response) => void) | undefined;
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    if (request.method === "GET" && new URL(request.url).pathname === "/v2/links/server/9007199254740993123") {
      linksCalls += 1;
      if (linksCalls === 1) return Response.json(linksResponse());
      return new Promise<Response>(resolve => { resolveSearch = resolve; });
    }
    return Response.json([]);
  }));

  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LinksManagementPage /></QueryClientProvider>);
  expect(await screen.findByText("Member")).toBeInTheDocument();

  fireEvent.change(screen.getByRole("textbox", { name: "Search linked accounts" }), { target: { value: "other" } });
  await waitFor(() => expect(linksCalls).toBe(2));

  expect(screen.getByText("Member")).toBeInTheDocument();
  expect(screen.queryByText("Loading members…")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Updating members")).toBeInTheDocument();

  await act(async () => resolveSearch?.(Response.json(linksResponse("Other"))));
  expect(await screen.findByText("Other")).toBeInTheDocument();
  expect(screen.queryByText("Member")).not.toBeInTheDocument();
});
