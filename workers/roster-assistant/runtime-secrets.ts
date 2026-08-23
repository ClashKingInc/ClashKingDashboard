interface SecretsStoreBinding {
  get(): Promise<string>;
}

type AssistantSecretBindings = {
  OPENAI_API_KEY?: string;
  AI_USAGE_SECRET?: string;
  OPENAI_API_KEY_SECRET?: SecretsStoreBinding;
  AI_USAGE_SECRET_SECRET?: SecretsStoreBinding;
};

async function readSecret(
  bindings: AssistantSecretBindings,
  directName: "OPENAI_API_KEY" | "AI_USAGE_SECRET",
  storeName: "OPENAI_API_KEY_SECRET" | "AI_USAGE_SECRET_SECRET",
): Promise<string> {
  const directValue = bindings[directName];
  if (typeof directValue === "string" && directValue.trim()) return directValue.trim();

  const storeBinding = bindings[storeName];
  if (!storeBinding || typeof storeBinding.get !== "function") return "";
  return (await storeBinding.get()).trim();
}

export async function resolveAssistantSecrets(bindings: AssistantSecretBindings): Promise<{
  openAIAPIKey: string;
  aiUsageSecret: string;
}> {
  const [openAIAPIKey, aiUsageSecret] = await Promise.all([
    readSecret(bindings, "OPENAI_API_KEY", "OPENAI_API_KEY_SECRET"),
    readSecret(bindings, "AI_USAGE_SECRET", "AI_USAGE_SECRET_SECRET"),
  ]);
  if (!openAIAPIKey || !aiUsageSecret) throw new Error("required secret is empty");
  return { openAIAPIKey, aiUsageSecret };
}
