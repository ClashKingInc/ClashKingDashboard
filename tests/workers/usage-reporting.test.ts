import { describe, expect, it } from "vitest";

import { aiUsageSettlementHeaders, normalizeAIUsage, settleAIUsage, sumAIUsage } from "../../workers/roster-assistant/usage-reporting";

describe("AI usage reporting", () => {
  it("combines completed step usage for aborted and failed streams", () => {
    expect(sumAIUsage([
      { inputTokens: 100, cachedInputTokens: 20, cacheWriteTokens: 5, outputTokens: 30, reasoningTokens: 10 },
      { inputTokens: 50, cachedInputTokens: 10, cacheWriteTokens: 0, outputTokens: 15, reasoningTokens: 5 },
    ])).toEqual({
      inputTokens: 150,
      cachedInputTokens: 30,
      cacheWriteTokens: 5,
      outputTokens: 45,
      reasoningTokens: 15,
    });
  });

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
    expect(() => aiUsageSettlementHeaders({ CLASHKING_API_ORIGIN: "https://api.clashk.ing", AI_USAGE_SECRET: "" } as RosterAssistantRuntimeEnv)).toThrow("not configured");
    expect(aiUsageSettlementHeaders({ CLASHKING_API_ORIGIN: "https://api.clashk.ing", AI_USAGE_SECRET: "worker-secret" } as RosterAssistantRuntimeEnv)).toMatchObject({
      "x-clashking-ai-metering": "worker-secret",
    });
  });

  it("does not synthesize a local-development settlement secret", () => {
    expect(() => aiUsageSettlementHeaders({ CLASHKING_API_ORIGIN: "http://127.0.0.1:8000", AI_USAGE_SECRET: "" } as RosterAssistantRuntimeEnv)).toThrow("not configured");
  });

  it("retries transient settlement failures with the same payload and metering header", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("temporary failure", { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const payload = { requestId: "request-1", usage: { inputTokens: 100 } };

    await settleAIUsage(
      { CLASHKING_API_ORIGIN: "http://127.0.0.1:8000", AI_USAGE_SECRET: "worker-secret" } as RosterAssistantRuntimeEnv,
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
    expect(headers["x-clashking-ai-metering"]).toBe("worker-secret");
  });

  it("does not retry a permanent settlement rejection", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("bad payload", { status: 400 }));

    await expect(settleAIUsage(
      { CLASHKING_API_ORIGIN: "http://127.0.0.1:8000", AI_USAGE_SECRET: "worker-secret" } as RosterAssistantRuntimeEnv,
      "/v2/roster/ai/usage",
      {},
      { fetcher, retryDelayMs: 0 },
    )).rejects.toThrow("AI usage settlement failed (400): bad payload");
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
