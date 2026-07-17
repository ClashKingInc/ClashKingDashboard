/**
 * Account linking types
 */

export interface CocAccountRequest {
  player_tag: string;
  api_token?: string;
}

export interface LinkedAccount {
  player_tag: string;
  player_name?: string | null;
  town_hall?: number | null;
  is_verified?: boolean;
  hidden: boolean;
  added_at?: string | null;
}

export interface LinkVisibilityRequest {
  hidden: boolean;
}

export interface LinkedAccountsResponse {
  items: LinkedAccount[];
}
