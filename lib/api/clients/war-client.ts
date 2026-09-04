/** War API client backed by the shared endpoint contracts. */

import {
  BotCwlGroupEndpoint,
  BotCwlRankingHistoryEndpoint,
  ClanCwlSeasonsEndpoint,
  CwlSummaryExportEndpoint,
  DashboardCwlBonusRecipientsEndpoint,
  DashboardReplaceCwlBonusRecipientsEndpoint,
  PlayerWarStatsExportEndpoint,
  ProxyCurrentWarEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from "../core/base-client";
import type { ApiResponse } from "../types/common";
import type {
  CwlBonusRecipient,
  CwlGroupResponse,
  CwlSeasonItem,
  PlayerWarhitsFilter,
} from "../types/war";

function mapData<A, B>(response: ApiResponse<A>, transform: (data: A) => B): ApiResponse<B> {
  if (response.data === undefined) {
    const { data: _data, ...rest } = response;
    return rest;
  }
  return { ...response, data: transform(response.data) };
}


export class WarClient extends BaseApiClient {
  async getCurrentWar(clanTag: string) {
    return this.executeEndpoint(ProxyCurrentWarEndpoint, {
      path: { clanTag },
      query: {},
      body: {},
    });
  }

  async getCwlRankingHistory(clanTag: string) {
    const response = await this.executeEndpoint(BotCwlRankingHistoryEndpoint, {
      path: { tag: clanTag },
      query: {},
      body: {},
    });
    return mapData(response, (data) => ({ ...data, items: [...data.items] }));
  }

  async getCwlSeasons(clanTag: string): Promise<ApiResponse<{ items: CwlSeasonItem[] }>> {
    const response = await this.executeEndpoint(ClanCwlSeasonsEndpoint, {
      path: { clanTag },
      query: {},
      body: {},
    });
    return mapData(response, (data) => ({ items: [...data.items] }));
  }

  async getStoredCwl(clanTag: string, season?: string): Promise<ApiResponse<CwlGroupResponse>> {
    const response = await this.executeEndpoint(BotCwlGroupEndpoint, {
      path: { tag: clanTag },
      query: season === undefined ? {} : { season },
      body: {},
    });
    return mapData(response, (data) => ({
      ...data,
      clans: data.clans.map((clan) => ({ ...clan, members: [...clan.members] })),
      rounds: data.rounds.map((round) => ({ warTags: [...round.warTags] })),
    }));
  }

  async getCwlBonusRecipients(
    serverId: string,
    clanTag: string,
    season: string,
  ): Promise<ApiResponse<{ items: CwlBonusRecipient[] }>> {
    const response = await this.executeEndpoint(DashboardCwlBonusRecipientsEndpoint, {
      path: { serverId, clanTag },
      query: { season },
      body: {},
    });
    return mapData(response, (data) => ({ items: [...data.items] }));
  }

  async replaceCwlBonusRecipients(
    serverId: string,
    clanTag: string,
    season: string,
    recipients: CwlBonusRecipient[],
  ): Promise<ApiResponse<{ items: CwlBonusRecipient[] }>> {
    const response = await this.executeEndpoint(DashboardReplaceCwlBonusRecipientsEndpoint, {
      path: { serverId, clanTag },
      query: { season },
      body: { recipients },
    });
    return mapData(response, (data) => ({ items: [...data.items] }));
  }

  async exportCwlSummary(clanTag: string): Promise<Blob> {
    const response = await this.executeEndpoint(CwlSummaryExportEndpoint, {
      path: {},
      query: { tag: clanTag },
      body: {},
    });
    if (!response.data) throw new Error(response.error ?? "CWL summary export failed");
    return response.data.blob();
  }

  async exportPlayerStats(filter: PlayerWarhitsFilter): Promise<Blob> {
    const response = await this.executeEndpoint(PlayerWarStatsExportEndpoint, {
      path: {},
      query: {},
      body: filter,
    });
    if (!response.data) throw new Error(response.error ?? "Player stats export failed");
    return response.data.blob();
  }
}
