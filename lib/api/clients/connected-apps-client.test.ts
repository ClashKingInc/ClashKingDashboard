import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectedAppsClient } from "./connected-apps-client";

describe("ConnectedAppsClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("validates an optional redirect URI through the public application endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      application: { id: "app id", name: "Roster Tool" },
      redirect_uri: "https://example.com/callback?from=discord",
    }), { status: 200 }));
    const client = new ConnectedAppsClient({ baseUrl: "https://api.example.com" });

    await client.getApplication("app id", "https://example.com/callback?from=discord");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v2/links/shared/applications/app%20id?redirect_uri=https%3A%2F%2Fexample.com%2Fcallback%3Ffrom%3Ddiscord",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("writes selected and dynamic grants without adding scope fields", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ access_mode: "selected" }), { status: 200 }));
    const client = new ConnectedAppsClient({ baseUrl: "https://api.example.com" });

    await client.updateGrant("app_123", {
      access_mode: "selected",
      player_tags: ["#AAA", "#BBB"],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v2/links/shared/grants/app_123",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ access_mode: "selected", player_tags: ["#AAA", "#BBB"] }),
      }),
    );
  });
});
