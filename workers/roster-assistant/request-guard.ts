import type { UIMessage } from "ai";

const MAX_TRANSCRIPT_MESSAGES = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function buildTrustedUserTranscript(messages: unknown): UIMessage[] {
  if (!Array.isArray(messages)) return [];

  const userMessages = messages.flatMap((message, messageIndex): UIMessage[] => {
    if (!isRecord(message) || message.role !== "user" || !Array.isArray(message.parts)) return [];
    const parts = message.parts.flatMap((part) => {
      if (!isRecord(part) || part.type !== "text" || typeof part.text !== "string") return [];
      const text = part.text.trim();
      return text ? [{ type: "text" as const, text }] : [];
    });
    if (parts.length === 0) return [];
    return [{ id: `trusted-user-${messageIndex}`, role: "user", parts }];
  });

  return userMessages.slice(-MAX_TRANSCRIPT_MESSAGES);
}

export function authorizedRosterIds(
  requestedRosterIds: readonly string[],
  authorized: ReadonlySet<string>,
): string[] {
  const unique = [...new Set(requestedRosterIds)];
  if (unique.length === 0 || unique.some((rosterId) => !authorized.has(rosterId))) {
    throw new Error("Roster is not attached to this request");
  }
  return unique;
}

export function assertAuthorizedMembershipChanges(
  changes: readonly { fromRosterId: string | null; toRosterId: string | null }[],
  authorized: ReadonlySet<string>,
): void {
  for (const change of changes) {
    const rosterIds = [change.fromRosterId, change.toRosterId].filter(
      (rosterId): rosterId is string => rosterId !== null,
    );
    if (rosterIds.some((rosterId) => !authorized.has(rosterId))) {
      throw new Error("Roster is not attached to this request");
    }
  }
}
