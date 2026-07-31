import { normalizeAllChannelsPayload } from "@/lib/dashboard-cache";

export interface DiscordDestinationChannel {
  id: string;
  name: string;
  type: string;
  parent_name?: string;
}

export interface DiscordDestinationThread {
  id: string;
  name: string;
  parent_channel_id: string;
  parent_channel_name?: string;
}

function unwrapCollection(payload: unknown, key: string): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const value = "data" in payload ? (payload as { data?: unknown }).data : payload;
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>)[key])) {
    return (value as Record<string, unknown>)[key] as unknown[];
  }
  return [];
}

export function normalizeDestinationChannels(payload: unknown): DiscordDestinationChannel[] {
  return normalizeAllChannelsPayload(payload).filter((channel) => {
    const type = channel.type.toLowerCase();
    return ["0", "5", "15", "text", "news", "forum"].includes(type);
  });
}

export function normalizeDestinationThreads(payload: unknown): DiscordDestinationThread[] {
  return unwrapCollection(payload, "threads").flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const thread = value as Record<string, unknown>;
    if (!thread.id || !thread.name || !thread.parent_channel_id) return [];
    return [{
      ...thread,
      id: String(thread.id),
      name: String(thread.name),
      parent_channel_id: String(thread.parent_channel_id),
      parent_channel_name: thread.parent_channel_name ? String(thread.parent_channel_name) : undefined,
    } as DiscordDestinationThread];
  });
}

export function isForumChannel(channel: DiscordDestinationChannel | undefined): boolean {
  const type = channel?.type.toLowerCase();
  return type === "15" || type === "forum";
}

export function destinationNeedsThread(
  channelId: string | undefined,
  channels: DiscordDestinationChannel[],
): boolean {
  return isForumChannel(channels.find((channel) => channel.id === channelId));
}

export function isDestinationValid(
  channelId: string | undefined,
  threadId: string | undefined,
  channels: DiscordDestinationChannel[],
  threads: DiscordDestinationThread[],
): boolean {
  const channel = channels.find((candidate) => candidate.id === channelId);
  if (!channel) return false;
  if (!threadId) return !isForumChannel(channel);
  return threads.some((thread) => thread.id === threadId && thread.parent_channel_id === channel.id);
}
