/**
 * Role-related types
 */

export type RoleType =
  | "townhall"
  | "league"
  | "builderhall"
  | "builder_league"
  | "achievement"
  | "status"
  | "family_position";

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
  mentionable: boolean;
}

export interface TownhallRole {
  role_id: string | number;
  th: number;
  toggle?: boolean;
  server?: number;
}

export interface LeagueRole {
  role_id: string | number;
  league: string;
  toggle?: boolean;
  server?: number;
}

export interface BuilderHallRole {
  role_id: string | number;
  bh: number;
  toggle?: boolean;
  server?: number;
}

export interface BuilderLeagueRole {
  role_id: string | number;
  league: string;
  toggle?: boolean;
  server?: number;
}

export interface AchievementRole {
  role_id: string | number;
  achievement: string;
  toggle?: boolean;
  server?: number;
}

export interface StatusRole {
  id: string | number;
  months: number;
  server?: number;
}

export interface FamilyPositionRole {
  role_id: string | number;
  type: "family_elder_roles" | "family_co-leader_roles" | "family_leader_roles";
  toggle?: boolean;
  server?: number;
}

export type ConfiguredRole =
  | TownhallRole
  | LeagueRole
  | BuilderHallRole
  | BuilderLeagueRole
  | AchievementRole
  | StatusRole
  | FamilyPositionRole;

export interface RoleSettings {
  server_id: string | number;
  auto_eval_status: boolean;
  auto_eval_nickname: boolean;
  autoeval_triggers: string[];
  autoeval_log?: string | number;
  blacklisted_roles: (string | number)[];
  role_treatment: string[];
  category_roles?: any;
}

export interface RoleSettingsUpdate {
  auto_eval_status?: boolean;
  auto_eval_nickname?: boolean;
  autoeval_triggers?: string[];
  autoeval_log?: string | number;
  blacklisted_roles?: (string | number)[];
  role_treatment?: string[];
}

export interface RolesListResponse {
  server_id: string | number;
  role_type: string;
  roles: ConfiguredRole[];
  count: number;
}

export interface AllRolesResponse {
  server_id: string | number;
  roles: {
    townhall: TownhallRole[];
    league: LeagueRole[];
    builderhall: BuilderHallRole[];
    builder_league: BuilderLeagueRole[];
    achievement: AchievementRole[];
    status: StatusRole[];
    family_position: FamilyPositionRole[];
  };
  total_count: number;
}

export interface RoleResponse {
  message: string;
  server_id: string | number;
  role_type: string;
  role_id?: string | number;
}

export interface DiscordRolesResponse {
  server_id: string | number;
  roles: DiscordRole[];
  count: number;
}
