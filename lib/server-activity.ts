import type { GuildInfo } from "@/lib/api/types/server";

export function dashboardGuilds(guilds: readonly GuildInfo[]): GuildInfo[] {
  return guilds
    .toSorted((left, right) => {
      if (left.has_bot !== right.has_bot) return left.has_bot ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
}

export function requiresServerReactivation(
  guild: Pick<GuildInfo, "inactive" | "last_command_at">,
): boolean {
  return guild.inactive;
}
