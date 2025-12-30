/**
 * Server/Guild API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse, PaginatedResponse } from '../types/common';
import type { ServerSettings, ServerSettingsUpdate, ServerSettingsResponse, ClanSettings, BanRequest, BannedPlayer, DiscordChannel, DiscordRole, GuildInfo, BotInfo, StrikeRequest, Strike, StrikeAddResponse, StrikeDeleteResponse, StrikeSummary } from '../types/server';

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
   * GET /v2/internal/bot/info
   * Get bot information and status
   */
  async getBotInfo(): Promise<ApiResponse<BotInfo>> {
    return this.request('/v2/internal/bot/info', { method: 'GET' });
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
   * GET /v2/server/{server_id}/bans
   * Get all bans for a server
   */
  async getBans(serverId: string | number, userId?: string): Promise<ApiResponse<PaginatedResponse<BannedPlayer>>> {
    const query = userId ? this.buildQueryString({ user_id: userId }) : '';
    return this.request(`/v2/server/${serverId}/bans${query}`, { method: 'GET' });
  }

  /**
   * POST /v2/server/{server_id}/bans/{player_tag}
   * Add or update a ban for a player
   */
  async addBan(serverId: string | number, playerTag: string, data: BanRequest, userId?: string): Promise<ApiResponse<{ status: string; player_tag: string; server_id: number }>> {
    const query = userId ? this.buildQueryString({ user_id: userId }) : '';
    return this.request(`/v2/server/${serverId}/bans/${playerTag}${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE /v2/server/{server_id}/bans/{player_tag}
   * Remove a ban for a player
   */
  async removeBan(serverId: string, playerTag: string, userId?: string): Promise<ApiResponse<{ status: string; player_tag: string; server_id: string }>> {
    const query = userId ? this.buildQueryString({ user_id: userId }) : '';
    return this.request(`/v2/server/${serverId}/bans/${playerTag}${query}`, { method: 'DELETE' });
  }

  /**
   * GET /v2/search/{guild_id}/banned-players
   */
  async searchBannedPlayers(guildId: number, query: string): Promise<ApiResponse<PaginatedResponse<BannedPlayer>>> {
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

  /**
   * GET /v2/server/{server_id}/links
   * Get all links for a server with pagination
   */
  async getServerLinks(serverId: string | number, params?: { limit?: number; offset?: number; search?: string }): Promise<ApiResponse<PaginatedResponse<any>>> {
    const query = params ? this.buildQueryString(params) : '';
    return this.request(`/v2/server/${serverId}/links${query}`, { method: 'GET' });
  }

  /**
   * GET /v2/server/{server_id}/strikes
   * Get all strikes for a server (optionally filtered by player)
   */
  async getStrikes(serverId: string | number, playerTag?: string, viewExpired: boolean = false): Promise<ApiResponse<PaginatedResponse<Strike>>> {
    const params: any = { view_expired: viewExpired };
    if (playerTag) params.player_tag = playerTag;
    const query = this.buildQueryString(params);
    return this.request(`/v2/server/${serverId}/strikes${query}`, { method: 'GET' });
  }

  /**
   * POST /v2/server/{server_id}/strikes/{player_tag}
   * Add a strike to a player
   */
  async addStrike(serverId: string | number, playerTag: string, data: StrikeRequest): Promise<ApiResponse<StrikeAddResponse>> {
    return this.request(`/v2/server/${serverId}/strikes/${playerTag}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE /v2/server/{server_id}/strikes/{strike_id}
   * Remove a strike by ID
   */
  async removeStrike(serverId: string | number, strikeId: string): Promise<ApiResponse<StrikeDeleteResponse>> {
    return this.request(`/v2/server/${serverId}/strikes/${strikeId}`, { method: 'DELETE' });
  }

  /**
   * GET /v2/server/{server_id}/strikes/player/{player_tag}/summary
   * Get strike summary for a specific player
   */
  async getPlayerStrikeSummary(serverId: string | number, playerTag: string): Promise<ApiResponse<StrikeSummary>> {
    return this.request(`/v2/server/${serverId}/strikes/player/${playerTag}/summary`, { method: 'GET' });
  }
}
