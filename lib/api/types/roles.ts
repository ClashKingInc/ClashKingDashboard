export type RoleType =
  | "townhall"
  | "builderhall"
  | "league"
  | "builder_league"
  | "clan_role"
  | "clan_category"
  | "family"
  | "achievement"
  | "status";

export type RoleMode = "both" | "add" | "remove";

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
  mentionable: boolean;
}

export interface ServerRole {
  id: string;
  server_id: number;
  clan_tag?: string | null;
  type: RoleType;
  option: string;
  role_id: string;
  mode: RoleMode;
  created_at: string;
  updated_at: string;
}

export interface ServerRoleInput {
  clan_tag?: string | null;
  type: RoleType;
  option: string;
  role_id: string;
  mode?: RoleMode;
}

export type ServerRoleUpdate = Partial<ServerRoleInput>;

export interface ServerRolesResponse {
  server_id: number;
  roles: ServerRole[];
  count: number;
}

export interface ServerRoleResponse {
  message: string;
  role: ServerRole;
}

export interface RoleSettings {
  server_id: number;
  auto_eval_status?: boolean;
  auto_eval_nickname?: boolean;
  autoeval_triggers?: string[];
  autoeval_log?: string;
  blacklisted_roles?: string[];
}

export interface RoleSettingsUpdate {
  auto_eval_status?: boolean;
  auto_eval_nickname?: boolean;
  autoeval_triggers?: string[];
  autoeval_log?: string;
  blacklisted_roles?: string[];
}

export interface DiscordRolesResponse {
  server_id: number;
  roles: DiscordRole[];
  count: number;
}
