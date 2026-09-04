import { afterEach, describe, expect, it, vi } from "vitest";
import { ServerClient } from "./server-client";

describe("ServerClient dashboard access", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([false, true])("preserves explicit linking-token policy %s through the shared request and response", async (enabled) => {
    const settings = { server_id: "9007199254740993123", server: "Fixture", name: "Fixture", countdowns: {}, server_roles: [],
      require_api_token_when_linking: enabled };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ message: "Updated", server_id: settings.server_id, updated_fields: 1 }))
      .mockResolvedValueOnce(Response.json(settings));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    await client.updateSettings(settings.server_id, { require_api_token_when_linking: enabled });
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.method).toBe("PATCH");
    expect(request.url).toBe(`http://dashboard.test/v2/server/${settings.server_id}/settings`);
    expect(await request.json()).toEqual({ require_api_token_when_linking: enabled });
    expect((await client.getSettings(settings.server_id)).data?.require_api_token_when_linking).toBe(enabled);
  });

  it("uses the capabilities endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      server_id: "123",
      full_access: true,
      sections: {},
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    await client.getDashboardCapabilities("123");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/server/123/dashboard-capabilities");
    expect(request.method).toBe("GET");
  });

  it("re-enables tracking through the server activity endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Server tracking re-enabled" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.reactivateServer("123");

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/server/123/reactivate");
    expect(request.method).toBe("POST");
  });

  it("sends an atomic grant replacement", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      server_id: "123",
      roles: [],
      grants: [],
      sections: [],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    await client.updateDashboardAccess("123", [{ role_id: "456", section: "links", access_level: "manage" }]);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/server/123/dashboard-access");
    expect(request.method).toBe("PUT");
    expect(await request.json()).toEqual({
      grants: [{ role_id: "456", section: "links", access_level: "manage" }],
    });
  });

  it("updates per-guild bot profile fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      name: "ClashKing Beta",
      avatar_url: null,
      banner_url: null,
      bio: "Family bot",
      name_inherited: false,
      avatar_inherited: true,
      banner_inherited: true,
      bio_inherited: false,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    await client.updateBotGuildProfile("123", { name: "ClashKing Beta", bio: "Family bot" });
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/server/123/bot-profile");
    expect(request.method).toBe("PATCH");
    expect(await request.json()).toEqual({ name: "ClashKing Beta", bio: "Family bot" });
  });

  it("keeps clan settings category as a string/null request and returns the shared category model", async () => {
    const category = { id: "category-1", serverId: "123", name: "CWL", position: 0, clanCount: 1 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: "Clan settings updated successfully",
      server_id: "123",
      clan_tag: "#ABC",
      updated_fields: 1,
      category,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    const response = await client.updateClanSettings("123", "#ABC", { category: "CWL" });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/server/123/clan/%23ABC/settings");
    expect(request.method).toBe("PATCH");
    expect(await request.json()).toEqual({ category: "CWL" });
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
      server_id: "123",
      updated_fields: 5,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.updateSettings("123", { link_parse: linkParse });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/server/123/settings");
    expect(request.method).toBe("PATCH");
    expect(await request.json()).toEqual({ link_parse: linkParse });
    expect(linkParse).not.toHaveProperty("channels");
  });

  it("consumes typed camelCase giveaway, entry, mutation, and reroll responses", async () => {
    const giveaway = {
      id: "giveaway-1",
      serverId: "123",
      prize: "Gold pass",
      status: "ongoing",
      start: "2026-07-24T12:00:00Z",
      end: "2026-07-25T12:00:00Z",
      winners: 1,
      mentions: [],
      textAboveEmbed: "",
      textInEmbed: "Enter",
      textOnEnd: "Ended",
      profilePictureRequired: false,
      cocAccountRequired: true,
      rolesMode: "none",
      roles: [],
      boosters: [],
      entries: ["user-1", "user-1", "user-2", "user-3"],
      updated: false,
      winnersList: [],
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
    const rerollRequest = fetchMock.mock.calls[3]?.[0] as Request;
    expect(rerollRequest.method).toBe("POST");
    expect(await rerollRequest.json()).toEqual({ user_ids_to_replace: ["user-1"] });
  });
});
