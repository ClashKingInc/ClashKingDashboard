import { describe, expect, it } from "vitest";

import { aiUsageSettlementHeaders, normalizeAIUsage, settleAIUsage } from "../../workers/roster-assistant/usage-reporting";

describe("AI usage reporting", () => {
  it("normalizes provider token details for settlement", () => {
    expect(normalizeAIUsage({
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
      inputTokenDetails: { noCacheTokens: 70, cacheReadTokens: 20, cacheWriteTokens: 10 },
      outputTokenDetails: { textTokens: 10, reasoningTokens: 30 },
    })).toEqual({ inputTokens: 100, cachedInputTokens: 20, cacheWriteTokens: 10, outputTokens: 40, reasoningTokens: 30 });
  });

  it("requires a dedicated production settlement secret", () => {
    expect(() => aiUsageSettlementHeaders({ CLASHKING_API_URL: "https://v2-api.clashk.ing" } as RosterAssistantEnv)).toThrow("not configured");
    expect(aiUsageSettlementHeaders({ CLASHKING_API_URL: "https://v2-api.clashk.ing", AI_USAGE_SECRET: "worker-secret" } as RosterAssistantEnv)).toMatchObject({
      "x-clashking-ai-metering": "worker-secret",
    });
  });

  it("uses the isolated local-development secret only for a local API", () => {
    expect(aiUsageSettlementHeaders({ CLASHKING_API_URL: "http://127.0.0.1:8000" } as RosterAssistantEnv)).toMatchObject({
      "x-clashking-ai-metering": "clashking-local-ai-metering",
    });
  });

  it("retries transient settlement failures with the same payload and metering header", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("temporary failure", { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const payload = { requestId: "request-1", usage: { inputTokens: 100 } };

    await settleAIUsage(
      { CLASHKING_API_URL: "http://127.0.0.1:8000" } as RosterAssistantEnv,
      "/v2/roster/ai/usage",
      payload,
      { fetcher, retryDelayMs: 0 },
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith("http://127.0.0.1:8000/v2/roster/ai/usage", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(payload),
    }));
    const headers = fetcher.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers["x-clashking-ai-metering"]).toBe("clashking-local-ai-metering");
  });

  it("does not retry a permanent settlement rejection", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("bad payload", { status: 400 }));

    await expect(settleAIUsage(
      { CLASHKING_API_URL: "http://127.0.0.1:8000" } as RosterAssistantEnv,
      "/v2/roster/ai/usage",
      {},
      { fetcher, retryDelayMs: 0 },
    )).rejects.toThrow("AI usage settlement failed (400): bad payload");
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
