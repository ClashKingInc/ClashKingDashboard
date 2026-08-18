import { BaseApiClient } from "../core/base-client";
import type { ApiResponse } from "../types/common";
import type { BillingSession, BillingSubscription, BillingUsage } from "../types/billing";

export class BillingClient extends BaseApiClient {
  async getSubscription(): Promise<ApiResponse<BillingSubscription>> {
    return this.request("/v2/billing/subscription", { method: "GET" });
  }

  async createCheckout(serverId: string): Promise<ApiResponse<BillingSession>> {
    return this.request("/v2/billing/stripe/checkout", { method: "POST", body: JSON.stringify({ serverId }) });
  }

  async createPortal(): Promise<ApiResponse<BillingSession>> {
    return this.request("/v2/billing/stripe/portal", { method: "POST" });
  }

  async getUsage(serverId: string): Promise<ApiResponse<BillingUsage>> {
    return this.request(`/v2/billing/usage?serverId=${encodeURIComponent(serverId)}`, { method: "GET" });
  }

  async updateAssignment(serverId: string | null): Promise<ApiResponse<null>> {
    return this.request("/v2/billing/subscription/assignment", {
      method: "PUT",
      body: JSON.stringify({ serverId }),
    });
  }
}
