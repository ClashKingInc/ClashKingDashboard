/**
 * Family Roles API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type {
  FamilyRolesResponse,
  FamilyRoleAdd,
  FamilyRoleOperationResponse,
  FamilyRoleType,
} from '../types/family-roles';

export class FamilyRolesClient extends BaseApiClient {
  /**
   * GET /v2/server/{server_id}/family-roles
   */
  async getFamilyRoles(serverId: string): Promise<ApiResponse<FamilyRolesResponse>> {
    return this.request(`/v2/server/${serverId}/family-roles`, {
      method: 'GET',
    });
  }

  /**
   * POST /v2/server/{server_id}/family-roles
   */
  async addFamilyRole(
    serverId: string,
    data: FamilyRoleAdd
  ): Promise<ApiResponse<FamilyRoleOperationResponse>> {
    return this.request(`/v2/server/${serverId}/family-roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE /v2/server/{server_id}/family-roles/{role_type}/{role_id}
   */
  async removeFamilyRole(
    serverId: string,
    roleType: FamilyRoleType,
    roleId: string
  ): Promise<ApiResponse<FamilyRoleOperationResponse>> {
    return this.request(`/v2/server/${serverId}/family-roles/${roleType}/${roleId}`, {
      method: 'DELETE',
    });
  }
}
