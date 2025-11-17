/**
 * Server/Guild-related types
 */

export interface ServerSettings {
  server: string | number;
  embed_color?: number;
  nickname_rule?: string;
  non_family_nickname_rule?: string;
  change_nickname?: boolean;
  flair_non_family?: boolean;
  auto_eval_nickname?: boolean;
  leadership_eval?: boolean;
  api_token?: boolean;
  banlist?: string | number;
  strike_log?: string | number;
  full_whitelist_role?: string | number;
  reddit_feed?: string | number;
  family_label?: string;
  greeting?: string;
  clans?: any[];
  eval?: any;
}

export interface ServerSettingsUpdate {
  embed_color?: number;
  nickname_rule?: string;
  non_family_nickname_rule?: string;
  change_nickname?: boolean;
  flair_non_family?: boolean;
  auto_eval_nickname?: boolean;
  leadership_eval?: boolean;
  api_token?: boolean;
  banlist?: string | number;
  strike_log?: string | number;
  full_whitelist_role?: string | number;
  reddit_feed?: string | number;
  family_label?: string;
  greeting?: string;
}

export interface ServerSettingsResponse {
  message: string;
  server_id: string | number;
  updated_fields: number;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
}

export interface ClanSettings {
  server_id: string | number;
  clan_tag: string;
  settings: any;
}

export interface BanRequest {
  reason: string;
  added_by: string;
  image?: any;
}
