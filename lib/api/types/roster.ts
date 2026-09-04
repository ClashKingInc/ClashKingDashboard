import type {
  DashboardApplyRosterMembershipChangesEndpoint,
  DashboardCloneRosterEndpoint,
  DashboardCreateRosterAutomationEndpoint,
  DashboardCreateRosterEndpoint,
  DashboardCreateRosterGroupEndpoint,
  DashboardCreateRosterViewEndpoint,
  DashboardGetRosterViewEndpoint,
  DashboardManageRosterMembersEndpoint,
  DashboardPreviewRosterViewEndpoint,
  DashboardQueryRosterMetricEndpoint,
  DashboardUpdateRosterAutomationEndpoint,
  DashboardUpdateRosterEndpoint,
  DashboardUpdateRosterGroupEndpoint,
  DashboardUpdateRosterMemberEndpoint,
  EndpointRequest,
  EndpointResponse,
} from "@clashking/api-contracts";

export type CreateRosterModel = EndpointRequest<typeof DashboardCreateRosterEndpoint>["body"];
export type RosterUpdateModel = EndpointRequest<typeof DashboardUpdateRosterEndpoint>["body"];
export type RosterMemberBulkOperationModel = EndpointRequest<typeof DashboardManageRosterMembersEndpoint>["body"];
export type UpdateMemberModel = EndpointRequest<typeof DashboardUpdateRosterMemberEndpoint>["body"];
export type CreateRosterGroupModel = EndpointRequest<typeof DashboardCreateRosterGroupEndpoint>["body"];
export type UpdateRosterGroupModel = EndpointRequest<typeof DashboardUpdateRosterGroupEndpoint>["body"];
type CreateRosterAutomationRequest = EndpointRequest<typeof DashboardCreateRosterAutomationEndpoint>;
export type CreateRosterAutomationModel = EndpointRequest<typeof DashboardCreateRosterAutomationEndpoint>["body"] & {
  readonly server_id: Extract<CreateRosterAutomationRequest["query"]["server_id"], string>;
};
export type UpdateRosterAutomationModel = EndpointRequest<typeof DashboardUpdateRosterAutomationEndpoint>["body"];
export type RosterCloneModel = EndpointRequest<typeof DashboardCloneRosterEndpoint>["body"];

/** The questionnaire editor is local UI state; it is not a body handled by this facade. */
export type RosterQuestionType = "text" | "boolean" | "single_select";
export interface RosterSignupQuestion {
  id: string;
  label: string;
  type: RosterQuestionType;
  required: boolean;
  options?: string[];
  order: number;
}

type PreviewRequest = EndpointRequest<typeof DashboardPreviewRosterViewEndpoint>["body"];
export type RosterViewColumn = PreviewRequest["columns"][number];
export type RosterViewSpec = {
  readonly schemaVersion: 1;
  readonly columns: RosterViewColumn[];
  readonly filters?: Array<PreviewRequest["filters"][number]>;
  readonly sort?: Array<PreviewRequest["sort"][number]>;
  readonly highlights?: Array<PreviewRequest["highlights"][number]>;
  readonly limit?: number;
};
export type RosterView = EndpointResponse<typeof DashboardGetRosterViewEndpoint>;
export type MaterializedRosterView = Omit<RosterView, "spec"> & { readonly spec: RosterViewSpec };
export type RosterViewResult = EndpointResponse<typeof DashboardPreviewRosterViewEndpoint>["result"];
export type RosterMetricQuery = Omit<
  EndpointRequest<typeof DashboardQueryRosterMetricEndpoint>["body"],
  "force"
> & { readonly force?: boolean };
export type RosterMetricQueryResult = EndpointResponse<typeof DashboardQueryRosterMetricEndpoint>;
export type CreateRosterViewModel = EndpointRequest<typeof DashboardCreateRosterViewEndpoint>["body"];
export type UpdateRosterViewModel = EndpointRequest<typeof DashboardCreateRosterViewEndpoint>["body"];
export type RosterMembershipChange = EndpointRequest<typeof DashboardApplyRosterMembershipChangesEndpoint>["body"]["changes"][number];
export type ApplyRosterMembershipChangesModel = EndpointRequest<typeof DashboardApplyRosterMembershipChangesEndpoint>["body"];

/** Roster-assistant proposal payload carried in chat UI parts, not an HTTP response. */
export interface RosterMembershipProposal {
  type: "membershipProposal";
  changes: RosterMembershipChange[];
  expectedRevisions: Record<string, number>;
  generatedAt: string;
  counts: { add: number; move: number; remove: number };
  items: Array<{
    action: "add" | "move" | "remove";
    playerTag: string;
    fromRoster?: string;
    toRoster?: string;
    reason?: string;
  }>;
}
