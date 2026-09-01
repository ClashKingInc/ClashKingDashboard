import { BaseApiClient } from "../core/base-client";
import type { ApiResponse } from "../types/common";
import type {
  ConnectedAppGrant,
  ConnectedAppGrantDetails,
  ConnectedAppGrantList,
  ConnectedApplicationMetadata,
  UpdateConnectedAppGrant,
} from "../types/connected-apps";

const applicationPath = (applicationId: string): string => encodeURIComponent(applicationId);

export class ConnectedAppsClient extends BaseApiClient {
  async getApplication(
    applicationId: string,
    redirectUri?: string,
  ): Promise<ApiResponse<ConnectedApplicationMetadata>> {
    const query = redirectUri
      ? `?${new URLSearchParams({ redirect_uri: redirectUri })}`
      : "";
    return this.request(
      `/v2/links/shared/applications/${applicationPath(applicationId)}${query}`,
      { method: "GET" },
    );
  }

  async getGrant(applicationId: string): Promise<ApiResponse<ConnectedAppGrantDetails>> {
    return this.request(`/v2/links/shared/grants/${applicationPath(applicationId)}`, {
      method: "GET",
    });
  }

  async updateGrant(
    applicationId: string,
    grant: UpdateConnectedAppGrant,
  ): Promise<ApiResponse<ConnectedAppGrant>> {
    return this.request(`/v2/links/shared/grants/${applicationPath(applicationId)}`, {
      method: "PUT",
      body: JSON.stringify(grant),
    });
  }

  async revokeGrant(applicationId: string): Promise<ApiResponse<void>> {
    return this.request(`/v2/links/shared/grants/${applicationPath(applicationId)}`, {
      method: "DELETE",
    });
  }

  async listGrants(): Promise<ApiResponse<ConnectedAppGrantList>> {
    return this.request("/v2/links/shared/grants", { method: "GET" });
  }
}
