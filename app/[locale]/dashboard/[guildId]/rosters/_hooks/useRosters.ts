"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Roster, Clan, CreateRosterFormData, CloneRosterFormData } from '../_lib/types';
import * as api from '../_lib/api';

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

  const loadData = useCallback(async () => {
    if (!serverId) return;

    setLoading(true);
    setError(null);

    try {
      const [rostersData, clansData] = await Promise.all([
        api.fetchRosters(serverId),
        api.fetchClans(serverId),
      ]);
      setRosters(rostersData);
      setClans(clansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createRoster = useCallback(async (data: CreateRosterFormData): Promise<Roster> => {
    const newRoster = await api.createRoster(serverId, data);
    // Refresh the rosters list to ensure we have complete data
    await loadData();
    return newRoster;
  }, [serverId, loadData]);

  const deleteRoster = useCallback(async (rosterId: string): Promise<void> => {
    await api.deleteRoster(rosterId, serverId);
    setRosters(prev => prev.filter(r => r.custom_id !== rosterId));
  }, [serverId]);

  const cloneRoster = useCallback(async (rosterId: string, data: CloneRosterFormData): Promise<Roster> => {
    const clonedRoster = await api.cloneRoster(rosterId, serverId, data);
    // Refresh the rosters list to ensure we have complete data
    await loadData();
    return clonedRoster;
  }, [serverId, loadData]);

  return {
    rosters,
    clans,
    loading,
    error,
    refresh: loadData,
    createRoster,
    deleteRoster,
    cloneRoster,
  };
}
