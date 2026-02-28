// Roster Types - Centralized type definitions for the rosters module

export interface RosterMember {
  name: string;
  tag: string;
  townhall: number;
  hero_lvs?: number;
  discord?: string;
  discord_username?: string | null;
  discord_avatar_url?: string | null;
  current_clan?: string;
  current_clan_tag?: string;
  war_pref?: boolean;
  trophies?: number;
  sub?: boolean;
  signup_group?: string | null;
  hitrate?: number | null;
  last_online?: number | null;
  current_league?: string | null;
  added_at?: number | null;
  last_updated?: number | null;
  is_in_family?: boolean;
  member_status?: string;
  error_details?: string | null;
}

export interface Roster {
  custom_id: string;
  server_id: string | number;
  alias: string;
  description?: string | null;
  roster_type: "clan" | "family";
  signup_scope: "clan-only" | "family-wide";
  clan_tag?: string | null;
  clan_name?: string | null;
  clan_badge?: string | null;
  group_id?: string | null;
  members?: RosterMember[];
  min_th?: number | null;
  max_th?: number | null;
  roster_size?: number | null;
  min_signups?: number | null;
  max_accounts_per_user?: number | null;
  th_restriction?: string;
  allowed_signup_categories?: string[];
  columns?: string[];
  sort?: string[];
  image?: string | null;
  event_start_time?: number | null;
  recurrence_days?: number | null;
  recurrence_day_of_month?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type PingType = "signup_reminder" | "missing";

export interface RosterAutomationOptions {
  ping_type?: PingType;
}

export interface RosterAutomation {
  automation_id: string;
  server_id: string | number;
  roster_id?: string;
  group_id?: string;
  action_type: AutomationActionType;
  offset_seconds: number;
  discord_channel_id?: string;
  options?: RosterAutomationOptions;
  active: boolean;
  executed: boolean;
  created_at?: number;
  updated_at?: number;
  /** Frontend-only: marks automations inherited from a group */
  _isGroupAutomation?: boolean;
}

export type AutomationActionType =
  | "roster_signup"
  | "roster_signup_close"
  | "roster_post"
  | "roster_ping"
  | "roster_delete"
  | "roster_clear"
  | "roster_archive";

export interface RosterGroup {
  group_id: string;
  alias: string;
  description?: string;
  server_id: string | number;
  max_accounts_per_user?: number | null;
  roster_size?: number | null;
  min_signups?: number | null;
  allowed_signup_categories?: string[];
  roster_count?: number;
  rosters?: Array<{
    custom_id: string;
    alias: string;
    clan_name?: string;
    updated_at?: string;
  }>;
  created_at?: number;
  updated_at?: number;
}

export interface SignupCategory {
  custom_id: string;
  alias: string;
  server_id: string | number;
  created_at?: number;
}

export interface Clan {
  tag: string;
  name: string;
  badge?: string;
  badge_url?: string | null;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: string;
  parent_name?: string;
}

export interface ClanMember {
  tag: string;
  name: string;
  townhall: number;
  clan_tag: string;
  clan_name: string;
}

export interface MissingMember {
  tag: string;
  name: string;
  townhall: number;
  role: string;
  trophies: number;
  discord?: string;
}

export interface MissingMembersRosterResult {
  state: 'ok' | 'error';
  roster_info?: {
    roster_id: string;
    alias: string;
    clan_tag: string;
    clan_name: string;
    registered_count: number;
  };
  missing_members?: MissingMember[];
  summary?: {
    total_missing: number;
    total_clan_members: number;
    coverage_percentage: number;
  };
  error_message?: string;
}

export interface MissingMembersResult {
  query_type: 'roster' | 'group';
  query_value: string;
  results: MissingMembersRosterResult[];
  total_rosters_checked: number;
}

// Form state types
export interface CreateRosterFormData {
  alias: string;
  roster_type: "clan" | "family";
  signup_scope: "clan-only" | "family-wide";
  clan_tag: string;
}

export interface EditRosterFormData {
  alias: string;
  description: string;
  roster_type: "clan" | "family";
  signup_scope: "clan-only" | "family-wide";
  clan_tag: string;
  min_th: string;
  max_th: string;
  roster_size: string;
  min_signups: string;
  max_accounts_per_user: string;
  event_start_time: string;
  recurrence_days: string;
  recurrence_day_of_month: string;
  recurrence_mode: 'days' | 'day_of_month';
  columns: string[];
  sort: string[];
  group_id: string;
  allowed_signup_categories: string[];
}

export interface CloneRosterFormData {
  new_alias: string;
  copy_members: boolean;
}

// Stats types
export interface RosterStats {
  totalMembers: number;
  avgTh: number;
  avgHitrate: number;
  inClan: number;
  inFamily: number;
  external: number;
  subs: number;
  thDistribution: Record<number, number>;
}

// Column configuration
export const ROSTER_COLUMNS = [
  { value: "townhall", label: "Town Hall" },
  { value: "name", label: "Name" },
  { value: "tag", label: "Tag" },
  { value: "hitrate", label: "Hit Rate" },
  { value: "current_clan_tag", label: "Current Clan" },
  { value: "discord", label: "Discord" },
  { value: "hero_lvs", label: "Hero Levels" },
  { value: "trophies", label: "Trophies" },
  { value: "war_pref", label: "War Preference" },
  { value: "signup_group", label: "Signup Group" },
] as const;

export const SORT_OPTIONS = [
  { value: "townhall_desc", label: "TH (High to Low)" },
  { value: "townhall_asc", label: "TH (Low to High)" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
  { value: "hitrate_desc", label: "Hit Rate (High to Low)" },
  { value: "hitrate_asc", label: "Hit Rate (Low to High)" },
  { value: "hero_lvs_desc", label: "Heroes (High to Low)" },
  { value: "added_at_desc", label: "Recently Added" },
  { value: "added_at_asc", label: "First Added" },
] as const;
