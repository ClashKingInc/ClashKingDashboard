/** Clan API client backed by the shared endpoint contracts. */

import {
  BotClanRankingsEndpoint,
  DashboardClanSearchEndpoint,
  ProxyClanEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from "../core/base-client";
import type { ApiResponse, PaginatedResponse } from "../types/common";
import type { ClanRanking, ClanSearchResult } from "../types/clan";

export class ClanClient extends BaseApiClient {
  async getClanInfo(clanTag: string) {
    return this.executeEndpoint(ProxyClanEndpoint, {
      path: { clanTag },
      query: {},
      body: {},
    });
  }

  /** Uses the canonical plural `/v2/clan/:clanTag/rankings` route. */
  async getRanking(clanTag: string): Promise<ApiResponse<ClanRanking>> {
    return this.executeEndpoint(BotClanRankingsEndpoint, {
      path: { tag: clanTag },
      query: {},
      body: {},
    });
  }

  /** Uses canonical `/v2/clan/search`; legacy user/guild hints no longer affect search. */
  async search(
    query: string,
    _userId?: string,
    _guildId?: string,
  ): Promise<ApiResponse<PaginatedResponse<ClanSearchResult>>> {
    const response = await this.executeEndpoint(DashboardClanSearchEndpoint, {
      path: {},
      query: { query },
      body: {},
    });
    if (response.data === undefined) {
      const { data: _data, ...rest } = response;
      return rest;
    }
    return {
      ...response,
      data: { items: [...response.data.items], limit: response.data.pagination.limit },
    };
  }
}
