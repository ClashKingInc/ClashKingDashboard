/**
 * Roster API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse, PaginatedResponse } from '../types/common';
import type {
  CreateRosterModel,
  RosterUpdateModel,
  RosterMemberBulkOperationModel,
  UpdateMemberModel,
  CreateRosterGroupModel,
  UpdateRosterGroupModel,
  CreateRosterSignupCategoryModel,
  CreateRosterAutomationModel,
  RosterCloneModel,
} from '../types/roster';

export class RosterClient extends BaseApiClient {
  // ============================================================================
  // Roster Management
  // ============================================================================

  async create(serverId: number, data: CreateRosterModel): Promise<ApiResponse<{ message: string; roster_id: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update(rosterId: string, serverId: number, data: RosterUpdateModel, groupId?: string): Promise<ApiResponse<{ message: string; roster: any }>> {
    const query = this.buildQueryString({ server_id: serverId, group_id: groupId });
    return this.request(`/v2/roster/${rosterId}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async get(rosterId: string, serverId: number): Promise<ApiResponse<{ roster: any }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/${rosterId}${query}`, { method: 'GET' });
  }

  async delete(rosterId: string, serverId: number, membersOnly?: boolean): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId, members_only: membersOnly });
    return this.request(`/v2/roster/${rosterId}${query}`, { method: 'DELETE' });
  }

  async list(serverId: string | number, groupId?: string, clanTag?: string): Promise<ApiResponse<PaginatedResponse<any>>> {
    const query = this.buildQueryString({ group_id: groupId, clan_tag: clanTag });
    return this.request(`/v2/roster/${serverId}/list${query}`, { method: 'GET' });
  }

  async clone(rosterId: string, serverId: number, data: RosterCloneModel): Promise<ApiResponse<{ message: string; new_roster_id: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/${rosterId}/clone${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refresh(serverId?: number, groupId?: string, rosterId?: string): Promise<ApiResponse<{ message: string; refreshed_rosters: any[] }>> {
    const query = this.buildQueryString({ server_id: serverId, group_id: groupId, roster_id: rosterId });
    return this.request(`/v2/roster/refresh${query}`, { method: 'POST' });
  }

  // ============================================================================
  // Roster Members
  // ============================================================================

  async bulkUpdateMembers(rosterId: string, serverId: number, data: RosterMemberBulkOperationModel): Promise<ApiResponse<{ message: string; added: number; removed: number }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/${rosterId}/members${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMember(rosterId: string, memberTag: string, serverId: number, data: UpdateMemberModel): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/${rosterId}/members/${memberTag}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async removeMember(rosterId: string, playerTag: string, serverId: number): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/${rosterId}/members/${playerTag}${query}`, { method: 'DELETE' });
  }

  async getMissingMembers(serverId: number, rosterId?: string, groupId?: string): Promise<ApiResponse<any>> {
    const query = this.buildQueryString({ server_id: serverId, roster_id: rosterId, group_id: groupId });
    return this.request(`/v2/roster/missing-members${query}`, { method: 'GET' });
  }

  async getServerMembers(serverId: number): Promise<ApiResponse<{ members: any[] }>> {
    return this.request(`/v2/roster/server/${serverId}/members`, { method: 'GET' });
  }

  async generateToken(serverId: number, rosterId?: string): Promise<ApiResponse<{ message: string; access_url: string; token: string; expires_at: string }>> {
    const query = this.buildQueryString({ server_id: serverId, roster_id: rosterId });
    return this.request(`/v2/roster-token${query}`, { method: 'POST' });
  }

  // ============================================================================
  // Roster Groups
  // ============================================================================

  async createGroup(serverId: number, data: CreateRosterGroupModel): Promise<ApiResponse<{ message: string; group_id: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-group${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGroup(groupId: string, serverId: number): Promise<ApiResponse<{ group: any }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-group/${groupId}${query}`, { method: 'GET' });
  }

  async updateGroup(groupId: string, serverId: number, data: UpdateRosterGroupModel): Promise<ApiResponse<{ message: string; group: any }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-group/${groupId}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listGroups(serverId: number): Promise<ApiResponse<PaginatedResponse<any>>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-group/list${query}`, { method: 'GET' });
  }

  async deleteGroup(groupId: string, serverId: number): Promise<ApiResponse<{ message: string; affected_rosters: number }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-group/${groupId}${query}`, { method: 'DELETE' });
  }

  // ============================================================================
  // Signup Categories
  // ============================================================================

  async createCategory(data: CreateRosterSignupCategoryModel): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v2/roster-signup-category', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listCategories(serverId: number): Promise<ApiResponse<PaginatedResponse<any>>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-signup-category/list${query}`, { method: 'GET' });
  }

  async updateCategory(customId: string, serverId: number, data: any): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-signup-category/${customId}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(customId: string, serverId: number): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-signup-category/${customId}${query}`, { method: 'DELETE' });
  }

  // ============================================================================
  // Automation
  // ============================================================================

  async createAutomation(data: CreateRosterAutomationModel): Promise<ApiResponse<{ message: string; automation_id: string }>> {
    return this.request('/v2/roster-automation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listAutomation(serverId: number, rosterId?: string, groupId?: string, activeOnly?: boolean): Promise<ApiResponse<PaginatedResponse<any>>> {
    const query = this.buildQueryString({
      server_id: serverId,
      roster_id: rosterId,
      group_id: groupId,
      active_only: activeOnly,
    });
    return this.request(`/v2/roster-automation/list${query}`, { method: 'GET' });
  }

  async updateAutomation(automationId: string, serverId: number, data: any): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-automation/${automationId}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAutomation(automationId: string, serverId: number): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster-automation/${automationId}${query}`, { method: 'DELETE' });
  }
}
