import { queryOptions } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { DashboardCapabilities } from "@/lib/api/types/dashboard-access";
import type { GuildInfo, ServerClanListItem, ServerSettings } from "@/lib/api/types/server";
import type { DiscordRolesResponse } from "@/lib/api/types/roles";
import { dashboardQueryKeys } from "@/lib/dashboard-query";

function unwrap<T>(response: { data?: T; error?: string; status: number }, label: string): T {
  if (response.error || response.data === undefined) {
    throw new Error(response.error || `Failed to load ${label} (${response.status})`);
  }
  return response.data;
}

export const dashboardQueryOptions = {
  guild: (guildId: string) => queryOptions({
    queryKey: dashboardQueryKeys.guild(guildId),
    staleTime: 120_000,
    queryFn: async ({ signal }) => unwrap<GuildInfo>(await apiClient.servers.getGuild(guildId, signal), "server"),
  }),
  guilds: () => queryOptions({
    queryKey: dashboardQueryKeys.guilds(),
    staleTime: 120_000,
    queryFn: async ({ signal }) => unwrap<GuildInfo[]>(await apiClient.servers.getGuilds(signal), "servers"),
  }),
  capabilities: (guildId: string) => queryOptions({
    queryKey: dashboardQueryKeys.capabilities(guildId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => unwrap<DashboardCapabilities>(await apiClient.servers.getDashboardCapabilities(guildId, signal), "dashboard access"),
  }),
  channels: (guildId: string) => queryOptions({
    queryKey: dashboardQueryKeys.channels(guildId),
    staleTime: 30_000,
    queryFn: async ({ signal }) => unwrap<unknown>(await apiClient.servers.getChannels(guildId, signal), "Discord channels"),
  }),
  roles: (guildId: string) => queryOptions({
    queryKey: dashboardQueryKeys.roles(guildId),
    staleTime: 30_000,
    queryFn: async ({ signal }) => unwrap<DiscordRolesResponse>(await apiClient.roles.getDiscordRoles(guildId, signal), "Discord roles"),
  }),
  threads: (guildId: string) => queryOptions({
    queryKey: dashboardQueryKeys.threads(guildId),
    staleTime: 30_000,
    queryFn: async ({ signal }) => unwrap<unknown>(await apiClient.servers.getThreads(guildId, signal), "Discord threads"),
  }),
  clans: (guildId: string) => queryOptions({
    queryKey: dashboardQueryKeys.clans(guildId),
    staleTime: 30_000,
    queryFn: async ({ signal }) => unwrap<ServerClanListItem[]>(await apiClient.servers.getServerClans(guildId, signal), "server clans"),
  }),
  settings: (guildId: string) => queryOptions({
    queryKey: dashboardQueryKeys.settings(guildId),
    staleTime: 30_000,
    queryFn: async ({ signal }) => unwrap<ServerSettings>(await apiClient.servers.getSettings(guildId, false, signal), "server settings"),
  }),
};
