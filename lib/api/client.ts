/**
 * Main ClashKing API Client
 * Composes all specialized clients into a single interface
 */

import type { ApiConfig } from './types/common';
import { AuthClient } from './clients/auth-client';
import { PlayerClient } from './clients/player-client';
import { ClanClient } from './clients/clan-client';
import { RosterClient } from './clients/roster-client';
import { WarClient } from './clients/war-client';
import { ServerClient } from './clients/server-client';
import { LinkClient } from './clients/link-client';
import { UtilityClient } from './clients/utility-client';
import { RolesClient } from './clients/roles-client';
import { FamilyRolesClient } from './clients/family-roles-client';
import { LeaderboardClient } from './clients/leaderboard-client';
import { TicketsClient } from './clients/tickets-client';
import { PanelsClient } from './clients/panels-client';

/**
 * Main API client with all endpoints organized by domain
 */
export class ClashKingApiClient {
  public readonly auth: AuthClient;
  public readonly players: PlayerClient;
  public readonly clans: ClanClient;
  public readonly rosters: RosterClient;
  public readonly wars: WarClient;
  public readonly servers: ServerClient;
  public readonly links: LinkClient;
  public readonly utils: UtilityClient;
  public readonly roles: RolesClient;
  public readonly familyRoles: FamilyRolesClient;
  public readonly leaderboards: LeaderboardClient;
  public readonly tickets: TicketsClient;
  public readonly panels: PanelsClient;

  constructor(config: ApiConfig) {
    // Initialize all specialized clients with the same config
    this.auth = new AuthClient(config);
    this.players = new PlayerClient(config);
    this.clans = new ClanClient(config);
    this.rosters = new RosterClient(config);
    this.wars = new WarClient(config);
    this.servers = new ServerClient(config);
    this.links = new LinkClient(config);
    this.utils = new UtilityClient(config);
    this.roles = new RolesClient(config);
    this.familyRoles = new FamilyRolesClient(config);
    this.leaderboards = new LeaderboardClient(config);
    this.tickets = new TicketsClient(config);
    this.panels = new PanelsClient(config);
  }

  /**
   * Update access token for all clients
   */
  setAccessToken(token: string): void {
    this.auth.setAccessToken(token);
    this.players.setAccessToken(token);
    this.clans.setAccessToken(token);
    this.rosters.setAccessToken(token);
    this.wars.setAccessToken(token);
    this.servers.setAccessToken(token);
    this.links.setAccessToken(token);
    this.utils.setAccessToken(token);
    this.roles.setAccessToken(token);
    this.familyRoles.setAccessToken(token);
    this.leaderboards.setAccessToken(token);
    this.tickets.setAccessToken(token);
    this.panels.setAccessToken(token);
  }

  /**
   * Update refresh token for all clients
   */
  setRefreshToken(token: string): void {
    this.auth.setRefreshToken(token);
    this.players.setRefreshToken(token);
    this.clans.setRefreshToken(token);
    this.rosters.setRefreshToken(token);
    this.wars.setRefreshToken(token);
    this.servers.setRefreshToken(token);
    this.links.setRefreshToken(token);
    this.utils.setRefreshToken(token);
    this.roles.setRefreshToken(token);
    this.familyRoles.setRefreshToken(token);
    this.leaderboards.setRefreshToken(token);
    this.tickets.setRefreshToken(token);
    this.panels.setRefreshToken(token);
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.auth.clearTokens();
    this.players.clearTokens();
    this.clans.clearTokens();
    this.rosters.clearTokens();
    this.wars.clearTokens();
    this.servers.clearTokens();
    this.links.clearTokens();
    this.utils.clearTokens();
    this.roles.clearTokens();
    this.familyRoles.clearTokens();
    this.leaderboards.clearTokens();
    this.tickets.clearTokens();
    this.panels.clearTokens();
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ApiConfig> {
    return this.auth.getConfig();
  }
}

/**
 * Factory function to create a new API client
 */
export function createApiClient(
  baseUrl: string,
  accessToken?: string,
  refreshToken?: string
): ClashKingApiClient {
  return new ClashKingApiClient({
    baseUrl,
    accessToken,
    refreshToken,
  });
}

/**
 * Default API client instance
 * Uses environment variables for configuration
 *
 * For client-side requests, use the Next.js API routes (/api) as proxy
 * For server-side requests, use the backend URL directly
 */
export const apiClient = createApiClient(
  typeof globalThis.window !== 'undefined'
    ? '/api'  // Client-side: use Next.js API routes
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',  // Server-side: use backend directly
);
