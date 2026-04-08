"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Roster, Clan, CreateRosterFormData, CloneRosterFormData } from '../_lib/types';
import * as api from '../_lib/api';
import { apiCache } from '@/lib/api-cache';

const ROSTERS_CACHE_TTL = 60000;
const CLANS_CACHE_TTL = 120000;

function getRostersCacheKey(serverId: string): string {
  return `rosters-list-${serverId}`;
}

function getClansCacheKey(serverId: string): string {
  return `rosters-clans-${serverId}`;
}

interface UseRostersResult {
  rosters: Roster[];
  clans: Clan[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createRoster: (data: CreateRosterFormData) => Promise<Roster>;
  deleteRoster: (rosterId: string) => Promise<void>;
  cloneRoster: (rosterId: string, data: CloneRosterFormData) => Promise<Roster>;
}

export function useRosters(serverId: string): UseRostersResult {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invalidateCache = useCallback(() => {
    if (!serverId) return;
    apiCache.invalidate(getRostersCacheKey(serverId));
    apiCache.invalidate(getClansCacheKey(serverId));
  }, [serverId]);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!serverId) return;

    if (forceRefresh) {
      invalidateCache();
    }

    setLoading(true);
    setError(null);

    try {
      const [rostersData, clansData] = await Promise.all([
        apiCache.get(
          getRostersCacheKey(serverId),
          () => api.fetchRosters(serverId),
          ROSTERS_CACHE_TTL
        ),
        apiCache.get(
          getClansCacheKey(serverId),
          () => api.fetchClans(serverId),
          CLANS_CACHE_TTL
        ),
      ]);
      setRosters(rostersData);
      setClans(clansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [serverId, invalidateCache]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createRoster = useCallback(async (data: CreateRosterFormData): Promise<Roster> => {
    const newRoster = await api.createRoster(serverId, data);
    apiCache.invalidate(getRostersCacheKey(serverId));
    setRosters(prev => [...prev, newRoster]);
    return newRoster;
  }, [serverId]);

  const deleteRoster = useCallback(async (rosterId: string): Promise<void> => {
    await api.deleteRoster(rosterId, serverId);
    apiCache.invalidate(getRostersCacheKey(serverId));
    setRosters(prev => prev.filter(r => r.custom_id !== rosterId));
  }, [serverId]);

  const cloneRoster = useCallback(async (rosterId: string, data: CloneRosterFormData): Promise<Roster> => {
    const clonedRoster = await api.cloneRoster(rosterId, serverId, data);
    apiCache.invalidate(getRostersCacheKey(serverId));
    setRosters(prev => [...prev, clonedRoster]);
    return clonedRoster;
  }, [serverId]);

  const refresh = useCallback(async (): Promise<void> => {
    await loadData(true);
  }, [loadData]);

  return {
    rosters,
    clans,
    loading,
    error,
    refresh,
    createRoster,
    deleteRoster,
    cloneRoster,
  };
}
