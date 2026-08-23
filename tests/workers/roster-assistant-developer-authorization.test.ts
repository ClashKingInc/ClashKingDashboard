import { afterEach, describe, expect, it, vi } from "vitest";
import { DEVELOPER_DISCORD_IDS } from "../../lib/internal/developer-access";
import {
  assertRosterAssistantDeveloper,
  RosterAssistantAuthorizationError,
} from "../../workers/roster-assistant/developer-authorization";

describe("assertRosterAssistantDeveloper", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts an authenticated developer identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ user_id: DEVELOPER_DISCORD_IDS[0] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(assertRosterAssistantDeveloper("https://api.example.com/", "token")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/v2/auth/me", expect.objectContaining({
      method: "GET",
      headers: { authorization: "Bearer token" },
    }));
  });

  it("rejects an authenticated user outside the developer preview", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ user_id: "999999999999999999" })));

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
});
