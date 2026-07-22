/**
 * Family Roles types
 */

export type FamilyRoleType =
  | "family" // Has at least one account in family
  | "not_family" // Has no accounts in family
  | "family_elder" // Elder position in clan
  | "family_coleader" // Co-Leader position in clan
  | "family_leader"; // Leader position in clan

export interface FamilyRole {
  id: string;
  role_id: string;
  mode: import('./roles').RoleMode;
}

export interface FamilyRolesResponse {
  server_id: number;
  family_roles: FamilyRole[];
  not_family_roles: FamilyRole[];
  family_elder_roles: FamilyRole[];
  family_coleader_roles: FamilyRole[];
  family_leader_roles: FamilyRole[];
}

export interface FamilyRoleAdd {
  role: string;
  type: FamilyRoleType;
  mode?: import('./roles').RoleMode;
}

export interface FamilyRoleOperationResponse {
  message: string;
  server_id: number;
  role_type: string;
  role_id: string;
}
