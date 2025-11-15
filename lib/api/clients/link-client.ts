/**
 * Account linking API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type { CocAccountRequest } from '../types/link';

export class LinkClient extends BaseApiClient {
  /**
   * POST /v2/link
   */
  async linkAccount(data: CocAccountRequest): Promise<ApiResponse<any>> {
    return this.request('/v2/link', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/link/no-auth
   */
  async linkAccountNoAuth(userId: string, data: CocAccountRequest): Promise<ApiResponse<any>> {
    return this.request(`/v2/link/no-auth`, {
      method: 'POST',
      body: JSON.stringify({ ...data, user_id: userId }),
    });
  }

  /**
   * GET /v2/links/{tag_or_id}
   */
  async getLinkedAccounts(tagOrId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/v2/links/${tagOrId}`, { method: 'GET' });
  }

  /**
   * DELETE /v2/link/{tag}
   */
  async unlinkAccount(tag: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/link/${tag}`, { method: 'DELETE' });
  }

  /**
   * DELETE /v2/link/no-auth/{tag}
   */
  async unlinkAccountNoAuth(tag: string, apiToken: string): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ api_token: apiToken });
    return this.request(`/v2/link/no-auth/${tag}${query}`, { method: 'DELETE' });
  }

  /**
   * PUT /v2/links/reorder
   */
  async reorderAccounts(orderedTags: string[]): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v2/links/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ordered_tags: orderedTags }),
    });
  }
}
