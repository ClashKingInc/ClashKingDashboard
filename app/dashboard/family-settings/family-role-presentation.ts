import type { FamilyRole } from "@/lib/api/types/family-roles";

export interface DiscordRoleSummary {
  readonly id: string;
  readonly name: string;
  readonly color?: number;
}

export interface AssignedFamilyRole extends FamilyRole {
  readonly displayName: string;
  readonly color: number;
  readonly exists: boolean;
}

export function presentFamilyRoles(
  roles: readonly FamilyRole[],
  discordRoles: readonly DiscordRoleSummary[],
  deletedRoleLabel: string,
): AssignedFamilyRole[] {
  return roles.map((role) => {
    const discordRole = discordRoles.find((candidate) => candidate.id === role.role_id);
    return {
      ...role,
      displayName: discordRole ? `@${discordRole.name}` : deletedRoleLabel,
      color: discordRole?.color || 0,
      exists: discordRole !== undefined,
    };
  });
}
