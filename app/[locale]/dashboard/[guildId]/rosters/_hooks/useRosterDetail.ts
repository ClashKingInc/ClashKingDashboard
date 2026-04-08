"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Roster,
  Clan,
  ClanMember,
  RosterAutomation,
  RosterGroup,
  SignupCategory,
  MissingMembersResult,
  DiscordChannel,
} from '../_lib/types';
import * as api from '../_lib/api';

interface UseRosterDetailResult {
  // Data
  roster: Roster | null;
  clans: Clan[];
  clanMembers: ClanMember[];
  serverMembers: ClanMember[];
  automations: RosterAutomation[];
  groups: RosterGroup[];
  categories: SignupCategory[];
  channels: DiscordChannel[];
  missingMembers: MissingMembersResult | null;

  // Loading states
  loading: boolean;
  loadingAutomations: boolean;
  loadingGroups: boolean;
  loadingCategories: boolean;
  loadingChannels: boolean;
  loadingMissingMembers: boolean;
  loadingServerMembers: boolean;

  // Error
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  refreshRoster: () => Promise<void>;
  updateRoster: (data: Partial<Roster>) => Promise<void>;
  addMembers: (tags: string[]) => Promise<void>;
  removeMember: (tag: string) => Promise<void>;
  clearMembers: () => Promise<void>;
  updateMemberCategory: (memberTag: string, categoryId: string | null) => Promise<void>;
  refreshMember: (memberTag: string) => Promise<void>;
  loadMissingMembers: (groupId?: string) => Promise<void>;
  loadServerMembers: () => Promise<void>;

  // Automation actions
  createAutomation: (data: Omit<RosterAutomation, 'automation_id' | 'executed' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAutomation: (automationId: string, data: Partial<RosterAutomation>) => Promise<void>;
  deleteAutomation: (automationId: string) => Promise<void>;

  // Group actions
  createGroup: (alias: string) => Promise<void>;
  updateGroup: (groupId: string, data: Partial<RosterGroup>) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;

  // Category actions
  createCategory: (alias: string) => Promise<SignupCategory>;
  updateCategory: (categoryId: string, data: Partial<SignupCategory>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

export function useRosterDetail(rosterId: string, serverId: string): UseRosterDetailResult {
  // Ref to always have current group_id without adding roster as a dep to every callback
  const groupIdRef = useRef<string | null | undefined>(undefined);
  const channelsLoadedRef = useRef(false);

  // Data state
  const [roster, setRoster] = useState<Roster | null>(null);
  const [clans, setClans] = useState<Clan[]>([]);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [serverMembers, setServerMembers] = useState<ClanMember[]>([]);
  const [automations, setAutomations] = useState<RosterAutomation[]>([]);
  const [groups, setGroups] = useState<RosterGroup[]>([]);
  const [categories, setCategories] = useState<SignupCategory[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [missingMembers, setMissingMembers] = useState<MissingMembersResult | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingAutomations, setLoadingAutomations] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingMissingMembers, setLoadingMissingMembers] = useState(false);
  const [loadingServerMembers, setLoadingServerMembers] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    channelsLoadedRef.current = false;
  }, [serverId]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!rosterId || !serverId) return;

    setLoading(true);
    setError(null);

    try {
      const [rosterData, clansData] = await Promise.all([
        api.fetchRoster(rosterId, serverId),
        api.fetchClans(serverId),
      ]);

      setRoster(rosterData);
      groupIdRef.current = rosterData.group_id ?? null;
      setClans(clansData);

      // Load clan members if roster has a clan
      if (rosterData.clan_tag) {
        const members = await api.fetchClanMembers(rosterData.clan_tag);
        setClanMembers(members);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, [rosterId, serverId]);

  // Load automations (roster-specific + group automations if roster belongs to a group)
  const loadAutomations = useCallback(async (groupId?: string | null) => {
    setLoadingAutomations(true);
    try {
      // Fetch roster-specific automations
      const rosterAutomations = await api.fetchAutomations(serverId, rosterId);

      // If roster belongs to a group, also fetch group automations
      let groupAutomations: RosterAutomation[] = [];
      if (groupId) {
        groupAutomations = await api.fetchAutomations(serverId, undefined, groupId);
      }

      // Merge and mark group automations
      const allAutomations = [
        ...rosterAutomations,
        ...groupAutomations.map(a => ({ ...a, _isGroupAutomation: true })),
      ];

      setAutomations(allAutomations as RosterAutomation[]);
    } catch (err) {
      console.error('Failed to load automations:', err);
    } finally {
      setLoadingAutomations(false);
    }
  }, [serverId, rosterId]);

  // Load groups
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const data = await api.fetchGroups(serverId);
      setGroups(data);
    } catch (err) {
      console.error('[useRosterDetail] Failed to load groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [serverId]);

  // Load categories
  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await api.fetchCategories(serverId);
      setCategories(data);
    } catch (err) {
      console.error('[useRosterDetail] Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  }, [serverId]);

  // Load Discord channels
  const loadChannels = useCallback(async () => {
    if (channelsLoadedRef.current) return;
    setLoadingChannels(true);
    try {
      const data = await api.fetchChannels(serverId);
      setChannels(data);
      channelsLoadedRef.current = true;
    } catch (err) {
      console.error('[useRosterDetail] Failed to load channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  }, [serverId]);

  // Initial load
  useEffect(() => {
    loadData();
    loadGroups();
    loadCategories();
    loadChannels();
  }, [loadData, loadGroups, loadCategories, loadChannels]);

  // Load automations when roster is loaded (to include group automations)
  useEffect(() => {
    if (roster) {
      loadAutomations(roster.group_id);
    }
  }, [roster?.group_id, loadAutomations]);

  // Refresh roster data from API
  const refreshRoster = useCallback(async () => {
    try {
      await api.refreshRoster(rosterId, serverId);
      // Reload roster data to get updated members
      await loadData();
    } catch (err) {
      throw err;
    }
  }, [rosterId, serverId, loadData]);

  // Update roster
  const updateRoster = useCallback(async (data: Partial<Roster>) => {
    const updated = await api.updateRoster(rosterId, serverId, data);
    // Preserve existing members if the API response doesn't include them
    setRoster(prev => ({
      ...prev,
      ...updated,
      members: updated.members ?? prev?.members,
    } as Roster));
  }, [rosterId, serverId]);

  // Add members
  const addMembers = useCallback(async (tags: string[]) => {
    await api.addRosterMembers(rosterId, serverId, tags);
    await loadData(); // Reload to get updated members
  }, [rosterId, serverId, loadData]);

  // Clear all members
  const clearMembers = useCallback(async () => {
    await api.clearRosterMembers(rosterId, serverId);
    setRoster(prev => prev ? { ...prev, members: [] } : null);
  }, [rosterId, serverId]);

  // Remove member
  const removeMember = useCallback(async (tag: string) => {
    await api.removeRosterMember(rosterId, serverId, tag);
    setRoster(prev => {
      if (!prev) return null;
      return {
        ...prev,
        members: prev.members?.filter(m => m.tag !== tag),
      };
    });
  }, [rosterId, serverId]);

  // Update member category
  const updateMemberCategory = useCallback(async (memberTag: string, categoryId: string | null) => {
    await api.updateMemberCategory(rosterId, serverId, memberTag, categoryId);
    setRoster(prev => {
      if (!prev) return null;
      return {
        ...prev,
        members: prev.members?.map(m =>
          m.tag === memberTag ? { ...m, signup_group: categoryId } : m
        ),
      };
    });
  }, [rosterId, serverId]);

  // Refresh single member
  const refreshMember = useCallback(async (memberTag: string) => {
    const updated = await api.refreshRosterMember(rosterId, serverId, memberTag);
    setRoster(prev => {
      if (!prev) return null;
      return {
        ...prev,
        members: prev.members?.map(m => m.tag === memberTag ? { ...m, ...updated } : m),
      };
    });
  }, [rosterId, serverId]);

  // Load missing members (for current roster or its group)
  const loadMissingMembers = useCallback(async (groupId?: string) => {
    setLoadingMissingMembers(true);
    try {
      const data = groupId
        ? await api.fetchMissingMembers(serverId, undefined, groupId)
        : await api.fetchMissingMembers(serverId, rosterId);
      setMissingMembers(data);
    } catch (err) {
      console.error('Failed to load missing members:', err);
    } finally {
      setLoadingMissingMembers(false);
    }
  }, [serverId, rosterId]);

  // Load server members (for autocomplete)
  const loadServerMembers = useCallback(async () => {
    if (serverMembers.length > 0) return; // Already loaded
    setLoadingServerMembers(true);
    try {
      const data = await api.fetchServerMembers(serverId);
      setServerMembers(data);
    } catch (err) {
      console.error('Failed to load server members:', err);
    } finally {
      setLoadingServerMembers(false);
    }
  }, [serverId, serverMembers.length]);

  // Automation actions
  const createAutomation = useCallback(async (
    data: Omit<RosterAutomation, 'automation_id' | 'executed' | 'created_at' | 'updated_at'>
  ) => {
    await api.createAutomation(data);
    await loadAutomations(groupIdRef.current);
  }, [loadAutomations]);

  const updateAutomation = useCallback(async (automationId: string, data: Partial<RosterAutomation>) => {
    await api.updateAutomation(automationId, serverId, data);
    await loadAutomations(groupIdRef.current);
  }, [serverId, loadAutomations]);

  const deleteAutomation = useCallback(async (automationId: string) => {
    await api.deleteAutomation(automationId, serverId);
    await loadAutomations(groupIdRef.current);
  }, [serverId, loadAutomations]);

  // Group actions
  const createGroup = useCallback(async (alias: string) => {
    await api.createGroup(serverId, alias);
    await loadGroups();
  }, [serverId, loadGroups]);

  const updateGroup = useCallback(async (groupId: string, data: Partial<RosterGroup>) => {
    await api.updateGroup(groupId, serverId, data);
    await loadGroups();
  }, [serverId, loadGroups]);

  const deleteGroup = useCallback(async (groupId: string) => {
    await api.deleteGroup(groupId, serverId);
    setGroups(prev => prev.filter(g => g.group_id !== groupId));
  }, [serverId]);

  // Category actions
  const createCategory = useCallback(async (alias: string): Promise<SignupCategory> => {
    const created = await api.createCategory(serverId, alias);
    await loadCategories();
    return created;
  }, [serverId, loadCategories]);

  const updateCategory = useCallback(async (categoryId: string, data: Partial<SignupCategory>) => {
    await api.updateCategory(categoryId, serverId, data);
    await loadCategories();
  }, [serverId, loadCategories]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    await api.deleteCategory(categoryId, serverId);
    setCategories(prev => prev.filter(c => c.custom_id !== categoryId));
  }, [serverId]);

  return {
    // Data
    roster,
    clans,
    clanMembers,
    serverMembers,
    automations,
    groups,
    categories,
    channels,
    missingMembers,

    // Loading states
    loading,
    loadingAutomations,
    loadingGroups,
    loadingCategories,
    loadingChannels,
    loadingMissingMembers,
    loadingServerMembers,

    // Error
    error,

    // Actions
    refresh: loadData,
    refreshRoster,
    updateRoster,
    addMembers,
    removeMember,
    clearMembers,
    updateMemberCategory,
    refreshMember,
    loadMissingMembers,
    loadServerMembers,

    // Automation actions
    createAutomation,
    updateAutomation,
    deleteAutomation,

    // Group actions
    createGroup,
    updateGroup,
    deleteGroup,

    // Category actions
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
