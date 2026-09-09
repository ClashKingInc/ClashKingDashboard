import {
  DashboardBillingCheckoutEndpoint,
  DashboardBillingSubscriptionEndpoint,
  DashboardBillingUsageEndpoint,
  type EndpointResponse,
} from "@clashking/api-contracts";

export type BillingSubscription = EndpointResponse<typeof DashboardBillingSubscriptionEndpoint>;
export type BillingSession = EndpointResponse<typeof DashboardBillingCheckoutEndpoint>;
export type BillingUsage = EndpointResponse<typeof DashboardBillingUsageEndpoint>;
