import {
  CreateServerRoleEndpoint,
  DeleteServerRoleEndpoint,
  ServerRolesEndpoint,
  UpdateServerRoleEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type { ServerRole, ServerRoleResponse, RoleMode, RoleType } from '../types/roles';
import type {
  FamilyRoleAdd,
  FamilyRoleOperationResponse,
  FamilyRolesResponse,
  FamilyRoleType,
} from '../types/family-roles';

const ruleForFamilyType: Record<FamilyRoleType, { type: RoleType; option: string }> = {
  family: { type: 'family', option: 'family' },
  not_family: { type: 'family', option: 'not_family' },
  family_elder: { type: 'clan_role', option: 'elder' },
  family_coleader: { type: 'clan_role', option: 'co_leader' },
  family_leader: { type: 'clan_role', option: 'leader' },
};

function matchingRoles(roles: readonly ServerRole[], type: RoleType, option: string) {
  return roles
    .filter((role) => !role.clan_tag && role.type === type && role.option === option)
    .map((role) => ({ id: role.id, role_id: role.role_id, mode: role.mode }));
}

function familyResponse(serverId: string, roles: readonly ServerRole[]): FamilyRolesResponse {
  return {
    server_id: serverId,
    family_roles: matchingRoles(roles, 'family', 'family'),
    not_family_roles: matchingRoles(roles, 'family', 'not_family'),
    family_elder_roles: matchingRoles(roles, 'clan_role', 'elder'),
    family_coleader_roles: matchingRoles(roles, 'clan_role', 'co_leader'),
    family_leader_roles: matchingRoles(roles, 'clan_role', 'leader'),
  };
}

export class FamilyRolesClient extends BaseApiClient {
  async getFamilyRoles(serverId: string): Promise<ApiResponse<FamilyRolesResponse>> {
    const response = await this.executeEndpoint(ServerRolesEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
    if (!response.data) return { error: response.error, status: response.status };
    return { data: familyResponse(serverId, response.data.roles), status: response.status };
  }

  async addFamilyRole(serverId: string, data: FamilyRoleAdd): Promise<ApiResponse<FamilyRoleOperationResponse>> {
    const mapped = ruleForFamilyType[data.type];
    const response = await this.executeEndpoint(CreateServerRoleEndpoint, {
      path: { serverId },
      query: {},
      body: { ...mapped, role_id: data.role, mode: data.mode ?? 'both' },
    });
    if (!response.data) return { error: response.error, status: response.status };
    return {
      data: {
        message: response.data.message,
        server_id: serverId,
        role_type: data.type,
        role_id: data.role,
      },
      status: response.status,
    };
  }

  async updateFamilyRoleMode(serverId: string, id: string, mode: RoleMode): Promise<ApiResponse<ServerRoleResponse>> {
    return this.executeEndpoint(UpdateServerRoleEndpoint, {
      path: { serverId, roleId: id },
      query: {},
      body: { mode },
    });
  }

  async removeFamilyRole(serverId: string, roleType: FamilyRoleType, id: string, roleId: string): Promise<ApiResponse<FamilyRoleOperationResponse>> {
    const deleted = await this.executeEndpoint(DeleteServerRoleEndpoint, {
      path: { serverId, roleId: id },
      query: {},
      body: {},
    });
    if (!deleted.data) return { error: deleted.error, status: deleted.status };
    return {
      data: { message: deleted.data.message, server_id: serverId, role_type: roleType, role_id: roleId },
      status: deleted.status,
    };
  }
}
