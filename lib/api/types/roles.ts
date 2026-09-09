import {
  CreateServerRoleEndpoint,
  DiscordRole as DiscordRoleSchema,
  DiscordRolesEndpoint,
  RoleSettingsEndpoint,
  ServerRole as ServerRoleSchema,
  ServerRoleMode,
  ServerRolesEndpoint,
  ServerRoleType,
  UpdateRoleSettingsEndpoint,
  UpdateServerRoleEndpoint,
  type EndpointRequest,
  type EndpointResponse,
} from "@clashking/api-contracts";

export type RoleType = (typeof ServerRoleType)["Type"];
export type RoleMode = (typeof ServerRoleMode)["Type"];
export type DiscordRole = (typeof DiscordRoleSchema)["Type"];
export type ServerRole = (typeof ServerRoleSchema)["Type"];
export type ServerRoleInput = EndpointRequest<typeof CreateServerRoleEndpoint>["body"];
export type ServerRoleUpdate = EndpointRequest<typeof UpdateServerRoleEndpoint>["body"];
export type ServerRolesResponse = EndpointResponse<typeof ServerRolesEndpoint>;
export type ServerRoleResponse = EndpointResponse<typeof CreateServerRoleEndpoint>;
export type RoleSettings = EndpointResponse<typeof RoleSettingsEndpoint>;
export type RoleSettingsUpdate = EndpointRequest<typeof UpdateRoleSettingsEndpoint>["body"];
export type DiscordRolesResponse = EndpointResponse<typeof DiscordRolesEndpoint>;
