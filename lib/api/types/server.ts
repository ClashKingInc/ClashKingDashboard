/**
 * Server/Guild-related types
 */

import type { ClanCategory } from './clan-categories';

export interface LinkParseSettings {
  clan?: boolean;
  army?: boolean;
  player?: boolean;
  base?: boolean;
  show?: boolean;
}

export interface ServerSettings {
  server: string | number;
  embed_color?: number;
  nickname_rule?: string;
  non_family_nickname_rule?: string;
  change_nickname?: boolean;
  flair_non_family?: boolean;
  auto_eval_nickname?: boolean;
  full_whitelist_role?: string | number;
  family_label?: string;
  link_parse?: LinkParseSettings;
  clans?: any[];
  server_roles?: import('./roles').ServerRole[];
}

export interface ServerSettingsUpdate {
  embed_color?: number;
  nickname_rule?: string;
  non_family_nickname_rule?: string;
  change_nickname?: boolean;
  flair_non_family?: boolean;
  auto_eval_nickname?: boolean;
  full_whitelist_role?: string | number;
  family_label?: string;
  link_parse?: LinkParseSettings;
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

export interface ClanSettingsUpdate {
  category?: string | null;
  abbreviation?: string | null;
}

export interface ClanSettingsResponse {
  message: string;
  server_id: string | number;
  clan_tag: string;
  updated_fields: number;
  category: ClanCategory | null;
}

export interface ServerClanListItem {
  tag: string;
  name: string;
  badge_url?: string | null;
  clan_badge_url?: string | null;
  badge?: string | null;
  settings?: {
    category?: string | null;
    [key: string]: any;
  };
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
 * A single winner entry in a giveaway's winnersList
 */
export interface GiveawayWinner {
  userId: string;
  username?: string | null;
  avatarUrl?: string | null;
  status: 'winner' | 'rerolled';
  timestamp?: string | null;
  reason?: string | null;
}

/**
 * Giveaway information
 */
export interface Giveaway {
  id: string;
  serverId: string;
  prize: string;
  channelId: string | null;
  status: 'scheduled' | 'ongoing' | 'ended';
  startTime: string;
  endTime: string;
  winners: number;
  mentions: string[];
  textAboveEmbed: string;
  textInEmbed: string;
  textOnEnd: string;
  imageUrl: string | null;
  profilePictureRequired: boolean;
  cocAccountRequired: boolean;
  rolesMode: 'allow' | 'deny' | 'none';
  roles: string[];
  boosters: GiveawayBooster[];
  entryCount: number;
  updated: boolean;
  messageId: string | null;
  winnersList: GiveawayWinner[];
  eventPending: string | null;
  eventPendingAt: string | null;
  createdAt: string;
  updatedAt: string;
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

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isGiveawayWinner(value: unknown): value is GiveawayWinner {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GiveawayWinner>;
  return typeof candidate.userId === 'string'
    && (candidate.username === undefined || isNullableString(candidate.username))
    && (candidate.avatarUrl === undefined || isNullableString(candidate.avatarUrl))
    && ['winner', 'rerolled'].includes(candidate.status ?? '')
    && (candidate.timestamp === undefined || isNullableString(candidate.timestamp))
    && (candidate.reason === undefined || isNullableString(candidate.reason));
}

function isGiveawayBooster(value: unknown): value is GiveawayBooster {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GiveawayBooster>;
  return typeof candidate.value === 'number'
    && Array.isArray(candidate.roles)
    && candidate.roles.every((role) => typeof role === 'string');
}

export function isGiveaway(value: unknown): value is Giveaway {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Giveaway>;
  return typeof candidate.id === 'string'
    && typeof candidate.serverId === 'string'
    && typeof candidate.prize === 'string'
    && isNullableString(candidate.channelId)
    && ['scheduled', 'ongoing', 'ended'].includes(candidate.status ?? '')
    && typeof candidate.startTime === 'string'
    && typeof candidate.endTime === 'string'
    && typeof candidate.winners === 'number'
    && Array.isArray(candidate.mentions)
    && candidate.mentions.every((mention) => typeof mention === 'string')
    && typeof candidate.textAboveEmbed === 'string'
    && typeof candidate.textInEmbed === 'string'
    && typeof candidate.textOnEnd === 'string'
    && isNullableString(candidate.imageUrl)
    && typeof candidate.profilePictureRequired === 'boolean'
    && typeof candidate.cocAccountRequired === 'boolean'
    && ['allow', 'deny', 'none'].includes(candidate.rolesMode ?? '')
    && Array.isArray(candidate.roles)
    && candidate.roles.every((role) => typeof role === 'string')
    && Array.isArray(candidate.boosters)
    && candidate.boosters.every(isGiveawayBooster)
    && typeof candidate.entryCount === 'number'
    && typeof candidate.updated === 'boolean'
    && isNullableString(candidate.messageId)
    && Array.isArray(candidate.winnersList)
    && candidate.winnersList.every(isGiveawayWinner)
    && isNullableString(candidate.eventPending)
    && isNullableString(candidate.eventPendingAt)
    && typeof candidate.createdAt === 'string'
    && typeof candidate.updatedAt === 'string';
}

export function isGiveawaysResponse(value: unknown): value is GiveawaysResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GiveawaysResponse>;
  return Array.isArray(candidate.ongoing)
    && candidate.ongoing.every(isGiveaway)
    && Array.isArray(candidate.upcoming)
    && candidate.upcoming.every(isGiveaway)
    && Array.isArray(candidate.ended)
    && candidate.ended.every(isGiveaway)
    && typeof candidate.total === 'number';
}

export interface GiveawayMutationResponse {
  message: string;
  giveawayId: string;
  serverId: string;
}

export interface GiveawayEntrant {
  userId: string;
  entries: number;
  winChance: number;
}

export interface GiveawayEntriesResponse {
  giveawayId: string;
  serverId: string;
  totalEntries: number;
  uniqueUsers: number;
  entrants: GiveawayEntrant[];
}

/**
 * Response from the reroll endpoint
 */
export interface GiveawayRerollResponse {
  message: string;
  giveawayId: string;
  serverId: string;
  newWinners: string[];
}
