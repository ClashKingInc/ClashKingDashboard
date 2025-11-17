/**
 * Server/Guild API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse, PaginatedResponse } from '../types/common';
import type { ServerSettings, ServerSettingsUpdate, ServerSettingsResponse, ClanSettings, BanRequest, DiscordChannel, DiscordRole, GuildInfo } from '../types/server';

export class ServerClient extends BaseApiClient {
  /**
   * GET /v2/guilds
   * Get all guilds the authenticated user has access to
   */
  async getGuilds(): Promise<ApiResponse<GuildInfo[]>> {
    return this.request('/v2/guilds', { method: 'GET' });
  }

  /**
   * GET /v2/guild/{guild_id}
   * Get information for a specific guild
   */
  async getGuild(guildId: string): Promise<ApiResponse<GuildInfo>> {
    return this.request(`/v2/guild/${guildId}`, { method: 'GET' });
  }
  /**
   * GET /v2/server/{server_id}/settings
   */
  async getSettings(serverId: string | number, clanSettings = false): Promise<ApiResponse<ServerSettings>> {
    const query = this.buildQueryString({ clan_settings: clanSettings });
    return this.request(`/v2/server/${serverId}/settings${query}`, { method: 'GET' });
  }

  /**
   * PATCH /v2/server/{server_id}/settings
   */
  async updateSettings(serverId: string | number, settings: ServerSettingsUpdate): Promise<ApiResponse<ServerSettingsResponse>> {
    return this.request(`/v2/server/${serverId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  /**
   * GET /v2/server/{server_id}/clan/{clan_tag}/settings
   */
  async getClanSettings(serverId: string | number, clanTag: string): Promise<ApiResponse<ClanSettings>> {
    return this.request(`/v2/server/${serverId}/clan/${clanTag}/settings`, { method: 'GET' });
  }

  /**
   * PUT /v2/server/{server_id}/embed-color/{hex_code}
   */
  async updateEmbedColor(serverId: string | number, hexCode: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/embed-color/${hexCode}`, { method: 'PUT' });
  }

  /**
   * GET /v2/ban/list/{server_id}
   */
  async getBans(serverId: string | number): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request(`/v2/ban/list/${serverId}`, { method: 'GET' });
  }

  /**
   * POST /v2/ban/add/{server_id}/{player_tag}
   */
  async addBan(serverId: string | number, playerTag: string, data: BanRequest): Promise<ApiResponse<{ status: string; player_tag: string; server_id: number }>> {
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
  async getLogsConfig(serverId: string | number): Promise<ApiResponse<any>> {
    return this.request(`/v2/server/${serverId}/logs`, { method: 'GET' });
  }

  /**
   * PUT /v2/server/{server_id}/logs
   */
  async saveLogsConfig(serverId: string | number, logsConfig: any): Promise<ApiResponse<any>> {
    return this.request(`/v2/server/${serverId}/logs`, {
      method: 'PUT',
      body: JSON.stringify(logsConfig),
    });
  }

  /**
   * GET /v2/server/{server_id}/channels
   */
  async getChannels(serverId: string | number): Promise<ApiResponse<any>> {
    return this.request(`/v2/server/${serverId}/channels`, { method: 'GET' });
  }
}
