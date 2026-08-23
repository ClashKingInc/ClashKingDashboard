import { getAccessToken } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/fetch";
// Roster API - Centralized API functions for the rosters module

import { normalizeChannelsPayload } from '@/lib/dashboard-cache';
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
} from './types';

// ============================================
// Helper
// ============================================

function getAuthHeaders(): HeadersInit {
  const token = globalThis.window === undefined ? null : getAccessToken();
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// ============================================
// Rosters API
// ============================================

export async function fetchRosters(serverId: string, groupId?: string): Promise<Roster[]> {
  const params = new URLSearchParams();
  if (groupId) params.append('group_id', groupId);
  const queryString = params.toString();
  const querySuffix = queryString ? `?${queryString}` : '';
  const url = `/v2/roster/${serverId}/list${querySuffix}`;

  const response = await apiFetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ items?: Roster[]; rosters?: Roster[] } | Roster[]>(response);
  if (Array.isArray(data)) return data;
  return data.rosters || data.items || [];
}

export async function fetchRoster(rosterId: string, serverId: string): Promise<Roster> {
  const response = await apiFetch(`/v2/roster/${encodeURIComponent(rosterId)}?server_id=${encodeURIComponent(serverId)}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ roster?: Roster } | Roster>(response);
  if ('roster' in data && data.roster) {
    return data.roster;
  }
  return data as Roster;
}

export async function createRoster(serverId: string, data: CreateRosterFormData): Promise<Roster> {
  const response = await apiFetch(`/v2/roster?server_id=${serverId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      server_id: serverId,
      ...data,
    }),
  });
  return handleResponse<Roster>(response);
}

export async function updateRoster(
  rosterId: string,
  serverId: string,
  data: Partial<Roster>
): Promise<Roster> {
  const response = await apiFetch(`/v2/roster/${rosterId}?server_id=${serverId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const result = await handleResponse<{ roster?: Roster } | Roster>(response);
  if ('roster' in result && result.roster) {
    return result.roster;
  }
  return result as Roster;
}

export async function deleteRoster(rosterId: string, serverId: string): Promise<void> {
  const response = await apiFetch(`/v2/roster/${rosterId}?server_id=${serverId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete roster');
  }
}

export async function clearRosterMembers(rosterId: string, serverId: string): Promise<void> {
  const response = await apiFetch(`/v2/roster/${rosterId}?server_id=${serverId}&members_only=true`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to clear roster members');
  }
}

export async function cloneRoster(
  rosterId: string,
  serverId: string,
  data: CloneRosterFormData
): Promise<Roster> {
  const response = await apiFetch(`/v2/roster/${rosterId}/clone?server_id=${serverId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Roster>(response);
}

export async function refreshRoster(rosterId: string, serverId: string): Promise<Roster> {
  const response = await apiFetch(
    `/v2/roster/refresh?roster_id=${rosterId}&server_id=${serverId}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  return handleResponse<Roster>(response);
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

  const response = await apiFetch(`/v2/roster/${rosterId}/members?server_id=${serverId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ add: addMembers }),
  });
  if (!response.ok) {
    throw new Error('Failed to add members');
  }
}

export async function removeRosterMember(
  rosterId: string,
  serverId: string,
  memberTag: string
): Promise<void> {
  const response = await apiFetch(
    `/v2/roster/${rosterId}/members/${encodeURIComponent(memberTag)}?server_id=${serverId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to remove member');
  }
}

export async function refreshRosterMember(
  rosterId: string,
  serverId: string,
  memberTag: string
): Promise<RosterMember> {
  const response = await apiFetch(
    `/v2/roster/${rosterId}/members/${encodeURIComponent(memberTag)}/refresh?server_id=${serverId}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) throw new Error('Failed to refresh member');
  const data = await response.json();
  return data.member;
}

export async function refreshRosterDiscordIdentity(
	rosterId: string,
	serverId: string,
	memberTag: string,
): Promise<Pick<RosterMember, "discord" | "discord_username" | "discord_avatar_url">> {
	const response = await apiFetch(
		`/v2/server/${encodeURIComponent(serverId)}/rosters/${encodeURIComponent(rosterId)}/discord-identity/refresh`,
		{
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify({ playerTag: memberTag }),
		},
	);
	if (!response.ok) throw new Error("Failed to refresh Discord identity");
	const data = await response.json();
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
  const params = new URLSearchParams({ server_id: serverId });
  if (rosterId) params.append('roster_id', rosterId);
  if (groupId) params.append('group_id', groupId);

  const response = await apiFetch(`/v2/roster/missing-members?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<MissingMembersResult>(response);
}

// ============================================
// Server Members API
// ============================================

export async function fetchServerMembers(serverId: string): Promise<ClanMember[]> {
  const response = await apiFetch(`/v2/roster/server/${serverId}/members`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ members?: ClanMember[] } | ClanMember[]>(response);
  return Array.isArray(data) ? data : data.members || [];
}

export async function fetchClanMembers(clanTag: string): Promise<ClanMember[]> {
  const response = await apiFetch(`https://proxy.clashk.ing/v1/clans/${encodeURIComponent(clanTag)}/members`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ items?: ClanMember[]; members?: ClanMember[]; clan_tag?: string } | ClanMember[]>(response);
  return Array.isArray(data) ? data : data.items || data.members || [];
}

// ============================================
// Clans API
// ============================================

export async function fetchClans(serverId: string): Promise<Clan[]> {
  const response = await apiFetch(`/v2/server/${serverId}/clans`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ items?: Clan[] } | Clan[]>(response);
  return Array.isArray(data) ? data : data.items || [];
}

// ============================================
// Automations API
// ============================================

export async function fetchAutomations(
  serverId: string,
  rosterId?: string,
  groupId?: string
): Promise<RosterAutomation[]> {
  const params = new URLSearchParams({ server_id: serverId });
  if (rosterId) params.append('roster_id', rosterId);
  if (groupId) params.append('group_id', groupId);

  const response = await apiFetch(`/v2/roster-automation/list?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ items?: RosterAutomation[] }>(response);
  return data.items || [];
}

export async function createAutomation(
  data: Omit<RosterAutomation, 'automation_id' | 'executed' | 'created_at' | 'updated_at'>
): Promise<RosterAutomation> {
  const response = await apiFetch('/v2/roster-automation', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<RosterAutomation>(response);
}

export async function updateAutomation(
  automationId: string,
  serverId: string,
  data: Partial<RosterAutomation>
): Promise<RosterAutomation> {
  const response = await apiFetch(`/v2/roster-automation/${automationId}?server_id=${serverId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<RosterAutomation>(response);
}


export async function deleteAutomation(automationId: string, serverId: string): Promise<void> {
  const response = await apiFetch(`/v2/roster-automation/${automationId}?server_id=${serverId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete automation');
  }
}

// ============================================
// Groups API
// ============================================

export async function fetchGroups(serverId: string): Promise<RosterGroup[]> {
  const response = await apiFetch(`/v2/roster-group/list?server_id=${serverId}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ items?: RosterGroup[] } | RosterGroup[]>(response);
  return Array.isArray(data) ? data : data.items || [];
}

export async function createGroup(
  serverId: string,
  alias: string
): Promise<RosterGroup> {
  const response = await apiFetch(`/v2/roster-group?server_id=${serverId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      server_id: serverId,
      alias,
    }),
  });
  return handleResponse<RosterGroup>(response);
}

export async function updateGroup(
  groupId: string,
  serverId: string,
  data: Partial<RosterGroup>
): Promise<RosterGroup> {
  const response = await apiFetch(`/v2/roster-group/${groupId}?server_id=${serverId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<RosterGroup>(response);
}

export async function deleteGroup(groupId: string, serverId: string): Promise<void> {
  const response = await apiFetch(`/v2/roster-group/${groupId}?server_id=${serverId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete group');
  }
}

// ============================================
// Discord Channels API
// ============================================

export async function fetchChannels(serverId: string): Promise<DiscordChannel[]> {
  const response = await apiFetch(`/v2/server/${serverId}/channels`, {
    headers: getAuthHeaders(),
  });
  return normalizeChannelsPayload(await handleResponse<unknown>(response)) as DiscordChannel[];
}
