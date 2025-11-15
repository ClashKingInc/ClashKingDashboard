/**
 * Clan API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse, PaginatedResponse } from '../types/common';
import type {
  ClanRanking,
  ClanBoardTotals,
  ClanDonation,
  ClanComposition,
  ClanSearchResult,
} from '../types/clan';

export class ClanClient extends BaseApiClient {
  /**
   * GET /v2/clan/{clan_tag}/ranking
   */
  async getRanking(clanTag: string): Promise<ApiResponse<ClanRanking>> {
    return this.request(`/v2/clan/${clanTag}/ranking`, { method: 'GET' });
  }

  /**
   * GET /v2/clan/{clan_tag}/board/totals
   */
  async getBoardTotals(clanTag: string, playerTags: string[]): Promise<ApiResponse<ClanBoardTotals>> {
    return this.request(`/v2/clan/${clanTag}/board/totals`, {
      method: 'GET',
      body: JSON.stringify({ player_tags: playerTags }),
    });
  }

  /**
   * GET /v2/clan/{clan_tag}/donations/{season}
   */
  async getDonations(clanTag: string, season: string): Promise<ApiResponse<PaginatedResponse<ClanDonation>>> {
    return this.request(`/v2/clan/${clanTag}/donations/${season}`, { method: 'GET' });
  }

  /**
   * GET /v2/clan/compo
   */
  async getComposition(clanTags: string[]): Promise<ApiResponse<ClanComposition>> {
    const query = this.buildQueryString({ clan_tags: clanTags });
    return this.request(`/v2/clan/compo${query}`, { method: 'GET' });
  }

  /**
   * GET /v2/clan/donations/{season}
   */
  async getMultipleDonations(
    season: string,
    clanTags: string[],
    onlyCurrentMembers?: boolean
  ): Promise<ApiResponse<PaginatedResponse<ClanDonation>>> {
    const query = this.buildQueryString({
      clan_tags: clanTags,
      only_current_members: onlyCurrentMembers,
    });
    return this.request(`/v2/clan/donations/${season}${query}`, { method: 'GET' });
  }

  /**
   * GET /v2/search/clan
   */
  async search(query: string, userId?: number, guildId?: number): Promise<ApiResponse<PaginatedResponse<ClanSearchResult>>> {
    const params = this.buildQueryString({ query, user_id: userId, guild_id: guildId });
    return this.request(`/v2/search/clan${params}`, { method: 'GET' });
  }
}
