import { normalizeAllChannelsPayload } from "@/lib/dashboard-cache";
import { ServerThreadsEndpoint } from "@clashking/api-contracts";
import { Schema } from "effect";

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

export function normalizeDestinationChannels(payload: unknown): DiscordDestinationChannel[] {
  return normalizeAllChannelsPayload(payload).filter((channel) => {
    const type = channel.type.toLowerCase();
    return ["0", "5", "15", "text", "news", "forum"].includes(type);
  });
}

export function normalizeDestinationThreads(payload: unknown): DiscordDestinationThread[] {
  return [...Schema.decodeUnknownSync(ServerThreadsEndpoint.response)(payload)];
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
