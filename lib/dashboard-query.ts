import type { QueryClientConfig } from "@tanstack/react-query";

export const dashboardQueryKeys = {
  guild: (guildId: string) => ["dashboard", "guild", guildId] as const,
  guilds: () => ["dashboard", "guilds"] as const,
  capabilities: (guildId: string) => ["dashboard", "capabilities", guildId] as const,
  channels: (guildId: string) => ["dashboard", "discord", "channels", guildId] as const,
  roles: (guildId: string) => ["dashboard", "discord", "roles", guildId] as const,
  threads: (guildId: string) => ["dashboard", "discord", "threads", guildId] as const,
  clans: (guildId: string) => ["dashboard", "clans", guildId] as const,
  settings: (guildId: string) => ["dashboard", "settings", guildId] as const,
  route: (route: string, guildId: string, ...parameters: readonly unknown[]) =>
    ["dashboard", "route", route, guildId, ...parameters] as const,
};

export const dashboardQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: false,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
};
