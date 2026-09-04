import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerChannelsEndpoint } from "@clashking/api-contracts";
import type { ExecuteOptions } from "@clashking/api-client";
import { BaseApiClient } from "./base-client";

const execute = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/shared-client", () => ({ executeSharedApiResult: execute }));

class TestClient extends BaseApiClient {
  run(options?: ExecuteOptions) {
    return this.executeEndpoint(ServerChannelsEndpoint, {
      path: { serverId: "9007199254740993123" }, query: {}, body: {},
    }, options);
  }
}

beforeEach(() => {
  execute.mockReset();
  execute.mockResolvedValue({ data: [], status: 200 });
});

describe("BaseApiClient configuration facade", () => {
  it("keeps token changes isolated from config snapshots", () => {
    const client = new TestClient({ baseUrl: "https://api.example.test" });
    const snapshot = client.getConfig();
    client.setAccessToken("token");
    expect(client.getConfig().accessToken).toBe("token");
    expect(snapshot.accessToken).toBeUndefined();
    client.clearTokens();
    expect(client.getConfig().accessToken).toBeUndefined();
  });

  it("forwards the shared descriptor, input and instance auth", async () => {
    const client = new TestClient({ baseUrl: "https://api.example.test", accessToken: "token" });
    await client.run();
    expect(execute).toHaveBeenCalledWith(ServerChannelsEndpoint, {
      path: { serverId: "9007199254740993123" }, query: {}, body: {},
    }, { baseUrl: "https://api.example.test", auth: { bearerToken: "token" } });
  });

  it("preserves explicit execution auth, base URL and abort signal", async () => {
    const client = new TestClient({ baseUrl: "https://api.example.test", accessToken: "instance" });
    const signal = new AbortController().signal;
    await client.run({ baseUrl: "https://override.example.test", auth: { bearerToken: "override" }, signal });
    expect(execute.mock.calls[0]?.[2]).toEqual({
      baseUrl: "https://override.example.test", auth: { bearerToken: "override" }, signal,
    });
  });

  it("leaves session auth resolution to the shared client", async () => {
    const client = new TestClient({ baseUrl: "https://api.example.test" });
    await client.run();
    expect(execute.mock.calls[0]?.[2]).toEqual({ baseUrl: "https://api.example.test" });
  });

  it("preserves the actual decoded response status", async () => {
    const response = { data: [], status: 201 };
    execute.mockResolvedValue(response);
    await expect(new TestClient({ baseUrl: "https://api.example.test" }).run()).resolves.toBe(response);
  });

  it("preserves typed error results without another transport layer", async () => {
    const response = { error: "Forbidden", errorData: { code: "forbidden" }, status: 403 };
    execute.mockResolvedValue(response);
    await expect(new TestClient({ baseUrl: "https://api.example.test" }).run()).resolves.toBe(response);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
