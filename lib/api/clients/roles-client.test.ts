import { afterEach, describe, expect, it, vi } from "vitest";

import { RolesClient } from "./roles-client";

describe("RolesClient migration-003 settings contract", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("updates only canonical role settings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "updated", server_id: 123 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new RolesClient({ baseUrl: "http://dashboard.test" });
    const settings = {
      auto_eval_status: true,
      auto_eval_nickname: false,
      autoeval_triggers: ["member_join"],
      autoeval_log: "456",
    };

    await client.updateRoleSettings("123", settings);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://dashboard.test/v2/server/123/role-settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(settings),
      }),
    );
  });
});
