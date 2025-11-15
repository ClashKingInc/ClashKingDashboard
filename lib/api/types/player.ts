/**
 * Player-related types
 */

export interface PlayerTagsRequest {
  player_tags: string[];
}

export interface PlayerLocation {
  tag: string;
  country_name: string;
  country_code: string;
}

export interface PlayerSorted {
  tag: string;
  name: string;
  value: number;
  clan?: string;
}

export interface PlayerSummaryTop {
  gold: any[];
  elixir: any[];
  dark_elixir: any[];
  activity: any[];
  attack_wins: any[];
  season_trophies: any[];
  donations: any[];
  capital_donated: any[];
  capital_raided: any[];
  war_stars: any[];
}

export interface PlayerList {
  tags: string[];
}
