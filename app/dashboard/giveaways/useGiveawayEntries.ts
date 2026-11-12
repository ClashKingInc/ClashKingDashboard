"use client";

import { useRef, useState } from "react";
import type { Giveaway, GiveawayEntriesResponse } from "@/lib/api/types/server";

type FetchEntriesResult = { data?: GiveawayEntriesResponse; error?: string };

export function useGiveawayEntries(
  guildId: string,
  fetchEntries: (guildId: string, giveawayId: string) => Promise<FetchEntriesResult>,
) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [target, setTarget] = useState<Giveaway | null>(null);
  const [data, setData] = useState<GiveawayEntriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,setError]=useState("");
  const request=useRef(0);

  const openDialog = async (giveaway: Giveaway) => {
    const version=++request.current;
    setError("");
    setTarget(giveaway);
    setData(null);
    setDialogOpen(true);
    setLoading(true);
    try {
      const res = await fetchEntries(guildId, giveaway.id);
      if (res.error) throw new Error(res.error);
      if(version!==request.current)return;
      if(!res.data)throw new Error("Could not load entries");
      setData(res.data);
    } catch (error) {
      if(version===request.current)setError(error instanceof Error ? error.message : "Failed to load entries");
    } finally {
      if(version===request.current)setLoading(false);
    }
  };

  const closeDialog = () => {
    request.current++;
    setError("");
    setDialogOpen(false);
    setTarget(null);
    setData(null);
  };

  return { error, dialogOpen, setDialogOpen, target, data, loading, openDialog, closeDialog };
}
