/**
 * War-related types
 */

export interface PreviousWarsOptions {
  timestamp_start?: number;
  timestamp_end?: number;
  include_cwl?: boolean;
  limit?: number;
}

export interface ClanWarStatsOptions {
  clan_tags: string[];
  timestamp_start?: number;
  timestamp_end?: number;
  war_types?: number;
  townhall_filter?: string;
  limit?: number;
}

export interface PlayerWarhitsFilter {
  player_tags: string[];
  timestamp_start: number;
  timestamp_end: number;
  limit?: number;
  season?: string;
  type?: number;
  own_th?: number;
  enemy_th?: number;
  stars?: number;
  min_destruction?: number;
  max_destruction?: number;
  map_position_min?: number;
  map_position_max?: number;
  fresh_only?: boolean;
}
