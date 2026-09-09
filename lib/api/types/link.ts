import type {
  DashboardLinksAddEndpoint,
  DashboardLinksListEndpoint,
  DashboardLinksVisibilityEndpoint,
  EndpointRequest,
  EndpointResponse,
} from "@clashking/api-contracts";

export type CocAccountRequest = EndpointRequest<typeof DashboardLinksAddEndpoint>["body"];
export type LinkedAccount = EndpointResponse<typeof DashboardLinksVisibilityEndpoint>;
export type LinkVisibilityRequest = EndpointRequest<typeof DashboardLinksVisibilityEndpoint>["body"];
export type LinkedAccountsResponse = EndpointResponse<typeof DashboardLinksListEndpoint>;
