import {
  CreateServerRoleEndpoint,
  DeleteServerRoleEndpoint,
  DiscordRolesEndpoint,
  RoleSettingsEndpoint,
  ServerRolesEndpoint,
  UpdateRoleSettingsEndpoint,
  UpdateServerRoleEndpoint,
} from "@clashking/api-contracts";

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
  async getDiscordRoles(serverId: string, signal?: AbortSignal): Promise<ApiResponse<DiscordRolesResponse>> {
    return this.executeEndpoint(DiscordRolesEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    }, { signal });
  }

  async getRoleSettings(serverId: string): Promise<ApiResponse<RoleSettings>> {
    return this.executeEndpoint(RoleSettingsEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
  }

  async updateRoleSettings(
    serverId: string,
    settings: RoleSettingsUpdate
  ) {
    return this.executeEndpoint(UpdateRoleSettingsEndpoint, {
      path: { serverId },
      query: {},
      body: settings,
    });
  }

  async getServerRoles(
    serverId: string,
    filters: { type?: RoleType; clan_tag?: string } = {}
  ): Promise<ApiResponse<ServerRolesResponse>> {
    return this.executeEndpoint(ServerRolesEndpoint, {
      path: { serverId },
      query: filters,
      body: {},
    });
  }

  async createServerRole(
    serverId: string,
    role: ServerRoleInput
  ): Promise<ApiResponse<ServerRoleResponse>> {
    return this.executeEndpoint(CreateServerRoleEndpoint, {
      path: { serverId },
      query: {},
      body: { ...role, mode: role.mode ?? 'both' },
    });
  }

  async updateServerRole(
    serverId: string,
    roleId: string,
    update: ServerRoleUpdate
  ): Promise<ApiResponse<ServerRoleResponse>> {
    return this.executeEndpoint(UpdateServerRoleEndpoint, {
      path: { serverId, roleId },
      query: {},
      body: update,
    });
  }

  async deleteServerRole(
    serverId: string,
    roleId: string
  ): Promise<ApiResponse<ServerRoleResponse>> {
    return this.executeEndpoint(DeleteServerRoleEndpoint, {
      path: { serverId, roleId },
      query: {},
      body: {},
    });
  }
}
