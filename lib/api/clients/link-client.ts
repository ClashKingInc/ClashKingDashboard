/**
 * Account linking API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type { CocAccountRequest, LinkedAccountsResponse } from '../types/link';

const encodePathSegment = (value: string): string => encodeURIComponent(value);
const toLinkAccountPayload = (data: CocAccountRequest): CocAccountRequest => ({
  player_tag: data.player_tag,
  ...(data.api_token ? { api_token: data.api_token } : {}),
});

export class LinkClient extends BaseApiClient {
  /**
   * POST /v2/links/{id}
   */
  async linkAccount(id: string, data: CocAccountRequest): Promise<ApiResponse<any>> {
    return this.request(`/v2/links/${encodePathSegment(id)}`, {
      method: 'POST',
      body: JSON.stringify(toLinkAccountPayload(data)),
    });
  }

  /**
   * GET /v2/links/{id}
   */
  async getLinkedAccounts(id: string): Promise<ApiResponse<LinkedAccountsResponse>> {
    return this.request(`/v2/links/${encodePathSegment(id)}`, { method: 'GET' });
  }

  /**
   * DELETE /v2/links/{id}/{player_tag}
   */
  async unlinkAccount(id: string, playerTag: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/links/${encodePathSegment(id)}/${encodePathSegment(playerTag)}`, { method: 'DELETE' });
  }

  /**
   * PUT /v2/links/{id}/order
   */
  async reorderAccounts(id: string, orderedTags: string[]): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/links/${encodePathSegment(id)}/order`, {
      method: 'PUT',
      body: JSON.stringify({ ordered_tags: orderedTags }),
    });
  }
}
