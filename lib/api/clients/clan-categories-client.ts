import {
  ClanCategoriesEndpoint,
  CreateClanCategoryEndpoint,
  DeleteClanCategoryEndpoint,
  PreviewClanCategoryDeleteEndpoint,
  RenameClanCategoryEndpoint,
  ReorderClanCategoriesEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from "../core/base-client";
import type { ApiResponse } from "../types/common";
import type {
  ClanCategoriesResponse,
  ClanCategoryDeletePreview,
  ClanCategoryDeleteResponse,
  ClanCategoryMutationResponse,
} from "../types/clan-categories";

export class ClanCategoriesClient extends BaseApiClient {
  list(serverId: string): Promise<ApiResponse<ClanCategoriesResponse>> {
    return this.executeEndpoint(ClanCategoriesEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
  }

  create(serverId: string, name: string): Promise<ApiResponse<ClanCategoryMutationResponse>> {
    return this.executeEndpoint(CreateClanCategoryEndpoint, {
      path: { serverId },
      query: {},
      body: { name },
    });
  }

  rename(
    serverId: string,
    categoryId: string,
    name: string,
  ): Promise<ApiResponse<ClanCategoryMutationResponse>> {
    return this.executeEndpoint(RenameClanCategoryEndpoint, {
      path: { serverId, categoryId },
      query: {},
      body: { name },
    });
  }

  reorder(
    serverId: string,
    categoryIds: string[],
  ): Promise<ApiResponse<ClanCategoriesResponse>> {
    return this.executeEndpoint(ReorderClanCategoriesEndpoint, {
      path: { serverId },
      query: {},
      body: { categoryIds },
    });
  }

  previewDelete(
    serverId: string,
    categoryId: string,
  ): Promise<ApiResponse<ClanCategoryDeletePreview>> {
    return this.executeEndpoint(PreviewClanCategoryDeleteEndpoint, {
      path: { serverId, categoryId },
      query: {},
      body: {},
    });
  }

  delete(
    serverId: string,
    categoryId: string,
  ): Promise<ApiResponse<ClanCategoryDeleteResponse>> {
    return this.executeEndpoint(DeleteClanCategoryEndpoint, {
      path: { serverId, categoryId },
      query: {},
      body: {},
    });
  }
}
