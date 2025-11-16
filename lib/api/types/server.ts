/**
 * Server/Guild-related types
 */

export interface ServerSettings {
  server: number;
  embed_color?: number;
  nickname_rule?: string;
  non_family_nickname_rule?: string;
  change_nickname?: boolean;
  flair_non_family?: boolean;
  auto_eval_nickname?: boolean;
  leadership_eval?: boolean;
  api_token?: boolean;
  banlist?: number;
  strike_log?: number;
  full_whitelist_role?: number;
  reddit_feed?: number;
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
  banlist?: number;
  strike_log?: number;
  full_whitelist_role?: number;
  reddit_feed?: number;
  family_label?: string;
  greeting?: string;
}

export interface ServerSettingsResponse {
  message: string;
  server_id: number;
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
  server_id: number;
  clan_tag: string;
  settings: any;
}

export interface BanRequest {
  reason: string;
  added_by: string;
  image?: any;
}
