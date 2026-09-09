import { dashboardEndpoints, ProxyClanEndpoint, type EndpointRequest, type EndpointResponse } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
// Roster API - Centralized API functions for the rosters module

import type {
  Roster,
  RosterMember,
  RosterAutomation,
  RosterGroup,
  Clan,
  ClanMember,
  MissingMembersResult,
  CreateRosterFormData,
  CloneRosterFormData,
  DiscordChannel,
  AutomationActionType,
} from './types';

// ============================================
// Helper
// ============================================

type ContractRoster = EndpointResponse<typeof dashboardEndpoints.dashboardGetRoster>["roster"];
type ContractRosterMember = ContractRoster["members"][number];
type ContractRosterGroup = EndpointResponse<typeof dashboardEndpoints.dashboardGetRosterGroup>["group"];
type ContractRosterAutomation = EndpointResponse<typeof dashboardEndpoints.dashboardCreateRosterAutomation>["rule"];

function timestampSeconds(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds / 1000 : undefined;
}

function toRosterMember(member: ContractRosterMember): RosterMember {
  const { last_online, added_at, last_updated, answers, ...rest } = member;
  return {
    ...rest,
    hero_lvs: member.hero_level_sum,
    current_league: member.league_name,
    last_online: timestampSeconds(last_online),
    added_at: timestampSeconds(added_at),
    last_updated: timestampSeconds(last_updated),
    signup_answers: typeof answers === "object" && answers !== null && !Array.isArray(answers)
      ? Object.fromEntries(Object.entries(answers)) : undefined,
  };
}

function toRoster(roster: ContractRoster): Roster {
  return {
    ...roster,
    members: roster.members.map(toRosterMember),
    columns: [...roster.columns],
    sort: [...roster.sort],
    signup_questions: roster.signup_questions?.map((question) => ({
      ...question,
      options: question.options ? [...question.options] : undefined,
    })),
  };
}

function toRosterGroup(group: ContractRosterGroup): RosterGroup {
  return {
    group_id: group.group_id,
    server_id: group.server_id,
    alias: group.alias ?? group.name,
    description: group.description,
    max_accounts_per_user: group.max_accounts_per_user,
    min_signups: group.min_signups,
    roster_count: group.rosters?.length,
    rosters: group.rosters?.map((roster) => ({
      id: roster.id,
      alias: roster.alias,
      clan_name: roster.clan_name ?? undefined,
      updated_at: roster.updated_at,
    })),
  };
}

function toRosterAutomation(rule: ContractRosterAutomation): RosterAutomation {
  return {
    automation_id: rule.automation_id,
    server_id: rule.server_id,
    roster_id: rule.roster_id,
    group_id: rule.group_id,
    action_type: parseAutomationActionType(rule.action_type),
    scheduled_at: rule.scheduled_at,
    discord_channel_id: rule.discord_channel_id,
    options: rule.options,
    active: rule.active,
    executed: rule.executed,
    executed_at: rule.executed_at,
    last_triggered_at: rule.last_triggered_at,
    execution_status: parseAutomationStatus(rule.execution_status),
    last_missed_at: rule.last_missed_at,
  };
}

function parseAutomationActionType(value: string): AutomationActionType {
  switch (value) {
    case "roster_signup": return value;
    case "roster_signup_close": return value;
    case "roster_post": return value;
    case "roster_ping": return value;
    case "roster_delete": return value;
    case "roster_clear": return value;
    case "roster_archive": return value;
    default: throw new Error(`Unsupported roster automation action: ${value}`);
  }
}

function parseAutomationStatus(value: string | undefined): RosterAutomation["execution_status"] {
  switch (value) {
    case "pending": return value;
    case "processing": return value;
    case "completed": return value;
    case "failed": return value;
    case "missed": return value;
    default: return undefined;
  }
}

// ============================================
// Rosters API
// ============================================

export async function fetchRosters(serverId: string, groupId?: string): Promise<Roster[]> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardListRosters, {
    path: { serverId },
    query: groupId ? { group_id: groupId } : {},
    body: {},
  });
  return response.rosters.map(toRoster);
}

export async function fetchRoster(rosterId: string, serverId: string): Promise<Roster> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardGetRoster, {
    path: { rosterId }, query: { server_id: serverId }, body: {},
  });
  return toRoster(response.roster);
}

export async function createRoster(serverId: string, data: CreateRosterFormData): Promise<Roster> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardCreateRoster, {
    path: {}, query: { server_id: serverId }, body: data,
  });
  return toRoster(response.roster);
}

export async function updateRoster(
  rosterId: string,
  serverId: string,
  data: EndpointRequest<typeof dashboardEndpoints.dashboardUpdateRoster>["body"]
): Promise<Roster> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardUpdateRoster, {
    path: { rosterId }, query: { server_id: serverId }, body: data,
  });
  return response.roster ? toRoster(response.roster) : fetchRoster(rosterId, serverId);
}

export async function deleteRoster(rosterId: string, serverId: string): Promise<void> {
  await executeSharedEndpoint(dashboardEndpoints.dashboardDeleteRoster, {
    path: { rosterId },
    query: { server_id: serverId },
    body: {},
  });
}

export async function clearRosterMembers(rosterId: string, serverId: string): Promise<void> {
  await executeSharedEndpoint(dashboardEndpoints.dashboardDeleteRoster, {
    path: { rosterId },
    query: { server_id: serverId, members_only: true },
    body: {},
  });
}

export async function cloneRoster(
  rosterId: string,
  serverId: string,
  data: CloneRosterFormData
): Promise<Roster> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardCloneRoster, {
    path: { rosterId }, query: { server_id: serverId }, body: data,
  });
  return toRoster(response.roster);
}

export async function refreshRoster(rosterId: string, serverId: string): Promise<Roster> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardRefreshRosters, {
    path: {}, query: { roster_id: rosterId, server_id: serverId }, body: {},
  });
  const roster = response.refreshed_rosters.find((item) => item.id === rosterId);
  return roster ? toRoster(roster) : fetchRoster(rosterId, serverId);
}

// ============================================
// Roster Members API
// ============================================

export async function addRosterMembers(
  rosterId: string,
  serverId: string,
  tags: string[]
): Promise<void> {
  // Transform tags array to the format expected by the API
  const addMembers = tags.map(tag => ({ tag }));

  await executeSharedEndpoint(dashboardEndpoints.dashboardManageRosterMembers, {
    path: { rosterId },
    query: { server_id: serverId },
    body: { add: addMembers },
  });
}

export async function removeRosterMember(
  rosterId: string,
  serverId: string,
  memberTag: string
): Promise<void> {
  await executeSharedEndpoint(dashboardEndpoints.dashboardRemoveRosterMember, {
    path: { rosterId, memberTag },
    query: { server_id: serverId },
    body: {},
  });
}

export async function refreshRosterMember(
  rosterId: string,
  serverId: string,
  memberTag: string
): Promise<RosterMember> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardRefreshRosterMember, {
    path: { rosterId, memberTag }, query: { server_id: serverId }, body: {},
  });
  return toRosterMember(response.member);
}

export async function refreshRosterDiscordIdentity(
	rosterId: string,
	serverId: string,
	memberTag: string,
): Promise<Pick<RosterMember, "discord" | "discord_username" | "discord_avatar_url">> {
	const data = await executeSharedEndpoint(dashboardEndpoints.dashboardRefreshRosterDiscordIdentity, {
		path: { serverId, rosterId },
		query: {},
		body: { playerTag: memberTag },
	});
	return {
		discord: data.discordUserId,
		discord_username: data.discordUsername,
		discord_avatar_url: data.discordAvatarUrl,
	};
}

export async function fetchMissingMembers(
  serverId: string,
  rosterId?: string,
  groupId?: string
): Promise<MissingMembersResult> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardMissingRosterMembers, {
    path: {},
    query: { server_id: serverId, ...(rosterId ? { roster_id: rosterId } : {}), ...(groupId ? { group_id: groupId } : {}) },
    body: {},
  });
  return { ...response, results: response.results.map((result) => ({ ...result, missing_members: [...result.missing_members] })) };
}

// ============================================
// Server Members API
// ============================================

export async function fetchServerMembers(serverId: string): Promise<ClanMember[]> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardServerClanMembers, {
    path: { serverId }, query: {}, body: {},
  });
  return [...response.members];
}

export async function fetchClanMembers(clanTag: string): Promise<ClanMember[]> {
  const clan = await executeSharedEndpoint(ProxyClanEndpoint, {
    path: { clanTag }, query: {}, body: {},
  });
  return (clan.memberList ?? []).map((member) => ({
    tag: member.tag, name: member.name, townhall: member.townHallLevel,
    clan_tag: clan.tag, clan_name: clan.name,
  }));
}

// ============================================
// Clans API
// ============================================

export async function fetchClans(serverId: string): Promise<Clan[]> {
  const response = await executeSharedEndpoint(dashboardEndpoints.serverClans, {
    path: { serverId },
    query: {},
    body: {},
  });
  return response.map((clan) => ({
    tag: clan.tag,
    name: clan.name,
    badge_url: clan.badge_url,
  }));
}

// ============================================
// Automations API
// ============================================

export async function fetchAutomations(
  serverId: string,
  rosterId?: string,
  groupId?: string
): Promise<RosterAutomation[]> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardListRosterAutomations, {
    path: {},
    query: {
      server_id: serverId,
      ...(rosterId ? { roster_id: rosterId } : {}),
      ...(groupId ? { group_id: groupId } : {}),
    },
    body: {},
  });
  return response.items.map(toRosterAutomation);
}

export async function createAutomation(
  data: Omit<RosterAutomation, 'automation_id' | 'executed' | 'created_at' | 'updated_at'>
): Promise<RosterAutomation> {
  const { server_id: serverId, ...payload } = data;
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardCreateRosterAutomation, {
    path: {},
    query: { server_id: serverId },
    body: {
      action_type: payload.action_type,
      scheduled_at: payload.scheduled_at,
      ...(payload.roster_id !== undefined ? { roster_id: payload.roster_id } : {}),
      ...(payload.group_id !== undefined ? { group_id: payload.group_id } : {}),
      ...(payload.discord_channel_id !== undefined ? { discord_channel_id: payload.discord_channel_id } : {}),
      ...(payload.options !== undefined ? { options: payload.options } : {}),
      ...(payload.active !== undefined ? { active: payload.active } : {}),
    },
  });
  return toRosterAutomation(response.rule);
}

export async function updateAutomation(
  automationId: string,
  serverId: string,
  data: Partial<RosterAutomation>
): Promise<RosterAutomation> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardUpdateRosterAutomation, {
    path: { automationId },
    query: { server_id: serverId },
    body: {
      ...(data.roster_id !== undefined ? { roster_id: data.roster_id } : {}),
      ...(data.group_id !== undefined ? { group_id: data.group_id } : {}),
      ...(data.action_type !== undefined ? { action_type: data.action_type } : {}),
      ...(data.scheduled_at !== undefined ? { scheduled_at: data.scheduled_at } : {}),
      ...(data.discord_channel_id !== undefined ? { discord_channel_id: data.discord_channel_id } : {}),
      ...(data.options !== undefined ? { options: data.options } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });
  return toRosterAutomation(response.rule);
}


export async function deleteAutomation(automationId: string, serverId: string): Promise<void> {
  await executeSharedEndpoint(dashboardEndpoints.dashboardDeleteRosterAutomation, {
    path: { automationId },
    query: { server_id: serverId },
    body: {},
  });
}

// ============================================
// Groups API
// ============================================

export async function fetchGroups(serverId: string): Promise<RosterGroup[]> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardListRosterGroups, {
    path: {},
    query: { server_id: serverId },
    body: {},
  });
  return response.items.map(toRosterGroup);
}

export async function createGroup(
  serverId: string,
  alias: string
): Promise<RosterGroup> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardCreateRosterGroup, {
    path: {},
    query: { server_id: serverId },
    body: {
      server_id: serverId,
      alias,
    },
  });
  return toRosterGroup(response.group);
}

export async function updateGroup(
  groupId: string,
  serverId: string,
  data: Partial<RosterGroup>
): Promise<RosterGroup> {
  const response = await executeSharedEndpoint(dashboardEndpoints.dashboardUpdateRosterGroup, {
    path: { groupId },
    query: { server_id: serverId },
    body: data,
  });
  return toRosterGroup(response.group);
}

export async function deleteGroup(groupId: string, serverId: string): Promise<void> {
  await executeSharedEndpoint(dashboardEndpoints.dashboardDeleteRosterGroup, {
    path: { groupId },
    query: { server_id: serverId },
    body: {},
  });
}

// ============================================
// Discord Channels API
// ============================================

export async function fetchChannels(serverId: string): Promise<DiscordChannel[]> {
  const response = await executeSharedEndpoint(dashboardEndpoints.serverChannels, {
    path: { serverId },
    query: {},
    body: {},
  });
  return response.map((channel) => ({ ...channel }));
}
