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

// Response types
export interface WarAttack {
  order: number;
  attacker_tag: string;
  defender_tag: string;
  stars: number;
  destruction: number;
  duration?: number;
  attacker_th?: number;
  defender_th?: number;
}

export interface WarMember {
  tag: string;
  name: string;
  townhall: number;
  map_position: number;
  attacks?: WarAttack[];
  best_opponent_attack?: WarAttack | null;
}

export interface WarClan {
  tag: string;
  name: string;
  badge_url?: string;
  clan_level?: number;
  attacks: number;
  stars: number;
  destruction: number;
  members?: WarMember[];
}

export interface War {
  state: 'notInWar' | 'preparation' | 'inWar' | 'warEnded';
  team_size: number;
  preparation_start_time?: string;
  start_time?: string;
  end_time?: string;
  clan: WarClan;
  opponent: WarClan;
  type?: 'random' | 'friendly' | 'cwl';
}

export interface ClanWarStats {
  clan_tag: string;
  clan_name: string;
  total_wars: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  total_stars: number;
  total_destruction: number;
  avg_stars: number;
  avg_destruction: number;
  attacks_per_war: number;
  war_streak?: number;
}

export interface PlayerWarStats {
  player_tag: string;
  player_name: string;
  total_attacks: number;
  total_stars: number;
  total_destruction: number;
  avg_stars: number;
  avg_destruction: number;
  three_star_count: number;
  three_star_rate: number;
  townhall_level?: number;
}

export interface WarPerformanceByTH {
  townhall: number;
  attacks: number;
  stars: number;
  destruction: number;
  success_rate: number;
}
