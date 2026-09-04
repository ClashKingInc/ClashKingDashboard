import type { DiscordRolesResponse } from "@/lib/api/types/roles";
import type { ServerSettings } from "@/lib/api/types/server";
import { ServerChannelsEndpoint, ServerSettingsEndpoint, DiscordRolesEndpoint } from "@clashking/api-contracts";
import { Schema } from "effect";

type DiscordChannel = {
  id: string;
  name: string;
  type: string;
  parent_name?: string;
};

export const dashboardCacheKeys = {
  channels: (guildId: string) => `dashboard-server-channels-${guildId}`,
  discordRoles: (guildId: string) => `dashboard-discord-roles-${guildId}`,
  settings: (guildId: string) => `dashboard-server-settings-${guildId}`,
  serverRoles: (guildId: string) => `dashboard-server-roles-${guildId}`,
};

function normalizeAllChannels(payload: unknown): DiscordChannel[] {
  return [...Schema.decodeUnknownSync(ServerChannelsEndpoint.response)(payload)];
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
  return Schema.decodeUnknownSync(DiscordRolesEndpoint.response)(payload).roles.filter(
    (role) => !role.managed && role.name !== "@everyone",
  );
}

export function normalizeServerSettingsPayload(payload: unknown): (Omit<ServerSettings, "embed_color"> & { embed_color?: number }) | null {
  const { embed_color, ...rest } = Schema.decodeUnknownSync(ServerSettingsEndpoint.response)(payload);
  const settings: Omit<ServerSettings, "embed_color"> & { embed_color?: number } = rest;
  if (embed_color !== undefined) {
    const embedColor = Number(embed_color);
    if (Number.isFinite(embedColor)) settings.embed_color = embedColor;
    else delete settings.embed_color;
  }
  return settings;
}
