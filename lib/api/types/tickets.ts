import {
  ApproveMessage as ApproveMessageSchema,
  CreateTicketButtonEndpoint,
  CreateTicketPanelEndpoint,
  ServerEmbed as ServerEmbedSchema,
  ServerEmbedsEndpoint,
  TicketButton as TicketButtonSchema,
  TicketButtonSettings as TicketButtonSettingsSchema,
  TicketPanel as TicketPanelSchema,
  TicketPanelsEndpoint,
  UpdateTicketApproveMessagesEndpoint,
  UpdateTicketButtonAppearanceEndpoint,
  UpdateTicketButtonSettingsEndpoint,
  UpdateTicketPanelEndpoint,
  UpsertEmbedRequest as UpsertEmbedRequestSchema,
  type EndpointRequest,
  type EndpointResponse,
} from "@clashking/api-contracts";

// A row in the Dashboard's town-hall requirement editor.
export type THRequirement = Record<string, number>;

export type TicketButton = (typeof TicketButtonSchema)["Type"];
export type TicketButtonSettings = (typeof TicketButtonSettingsSchema)["Type"];
export type ApproveMessage = (typeof ApproveMessageSchema)["Type"];
export type TicketPanel = (typeof TicketPanelSchema)["Type"];
export type TicketPanelsResponse = EndpointResponse<typeof TicketPanelsEndpoint>;
export type UpdateTicketPanelRequest = EndpointRequest<typeof UpdateTicketPanelEndpoint>["body"];
export type UpdateButtonSettingsRequest = EndpointRequest<typeof UpdateTicketButtonSettingsEndpoint>["body"];
export type UpdateApproveMessagesRequest = EndpointRequest<typeof UpdateTicketApproveMessagesEndpoint>["body"];
export type ServerEmbed = (typeof ServerEmbedSchema)["Type"];
export type ServerEmbedsResponse = EndpointResponse<typeof ServerEmbedsEndpoint>;
export type UpsertEmbedRequest = (typeof UpsertEmbedRequestSchema)["Type"];
export type CreatePanelRequest = EndpointRequest<typeof CreateTicketPanelEndpoint>["body"];
export type CreateButtonRequest = EndpointRequest<typeof CreateTicketButtonEndpoint>["body"];
export type UpdateButtonAppearanceRequest = EndpointRequest<typeof UpdateTicketButtonAppearanceEndpoint>["body"];
