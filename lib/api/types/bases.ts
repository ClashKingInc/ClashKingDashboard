export interface Base {
  id: string;
  serverId: string;
  channelId: string;
  messageId: string;
  baseLink: string;
  images: string[];
  description: string;
  downloadCount: number;
  upvotes: number;
  downvotes: number;
  downloaders: string[];
  createdAt: string;
  discordMessageUrl: string;
}

export interface BasesResponse {
  items: Base[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateBaseRequest {
  channelId: string;
  baseLink: string;
  images: string[];
  description: string;
}

export interface BaseImageUploadResponse {
  url: string;
  filename: string;
}

export type DiscordMessageCreateCleanup =
  | "notNeeded"
  | "deleted"
  | "alreadyMissing"
  | "failed";

export interface BaseCreateFailure {
  code: string;
  message: string;
  requestId: string;
  databaseInserted: false;
  discordMessageCreated: boolean;
  discordMessageId?: string;
  discordMessageCleanup: DiscordMessageCreateCleanup;
  retryable: boolean;
}

export function isBaseCreateFailure(value: unknown): value is BaseCreateFailure {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BaseCreateFailure>;
  return candidate.databaseInserted === false
    && typeof candidate.code === "string"
    && typeof candidate.message === "string"
    && typeof candidate.requestId === "string"
    && typeof candidate.discordMessageCreated === "boolean"
    && (
      candidate.discordMessageId === undefined
      || typeof candidate.discordMessageId === "string"
    )
    && typeof candidate.retryable === "boolean"
    && ["notNeeded", "deleted", "alreadyMissing", "failed"].includes(
      candidate.discordMessageCleanup ?? "",
    );
}

export interface BaseDownloader {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export type DiscordMessageCleanup = "deleted" | "alreadyMissing";

export interface BaseDeleteResponse {
  baseId: string;
  databaseDeleted: true;
  discordMessageCleanup: DiscordMessageCleanup;
}

export interface BaseDeleteFailure {
  code: string;
  message: string;
  requestId: string;
  baseId: string;
  databaseDeleted: false;
  discordMessageCleanup: DiscordMessageCleanup | "failed";
  retryable: boolean;
}

export function isBaseDeleteFailure(value: unknown): value is BaseDeleteFailure {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BaseDeleteFailure>;
  return candidate.databaseDeleted === false
    && typeof candidate.message === "string"
    && typeof candidate.baseId === "string"
    && typeof candidate.retryable === "boolean"
    && ["deleted", "alreadyMissing", "failed"].includes(candidate.discordMessageCleanup ?? "");
}
