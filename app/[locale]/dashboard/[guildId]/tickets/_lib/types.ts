/** Shared types for the tickets dashboard section. */

export interface DiscordChannel {
  id: string;
  name: string;
  type: number | string;
  parent_name?: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color?: number;
}
