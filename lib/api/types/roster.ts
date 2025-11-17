/**
 * Roster-related types
 */

export interface CreateRosterModel {
  name: string;
  roster_type: string;
  clan_tag?: string;
  alias?: string;
}

export interface RosterUpdateModel {
  min_th?: number;
  max_th?: number;
  clan_tag?: string;
  roster_type?: string;
}

export interface RosterMemberBulkOperationModel {
  add?: Array<{ player_tag: string; signup_group?: string }>;
  remove?: string[];
}

export interface UpdateMemberModel {
  signup_group?: string;
  member_status?: string;
}

export interface CreateRosterGroupModel {
  alias: string;
  description?: string;
}

export interface UpdateRosterGroupModel {
  alias?: string;
  description?: string;
}

export interface CreateRosterSignupCategoryModel {
  alias: string;
  server_id: string | number;
  custom_id: string;
  description?: string;
}

export interface CreateRosterAutomationModel {
  action: string;
  roster_id?: string;
  group_id?: string;
  schedule: any;
}

export interface RosterCloneModel {
  new_alias: string;
  copy_members?: boolean;
  group_id?: string;
}
