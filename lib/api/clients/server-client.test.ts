import { afterEach, describe, expect, it, vi } from "vitest";
import { ServerClient } from "./server-client";

describe("ServerClient dashboard access", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the capabilities endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ full_access: true, sections: {} }) });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    await client.getDashboardCapabilities("123");
    expect(fetchMock).toHaveBeenCalledWith("http://dashboard.test/v2/server/123/dashboard-capabilities", expect.objectContaining({ method: "GET" }));
  });

  it("re-enables tracking through the server activity endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Server tracking re-enabled" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.reactivateServer("123");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://dashboard.test/v2/server/123/reactivate",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends an atomic grant replacement", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ grants: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    await client.updateDashboardAccess("123", [{ role_id: "456", section: "links", access_level: "manage" }]);
    expect(fetchMock).toHaveBeenCalledWith("http://dashboard.test/v2/server/123/dashboard-access", expect.objectContaining({ method: "PUT", body: JSON.stringify({ grants: [{ role_id: "456", section: "links", access_level: "manage" }] }) }));
  });

  it("updates per-guild bot profile fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ bio: "Family bot" }) });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    await client.updateBotGuildProfile("123", { name: "ClashKing Beta", bio: "Family bot" });
    expect(fetchMock).toHaveBeenCalledWith("http://dashboard.test/v2/server/123/bot-profile", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name: "ClashKing Beta", bio: "Family bot" }) }));
  });

  it("keeps clan settings category as a string/null request and returns the shared category model", async () => {
    const category = { id: "category-1", serverId: "123", name: "CWL", clanCount: 1 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: "Clan settings updated successfully",
      server_id: 123,
      clan_tag: "#ABC",
      updated_fields: 1,
      category,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    const response = await client.updateClanSettings("123", "#ABC", { category: "CWL" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://dashboard.test/v2/server/123/clan/%23ABC/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ category: "CWL" }),
      }),
    );
    expect(response.data?.category).toEqual(category);
  });

  it("keeps the five link-parse booleans without a channels field", async () => {
    const linkParse = {
      clan: true,
      army: false,
      player: true,
      base: true,
      show: false,
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: "Server settings updated successfully",
      server_id: 123,
      updated_fields: 5,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.updateSettings("123", { link_parse: linkParse });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://dashboard.test/v2/server/123/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ link_parse: linkParse }),
      }),
    );
    expect(linkParse).not.toHaveProperty("channels");
  });

  it("consumes typed camelCase giveaway, entry, mutation, and reroll responses", async () => {
    const giveaway = {
      id: "giveaway-1",
      serverId: "123",
      prize: "Gold pass",
      channelId: "456",
      status: "ongoing",
      start: "2026-07-24T12:00:00Z",
      end: "2026-07-25T12:00:00Z",
      winners: 1,
      mentions: [],
      textAboveEmbed: "",
      textInEmbed: "Enter",
      textOnEnd: "Ended",
      imageUrl: null,
      profilePictureRequired: false,
      cocAccountRequired: true,
      rolesMode: "none",
      roles: [],
      boosters: [],
      entries: ["user-1", "user-1", "user-2", "user-3"],
      updated: false,
      messageId: "message-1",
      winnersList: [],
      eventPending: null,
      eventPendingAt: null,
      createdAt: "2026-07-24T11:00:00Z",
      updatedAt: "2026-07-24T11:00:00Z",
    };
    const mutation = { message: "Saved", giveawayId: giveaway.id, serverId: "123" };
    const entries = {
      giveawayId: giveaway.id,
      serverId: "123",
      totalEntries: 4,
      uniqueUsers: 3,
      entrants: [{ userId: "user-1", entries: 2, winChance: 50 }],
    };
    const reroll = { ...mutation, newWinners: ["user-2"] };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ongoing: [giveaway],
        upcoming: [],
        ended: [],
        total: 1,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mutation), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(entries), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(reroll), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    const listed = await client.getGiveaways("123");
    const created = await client.createGiveaway("123", new FormData());
    const entrantResponse = await client.getGiveawayEntries("123", giveaway.id);
    const rerolled = await client.rerollGiveaway("123", giveaway.id, ["user-1"]);

    expect(listed.data?.ongoing[0]).toEqual(giveaway);
    expect(listed.data?.ongoing[0]).not.toHaveProperty("data");
    expect(created.data).toEqual(mutation);
    expect(entrantResponse.data).toEqual(entries);
    expect(rerolled.data).toEqual(reroll);
    expect(fetchMock.mock.calls[3][1]).toEqual(expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ user_ids_to_replace: ["user-1"] }),
    }));
  });
});
