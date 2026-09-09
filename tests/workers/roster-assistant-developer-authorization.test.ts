import { afterEach, describe, expect, it, vi } from "vitest";
import { DEVELOPER_DISCORD_IDS } from "../../lib/internal/developer-access";
import {
  assertRosterAssistantDeveloper,
  RosterAssistantAuthorizationError,
} from "../../workers/roster-assistant/developer-authorization";

const identity = (userId: string) => ({
  user_id: userId, username: "User", avatar_url: "", auth_methods: ["discord"], account_summary: { follower_count: 0 },
});

describe("assertRosterAssistantDeveloper", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts an authenticated developer identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(identity(DEVELOPER_DISCORD_IDS[0])));
    vi.stubGlobal("fetch", fetchMock);

    await expect(assertRosterAssistantDeveloper("https://api.example.com/", "token")).resolves.toBeUndefined();
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("https://api.example.com/v2/auth/me");
    expect(request.method).toBe("GET");
    expect(request.headers.get("authorization")).toBe("Bearer token");
  });

  it("rejects an authenticated user outside the developer preview", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(identity("999999999999999999"))));

    await expect(assertRosterAssistantDeveloper("https://api.example.com", "token")).rejects.toMatchObject({
      status: 403,
    } satisfies Partial<RosterAssistantAuthorizationError>);
  });

  it("preserves authentication failures from the trusted identity endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "Unauthorized" }, { status: 401 })));

    await expect(assertRosterAssistantDeveloper("https://api.example.com", "bad-token")).rejects.toMatchObject({
      status: 401,
      message: "Unauthorized",
    } satisfies Partial<RosterAssistantAuthorizationError>);
  });

  it.each([
    { user_id: DEVELOPER_DISCORD_IDS[0] },
    { ...identity(DEVELOPER_DISCORD_IDS[0]), user_id: 123 },
    { ...identity(DEVELOPER_DISCORD_IDS[0]), account_summary: { follower_count: "invalid" } },
  ])("rejects an invalid canonical identity response", async (payload) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
    await expect(assertRosterAssistantDeveloper("https://api.example.com", "token")).rejects.toMatchObject({
      status: 502, message: "Roster assistant identity response is invalid",
    });
  });
});
