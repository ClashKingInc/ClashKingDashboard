import {
  BotGuildProfileEndpoint,
  DashboardAccessEndpoint,
  DashboardAccessGrant as DashboardAccessGrantSchema,
  DashboardAccessLevel as DashboardAccessLevelSchema,
  DashboardAccessRole as DashboardAccessRoleSchema,
  DashboardCapabilitiesEndpoint,
  UpdateBotGuildProfileEndpoint,
  type EndpointRequest,
  type EndpointResponse,
} from "@clashking/api-contracts";

// DashboardSection is a UI navigation model. The wire contract deliberately
// accepts section identifiers as strings so the API can add sections safely.
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

export type DashboardAccessLevel = (typeof DashboardAccessLevelSchema)["Type"];
export type DashboardCapabilities = EndpointResponse<typeof DashboardCapabilitiesEndpoint>;
export type DashboardAccessGrant = (typeof DashboardAccessGrantSchema)["Type"];
export type DashboardAccessRole = (typeof DashboardAccessRoleSchema)["Type"];
export type DashboardAccessConfig = EndpointResponse<typeof DashboardAccessEndpoint>;
export type BotGuildProfile = EndpointResponse<typeof BotGuildProfileEndpoint>;
export type BotGuildProfileUpdate = EndpointRequest<typeof UpdateBotGuildProfileEndpoint>["body"];
