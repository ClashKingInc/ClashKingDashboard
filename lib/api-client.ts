/**
 * ClashKing API Client
 *
 * Comprehensive TypeScript client for ClashKing Dashboard API
 * API Base: https://api.clashking.xyz (or your configured base URL)
 * Branch: feat/dashboard
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ApiConfig {
  baseUrl: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Auth Types
export interface UserInfo {
  user_id: string;
  username: string;
  avatar_url: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
}

export interface EmailRegisterRequest {
  email: string;
  password: string;
  username: string;
  device_id?: string;
}

export interface EmailAuthRequest {
  email: string;
  password: string;
  device_id?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
  device_id?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  reset_code: string;
  new_password: string;
  device_id?: string;
}

// Player Types
export interface PlayerTagsRequest {
  player_tags: string[];
}

export interface PlayerLocation {
  tag: string;
  country_name: string;
  country_code: string;
}

export interface PlayerSorted {
  tag: string;
  name: string;
  value: number;
  clan?: string;
}

export interface PlayerSummaryTop {
  gold: any[];
  elixir: any[];
  dark_elixir: any[];
  activity: any[];
  attack_wins: any[];
  season_trophies: any[];
  donations: any[];
  capital_donated: any[];
  capital_raided: any[];
  war_stars: any[];
}

// Clan Types
export interface ClanRanking {
  tag: string;
  global_rank: number;
  country_code: string;
  country_name: string;
  local_rank: number;
}

export interface ClanBoardTotals {
  tag: string;
  tracked_player_count: number;
  clan_games_points: number;
  troops_donated: number;
  troops_received: number;
  clan_capital_donated: number;
  activity_metrics: any;
}

export interface ClanDonation {
  tag: string;
  donated: number;
  received: number;
}

export interface ClanComposition {
  townhall: Record<string, number>;
  trophies: any;
  location: any;
  role: any;
  league: any;
  member_count: number;
  clan_count: number;
}

// Server/Guild Types
export interface ServerSettings {
  server_id: number;
  embed_color?: string;
  clans?: any[];
  roles?: any[];
}

export interface ClanSettings {
  server_id: number;
  clan_tag: string;
  settings: any;
}

// Roster Types
export interface CreateRosterModel {
  name: string;
  roster_type: string;
  clan_tag?: string;
  alias?: string;
}

export interface RosterUpdateModel {
  min_th?: number;
  max_th?: number;
  clan_tag?: string;
  roster_type?: string;
}

export interface RosterMemberBulkOperationModel {
  add?: Array<{ player_tag: string; signup_group?: string }>;
  remove?: string[];
}

export interface UpdateMemberModel {
  signup_group?: string;
  member_status?: string;
}

export interface CreateRosterGroupModel {
  alias: string;
  description?: string;
}

export interface UpdateRosterGroupModel {
  alias?: string;
  description?: string;
}

export interface CreateRosterSignupCategoryModel {
  alias: string;
  server_id: number;
  custom_id: string;
  description?: string;
}

export interface CreateRosterAutomationModel {
  action: string;
  roster_id?: string;
  group_id?: string;
  schedule: any;
}

export interface RosterCloneModel {
  new_alias: string;
  copy_members?: boolean;
  group_id?: string;
}

// Link Types
export interface CocAccountRequest {
  player_tag: string;
  api_token: string;
  player_token?: string;
}

// Export Types
export interface PlayerWarhitsFilter {
  player_tags: string[];
  timestamp_start: number;
  timestamp_end: number;
  limit?: number;
  season?: string;
  type?: number;
  own_th?: number;
  enemy_th?: number;
  stars?: number;
  min_destruction?: number;
  max_destruction?: number;
  map_position_min?: number;
  map_position_max?: number;
  fresh_only?: boolean;
}

// Ban Types
export interface BanRequest {
  reason: string;
  added_by: string;
  image?: any;
}

// Tracking Types
export interface PlayerList {
  tags: string[];
}

// ============================================================================
// API Client Class
// ============================================================================

export class ClashKingApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.config.accessToken && !options.headers?.['Authorization']) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          error: data?.detail || data?.message || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }

  // ============================================================================
  // Authentication Endpoints
  // ============================================================================

  /**
   * POST /v2/auth/verify-email-code
   * Verify email with 6-digit code
   */
  async verifyEmailCode(email: string, code: string): Promise<ApiResponse<AuthResponse>> {
    return this.request('/v2/auth/verify-email-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  /**
   * GET /v2/auth/me
   * Get current authenticated user information
   */
  async getCurrentUser(): Promise<ApiResponse<UserInfo>> {
    return this.request('/v2/auth/me', {
      method: 'GET',
    });
  }

  /**
   * POST /v2/auth/discord
   * Authenticate with Discord OAuth
   */
  async authenticateWithDiscord(data: {
    code: string;
    code_verifier: string;
    device_id?: string;
    device_name?: string;
    redirect_uri?: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.request('/v2/auth/discord', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/refresh
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<ApiResponse<{ access_token: string }>> {
    return this.request('/v2/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/register
   * Register new user with email
   */
  async registerWithEmail(data: EmailRegisterRequest): Promise<ApiResponse<{ message: string; verification_code?: string }>> {
    return this.request('/v2/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/resend-verification
   * Resend verification email
   */
  async resendVerification(email: string): Promise<ApiResponse<{ message: string; verification_code?: string }>> {
    return this.request('/v2/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * POST /v2/auth/email
   * Login with email and password
   */
  async loginWithEmail(data: EmailAuthRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request('/v2/auth/email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/link-discord
   * Link Discord account to existing account
   */
  async linkDiscord(data: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    device_id?: string;
    device_name?: string;
  }): Promise<ApiResponse<{ detail: string }>> {
    return this.request('/v2/auth/link-discord', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/link-email
   * Link email account to existing account
   */
  async linkEmail(data: EmailRegisterRequest): Promise<ApiResponse<{ detail: string }>> {
    return this.request('/v2/auth/link-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/forgot-password
   * Request password reset
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v2/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/reset-password
   * Reset password with reset code
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request('/v2/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // Server/Guild Endpoints
  // ============================================================================

  /**
   * GET /v2/server/{server_id}/settings
   * Get server settings
   */
  async getServerSettings(serverId: number, clanSettings = false): Promise<ApiResponse<ServerSettings>> {
    const query = this.buildQueryString({ clan_settings: clanSettings });
    return this.request(`/v2/server/${serverId}/settings${query}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/server/{server_id}/clan/{clan_tag}/settings
   * Get clan settings for a specific server
   */
  async getClanSettings(serverId: number, clanTag: string): Promise<ApiResponse<ClanSettings>> {
    return this.request(`/v2/server/${serverId}/clan/${clanTag}/settings`, {
      method: 'GET',
    });
  }

  /**
   * PUT /v2/server/{server_id}/embed-color/{hex_code}
   * Update server embed color
   */
  async updateServerEmbedColor(serverId: number, hexCode: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/embed-color/${hexCode}`, {
      method: 'PUT',
    });
  }

  // ============================================================================
  // Player Endpoints
  // ============================================================================

  /**
   * POST /v2/players/location
   * Get player locations
   */
  async getPlayerLocations(playerTags: string[]): Promise<ApiResponse<{ items: PlayerLocation[] }>> {
    return this.request('/v2/players/location', {
      method: 'POST',
      body: JSON.stringify({ player_tags: playerTags }),
    });
  }

  /**
   * POST /v2/players/sorted/{attribute}
   * Get players sorted by attribute
   */
  async getPlayersSorted(attribute: string, playerTags: string[]): Promise<ApiResponse<{ items: PlayerSorted[] }>> {
    return this.request(`/v2/players/sorted/${attribute}`, {
      method: 'POST',
      body: JSON.stringify({ player_tags: playerTags }),
    });
  }

  /**
   * POST /v2/players/summary/{season}/top
   * Get player summary top stats for a season
   */
  async getPlayerSummaryTop(season: string, playerTags: string[], limit = 10): Promise<ApiResponse<{ items: PlayerSummaryTop }>> {
    const query = this.buildQueryString({ limit });
    return this.request(`/v2/players/summary/${season}/top${query}`, {
      method: 'POST',
      body: JSON.stringify({ player_tags: playerTags }),
    });
  }

  // ============================================================================
  // Clan Endpoints
  // ============================================================================

  /**
   * GET /v2/clan/{clan_tag}/ranking
   * Get clan ranking
   */
  async getClanRanking(clanTag: string): Promise<ApiResponse<ClanRanking>> {
    return this.request(`/v2/clan/${clanTag}/ranking`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/clan/{clan_tag}/board/totals
   * Get clan board totals
   */
  async getClanBoardTotals(clanTag: string, playerTags: string[]): Promise<ApiResponse<ClanBoardTotals>> {
    return this.request(`/v2/clan/${clanTag}/board/totals`, {
      method: 'GET',
      body: JSON.stringify({ player_tags: playerTags }),
    });
  }

  /**
   * GET /v2/clan/{clan_tag}/donations/{season}
   * Get clan donations for a single clan
   */
  async getClanDonations(clanTag: string, season: string): Promise<ApiResponse<{ items: ClanDonation[] }>> {
    return this.request(`/v2/clan/${clanTag}/donations/${season}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/clan/compo
   * Get clan composition for multiple clans
   */
  async getClanComposition(clanTags: string[]): Promise<ApiResponse<ClanComposition>> {
    const query = this.buildQueryString({ clan_tags: clanTags });
    return this.request(`/v2/clan/compo${query}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/clan/donations/{season}
   * Get donations for multiple clans
   */
  async getClansDonations(season: string, clanTags: string[], onlyCurrentMembers?: boolean): Promise<ApiResponse<{ items: ClanDonation[] }>> {
    const query = this.buildQueryString({
      clan_tags: clanTags,
      only_current_members: onlyCurrentMembers
    });
    return this.request(`/v2/clan/donations/${season}${query}`, {
      method: 'GET',
    });
  }

  // ============================================================================
  // Roster Management Endpoints
  // ============================================================================

  /**
   * POST /v2/roster
   * Create a new roster
   */
  async createRoster(serverId: number, data: CreateRosterModel): Promise<ApiResponse<{ message: string; roster_id: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH /v2/roster/{roster_id}
   * Update a roster
   */
  async updateRoster(rosterId: string, serverId: number, data: RosterUpdateModel, groupId?: string): Promise<ApiResponse<{ message: string; roster: any }>> {
    const query = this.buildQueryString({ server_id: serverId, group_id: groupId });
    return this.request(`/v2/roster/${rosterId}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * GET /v2/roster/{roster_id}
   * Get a specific roster
   */
  async getRoster(rosterId: string, serverId: number): Promise<ApiResponse<{ roster: any }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/${rosterId}${query}`, {
      method: 'GET',
    });
  }

  /**
   * DELETE /v2/roster/{roster_id}
   * Delete a roster
   */
  async deleteRoster(rosterId: string, serverId: number, membersOnly?: boolean): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId, members_only: membersOnly });
    return this.request(`/v2/roster/${rosterId}${query}`, {
      method: 'DELETE',
    });
  }

  /**
   * GET /v2/roster/{server_id}/list
   * List rosters for a server
   */
  async listRosters(serverId: number, groupId?: string, clanTag?: string): Promise<ApiResponse<{ items: any[]; server_id: number }>> {
    const query = this.buildQueryString({ group_id: groupId, clan_tag: clanTag });
    return this.request(`/v2/roster/${serverId}/list${query}`, {
      method: 'GET',
    });
  }

  /**
   * POST /v2/roster/{roster_id}/clone
   * Clone a roster
   */
  async cloneRoster(rosterId: string, serverId: number, data: RosterCloneModel): Promise<ApiResponse<{ message: string; new_roster_id: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/${rosterId}/clone${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/roster/refresh
   * Refresh rosters
   */
  async refreshRosters(serverId?: number, groupId?: string, rosterId?: string): Promise<ApiResponse<{ message: string; refreshed_rosters: any[] }>> {
    const query = this.buildQueryString({ server_id: serverId, group_id: groupId, roster_id: rosterId });
    return this.request(`/v2/roster/refresh${query}`, {
      method: 'POST',
    });
  }

  /**
   * POST /v2/roster/{roster_id}/members
   * Add or remove roster members in bulk
   */
  async bulkUpdateRosterMembers(rosterId: string, serverId: number, data: RosterMemberBulkOperationModel): Promise<ApiResponse<{ message: string; added: number; removed: number }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/${rosterId}/members${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH /v2/roster/{roster_id}/members/{member_tag}
   * Update individual roster member
   */
  async updateRosterMember(rosterId: string, memberTag: string, serverId: number, data: UpdateMemberModel): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/${rosterId}/members/${memberTag}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE /v2/roster/{roster_id}/members/{player_tag}
   * Remove member from roster
   */
  async removeRosterMember(rosterId: string, playerTag: string, serverId: number): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/${rosterId}/members/${playerTag}${query}`, {
      method: 'DELETE',
    });
  }

  /**
   * GET /v2/roster/missing-members
   * Get missing members analysis
   */
  async getRosterMissingMembers(serverId: number, rosterId?: string, groupId?: string): Promise<ApiResponse<any>> {
    const query = this.buildQueryString({ server_id: serverId, roster_id: rosterId, group_id: groupId });
    return this.request(`/v2/roster/missing-members${query}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/roster/server/{server_id}/members
   * Get all clan members for a server
   */
  async getServerClanMembers(serverId: number): Promise<ApiResponse<{ members: any[] }>> {
    return this.request(`/v2/roster/server/${serverId}/members`, {
      method: 'GET',
    });
  }

  /**
   * POST /v2/roster-token
   * Generate roster access token
   */
  async generateRosterToken(serverId: number, rosterId?: string): Promise<ApiResponse<{ message: string; access_url: string; token: string; expires_at: string }>> {
    const query = this.buildQueryString({ server_id: serverId, roster_id: rosterId });
    return this.request(`/v2/roster-token${query}`, {
      method: 'POST',
    });
  }

  // ============================================================================
  // Roster Groups Endpoints
  // ============================================================================

  /**
   * POST /v2/roster-group
   * Create a roster group
   */
  async createRosterGroup(serverId: number, data: CreateRosterGroupModel): Promise<ApiResponse<{ message: string; group_id: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-group${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * GET /v2/roster-group/{group_id}
   * Get a roster group
   */
  async getRosterGroup(groupId: string, serverId: number): Promise<ApiResponse<{ group: any }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-group/${groupId}${query}`, {
      method: 'GET',
    });
  }

  /**
   * PATCH /v2/roster-group/{group_id}
   * Update a roster group
   */
  async updateRosterGroup(groupId: string, serverId: number, data: UpdateRosterGroupModel): Promise<ApiResponse<{ message: string; group: any }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-group/${groupId}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * GET /v2/roster-group/list
   * List all roster groups for a server
   */
  async listRosterGroups(serverId: number): Promise<ApiResponse<{ items: any[]; server_id: number }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-group/list${query}`, {
      method: 'GET',
    });
  }

  /**
   * DELETE /v2/roster-group/{group_id}
   * Delete a roster group
   */
  async deleteRosterGroup(groupId: string, serverId: number): Promise<ApiResponse<{ message: string; affected_rosters: number }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-group/${groupId}${query}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Signup Categories Endpoints
  // ============================================================================

  /**
   * POST /v2/roster-signup-category
   * Create a signup category
   */
  async createSignupCategory(data: CreateRosterSignupCategoryModel): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v2/roster-signup-category', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * GET /v2/roster-signup-category/list
   * List signup categories for a server
   */
  async listSignupCategories(serverId: number): Promise<ApiResponse<{ items: any[]; server_id: number }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-signup-category/list${query}`, {
      method: 'GET',
    });
  }

  /**
   * PATCH /v2/roster-signup-category/{custom_id}
   * Update a signup category
   */
  async updateSignupCategory(customId: string, serverId: number, data: any): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-signup-category/${customId}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE /v2/roster-signup-category/{custom_id}
   * Delete a signup category
   */
  async deleteSignupCategory(customId: string, serverId: number): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-signup-category/${customId}${query}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Roster Automation Endpoints
  // ============================================================================

  /**
   * POST /v2/roster-automation
   * Create automation rule
   */
  async createRosterAutomation(data: CreateRosterAutomationModel): Promise<ApiResponse<{ message: string; automation_id: string }>> {
    return this.request('/v2/roster-automation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * GET /v2/roster-automation/list
   * List automation rules
   */
  async listRosterAutomation(serverId: number, rosterId?: string, groupId?: string, activeOnly?: boolean): Promise<ApiResponse<{ items: any[] }>> {
    const query = this.buildQueryString({
      server_id: serverId,
      roster_id: rosterId,
      group_id: groupId,
      active_only: activeOnly
    });
    return this.request(`/v2/roster-automation/list${query}`, {
      method: 'GET',
    });
  }

  /**
   * PATCH /v2/roster-automation/{automation_id}
   * Update automation rule
   */
  async updateRosterAutomation(automationId: string, serverId: number, data: any): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-automation/${automationId}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE /v2/roster-automation/{automation_id}
   * Delete automation rule
   */
  async deleteRosterAutomation(automationId: string, serverId: number): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-automation/${automationId}${query}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Legends Endpoints
  // ============================================================================

  /**
   * GET /v2/legends/players/day/{day}
   * Get legends stats for a specific day
   */
  async getLegendsDay(day: string, players?: string[]): Promise<ApiResponse<any[]>> {
    const query = this.buildQueryString({ players });
    return this.request(`/v2/legends/players/day/${day}${query}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/legends/players/season/{season}
   * Get legends stats for a specific season
   */
  async getLegendsSeason(season: string, players?: string[]): Promise<ApiResponse<any[]>> {
    const query = this.buildQueryString({ players });
    return this.request(`/v2/legends/players/season/${season}${query}`, {
      method: 'GET',
    });
  }

  // ============================================================================
  // War Endpoints
  // ============================================================================

  /**
   * GET /v2/war/{clan_tag}/previous
   * Get previous wars for a clan
   */
  async getPreviousWars(clanTag: string, options?: {
    timestamp_start?: number;
    timestamp_end?: number;
    include_cwl?: boolean;
    limit?: number;
  }): Promise<ApiResponse<{ items: any[] }>> {
    const query = this.buildQueryString(options || {});
    return this.request(`/v2/war/${clanTag}/previous${query}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/cwl/{clan_tag}/ranking-history
   * Get CWL ranking history for a clan
   */
  async getCwlRankingHistory(clanTag: string): Promise<ApiResponse<{ items: any[] }>> {
    return this.request(`/v2/cwl/${clanTag}/ranking-history`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/cwl/league-thresholds
   * Get CWL league thresholds
   */
  async getCwlLeagueThresholds(): Promise<ApiResponse<{ items: any[] }>> {
    return this.request('/v2/cwl/league-thresholds', {
      method: 'GET',
    });
  }

  /**
   * GET /v2/war/clan/stats
   * Get clan war statistics
   */
  async getClanWarStats(options: {
    clan_tags: string[];
    timestamp_start?: number;
    timestamp_end?: number;
    war_types?: number;
    townhall_filter?: string;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const query = this.buildQueryString(options);
    return this.request(`/v2/war/clan/stats${query}`, {
      method: 'GET',
    });
  }

  // ============================================================================
  // Link Endpoints
  // ============================================================================

  /**
   * POST /v2/link
   * Link a CoC account with authentication
   */
  async linkAccount(data: CocAccountRequest): Promise<ApiResponse<any>> {
    return this.request('/v2/link', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/link/no-auth
   * Link a CoC account without authentication (requires Discord user ID)
   */
  async linkAccountNoAuth(userId: string, data: CocAccountRequest): Promise<ApiResponse<any>> {
    return this.request(`/v2/link/no-auth`, {
      method: 'POST',
      body: JSON.stringify({ ...data, user_id: userId }),
    });
  }

  /**
   * GET /v2/links/{tag_or_id}
   * Get linked accounts for a player tag or user ID
   */
  async getLinkedAccounts(tagOrId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/v2/links/${tagOrId}`, {
      method: 'GET',
    });
  }

  /**
   * DELETE /v2/link/{tag}
   * Remove a linked account with authentication
   */
  async unlinkAccount(tag: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/link/${tag}`, {
      method: 'DELETE',
    });
  }

  /**
   * DELETE /v2/link/no-auth/{tag}
   * Remove a linked account without authentication
   */
  async unlinkAccountNoAuth(tag: string, apiToken: string): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ api_token: apiToken });
    return this.request(`/v2/link/no-auth/${tag}${query}`, {
      method: 'DELETE',
    });
  }

  /**
   * PUT /v2/links/reorder
   * Reorder linked accounts
   */
  async reorderLinkedAccounts(orderedTags: string[]): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v2/links/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ordered_tags: orderedTags }),
    });
  }

  // ============================================================================
  // Export Endpoints
  // ============================================================================

  /**
   * GET /v2/exports/war/cwl-summary
   * Export CWL summary to Excel
   */
  async exportCwlSummary(clanTag: string): Promise<Blob> {
    const url = `${this.config.baseUrl}/v2/exports/war/cwl-summary?tag=${clanTag}`;
    const response = await fetch(url, {
      headers: this.config.accessToken
        ? { Authorization: `Bearer ${this.config.accessToken}` }
        : {},
    });
    return response.blob();
  }

  /**
   * POST /v2/exports/war/player-stats
   * Export player war statistics to Excel
   */
  async exportPlayerWarStats(filter: PlayerWarhitsFilter): Promise<Blob> {
    const url = `${this.config.baseUrl}/v2/exports/war/player-stats`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.accessToken
          ? { Authorization: `Bearer ${this.config.accessToken}` }
          : {}),
      },
      body: JSON.stringify(filter),
    });
    return response.blob();
  }

  // ============================================================================
  // Search Endpoints
  // ============================================================================

  /**
   * GET /v2/search/clan
   * Search for clans
   */
  async searchClan(query: string, userId?: number, guildId?: number): Promise<ApiResponse<{ items: any[] }>> {
    const params = this.buildQueryString({ query, user_id: userId, guild_id: guildId });
    return this.request(`/v2/search/clan${params}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/search/{guild_id}/banned-players
   * Search banned players in a guild
   */
  async searchBannedPlayers(guildId: number, query: string): Promise<ApiResponse<{ items: any[] }>> {
    const params = this.buildQueryString({ query });
    return this.request(`/v2/search/${guildId}/banned-players${params}`, {
      method: 'GET',
    });
  }

  /**
   * POST /v2/search/bookmark/{user_id}/{type}/{tag}
   * Bookmark a search item
   */
  async bookmarkSearch(userId: number, type: number, tag: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/bookmark/${userId}/${type}/${tag}`, {
      method: 'POST',
    });
  }

  /**
   * POST /v2/search/recent/{user_id}/{type}/{tag}
   * Add to recent searches
   */
  async addRecentSearch(userId: number, type: number, tag: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/recent/${userId}/${type}/${tag}`, {
      method: 'POST',
    });
  }

  /**
   * POST /v2/search/groups/create/{user_id}/{name}/{type}
   * Create a search group
   */
  async createSearchGroup(userId: number, name: string, type: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/groups/create/${userId}/${name}/${type}`, {
      method: 'POST',
    });
  }

  /**
   * POST /v2/search/groups/{group_id}/add/{tag}
   * Add tag to search group
   */
  async addToSearchGroup(groupId: string, tag: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/groups/${groupId}/add/${tag}`, {
      method: 'POST',
    });
  }

  /**
   * POST /v2/search/groups/{group_id}/remove/{tag}
   * Remove tag from search group
   */
  async removeFromSearchGroup(groupId: string, tag: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/groups/${groupId}/remove/${tag}`, {
      method: 'POST',
    });
  }

  /**
   * GET /v2/search/groups/{group_id}
   * Get a search group
   */
  async getSearchGroup(groupId: string): Promise<ApiResponse<any>> {
    return this.request(`/v2/search/groups/${groupId}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/search/groups/{user_id}/list
   * List search groups for a user
   */
  async listSearchGroups(userId: number): Promise<ApiResponse<{ items: any[] }>> {
    return this.request(`/v2/search/groups/${userId}/list`, {
      method: 'GET',
    });
  }

  /**
   * DELETE /v2/search/groups/{group_id}
   * Delete a search group
   */
  async deleteSearchGroup(groupId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/v2/search/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // App Endpoints
  // ============================================================================

  /**
   * GET /v2/app/public-config
   * Get public app configuration
   */
  async getPublicConfig(): Promise<ApiResponse<{ sentry_dsn: string }>> {
    return this.request('/v2/app/public-config', {
      method: 'GET',
    });
  }

  /**
   * POST /v2/app/initialization
   * Initialize all account data for mobile app
   */
  async initializeApp(playerTags: string[]): Promise<ApiResponse<any>> {
    return this.request('/v2/app/initialization', {
      method: 'POST',
      body: JSON.stringify({ player_tags: playerTags }),
    });
  }

  // ============================================================================
  // Tracking Endpoints
  // ============================================================================

  /**
   * POST /v2/tracking/players/add
   * Add players to tracking
   */
  async addPlayersToTracking(tags: string[]): Promise<ApiResponse<{ status: string; players_added: string[]; players_already_tracked: string[] }>> {
    return this.request('/v2/tracking/players/add', {
      method: 'POST',
      body: JSON.stringify({ tags }),
    });
  }

  /**
   * POST /v2/tracking/players/remove
   * Remove players from tracking
   */
  async removePlayersFromTracking(tags: string[]): Promise<ApiResponse<{ status: string; players_removed: string[] }>> {
    return this.request('/v2/tracking/players/remove', {
      method: 'POST',
      body: JSON.stringify({ tags }),
    });
  }

  // ============================================================================
  // Dates Endpoints
  // ============================================================================

  /**
   * GET /v2/dates/seasons
   * Get season dates
   */
  async getSeasonDates(numberOfSeasons = 0, asText = false): Promise<ApiResponse<{ items: any[] }>> {
    const query = this.buildQueryString({ number_of_seasons: numberOfSeasons, as_text: asText });
    return this.request(`/v2/dates/seasons${query}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/dates/raid-weekends
   * Get raid weekend dates
   */
  async getRaidWeekendDates(numberOfWeeks = 0): Promise<ApiResponse<{ items: any[] }>> {
    const query = this.buildQueryString({ number_of_weeks: numberOfWeeks });
    return this.request(`/v2/dates/raid-weekends${query}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/dates/current
   * Get current dates for season, raid, legend, and clan games
   */
  async getCurrentDates(): Promise<ApiResponse<any>> {
    return this.request('/v2/dates/current', {
      method: 'GET',
    });
  }

  /**
   * GET /v2/dates/season-start-end
   * Get season start and end dates
   */
  async getSeasonStartEnd(season = '', goldPassSeason = false): Promise<ApiResponse<{ season_start: any; season_end: any }>> {
    const query = this.buildQueryString({ season, gold_pass_season: goldPassSeason });
    return this.request(`/v2/dates/season-start-end${query}`, {
      method: 'GET',
    });
  }

  /**
   * GET /v2/dates/season-raid-dates
   * Get raid weekends for a season
   */
  async getSeasonRaidDates(season = ''): Promise<ApiResponse<{ items: any[] }>> {
    const query = this.buildQueryString({ season });
    return this.request(`/v2/dates/season-raid-dates${query}`, {
      method: 'GET',
    });
  }

  // ============================================================================
  // Ban Endpoints
  // ============================================================================

  /**
   * GET /v2/ban/list/{server_id}
   * Get bans for a server
   */
  async getBans(serverId: number): Promise<ApiResponse<{ items: any[] }>> {
    return this.request(`/v2/ban/list/${serverId}`, {
      method: 'GET',
    });
  }

  /**
   * POST /v2/ban/add/{server_id}/{player_tag}
   * Add or update a ban
   */
  async addBan(serverId: number, playerTag: string, data: BanRequest): Promise<ApiResponse<{ status: string; player_tag: string; server_id: number }>> {
    return this.request(`/v2/ban/add/${serverId}/${playerTag}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE /v2/ban/remove/{server_id}/{player_tag}
   * Remove a ban
   */
  async removeBan(serverId: string, playerTag: string): Promise<ApiResponse<{ status: string; player_tag: string; server_id: string }>> {
    return this.request(`/v2/ban/remove/${serverId}/${playerTag}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // UI Endpoints
  // ============================================================================

  /**
   * GET /ui/roster/dashboard
   * Get roster dashboard HTML page
   */
  async getRosterDashboard(serverId: number, token: string, rosterId?: string): Promise<Response> {
    const query = this.buildQueryString({ server_id: serverId, token, roster_id: rosterId });
    const url = `${this.config.baseUrl}/ui/roster/dashboard${query}`;
    return fetch(url);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Update the access token
   */
  setAccessToken(token: string): void {
    this.config.accessToken = token;
  }

  /**
   * Update the refresh token
   */
  setRefreshToken(token: string): void {
    this.config.refreshToken = token;
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.config.accessToken = undefined;
    this.config.refreshToken = undefined;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ApiConfig> {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new API client instance
 */
export function createApiClient(baseUrl: string, accessToken?: string, refreshToken?: string): ClashKingApiClient {
  return new ClashKingApiClient({
    baseUrl,
    accessToken,
    refreshToken,
  });
}

export default ClashKingApiClient;
