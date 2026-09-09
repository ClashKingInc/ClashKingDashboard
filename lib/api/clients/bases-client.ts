import {
  BaseDownloaderEndpoint,
  BaseEndpoint,
  BasesEndpoint,
  CreateBaseEndpoint,
  DeleteBaseEndpoint,
  UploadBaseImageEndpoint,
} from "@clashking/api-contracts";

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
    return this.executeEndpoint(BasesEndpoint, {
      path: { serverId },
      query: { limit, offset },
      body: {},
    });
  }

  async get(serverId: string, baseId: string): Promise<ApiResponse<Base>> {
    return this.executeEndpoint(BaseEndpoint, {
      path: { serverId, baseId },
      query: {},
      body: {},
    });
  }

  async delete(serverId: string, baseId: string): Promise<ApiResponse<BaseDeleteResponse>> {
    return this.executeEndpoint(DeleteBaseEndpoint, {
      path: { serverId, baseId },
      query: {},
      body: {},
    });
  }

  async create(serverId: string, data: CreateBaseRequest): Promise<ApiResponse<Base>> {
    return this.executeEndpoint(CreateBaseEndpoint, {
      path: { serverId },
      query: {},
      body: data,
    });
  }

  async uploadImage(serverId: string, file: File): Promise<ApiResponse<BaseImageUploadResponse>> {
    const body = new FormData();
    body.append("file", file);
    return this.executeEndpoint(UploadBaseImageEndpoint, {
      path: { serverId },
      query: {},
      body,
    });
  }

  async getDownloader(
    serverId: string,
    baseId: string,
    userId: string,
  ): Promise<ApiResponse<BaseDownloader>> {
    return this.executeEndpoint(BaseDownloaderEndpoint, {
      path: { serverId, baseId, userId },
      query: {},
      body: {},
    });
  }
}
