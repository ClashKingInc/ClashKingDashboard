export const BUTTON_TYPES = [
  "Link Button",
  "Link Help Button",
  "Refresh Button",
  "To-Do Button",
  "Roster Button",
] as const;

export type ButtonType = (typeof BUTTON_TYPES)[number];

export const BUTTON_COLORS = ["Blue", "Green", "Grey", "Red"] as const;
export type ButtonColor = (typeof BUTTON_COLORS)[number];

export type ServerPanel = EndpointResponse<typeof ServerPanelEndpoint>;
export type UpdatePanelRequest = EndpointRequest<typeof UpdateServerPanelEndpoint>["body"];
import {
  ServerPanelEndpoint,
  UpdateServerPanelEndpoint,
  type EndpointRequest,
  type EndpointResponse,
} from "@clashking/api-contracts";
