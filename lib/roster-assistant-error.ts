function messageFromJson(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["error", "message", "errorText"]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  }
  return undefined;
}

export function rosterAssistantErrorText(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const trimmed = raw.trim();
  if (!trimmed) return "The roster assistant couldn’t complete that request. Please try again.";

  try {
    return messageFromJson(JSON.parse(trimmed)) ?? trimmed;
  } catch {
    return trimmed;
  }
}
