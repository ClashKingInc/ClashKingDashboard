/**
 * Server/Guild API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse, PaginatedResponse } from '../types/common';
import type { ServerSettings, ClanSettings, BanRequest } from '../types/server';

export class ServerClient extends BaseApiClient {
  /**
   * GET /v2/server/{server_id}/settings
   */
  async getSettings(serverId: number, clanSettings = false): Promise<ApiResponse<ServerSettings>> {
    const query = this.buildQueryString({ clan_settings: clanSettings });
    return this.request(`/v2/server/${serverId}/settings${query}`, { method: 'GET' });
  }

  /**
   * GET /v2/server/{server_id}/clan/{clan_tag}/settings
   */
  async getClanSettings(serverId: number, clanTag: string): Promise<ApiResponse<ClanSettings>> {
    return this.request(`/v2/server/${serverId}/clan/${clanTag}/settings`, { method: 'GET' });
  }

  /**
   * PUT /v2/server/{server_id}/embed-color/{hex_code}
   */
  async updateEmbedColor(serverId: number, hexCode: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/embed-color/${hexCode}`, { method: 'PUT' });
  }

  /**
   * GET /v2/ban/list/{server_id}
   */
  async getBans(serverId: number): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request(`/v2/ban/list/${serverId}`, { method: 'GET' });
  }

  /**
   * POST /v2/ban/add/{server_id}/{player_tag}
   */
  async addBan(serverId: number, playerTag: string, data: BanRequest): Promise<ApiResponse<{ status: string; player_tag: string; server_id: number }>> {
    return this.request(`/v2/ban/add/${serverId}/${playerTag}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE /v2/ban/remove/{server_id}/{player_tag}
   */
  async removeBan(serverId: string, playerTag: string): Promise<ApiResponse<{ status: string; player_tag: string; server_id: string }>> {
    return this.request(`/v2/ban/remove/${serverId}/${playerTag}`, { method: 'DELETE' });
  }

  /**
   * GET /v2/search/{guild_id}/banned-players
   */
  async searchBannedPlayers(guildId: number, query: string): Promise<ApiResponse<PaginatedResponse<any>>> {
    const params = this.buildQueryString({ query });
    return this.request(`/v2/search/${guildId}/banned-players${params}`, { method: 'GET' });
  }

  /**
   * GET /v2/server/{server_id}/logs
   */
  async getLogsConfig(serverId: number): Promise<ApiResponse<any>> {
    return this.request(`/v2/server/${serverId}/logs`, { method: 'GET' });
  }

  /**
   * PUT /v2/server/{server_id}/logs
   */
  async saveLogsConfig(serverId: number, logsConfig: any): Promise<ApiResponse<any>> {
    return this.request(`/v2/server/${serverId}/logs`, {
      method: 'PUT',
      body: JSON.stringify(logsConfig),
    });
  }

  /**
   * GET /v2/server/{server_id}/channels
   */
  async getChannels(serverId: number): Promise<ApiResponse<any>> {
    return this.request(`/v2/server/${serverId}/channels`, { method: 'GET' });
  }
}
