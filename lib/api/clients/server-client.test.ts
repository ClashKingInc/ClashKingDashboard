import { afterEach, describe, expect, it, vi } from "vitest";
import { ServerClient } from "./server-client";

describe("ServerClient dashboard access", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the capabilities endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ full_access: true, sections: {} }) });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test" });
    await client.getDashboardCapabilities("123");
    expect(fetchMock).toHaveBeenCalledWith("http://dashboard.test/v2/server/123/dashboard-capabilities", expect.objectContaining({ method: "GET" }));
  });

  it("sends an atomic grant replacement", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ grants: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test" });
    await client.updateDashboardAccess("123", [{ role_id: "456", section: "links", access_level: "manage" }]);
    expect(fetchMock).toHaveBeenCalledWith("http://dashboard.test/v2/server/123/dashboard-access", expect.objectContaining({ method: "PUT", body: JSON.stringify({ grants: [{ role_id: "456", section: "links", access_level: "manage" }] }) }));
  });

  it("updates per-guild bot profile fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ bio: "Family bot" }) });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ServerClient({ baseUrl: "http://dashboard.test" });
    await client.updateBotGuildProfile("123", { name: "ClashKing Beta", bio: "Family bot" });
    expect(fetchMock).toHaveBeenCalledWith("http://dashboard.test/v2/server/123/bot-profile", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name: "ClashKing Beta", bio: "Family bot" }) }));
  });
});
