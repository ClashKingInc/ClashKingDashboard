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
  add?: Array<{ player_tag: string; signupAnswers?: Record<string, unknown> }>;
  remove?: string[];
}

export interface UpdateMemberModel {
  signupAnswers?: Record<string, unknown>;
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

export type RosterQuestionType = "text" | "boolean" | "single_select";

export interface RosterSignupQuestion {
  id: string;
  label: string;
  type: RosterQuestionType;
  required: boolean;
  options?: string[];
  order: number;
}

export interface RosterViewColumn {
  id: string;
  label: string;
  metricId: string;
  description?: string;
  parameters?: Record<string, unknown>;
  format?: "text" | "number" | "percent" | "boolean" | "player" | "clan";
}

export interface RosterViewSpec {
  schemaVersion: 1;
  columns: RosterViewColumn[];
  filters?: Array<{
    columnId: string;
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
    value: unknown;
  }>;
  sort?: Array<{ columnId: string; direction: "asc" | "desc" }>;
  highlights?: Array<{
    id: string;
    target: "row" | "column" | "cell";
    columnId?: string;
    when?: {
      columnId?: string;
      operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
      value: unknown;
    };
    tone: "red" | "amber" | "green" | "blue" | "purple" | "gray";
  }>;
  limit?: number;
}

export interface RosterView {
  id: string;
  shareId: string;
  serverId: string;
  name: string;
  sourceCode: string;
  sourceVersion: 1;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterializedRosterView extends RosterView {
  spec: RosterViewSpec;
}

export interface RosterViewResult {
  viewId: string;
  rosterIds: string[];
  schemaVersion: 1;
  rows: Array<{
    rosterId: string;
    playerTag: string;
    values: Record<string, unknown>;
    highlight?: string;
  }>;
  cachedMetricIds: string[];
  evaluatedAt: string;
}

export interface RosterMetricQuery {
  rosterIds: string[];
  metricId: string;
  parameters?: Record<string, unknown>;
  force?: boolean;
}

export interface RosterMetricQueryResult {
  metricId: string;
  parameters: Record<string, unknown>;
  rows: Array<{ rosterId: string; playerTag: string; value: unknown }>;
  cached: boolean;
  evaluatedAt: string;
}

export interface CreateRosterViewModel {
  name: string;
  sourceCode: string;
  sourceVersion: 1;
}

export interface UpdateRosterViewModel {
  name: string;
  sourceCode: string;
  sourceVersion: 1;
}

export interface RosterMembershipChange {
  action: "add" | "remove" | "move";
  playerTag: string;
  fromRosterId?: string;
  toRosterId?: string;
  reason?: string;
}

export interface RosterMembershipProposal {
  type: "membershipProposal";
  changes: RosterMembershipChange[];
  expectedRevisions: Record<string, number>;
  generatedAt: string;
  counts: { add: number; move: number; remove: number };
  items: Array<{ action: "add" | "move" | "remove"; playerTag: string; fromRoster?: string; toRoster?: string; reason?: string }>;
}

export interface ApplyRosterMembershipChangesModel {
  serverId: string;
  changes: RosterMembershipChange[];
  expectedRevisions: Record<string, number>;
}
