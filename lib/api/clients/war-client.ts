/**
 * War API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse, PaginatedResponse } from '../types/common';
import type { PreviousWarsOptions, ClanWarStatsOptions, PlayerWarhitsFilter } from '../types/war';

export class WarClient extends BaseApiClient {
  /**
   * GET /v2/war/{clan_tag}/previous
   */
  async getPrevious(clanTag: string, options?: PreviousWarsOptions): Promise<ApiResponse<PaginatedResponse<any>>> {
    const query = this.buildQueryString(options || {});
    return this.request(`/v2/war/${clanTag}/previous${query}`, { method: 'GET' });
  }

  /**
   * GET /v2/cwl/{clan_tag}/ranking-history
   */
  async getCwlRankingHistory(clanTag: string): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request(`/v2/cwl/${clanTag}/ranking-history`, { method: 'GET' });
  }

  /**
   * GET /v2/cwl/league-thresholds
   */
  async getCwlLeagueThresholds(): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request('/v2/cwl/league-thresholds', { method: 'GET' });
  }

  /**
   * GET /v2/war/clan/stats
   */
  async getClanStats(options: ClanWarStatsOptions): Promise<ApiResponse<any>> {
    const query = this.buildQueryString(options);
    return this.request(`/v2/war/clan/stats${query}`, { method: 'GET' });
  }

  /**
   * GET /v2/exports/war/cwl-summary
   */
  async exportCwlSummary(clanTag: string): Promise<Blob> {
    const url = `${this.config.baseUrl}/v2/exports/war/cwl-summary?tag=${clanTag}`;
    const response = await fetch(url, {
      headers: this.config.accessToken ? { Authorization: `Bearer ${this.config.accessToken}` } : {},
    });
    return response.blob();
  }

  /**
   * POST /v2/exports/war/player-stats
   */
  async exportPlayerStats(filter: PlayerWarhitsFilter): Promise<Blob> {
    const url = `${this.config.baseUrl}/v2/exports/war/player-stats`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.accessToken ? { Authorization: `Bearer ${this.config.accessToken}` } : {}),
      },
      body: JSON.stringify(filter),
    });
    return response.blob();
  }
}
