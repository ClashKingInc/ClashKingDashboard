export interface BillingSubscription {
  provider: "stripe";
  status: string;
  active: boolean;
  checkoutEnabled: boolean;
  bookmarkNotificationsLimit: number;
  rosterAssistantMonthlyCreditUsd: number;
  assignedServerId: string | null;
  rosterAssistantSpentUsd: number;
  rosterAssistantRemainingUsd: number;
}

export interface BillingSession {
  url: string;
}

export interface BillingUsage {
  serverId: string;
  serverSpentUsd: number;
  serverLimitUsd: number;
  userSpentUsd: number;
  userLimitUsd: number;
  globalFreeAvailable: boolean;
  subscriptionActive: boolean;
  assignedSubscriberCount: number;
  paidLimitUsd: number;
  paidSpentUsd: number;
  paidRemainingUsd: number;
  resetsAt: string;
}
