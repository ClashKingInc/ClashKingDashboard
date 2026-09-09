import type { LanguageModelUsage } from "ai";
import { TransportError } from "@clashking/api-client";
import { DashboardRosterAIUsageEndpoint, type DashboardRosterAITokenUsage, type EndpointRequest } from "@clashking/api-contracts";
import { AssistantApiError, executeAssistantEndpoint } from "./api-client";

export type NormalizedAIUsage = typeof DashboardRosterAITokenUsage.Type;
type UsagePayload = EndpointRequest<typeof DashboardRosterAIUsageEndpoint>["body"];

interface AIUsageSettlementOptions {
  fetcher?: typeof fetch;
  attempts?: number;
  retryDelayMs?: number;
}

export function normalizeAIUsage(usage: LanguageModelUsage): NormalizedAIUsage {
  return {
    inputTokens: usage.inputTokens ?? 0,
    cachedInputTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    reasoningTokens: usage.outputTokenDetails.reasoningTokens ?? 0,
  };
}

export function sumAIUsage(usages: readonly NormalizedAIUsage[]): NormalizedAIUsage {
  return usages.reduce<NormalizedAIUsage>((total, usage) => ({
    inputTokens: total.inputTokens + usage.inputTokens,
    cachedInputTokens: total.cachedInputTokens + usage.cachedInputTokens,
    cacheWriteTokens: total.cacheWriteTokens + usage.cacheWriteTokens,
    outputTokens: total.outputTokens + usage.outputTokens,
    reasoningTokens: total.reasoningTokens + usage.reasoningTokens,
  }), {
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
  });
}

export function aiUsageSettlementHeaders(env: RosterAssistantRuntimeEnv): Record<string, string> {
  const secret = env.AI_USAGE_SECRET.trim();
  if (!secret) throw new Error("AI usage settlement is not configured");
  return {
    "content-type": "application/json",
    "x-clashking-ai-metering": secret,
  };
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function settleAIUsage(
  env: RosterAssistantRuntimeEnv,
  payload: UsagePayload,
  options: AIUsageSettlementOptions = {},
): Promise<void> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 250);
  const headers = aiUsageSettlementHeaders(env);
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await executeAssistantEndpoint(env.CLASHKING_API_ORIGIN, undefined, DashboardRosterAIUsageEndpoint, {
        path: {}, query: {}, body: payload,
      }, undefined, { headers, fetcher: options.fetcher });
      return;
    } catch (error) {
      lastError = error instanceof AssistantApiError
        ? new Error(`AI usage settlement failed (${error.status}): ${error.message}`)
        : error instanceof Error ? error : new Error(String(error));
      const retryable = error instanceof TransportError || error instanceof AssistantApiError && error.status >= 500;
      if (!retryable || attempt >= attempts) throw lastError;
      if (retryDelayMs > 0) await wait(retryDelayMs * attempt);
    }
  }

  throw lastError ?? new Error("AI usage settlement failed");
}
