export interface ConnectedApplication {
  id: string;
  name: string;
  developer_name?: string | null;
}

export interface ConnectedApplicationMetadata {
  application: ConnectedApplication;
  redirect_uri?: string;
}

export interface ShareableAccount {
  player_tag: string;
  name: string;
  is_verified: boolean;
  hidden: boolean;
}

export type ConnectedAppAccessMode = "selected" | "all_current_and_future";

export interface ConnectedAppGrant {
  access_mode: ConnectedAppAccessMode;
  selected_player_tags: string[];
  connected_at: string;
  updated_at: string;
}

export interface ConnectedAppGrantDetails {
  application: ConnectedApplication;
  accounts: ShareableAccount[];
  grant: ConnectedAppGrant | null;
}

export interface ConnectedAppGrantListItem {
  application: ConnectedApplication;
  grant: ConnectedAppGrant;
}

export interface ConnectedAppGrantList {
  items: ConnectedAppGrantListItem[];
}

export type UpdateConnectedAppGrant =
  | { access_mode: "selected"; player_tags: string[] }
  | { access_mode: "all_current_and_future" };
