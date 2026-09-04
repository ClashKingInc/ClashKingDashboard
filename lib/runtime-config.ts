import { Effect, Schema } from "effect";

const BrowserRuntimeConfigSchema = Schema.Struct({
  apiOrigin: Schema.String,
  assistantOrigin: Schema.String,
  discordClientId: Schema.String,
});

export type BrowserRuntimeConfig = typeof BrowserRuntimeConfigSchema.Type;

function isLocalBrowser(): boolean {
  if (typeof window === "undefined") return true;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

export function readBrowserRuntimeConfig(
  env: Pick<ImportMetaEnv, "DEV" | "VITE_CLASHKING_AI_ORIGIN" | "VITE_CLASHKING_API_ORIGIN" | "VITE_DISCORD_CLIENT_ID"> = import.meta.env,
): BrowserRuntimeConfig {
  const localBrowser = isLocalBrowser();
  const rawConfig = {
    apiOrigin: env.VITE_CLASHKING_API_ORIGIN || (env.DEV && localBrowser ? "http://localhost:8000" : env.DEV ? "https://dev-api.clashk.ing" : "https://api.clashk.ing"),
    assistantOrigin: env.VITE_CLASHKING_AI_ORIGIN || (env.DEV && localBrowser ? "http://localhost:8788" : env.DEV ? "https://dev-ai.clashk.ing" : "https://ai.clashk.ing"),
    discordClientId: env.VITE_DISCORD_CLIENT_ID || "",
  };

  return Effect.runSync(Schema.decodeUnknownEffect(BrowserRuntimeConfigSchema)(rawConfig));
}
