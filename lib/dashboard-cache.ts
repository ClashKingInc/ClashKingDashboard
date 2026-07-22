import type { DiscordRolesResponse } from "@/lib/api/types/roles";
import type { ServerSettings } from "@/lib/api/types/server";

type ApiEnvelope<T> = {
  data?: T;
};

type DiscordChannel = {
  id: string;
  name: string;
  type: string;
  parent_name?: string;
};

function unwrapApiData<T>(payload: unknown): T | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  if ("data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

export const dashboardCacheKeys = {
  channels: (guildId: string) => `dashboard-server-channels-${guildId}`,
  discordRoles: (guildId: string) => `dashboard-discord-roles-${guildId}`,
  settings: (guildId: string) => `dashboard-server-settings-${guildId}`,
  serverRoles: (guildId: string) => `dashboard-server-roles-${guildId}`,
};

function normalizeAllChannels(payload: unknown): DiscordChannel[] {
  const unwrapped = unwrapApiData<unknown>(payload);
  const normalizeChannel = (channel: any): DiscordChannel => ({
    ...channel,
    id: String(channel.id),
    name: String(channel.name),
    type: String(channel.type),
  });

  if (Array.isArray(unwrapped)) {
    return unwrapped.map(normalizeChannel);
  }

  if (unwrapped && typeof unwrapped === "object" && Array.isArray((unwrapped as any).channels)) {
    return (unwrapped as any).channels.map(normalizeChannel);
  }

  return [];
}

export function normalizeAllChannelsPayload(payload: unknown): DiscordChannel[] {
  return normalizeAllChannels(payload);
}

export function normalizeChannelsPayload(payload: unknown): DiscordChannel[] {
  return normalizeAllChannels(payload).filter((channel) => {
    const type = channel.type.toLowerCase();
    return type === "0" || type === "5" || type === "text" || type === "news";
  });
}

export function normalizeDiscordRolesPayload(payload: unknown): DiscordRolesResponse["roles"] {
  const unwrapped = unwrapApiData<unknown>(payload);

  if (unwrapped && typeof unwrapped === "object" && Array.isArray((unwrapped as any).roles)) {
    return ((unwrapped as any).roles as DiscordRolesResponse["roles"]).filter(
      (role) => !role.managed && role.name !== "@everyone",
    );
  }

  return [];
}

export function normalizeServerSettingsPayload(payload: unknown): ServerSettings | null {
  const unwrapped = unwrapApiData<unknown>(payload);
  return unwrapped && typeof unwrapped === "object" ? (unwrapped as ServerSettings) : null;
}
