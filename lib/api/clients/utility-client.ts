/**
 * Utility API client (dates, legends, search, app)
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse, PaginatedResponse } from '../types/common';

export class UtilityClient extends BaseApiClient {
  // ============================================================================
  // Dates
  // ============================================================================

  async getSeasonDates(numberOfSeasons = 0, asText = false): Promise<ApiResponse<PaginatedResponse<any>>> {
    const query = this.buildQueryString({ number_of_seasons: numberOfSeasons, as_text: asText });
    return this.request(`/v2/dates/seasons${query}`, { method: 'GET' });
  }

  async getRaidWeekendDates(numberOfWeeks = 0): Promise<ApiResponse<PaginatedResponse<any>>> {
    const query = this.buildQueryString({ number_of_weeks: numberOfWeeks });
    return this.request(`/v2/dates/raid-weekends${query}`, { method: 'GET' });
  }

  async getCurrentDates(): Promise<ApiResponse<any>> {
    return this.request('/v2/dates/current', { method: 'GET' });
  }

  async getSeasonStartEnd(season = '', goldPassSeason = false): Promise<ApiResponse<{ season_start: any; season_end: any }>> {
    const query = this.buildQueryString({ season, gold_pass_season: goldPassSeason });
    return this.request(`/v2/dates/season-start-end${query}`, { method: 'GET' });
  }

  async getSeasonRaidDates(season = ''): Promise<ApiResponse<PaginatedResponse<any>>> {
    const query = this.buildQueryString({ season });
    return this.request(`/v2/dates/season-raid-dates${query}`, { method: 'GET' });
  }

  // ============================================================================
  // Legends
  // ============================================================================

  async getLegendsDay(day: string, players?: string[]): Promise<ApiResponse<any[]>> {
    const query = this.buildQueryString({ players });
    return this.request(`/v2/legends/players/day/${day}${query}`, { method: 'GET' });
  }

  async getLegendsSeason(season: string, players?: string[]): Promise<ApiResponse<any[]>> {
    const query = this.buildQueryString({ players });
    return this.request(`/v2/legends/players/season/${season}${query}`, { method: 'GET' });
  }

  // ============================================================================
  // Search
  // ============================================================================

  async bookmarkSearch(userId: number, type: number, tag: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/bookmark/${userId}/${type}/${tag}`, { method: 'POST' });
  }

  async addRecentSearch(userId: number, type: number, tag: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/recent/${userId}/${type}/${tag}`, { method: 'POST' });
  }

  async createSearchGroup(userId: number, name: string, type: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/groups/create/${userId}/${name}/${type}`, { method: 'POST' });
  }

  async addToSearchGroup(groupId: string, tag: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/groups/${groupId}/add/${tag}`, { method: 'POST' });
  }

  async removeFromSearchGroup(groupId: string, tag: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/groups/${groupId}/remove/${tag}`, { method: 'POST' });
  }

  async getSearchGroup(groupId: string): Promise<ApiResponse<any>> {
    return this.request(`/v2/search/groups/${groupId}`, { method: 'GET' });
  }

  async listSearchGroups(userId: number): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request(`/v2/search/groups/${userId}/list`, { method: 'GET' });
  }

  async deleteSearchGroup(groupId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/groups/${groupId}`, { method: 'DELETE' });
  }

  // ============================================================================
  // App
  // ============================================================================

  async getPublicConfig(): Promise<ApiResponse<{ sentry_dsn: string }>> {
    return this.request('/v2/app/public-config', { method: 'GET' });
  }

  async initializeApp(playerTags: string[]): Promise<ApiResponse<any>> {
    return this.request('/v2/app/initialization', {
      method: 'POST',
      body: JSON.stringify({ player_tags: playerTags }),
    });
  }

  // ============================================================================
  // UI
  // ============================================================================

  async getRosterDashboard(serverId: number, token: string, rosterId?: string): Promise<Response> {
    const query = this.buildQueryString({ server_id: serverId, token, roster_id: rosterId });
    const url = `${this.config.baseUrl}/ui/roster/dashboard${query}`;
    return fetch(url);
  }
}
