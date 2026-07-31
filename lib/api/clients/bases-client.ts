import { BaseApiClient } from "../core/base-client";
import type { ApiResponse } from "../types/common";
import type {
  Base,
  BaseDeleteResponse,
  BaseDownloader,
  BaseImageUploadResponse,
  BasesResponse,
  CreateBaseRequest,
} from "../types/bases";

export class BasesClient extends BaseApiClient {
  async list(serverId: string, limit = 50, offset = 0): Promise<ApiResponse<BasesResponse>> {
    const query = this.buildQueryString({ limit, offset });
    return this.request(`/v2/server/${serverId}/bases${query}`, { method: "GET" });
  }

  async get(serverId: string, baseId: string): Promise<ApiResponse<Base>> {
    return this.request(`/v2/server/${serverId}/bases/${encodeURIComponent(baseId)}`, {
      method: "GET",
    });
  }

  async delete(serverId: string, baseId: string): Promise<ApiResponse<BaseDeleteResponse>> {
    return this.request(`/v2/server/${serverId}/bases/${encodeURIComponent(baseId)}`, {
      method: "DELETE",
    });
  }

  async create(serverId: string, data: CreateBaseRequest): Promise<ApiResponse<Base>> {
    return this.request(`/v2/server/${serverId}/bases`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async uploadImage(serverId: string, file: File): Promise<ApiResponse<BaseImageUploadResponse>> {
    const body = new FormData();
    body.append("file", file);
    return this.requestFormData(`/v2/server/${serverId}/bases/images`, "POST", body);
  }

  async getDownloader(
    serverId: string,
    baseId: string,
    userId: string,
  ): Promise<ApiResponse<BaseDownloader>> {
    return this.request(
      `/v2/server/${serverId}/bases/${encodeURIComponent(baseId)}/downloaders/${encodeURIComponent(userId)}`,
      { method: "GET" },
    );
  }
}
