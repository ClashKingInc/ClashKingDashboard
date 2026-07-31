"use client";

import { useState } from "react";
import type { Giveaway, GiveawayEntriesResponse } from "@/lib/api/types/server";

type FetchEntriesResult = { data?: GiveawayEntriesResponse; error?: string };

export function useGiveawayEntries(
  guildId: string,
  fetchEntries: (guildId: string, giveawayId: string) => Promise<FetchEntriesResult>,
  onError: (message: string) => void,
) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [target, setTarget] = useState<Giveaway | null>(null);
  const [data, setData] = useState<GiveawayEntriesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const openDialog = async (giveaway: Giveaway) => {
    setTarget(giveaway);
    setData(null);
    setDialogOpen(true);
    setLoading(true);
    try {
      const res = await fetchEntries(guildId, giveaway.id);
      if (res.error) throw new Error(res.error);
      setData(res.data!);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to load entries");
      setDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setTarget(null);
    setData(null);
  };

  return { dialogOpen, setDialogOpen, target, data, loading, openDialog, closeDialog };
}
