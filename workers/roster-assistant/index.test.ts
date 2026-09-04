import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@cloudflare/codemode", () => ({ DynamicWorkerExecutor: vi.fn() }));
vi.mock("@cloudflare/codemode/ai", () => ({ aiTools: vi.fn(), createCodeTool: vi.fn(), resolveProvider: vi.fn() }));
vi.mock("./runtime-secrets", () => ({ resolveAssistantSecrets: vi.fn() }));

import rosterAssistantWorker from "./index";
import { resolveAssistantSecrets } from "./runtime-secrets";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("roster assistant browser boundary", () => {
  it.each(["{invalid", "null", JSON.stringify({ serverId: "123456789012345678", rosterIds: ["roster"], messages: "not-an-array" })])(
    "returns 400 before reading secrets or reserving AI usage for invalid JSON/payload",
    async (body) => {
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      const response = await rosterAssistantWorker.fetch(new Request("https://ai.clashk.ing/chat", {
        method: "POST", headers: { authorization: "Bearer token", origin: "https://dash.clashk.ing" }, body,
      }), {} as RosterAssistantBindings, { waitUntil: vi.fn() } as ExecutionContext);
      expect(response.status).toBe(400);
      expect(response.headers.get("access-control-allow-origin")).toBe("https://dash.clashk.ing");
      expect(await response.json()).toEqual({ error: expect.any(String) });
      expect(resolveAssistantSecrets).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
