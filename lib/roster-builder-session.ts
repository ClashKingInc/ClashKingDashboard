import type { UIMessage } from "ai";

const STORAGE_PREFIX = "clashking:roster-builder-chat:";
const CHAT_TTL_MS = 24 * 60 * 60 * 1000;

type StoredRosterBuilderChat = {
  savedAt: number;
  messages: UIMessage[];
};

const MAX_STORED_MESSAGES = 100;

function compactMessagePart(part: UIMessage["parts"][number]): UIMessage["parts"][number] | null {
  if (part.type === "text") return part;
  if (part.type === "custom" && part.kind === "openai.compaction") return part;
  if (part.type === "data-usage") return part;
  if (part.type === "data-rosterTool") return part;
  if (part.type === "data-membershipProposal") return part;
  if (part.type === "data-playerContexts") return part;
  if (part.type !== "dynamic-tool" && !part.type.startsWith("tool-")) return null;

  const compact = { ...part } as Record<string, unknown>;
  delete compact.providerMetadata;
  delete compact.toolMetadata;
  if ("output" in compact) compact.output = { completed: true };
  if ("input" in compact) compact.input = {};
  return compact as UIMessage["parts"][number];
}

function storageKey(serverId: string): string {
  return `${STORAGE_PREFIX}${serverId}`;
}

export function loadRosterBuilderChat(serverId: string, now = Date.now()): UIMessage[] {
  if (typeof window === "undefined") return [];
  const key = storageKey(serverId);
  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    const stored = JSON.parse(raw) as StoredRosterBuilderChat;
    if (!Array.isArray(stored.messages) || !Number.isFinite(stored.savedAt) || now - stored.savedAt >= CHAT_TTL_MS) {
      localStorage.removeItem(key);
      return [];
    }
    return stored.messages;
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

export function saveRosterBuilderChat(serverId: string, messages: UIMessage[], now = Date.now()): void {
  if (typeof window === "undefined") return;
  const key = storageKey(serverId);
  if (messages.length === 0) {
    localStorage.removeItem(key);
    return;
  }
  const compactMessages = messages
    .map((message) => ({
      ...message,
      parts: message.parts.map(compactMessagePart).filter((part): part is UIMessage["parts"][number] => part !== null),
    }))
    .filter((message) => message.parts.length > 0)
    .slice(-MAX_STORED_MESSAGES) as UIMessage[];
  const value = JSON.stringify({ savedAt: now, messages: compactMessages } satisfies StoredRosterBuilderChat);
  try {
    localStorage.setItem(key, value);
  } catch {
    // Tool outputs can be very large. Evict older roster chats and retry the
    // compact text transcript without ever crashing the dashboard.
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const storedKey = localStorage.key(index);
      if (storedKey?.startsWith(STORAGE_PREFIX) && storedKey !== key) localStorage.removeItem(storedKey);
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      localStorage.removeItem(key);
    }
  }
}

export function clearRosterBuilderChats(): void {
  if (typeof window === "undefined") return;
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
  }
}
