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
    return this.request(`/v2/server/${serverId}/clan-categories`, { method: "GET" });
  }

  create(serverId: string, name: string): Promise<ApiResponse<ClanCategoryMutationResponse>> {
    return this.request(`/v2/server/${serverId}/clan-categories`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  rename(
    serverId: string,
    categoryId: string,
    name: string,
  ): Promise<ApiResponse<ClanCategoryMutationResponse>> {
    return this.request(
      `/v2/server/${serverId}/clan-categories/${encodeURIComponent(categoryId)}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
    );
  }

  previewDelete(
    serverId: string,
    categoryId: string,
  ): Promise<ApiResponse<ClanCategoryDeletePreview>> {
    return this.request(
      `/v2/server/${serverId}/clan-categories/${encodeURIComponent(categoryId)}/delete-preview`,
      { method: "GET" },
    );
  }

  delete(
    serverId: string,
    categoryId: string,
  ): Promise<ApiResponse<ClanCategoryDeleteResponse>> {
    return this.request(
      `/v2/server/${serverId}/clan-categories/${encodeURIComponent(categoryId)}`,
      { method: "DELETE" },
    );
  }
}
