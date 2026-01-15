/**
 * Family Roles types
 */

export type FamilyRoleType =
  | "family" // Has at least one account in family
  | "not_family" // Has no accounts in family
  | "only_family" // All accounts are in family
  | "family_member" // Member position in clan
  | "family_elder" // Elder position in clan
  | "family_coleader" // Co-Leader position in clan
  | "family_leader" // Leader position in clan
  | "ignored"; // Ignored during auto-eval

export interface FamilyRolesResponse {
  server_id: number;
  family_roles: string[]; // Has at least one account in family
  not_family_roles: string[]; // Has no accounts in family
  only_family_roles: string[]; // All accounts are in family
  family_member_roles: string[]; // Member position
  family_elder_roles: string[]; // Elder position
  family_coleader_roles: string[]; // Co-Leader position
  family_leader_roles: string[]; // Leader position
  ignored_roles: string[]; // Ignored during auto-eval
}

export interface FamilyRoleAdd {
  role: string;
  type: FamilyRoleType;
}

export interface FamilyRoleOperationResponse {
  message: string;
  server_id: number;
  role_type: string;
  role_id: string;
}
