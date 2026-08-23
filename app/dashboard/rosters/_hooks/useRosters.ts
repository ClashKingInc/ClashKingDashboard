"use client";

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Roster, Clan, CreateRosterFormData, CloneRosterFormData } from '../_lib/types';
import * as api from '../_lib/api';
import { dashboardQueryKeys } from '@/lib/dashboard-query';
import { dashboardQueryOptions } from '@/lib/dashboard-query-options';

interface UseRostersResult {
  rosters: Roster[];
  clans: Clan[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshRoster: (rosterId: string) => Promise<Roster>;
  createRoster: (data: CreateRosterFormData) => Promise<Roster>;
  renameRoster: (rosterId: string, alias: string) => Promise<Roster>;
  deleteRoster: (rosterId: string) => Promise<void>;
  cloneRoster: (rosterId: string, data: CloneRosterFormData) => Promise<Roster>;
}

export function useRosters(serverId: string): UseRostersResult {
  const queryClient = useQueryClient();
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invalidateCache = useCallback(() => {
    if (!serverId) return;
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("rosters", serverId), exact: true });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.clans(serverId), exact: true });
  }, [queryClient, serverId]);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!serverId) return;

    if (forceRefresh) {
      invalidateCache();
    }

    setLoading(true);
    setError(null);

    try {
      const [rostersData, clansData] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: dashboardQueryKeys.route("rosters", serverId),
          queryFn: () => api.fetchRosters(serverId),
        }),
        queryClient.fetchQuery(dashboardQueryOptions.clans(serverId)),
      ]);
      setRosters(rostersData);
      setClans(clansData.map((clan) => ({
        tag: clan.tag,
        name: clan.name,
        badge: clan.badge ?? undefined,
        badge_url: clan.badge_url ?? clan.clan_badge_url ?? null,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [serverId, invalidateCache, queryClient]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createRoster = useCallback(async (data: CreateRosterFormData): Promise<Roster> => {
    const newRoster = await api.createRoster(serverId, data);
    await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("rosters", serverId), exact: true });
    setRosters(prev => [...prev, newRoster]);
    return newRoster;
  }, [queryClient, serverId]);

  const deleteRoster = useCallback(async (rosterId: string): Promise<void> => {
    await api.deleteRoster(rosterId, serverId);
    await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("rosters", serverId), exact: true });
    setRosters(prev => prev.filter(r => r.id !== rosterId));
  }, [queryClient, serverId]);

  const renameRoster = useCallback(async (rosterId: string, alias: string): Promise<Roster> => {
    const updatedRoster = await api.updateRoster(rosterId, serverId, { alias });
    await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("rosters", serverId), exact: true });
    setRosters(prev => prev.map(roster => roster.id === rosterId
      ? { ...roster, ...updatedRoster, alias }
      : roster));
    return updatedRoster;
  }, [queryClient, serverId]);

  const refreshRoster = useCallback(async (rosterId: string): Promise<Roster> => {
    await api.refreshRoster(rosterId, serverId);
    const refreshedRoster = await api.fetchRoster(rosterId, serverId);
    await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("rosters", serverId), exact: true });
    setRosters(prev => prev.map(roster => roster.id === rosterId ? refreshedRoster : roster));
    return refreshedRoster;
  }, [queryClient, serverId]);

  const cloneRoster = useCallback(async (rosterId: string, data: CloneRosterFormData): Promise<Roster> => {
    const clonedRoster = await api.cloneRoster(rosterId, serverId, data);
    await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("rosters", serverId), exact: true });
    setRosters(prev => [...prev, clonedRoster]);
    return clonedRoster;
  }, [queryClient, serverId]);

  const refresh = useCallback(async (): Promise<void> => {
    await loadData(true);
  }, [loadData]);

  return {
    rosters,
    clans,
    loading,
    error,
    refresh,
    refreshRoster,
    createRoster,
    renameRoster,
    deleteRoster,
    cloneRoster,
  };
}
