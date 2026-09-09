/** Account-linking API client backed by the shared endpoint contracts. */

import {
  DashboardLinksAddEndpoint,
  DashboardLinksListEndpoint,
  DashboardLinksOrderEndpoint,
  DashboardLinksRemoveEndpoint,
  DashboardLinksVisibilityEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from "../core/base-client";
import type { ApiResponse } from "../types/common";
import type { CocAccountRequest, LinkedAccount, LinkedAccountsResponse } from "../types/link";

export class LinkClient extends BaseApiClient {
  async linkAccount(id: string, data: CocAccountRequest) {
    return this.executeEndpoint(DashboardLinksAddEndpoint, {
      path: { userId: id },
      query: {},
      body: data,
    });
  }

  async getLinkedAccounts(id: string): Promise<ApiResponse<LinkedAccountsResponse>> {
    return this.executeEndpoint(DashboardLinksListEndpoint, {
      path: { userId: id },
      query: {},
      body: {},
    });
  }

  async unlinkAccount(id: string, playerTag: string): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(DashboardLinksRemoveEndpoint, {
      path: { userId: id, playerTag },
      query: {},
      body: {},
    });
  }

  async setAccountHidden(
    id: string,
    playerTag: string,
    hidden: boolean,
  ): Promise<ApiResponse<LinkedAccount>> {
    return this.executeEndpoint(DashboardLinksVisibilityEndpoint, {
      path: { userId: id, playerTag },
      query: {},
      body: { hidden },
    });
  }

  async reorderAccounts(id: string, orderedTags: string[]): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(DashboardLinksOrderEndpoint, {
      path: { userId: id },
      query: {},
      body: { ordered_tags: orderedTags },
    });
  }
}
