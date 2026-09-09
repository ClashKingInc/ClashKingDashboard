import { afterEach, describe, expect, it, vi } from "vitest";

import { RolesClient } from "./roles-client";

describe("RolesClient migration-003 settings contract", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("updates only canonical role settings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "updated", server_id: "123" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new RolesClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    const settings = {
      auto_eval_status: true,
      auto_eval_nickname: false,
      autoeval_triggers: ["member_join"],
      autoeval_log: "456",
    };

    await client.updateRoleSettings("123", settings);

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/server/123/role-settings");
    expect(request.method).toBe("PATCH");
    expect(await request.json()).toEqual(settings);
  });

  it("preserves Discord snowflakes above Number.MAX_SAFE_INTEGER", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: "test response",
    }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new RolesClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    const snowflake = "9007199254740993";

    await client.createServerRole(snowflake, {
      type: "family",
      option: "family",
      role_id: snowflake,
    });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe(`http://dashboard.test/v2/server/${snowflake}/server-roles`);
    expect(await request.json()).toEqual({
      type: "family",
      option: "family",
      role_id: snowflake,
      mode: "both",
    });
  });
});
