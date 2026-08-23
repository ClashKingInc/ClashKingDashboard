import { describe, expect, it, vi } from "vitest";
import { resolveAssistantSecrets } from "../../workers/roster-assistant/runtime-secrets";

describe("resolveAssistantSecrets", () => {
  it("uses direct Wrangler development secrets when present", async () => {
    await expect(resolveAssistantSecrets({
      OPENAI_API_KEY: " local-openai ",
      AI_USAGE_SECRET: " local-usage ",
    })).resolves.toEqual({ openAIAPIKey: "local-openai", aiUsageSecret: "local-usage" });
  });

  it("uses production Secrets Store bindings", async () => {
    const openAIGet = vi.fn().mockResolvedValue("stored-openai");
    const usageGet = vi.fn().mockResolvedValue("stored-usage");

    await expect(resolveAssistantSecrets({
      OPENAI_API_KEY_SECRET: { get: openAIGet },
      AI_USAGE_SECRET_SECRET: { get: usageGet },
    })).resolves.toEqual({ openAIAPIKey: "stored-openai", aiUsageSecret: "stored-usage" });
  });

  it("rejects incomplete secret configuration", async () => {
    await expect(resolveAssistantSecrets({ OPENAI_API_KEY: "only-one" })).rejects.toThrow("required secret");
  });
});
