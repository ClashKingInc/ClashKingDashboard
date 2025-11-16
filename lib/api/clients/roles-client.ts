/**
 * Roles API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type {
  RoleType,
  RoleSettings,
  RoleSettingsUpdate,
  RolesListResponse,
  AllRolesResponse,
  RoleResponse,
  DiscordRolesResponse,
  TownhallRole,
  LeagueRole,
  BuilderHallRole,
  BuilderLeagueRole,
  AchievementRole,
  StatusRole,
  FamilyPositionRole,
} from '../types/roles';

export class RolesClient extends BaseApiClient {
  /**
   * GET /v2/server/{server_id}/discord-roles
   */
  async getDiscordRoles(serverId: string | number): Promise<ApiResponse<DiscordRolesResponse>> {
    return this.request(`/v2/server/${serverId}/discord-roles`, { method: 'GET' });
  }

  /**
   * GET /v2/server/{server_id}/role-settings
   */
  async getRoleSettings(serverId: string | number): Promise<ApiResponse<RoleSettings>> {
    return this.request(`/v2/server/${serverId}/role-settings`, { method: 'GET' });
  }

  /**
   * PATCH /v2/server/{server_id}/role-settings
   */
  async updateRoleSettings(
    serverId: string | number,
    settings: RoleSettingsUpdate
  ): Promise<ApiResponse<{ message: string; server_id: number; updated_fields: number }>> {
    return this.request(`/v2/server/${serverId}/role-settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  /**
   * GET /v2/server/{server_id}/roles/all
   */
  async getAllRoles(serverId: string | number): Promise<ApiResponse<AllRolesResponse>> {
    return this.request(`/v2/server/${serverId}/roles/all`, { method: 'GET' });
  }

  /**
   * GET /v2/server/{server_id}/roles/{role_type}
   */
  async getRolesByType(serverId: string | number, roleType: RoleType): Promise<ApiResponse<RolesListResponse>> {
    return this.request(`/v2/server/${serverId}/roles/${roleType}`, { method: 'GET' });
  }

  /**
   * POST /v2/server/{server_id}/roles/{role_type}
   */
  async createRole(
    serverId: string | number,
    roleType: RoleType,
    roleData:
      | TownhallRole
      | LeagueRole
      | BuilderHallRole
      | BuilderLeagueRole
      | AchievementRole
      | StatusRole
      | FamilyPositionRole
  ): Promise<ApiResponse<RoleResponse>> {
    return this.request(`/v2/server/${serverId}/roles/${roleType}`, {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }

  /**
   * DELETE /v2/server/{server_id}/roles/{role_type}/{role_id}
   */
  async deleteRole(serverId: string | number, roleType: RoleType, roleId: string | number): Promise<ApiResponse<RoleResponse>> {
    return this.request(`/v2/server/${serverId}/roles/${roleType}/${roleId}`, {
      method: 'DELETE',
    });
  }
}
