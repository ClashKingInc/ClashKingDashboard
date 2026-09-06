/**
 * Server/Guild API client
 */

import {
  AddServerBanEndpoint,
  AddServerStrikeEndpoint,
  BotGuildProfileEndpoint,
  ClanSettingsEndpoint,
  CreateServerGiveawayEndpoint,
  DashboardAccessEndpoint,
  DashboardCapabilitiesEndpoint,
  DeleteServerGiveawayEndpoint,
  DiscordRolesEndpoint,
  GiveawayEntriesEndpoint,
  GuildEndpoint,
  GuildsEndpoint,
  PlayerStrikeSummaryEndpoint,
  ReactivateServerEndpoint,
  RemoveServerBanEndpoint,
  RemoveServerStrikeEndpoint,
  RerollGiveawayEndpoint,
  SaveServerLogsEndpoint,
  SearchBannedPlayersEndpoint,
  ServerBansEndpoint,
  ServerChannelsEndpoint,
  ServerClansEndpoint,
  ServerGiveawaysEndpoint,
  ServerLinksEndpoint,
  ServerLogsEndpoint,
  ServerSettingsEndpoint,
  ServerStrikesEndpoint,
  ServerThreadsEndpoint,
  UpdateBotGuildProfileEndpoint,
  UpdateClanSettingsEndpoint,
  UpdateDashboardAccessEndpoint,
  UpdateEmbedColorEndpoint,
  UpdateServerGiveawayEndpoint,
  UpdateServerSettingsEndpoint,
  type EndpointRequest,
} from "@clashking/api-contracts";

import { BaseApiClient } from "../core/base-client";
import type { ApiResponse, PaginatedResponse } from "../types/common";
import type {
  BanRequest,
  BanResponse,
  BannedPlayer,
  ClanSettings,
  ClanSettingsResponse,
  ClanSettingsUpdate,
  DiscordRole,
  GiveawayEntriesResponse,
  GiveawayMutationResponse,
  GiveawayRerollResponse,
  GiveawaysResponse,
  GuildInfo,
  GuildDetails,
  SearchBannedPlayersResponse,
  ServerClanListItem,
  ServerLinksResponse,
  ServerSettings,
  ServerSettingsResponse,
  ServerSettingsUpdate,
  Strike,
  StrikeAddResponse,
  StrikeDeleteResponse,
  StrikeRequest,
  StrikeSummary,
} from "../types/server";
import type {
  BotGuildProfile,
  BotGuildProfileUpdate,
  DashboardAccessConfig,
  DashboardAccessGrant,
  DashboardCapabilities,
} from "../types/dashboard-access";

function failedResponse(response: ApiResponse<unknown>): ApiResponse<never> {
  return {
    error: response.error,
    errorData: response.errorData,
    status: response.status,
  };
}

export class ServerClient extends BaseApiClient {
  async getDashboardCapabilities(
    serverId: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse<DashboardCapabilities>> {
    return this.executeEndpoint(DashboardCapabilitiesEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    }, { signal });
  }

  async getDashboardAccess(serverId: string): Promise<ApiResponse<DashboardAccessConfig>> {
    return this.executeEndpoint(DashboardAccessEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
  }

  async updateDashboardAccess(
    serverId: string,
    grants: DashboardAccessGrant[],
  ): Promise<ApiResponse<DashboardAccessConfig>> {
    return this.executeEndpoint(UpdateDashboardAccessEndpoint, {
      path: { serverId },
      query: {},
      body: { grants },
    });
  }

  async getBotGuildProfile(serverId: string): Promise<ApiResponse<BotGuildProfile>> {
    return this.executeEndpoint(BotGuildProfileEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
  }

  async updateBotGuildProfile(
    serverId: string,
    profile: BotGuildProfileUpdate,
  ): Promise<ApiResponse<BotGuildProfile>> {
    return this.executeEndpoint(UpdateBotGuildProfileEndpoint, {
      path: { serverId },
      query: {},
      body: profile,
    });
  }

  async getGuilds(signal?: AbortSignal): Promise<ApiResponse<GuildInfo[]>> {
    const response = await this.executeEndpoint(
      GuildsEndpoint,
      { path: {}, query: {}, body: {} },
      { signal },
    );
    if (!response.data) return failedResponse(response);
    return { data: [...response.data], status: response.status };
  }

  async getGuild(guildId: string, signal?: AbortSignal): Promise<ApiResponse<GuildDetails>> {
    return this.executeEndpoint(GuildEndpoint, {
      path: { guildId },
      query: {},
      body: {},
    }, { signal });
  }

  async reactivateServer(serverId: string): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(ReactivateServerEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
  }

  async getSettings(
    serverId: string,
    clanSettings = false,
    signal?: AbortSignal,
  ): Promise<ApiResponse<ServerSettings>> {
    return this.executeEndpoint(ServerSettingsEndpoint, {
      path: { serverId },
      query: { clan_settings: clanSettings },
      body: {},
    }, { signal });
  }

  async updateSettings(
    serverId: string,
    settings: ServerSettingsUpdate,
  ): Promise<ApiResponse<ServerSettingsResponse>> {
    return this.executeEndpoint(UpdateServerSettingsEndpoint, {
      path: { serverId },
      query: {},
      body: settings,
    });
  }

  async getClanSettings(serverId: string, clanTag: string): Promise<ApiResponse<ClanSettings>> {
    return this.executeEndpoint(ClanSettingsEndpoint, {
      path: { serverId, clanTag },
      query: {},
      body: {},
    });
  }

  async updateClanSettings(
    serverId: string,
    clanTag: string,
    settings: ClanSettingsUpdate,
  ): Promise<ApiResponse<ClanSettingsResponse>> {
    return this.executeEndpoint(UpdateClanSettingsEndpoint, {
      path: { serverId, clanTag },
      query: {},
      body: settings,
    });
  }

  async getServerClans(
    serverId: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse<ServerClanListItem[]>> {
    const response = await this.executeEndpoint(ServerClansEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    }, { signal });
    if (!response.data) return failedResponse(response);
    return { data: [...response.data], status: response.status };
  }

  async updateEmbedColor(
    serverId: string,
    hexCode: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(UpdateEmbedColorEndpoint, {
      path: { serverId, hexCode },
      query: {},
      body: {},
    });
  }

  async getBans(
    serverId: string,
    userId?: string,
  ): Promise<ApiResponse<PaginatedResponse<BannedPlayer>>> {
    const response = await this.executeEndpoint(ServerBansEndpoint, {
      path: { serverId },
      query: userId === undefined ? {} : { user_id: userId },
      body: {},
    });
    if (!response.data) return failedResponse(response);
    return {
      data: { items: [...response.data.items] },
      status: response.status,
    };
  }

  async addBan(
    serverId: string,
    playerTag: string,
    data: BanRequest,
    userId?: string,
  ): Promise<ApiResponse<BanResponse>> {
    return this.executeEndpoint(AddServerBanEndpoint, {
      path: { serverId, playerTag },
      query: userId === undefined ? {} : { user_id: userId },
      body: data,
    });
  }

  async removeBan(
    serverId: string,
    playerTag: string,
    userId?: string,
  ): Promise<ApiResponse<BanResponse>> {
    return this.executeEndpoint(RemoveServerBanEndpoint, {
      path: { serverId, playerTag },
      query: userId === undefined ? {} : { user_id: userId },
      body: {},
    });
  }

  async searchBannedPlayers(
    guildId: string,
    query: string,
  ): Promise<ApiResponse<SearchBannedPlayersResponse>> {
    return this.executeEndpoint(SearchBannedPlayersEndpoint, {
      path: { guildId },
      query: { query },
      body: {},
    });
  }

  async getLogsConfig(serverId: string) {
    return this.executeEndpoint(ServerLogsEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
  }

  async saveLogsConfig(serverId: string, logsConfig: EndpointRequest<typeof SaveServerLogsEndpoint>["body"]) {
    return this.executeEndpoint(SaveServerLogsEndpoint, {
      path: { serverId },
      query: {},
      body: logsConfig,
    });
  }

  async getChannels(serverId: string, signal?: AbortSignal) {
    return this.executeEndpoint(ServerChannelsEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    }, { signal });
  }

  async getThreads(serverId: string, signal?: AbortSignal) {
    return this.executeEndpoint(ServerThreadsEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    }, { signal });
  }

  async getServerLinks(
    serverId: string,
    params?: { limit?: number; offset?: number; query?: string; account_filter?: "none" },
  ): Promise<ApiResponse<ServerLinksResponse>> {
    return this.executeEndpoint(ServerLinksEndpoint, {
      path: { serverId },
      query: params ?? {},
      body: {},
    });
  }

  async getStrikes(
    serverId: string,
    playerTag?: string,
    viewExpired = false,
  ): Promise<ApiResponse<PaginatedResponse<Strike>>> {
    const response = await this.executeEndpoint(ServerStrikesEndpoint, {
      path: { serverId },
      query: {
        ...(playerTag === undefined ? {} : { player_tag: playerTag }),
        view_expired: viewExpired,
      },
      body: {},
    });
    if (!response.data) return failedResponse(response);
    return {
      data: { items: [...response.data.items] },
      status: response.status,
    };
  }

  async addStrike(
    serverId: string,
    playerTag: string,
    data: StrikeRequest,
  ): Promise<ApiResponse<StrikeAddResponse>> {
    return this.executeEndpoint(AddServerStrikeEndpoint, {
      path: { serverId, playerTag },
      query: {},
      body: data,
    });
  }

  async removeStrike(
    serverId: string,
    strikeId: string,
  ): Promise<ApiResponse<StrikeDeleteResponse>> {
    return this.executeEndpoint(RemoveServerStrikeEndpoint, {
      path: { serverId, strikeId },
      query: {},
      body: {},
    });
  }

  async getPlayerStrikeSummary(
    serverId: string,
    playerTag: string,
  ): Promise<ApiResponse<StrikeSummary>> {
    return this.executeEndpoint(PlayerStrikeSummaryEndpoint, {
      path: { serverId, playerTag },
      query: {},
      body: {},
    });
  }

  async getDiscordRoles(serverId: string): Promise<ApiResponse<{ roles: DiscordRole[] }>> {
    const response = await this.executeEndpoint(DiscordRolesEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
    if (!response.data) return failedResponse(response);
    return { data: { roles: [...response.data.roles] }, status: response.status };
  }

  async getGiveaways(serverId: string): Promise<ApiResponse<GiveawaysResponse>> {
    return this.executeEndpoint(ServerGiveawaysEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
  }

  async createGiveaway(
    serverId: string,
    body: FormData,
  ): Promise<ApiResponse<GiveawayMutationResponse>> {
    return this.executeEndpoint(CreateServerGiveawayEndpoint, {
      path: { serverId },
      query: {},
      body,
    });
  }

  async updateGiveaway(
    serverId: string,
    giveawayId: string,
    body: FormData,
  ): Promise<ApiResponse<GiveawayMutationResponse>> {
    return this.executeEndpoint(UpdateServerGiveawayEndpoint, {
      path: { serverId, giveawayId },
      query: {},
      body,
    });
  }

  async deleteGiveaway(
    serverId: string,
    giveawayId: string,
  ): Promise<ApiResponse<GiveawayMutationResponse>> {
    return this.executeEndpoint(DeleteServerGiveawayEndpoint, {
      path: { serverId, giveawayId },
      query: {},
      body: {},
    });
  }

  async getGiveawayEntries(
    serverId: string,
    giveawayId: string,
  ): Promise<ApiResponse<GiveawayEntriesResponse>> {
    return this.executeEndpoint(GiveawayEntriesEndpoint, {
      path: { serverId, giveawayId },
      query: {},
      body: {},
    });
  }

  async rerollGiveaway(
    serverId: string,
    giveawayId: string,
    userIdsToReplace: string[],
  ): Promise<ApiResponse<GiveawayRerollResponse>> {
    return this.executeEndpoint(RerollGiveawayEndpoint, {
      path: { serverId, giveawayId },
      query: {},
      body: { user_ids_to_replace: userIdsToReplace },
    });
  }
}
