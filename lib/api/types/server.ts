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

export interface ServerClanListItem {
  tag: string;
  name: string;
  badge_url?: string | null;
  clan_badge_url?: string | null;
  badge?: string | null;
}

export interface BanRequest {
  reason: string | null;
  added_by: number | string; // Allow string for large Discord IDs to preserve precision
  image: string | null;
}

/**
 * Banned player information
 */
export interface BannedPlayer {
  _id?: string;
  VillageTag: string;
  VillageName?: string;
  name?: string;
  Notes: string;
  added_by: number | string; // Can be string to preserve precision for large Discord IDs
  added_by_username?: string;
  added_by_avatar_url?: string;
  DateCreated: string;
  server: number;
  rollover_date?: number | null;
  town_hall?: number | null;
  trophies?: number | null;
  clan_tag?: string | null;
  clan_name?: string | null;
  current_role?: string | null;
  image_url?: string;
  edited_by?: Array<{
    user: number | string; // Can be string to preserve precision for large Discord IDs
    previous: {
      reason: string;
      rollover_days: number | null;
    };
  }>;
}

/**
 * Ban add/remove response
 */
export interface BanResponse {
  status: string;
  player_tag: string;
  server_id: number;
}

/**
 * Strike request data
 */
export interface StrikeRequest {
  reason: string;
  added_by: number | string; // Allow string for large Discord IDs to preserve precision
  strike_weight: number;
  rollover_days?: number;
  image?: string;
}

/**
 * Strike information
 */
export interface Strike {
  strike_id: string;
  tag: string;
  date_created: string;
  reason: string;
  server: number;
  added_by: number | string; // Can be string to preserve precision for large Discord IDs
  added_by_username?: string;
  added_by_avatar_url?: string;
  strike_weight: number;
  rollover_date?: number;
  image?: string;
  player_name?: string;
  town_hall?: number | null;
  trophies?: number | null;
  clan_tag?: string | null;
  clan_name?: string | null;
  current_role?: string | null;
}

/**
 * Strike add response
 */
export interface StrikeAddResponse {
  status: string;
  strike_id: string;
  player_tag: string;
  player_name?: string; // Player name from COC API
  server_id: number;
  total_strikes: number;
  total_weight: number;
}

/**
 * Strike delete response
 */
export interface StrikeDeleteResponse {
  status: string;
  strike_id: string;
  player_tag: string;
  server_id: number;
}

/**
 * Strike summary for a player
 */
export interface StrikeSummary {
  player_tag: string;
  server_id: number;
  total_strikes: number;
  total_weight: number;
  strikes: Strike[];
}

/**
 * Discord Guild/Server information
 */
export interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  role: "Owner" | "Administrator" | "Manager" | "Member";
  features: string[];
  has_bot: boolean;
  member_count?: number;
  owner_id?: string;
  description?: string;
  banner?: string;
  premium_tier?: number;
  boost_count?: number;
}

/**
 * Giveaway booster configuration
 */
export interface GiveawayBooster {
  value: number;
  roles: string[];
}

/**
 * A single winner entry in a giveaway's winners_list
 */
export interface GiveawayWinner {
  user_id: string;
  username: string | null;
  avatar_url?: string | null;
  status: 'winner' | 'rerolled';
  timestamp: string | null;
  reason: string | null;
}

/**
 * Giveaway information
 */
export interface Giveaway {
  id: string;
  prize: string;
  channel_id: string | null;
  status: 'scheduled' | 'ongoing' | 'ended';
  start_time: string;
  end_time: string;
  winners: number;
  mentions: string[];
  text_above_embed: string;
  text_in_embed: string;
  text_on_end: string;
  image_url: string | null;
  profile_picture_required: boolean;
  coc_account_required: boolean;
  roles_mode: 'allow' | 'deny' | 'none';
  roles: string[];
  boosters: GiveawayBooster[];
  entry_count: number;
  updated: boolean;
  message_id: string | null;
  winners_list: GiveawayWinner[];
}

/**
 * Giveaways list response
 */
export interface GiveawaysResponse {
  ongoing: Giveaway[];
  upcoming: Giveaway[];
  ended: Giveaway[];
  total: number;
}

/**
 * Response from the reroll endpoint
 */
export interface GiveawayRerollResponse {
  message: string;
  giveaway_id: string;
  server_id: number;
  new_winners: string[];
}

/**
 * Bot information and status from /v2/internal/bot/info
 */
export interface BotInfo {
  bot: {
    total_servers: number;
    total_members: number;
    total_clans: number;
    total_shards: number;
    clusters: Array<{
      cluster_id: number;
      server_count: number;
      member_count: number;
      clan_count: number;
      shards: number[];
    }>;
  };
  system: {
    python_version: string;
    platform: string;
    cpu_percent: number;
    memory_used_mb: number;
    memory_total_gb: number;
    memory_percent: number;
    disk_usage_percent: number;
  };
  database: {
    clans_tracked: number;
    players_tracked: number;
    wars_stored: number;
    tickets_open: number;
    capital_raids: number;
  };
}
