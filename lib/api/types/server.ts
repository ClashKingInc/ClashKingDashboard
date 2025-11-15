/**
 * Server/Guild-related types
 */

export interface ServerSettings {
  server_id: number;
  embed_color?: string;
  clans?: any[];
  roles?: any[];
}

export interface ClanSettings {
  server_id: number;
  clan_tag: string;
  settings: any;
}

export interface BanRequest {
  reason: string;
  added_by: string;
  image?: any;
}
