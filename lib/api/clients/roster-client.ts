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
  CreateRosterAutomationModel,
  RosterCloneModel,
  CreateRosterViewModel,
  UpdateRosterViewModel,
  MaterializedRosterView,
  RosterView,
  RosterViewResult,
  RosterMetricQuery,
  RosterMetricQueryResult,
  ApplyRosterMembershipChangesModel,
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

  // ============================================================================
  // AI roster views
  // ============================================================================

  async listViews(serverId: string | number): Promise<ApiResponse<RosterView[]>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/views${query}`, { method: 'GET' });
  }

  async queryMetric(
    serverId: string | number,
    data: RosterMetricQuery,
  ): Promise<ApiResponse<RosterMetricQueryResult>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/metrics/query${query}`, {
      method: 'POST',
      body: JSON.stringify({ ...data, force: data.force ?? false }),
    });
  }

  async getView(viewId: string, serverId: string | number): Promise<ApiResponse<RosterView>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/views/${encodeURIComponent(viewId)}${query}`, { method: 'GET' });
  }

  async resolveSharedView(viewId: string): Promise<ApiResponse<RosterView>> {
    return this.request(`/v2/roster/views/shared/${encodeURIComponent(viewId)}`, { method: 'GET' });
  }

  async createView(serverId: string | number, data: CreateRosterViewModel): Promise<ApiResponse<RosterView>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/views${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateView(
    viewId: string,
    serverId: string | number,
    data: UpdateRosterViewModel,
  ): Promise<ApiResponse<RosterView>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/views/${encodeURIComponent(viewId)}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteView(viewId: string, serverId: string | number): Promise<ApiResponse<{ message: string }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/views/${encodeURIComponent(viewId)}${query}`, { method: 'DELETE' });
  }

  async previewView(
    serverId: string | number,
	view: MaterializedRosterView,
    rosterIds: string[],
  ): Promise<ApiResponse<{ view: RosterView; result: RosterViewResult }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/views/preview${query}`, {
      method: 'POST',
      body: JSON.stringify({
        serverId: String(serverId),
        rosterIds,
        viewId: view.id || undefined,
        name: view.name,
        sourceCode: view.sourceCode,
        sourceVersion: view.sourceVersion,
        columns: view.spec.columns,
        filters: view.spec.filters ?? [],
        sort: view.spec.sort ?? [],
        highlights: view.spec.highlights ?? [],
        limit: view.spec.limit ?? null,
      }),
    });
  }

  async applyMembershipChanges(
    serverId: string | number,
    data: ApplyRosterMembershipChangesModel,
  ): Promise<ApiResponse<{ applied: boolean; changeCount: number; revisions: Record<string, number> }>> {
    const query = this.buildQueryString({ server_id: serverId });
    return this.request(`/v2/roster/membership-changes${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
