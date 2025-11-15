/**
 * Clan-related types
 */

export interface ClanRanking {
  tag: string;
  global_rank: number;
  country_code: string;
  country_name: string;
  local_rank: number;
}

export interface ClanBoardTotals {
  tag: string;
  tracked_player_count: number;
  clan_games_points: number;
  troops_donated: number;
  troops_received: number;
  clan_capital_donated: number;
  activity_metrics: any;
}

export interface ClanDonation {
  tag: string;
  donated: number;
  received: number;
}

export interface ClanComposition {
  townhall: Record<string, number>;
  trophies: any;
  location: any;
  role: any;
  league: any;
  member_count: number;
  clan_count: number;
}

export interface ClanSearchResult {
  name: string;
  tag: string;
  memberCount: number;
  level: number;
  warLeague: string;
  type: string;
}
