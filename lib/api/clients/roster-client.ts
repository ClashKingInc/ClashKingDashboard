/** Roster API client backed by the shared endpoint contracts. */

import {
  DashboardApplyRosterMembershipChangesEndpoint,
  DashboardCloneRosterEndpoint,
  DashboardCreateRosterAutomationEndpoint,
  DashboardCreateRosterEndpoint,
  DashboardCreateRosterGroupEndpoint,
  DashboardCreateRosterViewEndpoint,
  DashboardDeleteRosterAutomationEndpoint,
  DashboardDeleteRosterEndpoint,
  DashboardDeleteRosterGroupEndpoint,
  DashboardDeleteRosterViewEndpoint,
  DashboardGetRosterEndpoint,
  DashboardGetRosterGroupEndpoint,
  DashboardGetRosterViewEndpoint,
  DashboardListRosterAutomationsEndpoint,
  DashboardListRosterGroupsEndpoint,
  DashboardListRosterViewsEndpoint,
  DashboardListRostersEndpoint,
  DashboardManageRosterMembersEndpoint,
  DashboardMissingRosterMembersEndpoint,
  DashboardPreviewRosterViewEndpoint,
  DashboardQueryRosterMetricEndpoint,
  DashboardRefreshRostersEndpoint,
  DashboardRemoveRosterMemberEndpoint,
  DashboardResolveSharedRosterViewEndpoint,
  DashboardServerClanMembersEndpoint,
  DashboardUpdateRosterAutomationEndpoint,
  DashboardUpdateRosterEndpoint,
  DashboardUpdateRosterGroupEndpoint,
  DashboardUpdateRosterMemberEndpoint,
  DashboardUpdateRosterViewEndpoint,
  type EndpointResponse,
} from "@clashking/api-contracts";

import { BaseApiClient } from "../core/base-client";
import type { ApiResponse } from "../types/common";
import type {
  ApplyRosterMembershipChangesModel,
  CreateRosterAutomationModel,
  CreateRosterGroupModel,
  CreateRosterModel,
  CreateRosterViewModel,
  MaterializedRosterView,
  RosterCloneModel,
  RosterMemberBulkOperationModel,
  RosterMetricQuery,
  RosterMetricQueryResult,
  RosterUpdateModel,
  RosterView,
  RosterViewResult,
  UpdateMemberModel,
  UpdateRosterAutomationModel,
  UpdateRosterGroupModel,
  UpdateRosterViewModel,
} from "../types/roster";

function mapData<A, B>(response: ApiResponse<A>, transform: (data: A) => B): ApiResponse<B> {
  if (response.data === undefined) {
    const { data: _data, ...rest } = response;
    return rest;
  }
  return { ...response, data: transform(response.data) };
}

export class RosterClient extends BaseApiClient {
  async create(
    serverId: string,
    data: CreateRosterModel,
  ): Promise<ApiResponse<{ message: string; roster_id: string }>> {
    const response = await this.executeEndpoint(DashboardCreateRosterEndpoint, {
      path: {}, query: { server_id: serverId }, body: data,
    });
    return mapData(response, ({ message, roster_id }) => ({ message, roster_id }));
  }

  async update(
    rosterId: string,
    serverId: string,
    data: RosterUpdateModel,
    groupId?: string,
  ) {
    const response = await this.executeEndpoint(DashboardUpdateRosterEndpoint, {
      path: { rosterId },
      query: { server_id: serverId },
      body: groupId === undefined ? data : { ...data, group_id: groupId },
    });
    return mapData(response, ({ message, roster }) => ({ message, roster }));
  }

  async get(
    rosterId: string,
    serverId: string,
  ) {
    const response = await this.executeEndpoint(DashboardGetRosterEndpoint, {
      path: { rosterId }, query: { server_id: serverId }, body: {},
    });
    return mapData(response, ({ roster }) => ({ roster }));
  }

  async delete(
    rosterId: string,
    serverId: string,
    membersOnly?: boolean,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.executeEndpoint(DashboardDeleteRosterEndpoint, {
      path: { rosterId },
      query: membersOnly === undefined
        ? { server_id: serverId }
        : { server_id: serverId, members_only: membersOnly },
      body: {},
    });
    return mapData(response, ({ message }) => ({ message }));
  }

  async list(
    serverId: string,
    groupId?: string,
    clanTag?: string,
  ) {
    const response = await this.executeEndpoint(DashboardListRostersEndpoint, {
      path: { serverId },
      query: {
        ...(groupId === undefined ? {} : { group_id: groupId }),
        ...(clanTag === undefined ? {} : { clan_tag: clanTag }),
      },
      body: {},
    });
    return mapData(response, (data) => ({ items: [...data.rosters], total: data.count }));
  }

  async clone(
    rosterId: string,
    serverId: string,
    data: RosterCloneModel,
  ): Promise<ApiResponse<{ message: string; new_roster_id: string }>> {
    const response = await this.executeEndpoint(DashboardCloneRosterEndpoint, {
      path: { rosterId }, query: { server_id: serverId }, body: data,
    });
    return mapData(response, ({ message, new_roster_id }) => ({ message, new_roster_id }));
  }

  async refresh(
    serverId?: string,
    groupId?: string,
    rosterId?: string,
  ): Promise<ApiResponse<EndpointResponse<typeof DashboardRefreshRostersEndpoint>>> {
    if (serverId === undefined) {
      return { error: "serverId is required by the canonical roster refresh endpoint", status: 400 };
    }
    const response = await this.executeEndpoint(DashboardRefreshRostersEndpoint, {
      path: {},
      query: {
        server_id: serverId,
        ...(groupId === undefined ? {} : { group_id: groupId }),
        ...(rosterId === undefined ? {} : { roster_id: rosterId }),
      },
      body: {},
    });
    return mapData(response, (data) => ({
      message: data.message,
      refreshed_rosters: [...data.refreshed_rosters],
    }));
  }

  async bulkUpdateMembers(
    rosterId: string,
    serverId: string,
    data: RosterMemberBulkOperationModel,
  ): Promise<ApiResponse<{ message: string; added: number; removed: number }>> {
    const response = await this.executeEndpoint(DashboardManageRosterMembersEndpoint, {
      path: { rosterId }, query: { server_id: serverId }, body: data,
    });
    return mapData(response, ({ message }) => ({
      message,
      added: data.add?.length ?? data.members?.length ?? 0,
      removed: data.player_tags?.length ?? 0,
    }));
  }

  async updateMember(
    rosterId: string,
    memberTag: string,
    serverId: string,
    data: UpdateMemberModel,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.executeEndpoint(DashboardUpdateRosterMemberEndpoint, {
      path: { rosterId, memberTag }, query: { server_id: serverId }, body: data,
    });
    return mapData(response, ({ message }) => ({ message }));
  }

  async removeMember(
    rosterId: string,
    playerTag: string,
    serverId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.executeEndpoint(DashboardRemoveRosterMemberEndpoint, {
      path: { rosterId, memberTag: playerTag }, query: { server_id: serverId }, body: {},
    });
    return mapData(response, ({ message }) => ({ message }));
  }

  async getMissingMembers(
    serverId: string,
    rosterId?: string,
    groupId?: string,
  ) {
    return this.executeEndpoint(DashboardMissingRosterMembersEndpoint, {
      path: {},
      query: {
        server_id: serverId,
        ...(rosterId === undefined ? {} : { roster_id: rosterId }),
        ...(groupId === undefined ? {} : { group_id: groupId }),
      },
      body: {},
    });
  }

  async getServerMembers(
    serverId: string,
  ) {
    const response = await this.executeEndpoint(DashboardServerClanMembersEndpoint, {
      path: { serverId }, query: {}, body: {},
    });
    return mapData(response, (data) => ({ members: [...data.members] }));
  }

  async createGroup(
    serverId: string,
    data: CreateRosterGroupModel,
  ): Promise<ApiResponse<{ message: string; group_id: string }>> {
    const response = await this.executeEndpoint(DashboardCreateRosterGroupEndpoint, {
      path: {}, query: { server_id: serverId }, body: data,
    });
    return mapData(response, ({ message, group_id }) => ({ message, group_id }));
  }

  async getGroup(
    groupId: string,
    serverId: string,
  ) {
    const response = await this.executeEndpoint(DashboardGetRosterGroupEndpoint, {
      path: { groupId }, query: { server_id: serverId }, body: {},
    });
    return mapData(response, ({ group }) => ({ group }));
  }

  async updateGroup(
    groupId: string,
    serverId: string,
    data: UpdateRosterGroupModel,
  ) {
    const response = await this.executeEndpoint(DashboardUpdateRosterGroupEndpoint, {
      path: { groupId }, query: { server_id: serverId }, body: data,
    });
    return mapData(response, ({ message, group }) => ({ message, group }));
  }

  async listGroups(serverId: string) {
    const response = await this.executeEndpoint(DashboardListRosterGroupsEndpoint, {
      path: {}, query: { server_id: serverId }, body: {},
    });
    return mapData(response, (data) => ({ ...data, items: [...data.items] }));
  }

  async deleteGroup(
    groupId: string,
    serverId: string,
  ): Promise<ApiResponse<{ message: string; affected_rosters: number }>> {
    return this.executeEndpoint(DashboardDeleteRosterGroupEndpoint, {
      path: { groupId }, query: { server_id: serverId }, body: {},
    });
  }

  async createAutomation(
    data: CreateRosterAutomationModel,
  ): Promise<ApiResponse<{ message: string; automation_id: string }>> {
    const { server_id: serverId, ...body } = data;
    const response = await this.executeEndpoint(DashboardCreateRosterAutomationEndpoint, {
      path: {}, query: { server_id: serverId }, body,
    });
    return mapData(response, ({ message, automation_id }) => ({ message, automation_id }));
  }

  async listAutomation(
    serverId: string,
    rosterId?: string,
    groupId?: string,
    activeOnly?: boolean,
  ) {
    const response = await this.executeEndpoint(DashboardListRosterAutomationsEndpoint, {
      path: {},
      query: {
        server_id: serverId,
        ...(rosterId === undefined ? {} : { roster_id: rosterId }),
        ...(groupId === undefined ? {} : { group_id: groupId }),
        ...(activeOnly === undefined ? {} : { active_only: activeOnly }),
      },
      body: {},
    });
    return mapData(response, (data) => ({ ...data, items: [...data.items] }));
  }

  async updateAutomation(
    automationId: string,
    serverId: string,
    data: UpdateRosterAutomationModel,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.executeEndpoint(DashboardUpdateRosterAutomationEndpoint, {
      path: { automationId }, query: { server_id: serverId }, body: data,
    });
    return mapData(response, ({ message }) => ({ message }));
  }

  async deleteAutomation(
    automationId: string,
    serverId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.executeEndpoint(DashboardDeleteRosterAutomationEndpoint, {
      path: { automationId }, query: { server_id: serverId }, body: {},
    });
    return mapData(response, ({ message }) => ({ message }));
  }

  async listViews(serverId: string): Promise<ApiResponse<RosterView[]>> {
    const response = await this.executeEndpoint(DashboardListRosterViewsEndpoint, {
      path: {}, query: { server_id: serverId }, body: {},
    });
    return mapData(response, (data) => [...data]);
  }

  async queryMetric(
    serverId: string,
    data: RosterMetricQuery,
  ): Promise<ApiResponse<RosterMetricQueryResult>> {
    return this.executeEndpoint(DashboardQueryRosterMetricEndpoint, {
      path: {}, query: { server_id: serverId }, body: { ...data, force: data.force ?? false },
    });
  }

  async getView(viewId: string, serverId: string): Promise<ApiResponse<RosterView>> {
    return this.executeEndpoint(DashboardGetRosterViewEndpoint, {
      path: { viewId }, query: { server_id: serverId }, body: {},
    });
  }

  async resolveSharedView(viewId: string): Promise<ApiResponse<RosterView>> {
    return this.executeEndpoint(DashboardResolveSharedRosterViewEndpoint, {
      path: { viewId }, query: {}, body: {},
    });
  }

  async createView(
    serverId: string,
    data: CreateRosterViewModel,
  ): Promise<ApiResponse<RosterView>> {
    return this.executeEndpoint(DashboardCreateRosterViewEndpoint, {
      path: {}, query: { server_id: serverId }, body: data,
    });
  }

  async updateView(
    viewId: string,
    serverId: string,
    data: UpdateRosterViewModel,
  ): Promise<ApiResponse<RosterView>> {
    return this.executeEndpoint(DashboardUpdateRosterViewEndpoint, {
      path: { viewId }, query: { server_id: serverId }, body: data,
    });
  }

  async deleteView(
    viewId: string,
    serverId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await this.executeEndpoint(DashboardDeleteRosterViewEndpoint, {
      path: { viewId }, query: { server_id: serverId }, body: {},
    });
    if (response.error !== undefined) {
      return { error: response.error, errorData: response.errorData, status: response.status };
    }
    return { data: { message: "Roster view deleted" }, status: response.status };
  }

  async previewView(
    serverId: string,
    view: MaterializedRosterView,
    rosterIds: string[],
  ): Promise<ApiResponse<{ view: RosterView; result: RosterViewResult }>> {
    return this.executeEndpoint(DashboardPreviewRosterViewEndpoint, {
      path: {},
      query: { server_id: serverId },
      body: {
        serverId,
        rosterIds,
        ...(view.id ? { viewId: view.id } : {}),
        name: view.name,
        sourceCode: view.sourceCode,
        sourceVersion: view.sourceVersion,
        columns: view.spec.columns,
        filters: view.spec.filters ?? [],
        sort: view.spec.sort ?? [],
        highlights: view.spec.highlights ?? [],
        limit: view.spec.limit ?? null,
      },
    });
  }

  async applyMembershipChanges(
    serverId: string,
    data: ApplyRosterMembershipChangesModel,
  ): Promise<ApiResponse<EndpointResponse<typeof DashboardApplyRosterMembershipChangesEndpoint>>> {
    return this.executeEndpoint(DashboardApplyRosterMembershipChangesEndpoint, {
      path: {}, query: { server_id: serverId }, body: data,
    });
  }
}
