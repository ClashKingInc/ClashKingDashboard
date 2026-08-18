"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { dashboardHref, useGuildId } from "@/lib/dashboard-route";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";

function hasNoConfiguredClans(payload: unknown): boolean {
  if (Array.isArray(payload)) return payload.length === 0;
  if (!payload || typeof payload !== "object") return false;

  const collection = payload as { items?: unknown; clans?: unknown; data?: unknown };
  const nestedClans = collection.items ?? collection.clans ?? collection.data;
  return Array.isArray(nestedClans) && nestedClans.length === 0;
}

export default function DashboardEntryPage() {
  const guildId = useGuildId();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!guildId) return;

    let active = true;

    void queryClient.fetchQuery(dashboardQueryOptions.clans(guildId))
      .then((clans) => {
        if (!active) return;

        const destination = hasNoConfiguredClans(clans) ? "clans" : "general";
        router.replace(dashboardHref(destination, guildId));
      })
      .catch(() => {
        if (active) router.replace(dashboardHref("general", guildId));
      });

    return () => {
      active = false;
    };
  }, [guildId, queryClient, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground" role="status">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      Opening server settings…
    </div>
  );
}
