import {
  DashboardBillingAssignmentEndpoint,
  DashboardBillingCheckoutEndpoint,
  DashboardBillingPortalEndpoint,
  DashboardBillingSubscriptionEndpoint,
  DashboardBillingUsageEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from "../core/base-client";
import type { ApiResponse } from "../types/common";
import type { BillingSession, BillingSubscription, BillingUsage } from "../types/billing";

export class BillingClient extends BaseApiClient {
  async getSubscription(): Promise<ApiResponse<BillingSubscription>> {
    return this.executeEndpoint(DashboardBillingSubscriptionEndpoint, {
      path: {},
      query: {},
      body: {},
    });
  }

  async createCheckout(serverId: string): Promise<ApiResponse<BillingSession>> {
    return this.executeEndpoint(DashboardBillingCheckoutEndpoint, {
      path: {},
      query: {},
      body: { serverId },
    });
  }

  async createPortal(): Promise<ApiResponse<BillingSession>> {
    return this.executeEndpoint(DashboardBillingPortalEndpoint, {
      path: {},
      query: {},
      body: {},
    });
  }

  async getUsage(serverId: string): Promise<ApiResponse<BillingUsage>> {
    return this.executeEndpoint(DashboardBillingUsageEndpoint, {
      path: {},
      query: { serverId },
      body: {},
    });
  }

  async updateAssignment(serverId: string | null): Promise<ApiResponse<null>> {
    const response = await this.executeEndpoint(DashboardBillingAssignmentEndpoint, {
      path: {},
      query: {},
      body: { serverId },
    });
    if (response.error) {
      return {
        error: response.error,
        errorData: response.errorData,
        status: response.status,
      };
    }
    return { data: null, status: response.status };
  }
}
