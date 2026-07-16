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
  added_at?: string | null;
}

export interface LinkedAccountsResponse {
  items: LinkedAccount[];
}
