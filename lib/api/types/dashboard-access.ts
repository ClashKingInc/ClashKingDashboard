export type DashboardSection =
  | "settings"
  | "family_settings"
  | "logs"
  | "clans"
  | "rosters"
  | "links"
  | "moderation"
  | "roles"
  | "reminders"
  | "autoboards"
  | "giveaways"
  | "panels"
  | "tickets"
  | "embeds"
  | "wars"
  | "leaderboards";

export type DashboardAccessLevel = "view" | "manage";

export interface DashboardCapabilities {
  server_id: string;
  full_access: boolean;
  sections: Partial<Record<DashboardSection, DashboardAccessLevel>>;
}

export interface DashboardAccessGrant {
  role_id: string;
  section: DashboardSection;
  access_level: DashboardAccessLevel;
}

export interface DashboardAccessRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

export interface DashboardAccessConfig {
  server_id: string;
  roles: DashboardAccessRole[];
  grants: DashboardAccessGrant[];
  sections: DashboardSection[];
}

export interface BotGuildProfile {
  name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string;
  name_inherited: boolean;
  avatar_inherited: boolean;
  banner_inherited: boolean;
  bio_inherited: boolean;
}

export interface BotGuildProfileUpdate {
  name?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  clear_name?: boolean;
  clear_avatar?: boolean;
  clear_banner?: boolean;
  clear_bio?: boolean;
}
