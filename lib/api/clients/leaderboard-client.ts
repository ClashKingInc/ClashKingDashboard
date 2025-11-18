/**
 * Leaderboard API Client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type {
  LeaderboardResponse,
  LeaderboardQueryParams,
  LeaderboardCategory,
  LeaderboardEntityType,
} from '../types/leaderboard';

export class LeaderboardClient extends BaseApiClient {
  /**
   * Fetch leaderboard data for players or clans
   */
  async getLeaderboard(
    category: LeaderboardCategory,
    entityType: LeaderboardEntityType,
    params: LeaderboardQueryParams
  ): Promise<ApiResponse<LeaderboardResponse>> {
    const queryString = this.buildQueryString({
      weekend: params.weekend,
      type: params.type,
      league: params.league,
      lower: params.lower,
      upper: params.upper,
    });

    return this.request<LeaderboardResponse>(
      `/api/v1/leaderboard/${entityType}/${category}${queryString}`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Fetch player leaderboard for capital raids
   */
  async getPlayerCapitalLeaderboard(params: LeaderboardQueryParams): Promise<ApiResponse<LeaderboardResponse>> {
    return this.getLeaderboard('capital', 'players', params);
  }

  /**
   * Fetch clan leaderboard for capital raids
   */
  async getClanCapitalLeaderboard(params: LeaderboardQueryParams): Promise<ApiResponse<LeaderboardResponse>> {
    return this.getLeaderboard('capital', 'clans', params);
  }
}
