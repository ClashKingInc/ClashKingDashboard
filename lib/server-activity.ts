import type { GuildInfo } from "@/lib/api/types/server";

export function dashboardGuilds(guilds: readonly GuildInfo[]): GuildInfo[] {
  return guilds
    .filter((guild) => guild.has_bot)
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

export function requiresServerReactivation(
  guild: Pick<GuildInfo, "inactive" | "last_command_at">,
): boolean {
  return guild.inactive;
}
