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

export interface LeagueReference {
  id: number;
  name: string;
  iconUrl: string;
}

export interface CwlSeasonItem {
  season: string;
  state: string;
  warSize: number | null;
  warLeague: LeagueReference | null;
}

export interface CwlGroupMember {
  tag: string;
  name: string;
  townHallLevel: number;
}

export interface CwlGroupClan {
  tag: string;
  name: string;
  clanLevel: number;
  badgeUrls: { small?: string; medium?: string; large?: string };
  members: CwlGroupMember[];
}

export interface CwlStoredWarClan {
  tag: string;
  name: string;
  attacks?: number;
  stars: number;
  destructionPercentage: number;
  members?: CwlStoredWarMember[];
}

export interface CwlStoredWarAttack {
  attackerTag: string;
  defenderTag: string;
  stars: number;
  destructionPercentage: number;
  order: number;
  duration: number;
}

export interface CwlStoredWarMember {
  tag: string;
  name: string;
  townhallLevel: number;
  mapPosition: number;
  attacks?: CwlStoredWarAttack[];
}

export interface CwlStoredWar {
  tag: string;
  season: string;
  state: string;
  teamSize: number;
  clan: CwlStoredWarClan;
  opponent: CwlStoredWarClan;
}

export interface CwlWarPlaceholder {
  tag: string;
}

export interface CwlGroupResponse {
  season: string;
  state: string;
  warLeague: LeagueReference | null;
  clans: CwlGroupClan[];
  rounds: Array<{ warTags: Array<CwlStoredWar | CwlWarPlaceholder> }>;
}

export interface CwlBonusRecipient {
  playerTag: string;
  medalCount: number;
}

export interface CwlWarLeagueStaticItem {
  _id: number;
  name: string;
  cwl_medals: {
    first_place: number;
    position_medal_diff: number;
    bonus_reward: number;
    minimum_bonus_amount: number;
  };
  promotions?: number;
  demotions?: number;
  "15v15_only": boolean;
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
  badgeUrl?: string;
  badge_url?: string;
  badgeUrls?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  clanLevel?: number;
  clan_level?: number;
  attacks?: number;
  stars: number;
  destruction?: number;
  destructionPercentage?: number;
  members?: WarMember[];
}

export interface War {
  tag?: string;
  state: 'notInWar' | 'preparation' | 'inWar' | 'warEnded';
  teamSize?: number;
  team_size?: number; // API might use either format
  attacksPerMember?: number;
  preparationStartTime?: string;
  preparation_start_time?: string;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  clan: WarClan;
  opponent: WarClan;
  warType?: string;
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

// War Summary types
export interface CwlLeagueRound {
  round: number;
  war_tags: string[];
}

export interface CwlLeague {
  rounds: CwlLeagueRound[];
}

export interface WarSummary {
  clan_tag?: string;
  isInWar: boolean;
  isInCwl: boolean;
  war_info: War | null;
  league_info: CwlLeague | null;
  war_league_infos: War[];
}

export interface WarSummaryResponse {
  items: WarSummary[];
}
