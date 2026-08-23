/**
 * Player API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse, PaginatedResponse } from '../types/common';
import type {
  PlayerLocation,
  PlayerSorted,
  PlayerSummaryTop,
} from '../types/player';

export class PlayerClient extends BaseApiClient {
  /**
   * POST /v2/players/location
   */
  async getLocations(playerTags: string[]): Promise<ApiResponse<PaginatedResponse<PlayerLocation>>> {
    return this.request('/v2/players/location', {
      method: 'POST',
      body: JSON.stringify({ player_tags: playerTags }),
    });
  }

  /**
   * POST /v2/players/sorted/{attribute}
   */
  async getSorted(attribute: string, playerTags: string[]): Promise<ApiResponse<PaginatedResponse<PlayerSorted>>> {
    return this.request(`/v2/players/sorted/${attribute}`, {
      method: 'POST',
      body: JSON.stringify({ player_tags: playerTags }),
    });
  }

  /**
   * POST /v2/players/summary/{season}/top
   */
  async getSummaryTop(season: string, playerTags: string[], limit = 10): Promise<ApiResponse<PaginatedResponse<PlayerSummaryTop>>> {
    const query = this.buildQueryString({ limit });
    return this.request(`/v2/players/summary/${season}/top${query}`, {
      method: 'POST',
      body: JSON.stringify({ player_tags: playerTags }),
    });
  }

  /**
   * GET /proxy/v1/players/{player_tag}
   * Get player information from COC wrapper
   */
  async getPlayerInfo(playerTag: string): Promise<ApiResponse<{ name: string; tag: string; townHallLevel?: number }>> {
    return this.request(`/proxy/v1/players/${encodeURIComponent(playerTag)}`, {
      method: 'GET',
    });
  }
}
