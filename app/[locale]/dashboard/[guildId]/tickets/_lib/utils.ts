/**
 * Pure helpers for the tickets dashboard section.
 * Extracted from page.tsx so they can be unit-tested in isolation.
 */

import { normalizeChannelsPayload } from "@/lib/dashboard-cache";
import type { OpenTicket, ServerEmbed, THRequirement } from "@/lib/api/types/tickets";
import type { DiscordChannel } from "./types";

export const MAX_APPROVE_MESSAGE_NAME_LENGTH = 100;
export const MAX_APPROVE_MESSAGE_CONTENT_LENGTH = 2000;
export const DEFAULT_TOWNHALL_REQUIREMENT_FIELDS = ["BK", "AQ", "GW", "RC", "WARST"];

export const stripTrailingSlashes = (value: string): string => {
  let normalized = value;
  while (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

export const getChannelTypeToken = (channel: DiscordChannel): string => {
  const rawType = (channel as { channel_type?: string | number; channelType?: string | number }).channel_type
    ?? (channel as { channelType?: string | number }).channelType
    ?? channel.type;
  return String(rawType).toLowerCase();
};

export const isCategoryChannel = (channel: DiscordChannel): boolean => {
  const token = getChannelTypeToken(channel);
  return token === "4" || token.includes("category");
};

export const isTextLikeChannel = (channel: DiscordChannel): boolean => {
  const token = getChannelTypeToken(channel);
  return token === "0" || token === "11" || token === "5" || token.includes("text") || token.includes("news");
};

export const normalizeTicketChannels = (payload: unknown): DiscordChannel[] => {
  const normalized = normalizeChannelsPayload(payload) as DiscordChannel[];
  if (normalized.length > 0) {
    return normalized;
  }

  if (payload && typeof payload === "object") {
    const obj = payload as { items?: unknown; results?: unknown };
    if (Array.isArray(obj.items)) return obj.items as DiscordChannel[];
    if (Array.isArray(obj.results)) return obj.results as DiscordChannel[];
  }

  return [];
};

export const normalizeTicketEmbeds = (payload: unknown): ServerEmbed[] => {
  if (Array.isArray(payload)) {
    return payload as ServerEmbed[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const obj = payload as { items?: unknown; data?: { items?: unknown } };
  if (Array.isArray(obj.items)) return obj.items as ServerEmbed[];
  if (obj.data && Array.isArray(obj.data.items)) return obj.data.items as ServerEmbed[];

  return [];
};

export const toEmbedDataRecord = (data: unknown): Record<string, unknown> | null => {
  if (!data) return null;

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  return typeof data === "object" ? (data as Record<string, unknown>) : null;
};

export const getTicketDiscordUrl = (ticket: OpenTicket) =>
  `https://discord.com/channels/${ticket.server}/${ticket.channel}`;

const TRANSCRIPT_BASE_URL = stripTrailingSlashes(process.env.NEXT_PUBLIC_TRANSCRIPT_BASE_URL ?? "https://cdn.clashk.ing");

export const getTranscriptUrl = (ticket: OpenTicket) =>
  `${TRANSCRIPT_BASE_URL}/transcript-${ticket.channel}.html`;

export const normalizeOptionalText = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const pickFirstNonEmptyText = (...values: Array<string | null | undefined>): string | null => {
  for (const value of values) {
    const normalized = normalizeOptionalText(value);
    if (normalized) return normalized;
  }
  return null;
};

export const normalizePlayerTag = (value: string): string => {
  const trimmed = value.trim();
  const withoutPrefix = trimmed.replace(/^#/, "");
  return `#${withoutPrefix.toUpperCase()}`;
};

export const normalizeTownhallRequirementFields = (fields: readonly string[] | null | undefined): string[] => {
  const normalized = (fields ?? []).filter((field): field is string => typeof field === "string" && field.trim().length > 0);
  return normalized.length > 0 ? normalized : [...DEFAULT_TOWNHALL_REQUIREMENT_FIELDS];
};

export const createTownhallRequirementRow = (th: string, fields: readonly string[]): THRequirement => {
  const row: THRequirement = { TH: Number(th) };
  for (const field of fields) {
    row[field] = 0;
  }
  return row;
};
