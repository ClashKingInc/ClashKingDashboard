import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type {
  DiscordRolesResponse,
  ServerRoleInput,
  ServerRoleResponse,
  ServerRolesResponse,
  ServerRoleUpdate,
  RoleSettings,
  RoleSettingsUpdate,
  RoleType,
} from '../types/roles';

export class RolesClient extends BaseApiClient {
  async getDiscordRoles(serverId: string | number): Promise<ApiResponse<DiscordRolesResponse>> {
    return this.request(`/v2/server/${serverId}/discord-roles`, { method: 'GET' });
  }

  async getRoleSettings(serverId: string | number): Promise<ApiResponse<RoleSettings>> {
    return this.request(`/v2/server/${serverId}/role-settings`, { method: 'GET' });
  }

  async updateRoleSettings(
    serverId: string | number,
    settings: RoleSettingsUpdate
  ): Promise<ApiResponse<{ message: string; server_id: number }>> {
    return this.request(`/v2/server/${serverId}/role-settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  async getServerRoles(
    serverId: string | number,
    filters: { type?: RoleType; clan_tag?: string } = {}
  ): Promise<ApiResponse<ServerRolesResponse>> {
    const query = this.buildQueryString(filters);
    return this.request(`/v2/server/${serverId}/server-roles${query}`, { method: 'GET' });
  }

  async createServerRole(
    serverId: string | number,
    role: ServerRoleInput
  ): Promise<ApiResponse<ServerRoleResponse>> {
    return this.request(`/v2/server/${serverId}/server-roles`, {
      method: 'POST',
      body: JSON.stringify({ ...role, mode: role.mode ?? 'both' }),
    });
  }

  async updateServerRole(
    serverId: string | number,
    roleId: string,
    update: ServerRoleUpdate
  ): Promise<ApiResponse<ServerRoleResponse>> {
    return this.request(`/v2/server/${serverId}/server-roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  async deleteServerRole(
    serverId: string | number,
    roleId: string
  ): Promise<ApiResponse<ServerRoleResponse>> {
    return this.request(`/v2/server/${serverId}/server-roles/${roleId}`, { method: 'DELETE' });
  }
}
