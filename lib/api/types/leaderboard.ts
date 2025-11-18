/**
 * Leaderboard Types
 */

export interface LeaderboardEntry {
  tag: string;
  name: string;
  value: number;
  rank: number;
  clan_tag?: string;
  clan_name?: string;
  league?: string;
  trophies?: number;
}

export interface LeaderboardResponse {
  items: LeaderboardEntry[];
}

export interface LeaderboardQueryParams {
  weekend: string;
  type: string;
  league?: string;
  lower?: string;
  upper?: string;
}

export type LeaderboardCategory = 'capital';
export type LeaderboardEntityType = 'players' | 'clans';

export type PlayerCapitalMetric = 'capital_looted';
export type ClanCapitalMetric = 'capitalTotalLoot' | 'raidsCompleted' | 'enemyDistrictsDestroyed' | 'medals';

export type LeaderboardMetric = PlayerCapitalMetric | ClanCapitalMetric;
