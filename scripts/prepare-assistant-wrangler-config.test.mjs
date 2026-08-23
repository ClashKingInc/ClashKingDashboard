import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareAssistantConfig } from "./prepare-assistant-wrangler-config.mjs";

const source = await readFile(path.resolve("wrangler.assistant.jsonc"), "utf8");

describe("prepareAssistantConfig", () => {
  it("creates a local config backed by .dev.vars and the local API", () => {
    const config = prepareAssistantConfig(source, { local: true });

    expect(config.secrets_store_secrets).toBeUndefined();
    expect(config.vars.CLASHKING_API_ORIGIN).toBe("http://127.0.0.1:8000");
    expect(config.main).toBe("../workers/roster-assistant/index.ts");
  });

  it("preserves Secrets Store bindings for production", () => {
    const config = prepareAssistantConfig(source, { storeID: "store_123" });

    expect(config.secrets_store_secrets).toHaveLength(2);
    expect(config.secrets_store_secrets[0].store_id).toBe("store_123");
    expect(config.vars.CLASHKING_API_ORIGIN).toBe("https://v2-api.clashk.ing");
  });

  it("requires an explicit production store ID", () => {
    expect(() => prepareAssistantConfig(source)).toThrow("CLOUDFLARE_SECRETS_STORE_ID");
  });
});
