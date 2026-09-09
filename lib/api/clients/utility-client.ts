/** Utility API client backed by the shared endpoint contracts. */

import {
  DashboardCurrentDatesEndpoint,
  DashboardRaidWeekendDatesEndpoint,
  DashboardSeasonBoundsEndpoint,
  DashboardSeasonDatesEndpoint,
  DashboardSeasonRaidDatesEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from "../core/base-client";
import type { ApiResponse } from "../types/common";

function mapData<A, B>(response: ApiResponse<A>, transform: (data: A) => B): ApiResponse<B> {
  if (response.data === undefined) {
    const { data: _data, ...rest } = response;
    return rest;
  }
  return { ...response, data: transform(response.data) };
}

export class UtilityClient extends BaseApiClient {
  async getSeasonDates(
    numberOfSeasons = 0,
    asText = false,
  ) {
    const response = await this.executeEndpoint(DashboardSeasonDatesEndpoint, {
      path: {},
      query: { number_of_seasons: numberOfSeasons, as_text: asText },
      body: {},
    });
    return mapData(response, (data) => ({ ...data, items: [...data.items] }));
  }

  async getRaidWeekendDates(numberOfWeeks = 0) {
    const response = await this.executeEndpoint(DashboardRaidWeekendDatesEndpoint, {
      path: {},
      query: { number_of_weeks: numberOfWeeks },
      body: {},
    });
    return mapData(response, (data) => ({ ...data, items: [...data.items] }));
  }

  async getCurrentDates() {
    return this.executeEndpoint(DashboardCurrentDatesEndpoint, {
      path: {},
      query: {},
      body: {},
    });
  }

  async getSeasonStartEnd(
    season = "",
    goldPassSeason = false,
  ) {
    return this.executeEndpoint(DashboardSeasonBoundsEndpoint, {
      path: {},
      query: { season, gold_pass_season: goldPassSeason },
      body: {},
    });
  }

  async getSeasonRaidDates(season = "") {
    const response = await this.executeEndpoint(DashboardSeasonRaidDatesEndpoint, {
      path: {},
      query: { season },
      body: {},
    });
    return mapData(response, (data) => ({ ...data, items: [...data.items] }));
  }
}
