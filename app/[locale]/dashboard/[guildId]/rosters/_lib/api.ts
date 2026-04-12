// Roster API - Centralized API functions for the rosters module

import type {
  Roster,
  RosterMember,
  RosterAutomation,
  RosterGroup,
  SignupCategory,
  Clan,
  ClanMember,
  MissingMembersResult,
  CreateRosterFormData,
  CloneRosterFormData,
  DiscordChannel,
} from './types';

export interface RosterTokenResult {
  access_url: string;
  token: string;
  expires_at: string;
  server_info: { server_id: string; roster_count: number };
}

// ============================================
// Helper
// ============================================

function getAuthHeaders(): HeadersInit {
  const token = globalThis.window === undefined ? null : localStorage.getItem('access_token');
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
  const url = `/api/v2/roster/${serverId}/list${querySuffix}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ items?: Roster[]; rosters?: Roster[] } | Roster[]>(response);
  if (Array.isArray(data)) return data;
  return data.rosters || data.items || [];
}

export async function fetchRoster(rosterId: string, serverId: string): Promise<Roster> {
  const response = await fetch(`/api/v2/roster/${rosterId}?server_id=${serverId}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ roster?: Roster } | Roster>(response);
  if ('roster' in data && data.roster) {
    return data.roster;
  }
  return data as Roster;
}

export async function createRoster(serverId: string, data: CreateRosterFormData): Promise<Roster> {
  const response = await fetch(`/api/v2/roster?server_id=${serverId}`, {
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
  const response = await fetch(`/api/v2/roster/${rosterId}?server_id=${serverId}`, {
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
  const response = await fetch(`/api/v2/roster/${rosterId}?server_id=${serverId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete roster');
  }
}

export async function clearRosterMembers(rosterId: string, serverId: string): Promise<void> {
  const response = await fetch(`/api/v2/roster/${rosterId}?server_id=${serverId}&members_only=true`, {
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
  const response = await fetch(`/api/v2/roster/${rosterId}/clone?server_id=${serverId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Roster>(response);
}

export async function refreshRoster(rosterId: string, serverId: string): Promise<Roster> {
  const response = await fetch(
    `/api/v2/roster/refresh?roster_id=${rosterId}&server_id=${serverId}`,
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

  const response = await fetch(`/api/v2/roster/${rosterId}/members?server_id=${serverId}`, {
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
  const response = await fetch(
    `/api/v2/roster/${rosterId}/members/${encodeURIComponent(memberTag)}?server_id=${serverId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to remove member');
  }
}

export async function updateMemberCategory(
  rosterId: string,
  serverId: string,
  memberTag: string,
  categoryId: string | null
): Promise<void> {
  const response = await fetch(
    `/api/v2/roster/${rosterId}/members/${encodeURIComponent(memberTag)}?server_id=${serverId}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ signup_group: categoryId }),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to update member category');
  }
}

export async function refreshRosterMember(
  rosterId: string,
  serverId: string,
  memberTag: string
): Promise<RosterMember> {
  const response = await fetch(
    `/api/v2/roster/${rosterId}/members/${encodeURIComponent(memberTag)}/refresh?server_id=${serverId}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) throw new Error('Failed to refresh member');
  const data = await response.json();
  return data.member;
}

export async function fetchMissingMembers(
  serverId: string,
  rosterId?: string,
  groupId?: string
): Promise<MissingMembersResult> {
  const params = new URLSearchParams({ server_id: serverId });
  if (rosterId) params.append('roster_id', rosterId);
  if (groupId) params.append('group_id', groupId);

  const response = await fetch(`/api/v2/roster/missing-members?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<MissingMembersResult>(response);
}

export async function generateRosterToken(
  serverId: string,
  rosterId?: string
): Promise<RosterTokenResult> {
  const params = new URLSearchParams({ server_id: serverId });
  if (rosterId) params.append('roster_id', rosterId);

  const response = await fetch(`/api/v2/roster-token?${params.toString()}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse<RosterTokenResult>(response);
}

// ============================================
// Server Members API
// ============================================

export async function fetchServerMembers(serverId: string): Promise<ClanMember[]> {
  const response = await fetch(`/api/v2/roster/server/${serverId}/members`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ members?: ClanMember[] } | ClanMember[]>(response);
  return Array.isArray(data) ? data : data.members || [];
}

export async function fetchClanMembers(clanTag: string): Promise<ClanMember[]> {
  const response = await fetch(`https://proxy.clashk.ing/v1/clans/${encodeURIComponent(clanTag)}/members`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ members?: ClanMember[]; clan_tag?: string } | ClanMember[]>(response);
  return Array.isArray(data) ? data : data.members || [];
}

// ============================================
// Clans API
// ============================================

export async function fetchClans(serverId: string): Promise<Clan[]> {
  const response = await fetch(`/api/v2/server/${serverId}/clans`, {
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

  const response = await fetch(`/api/v2/roster-automation/list?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ items?: RosterAutomation[] }>(response);
  return data.items || [];
}

export async function createAutomation(
  data: Omit<RosterAutomation, 'automation_id' | 'executed' | 'created_at' | 'updated_at'>
): Promise<RosterAutomation> {
  const response = await fetch('/api/v2/roster-automation', {
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
  const response = await fetch(`/api/v2/roster-automation/${automationId}?server_id=${serverId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<RosterAutomation>(response);
}


export async function deleteAutomation(automationId: string, serverId: string): Promise<void> {
  const response = await fetch(`/api/v2/roster-automation/${automationId}?server_id=${serverId}`, {
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
  const response = await fetch(`/api/v2/roster-group/list?server_id=${serverId}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ items?: RosterGroup[] } | RosterGroup[]>(response);
  return Array.isArray(data) ? data : data.items || [];
}

export async function createGroup(
  serverId: string,
  alias: string
): Promise<RosterGroup> {
  const response = await fetch(`/api/v2/roster-group?server_id=${serverId}`, {
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
  const response = await fetch(`/api/v2/roster-group/${groupId}?server_id=${serverId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<RosterGroup>(response);
}

export async function deleteGroup(groupId: string, serverId: string): Promise<void> {
  const response = await fetch(`/api/v2/roster-group/${groupId}?server_id=${serverId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete group');
  }
}

// ============================================
// Categories API
// ============================================

export async function fetchCategories(serverId: string): Promise<SignupCategory[]> {
  const response = await fetch(`/api/v2/roster-signup-category/list?server_id=${serverId}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ items?: SignupCategory[] } | SignupCategory[]>(response);
  return Array.isArray(data) ? data : data.items || [];
}

export async function createCategory(
  serverId: string,
  alias: string
): Promise<SignupCategory> {
  const response = await fetch(`/api/v2/roster-signup-category?server_id=${serverId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      server_id: serverId,
      alias,
    }),
  });
  return handleResponse<SignupCategory>(response);
}

export async function updateCategory(
  categoryId: string,
  serverId: string,
  data: Partial<SignupCategory>
): Promise<SignupCategory> {
  const response = await fetch(
    `/api/v2/roster-signup-category/${categoryId}?server_id=${serverId}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  return handleResponse<SignupCategory>(response);
}

export async function deleteCategory(categoryId: string, serverId: string): Promise<void> {
  const response = await fetch(
    `/api/v2/roster-signup-category/${categoryId}?server_id=${serverId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to delete category');
  }
}

// ============================================
// Discord Channels API
// ============================================

export async function fetchChannels(serverId: string): Promise<DiscordChannel[]> {
  const response = await fetch(`/api/v2/server/${serverId}/channels`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<DiscordChannel[]>(response);
}
