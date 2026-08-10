import type { LanguageModelUsage } from "ai";

export interface NormalizedAIUsage {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

interface AIUsageSettlementOptions {
  fetcher?: typeof fetch;
  attempts?: number;
  retryDelayMs?: number;
}

const LOCAL_METERING_SECRET = "clashking-local-ai-metering";

export function normalizeAIUsage(usage: LanguageModelUsage): NormalizedAIUsage {
  return {
    inputTokens: usage.inputTokens ?? 0,
    cachedInputTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    reasoningTokens: usage.outputTokenDetails.reasoningTokens ?? 0,
  };
}

export function aiUsageSettlementHeaders(env: RosterAssistantEnv): Record<string, string> {
  const localAPI = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(env.CLASHKING_API_URL);
  const secret = env.AI_USAGE_SECRET?.trim() || (localAPI ? LOCAL_METERING_SECRET : "");
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
  env: RosterAssistantEnv,
  endpoint: string,
  payload: unknown,
  options: AIUsageSettlementOptions = {},
): Promise<void> {
  const fetcher = options.fetcher ?? fetch;
  const attempts = Math.max(1, options.attempts ?? 3);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 250);
  const url = `${env.CLASHKING_API_URL.replace(/\/$/, "")}${endpoint}`;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetcher(url, {
        method: "POST",
        headers: aiUsageSettlementHeaders(env),
        body: JSON.stringify(payload),
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= attempts) throw lastError;
      if (retryDelayMs > 0) await wait(retryDelayMs * attempt);
      continue;
    }

    if (response.ok) return;
    const detail = (await response.text().catch(() => "")).trim().slice(0, 500);
    lastError = new Error(`AI usage settlement failed (${response.status})${detail ? `: ${detail}` : ""}`);
    if (response.status < 500 || attempt >= attempts) throw lastError;
    if (attempt < attempts && retryDelayMs > 0) await wait(retryDelayMs * attempt);
  }

  throw lastError ?? new Error("AI usage settlement failed");
}
