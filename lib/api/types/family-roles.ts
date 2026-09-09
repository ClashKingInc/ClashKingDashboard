import type { RoleMode, ServerRole, ServerRoleResponse } from "./roles";

// These groupings are a Dashboard view over the canonical server-role API.
export type FamilyRoleType =
  | "family"
  | "not_family"
  | "family_elder"
  | "family_coleader"
  | "family_leader";

export type FamilyRole = Pick<ServerRole, "id" | "role_id" | "mode">;

export type FamilyRolesResponse = {
  server_id: ServerRole["server_id"];
  family_roles: FamilyRole[];
  not_family_roles: FamilyRole[];
  family_elder_roles: FamilyRole[];
  family_coleader_roles: FamilyRole[];
  family_leader_roles: FamilyRole[];
};

export type FamilyRoleAdd = {
  role: ServerRole["role_id"];
  type: FamilyRoleType;
  mode?: RoleMode;
};

export type FamilyRoleOperationResponse = {
  message: ServerRoleResponse["message"];
  server_id: ServerRole["server_id"];
  role_type: FamilyRoleType;
  role_id: ServerRole["role_id"];
};
