import type { GuildInfo } from "@/lib/api/types/server";

export function requiresServerReactivation(
  guild: Pick<GuildInfo, "inactive" | "last_command_at">,
): boolean {
  return guild.inactive && typeof guild.last_command_at === "string" && guild.last_command_at.trim().length > 0;
}
