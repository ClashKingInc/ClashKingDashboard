"use client";

import React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { Roster } from "../_lib/types";
import { calculateRosterStats, formatThRestriction } from "../_lib/utils";
import { townHallImageUrl } from "@/lib/theme";

interface RosterStatsCardProps {
  readonly roster: Roster;
  readonly familyClanTags?: string[];
  readonly t: (key: string) => string;
}

export function RosterStatsCard({ roster, familyClanTags = [], t }: RosterStatsCardProps) {
  const stats = calculateRosterStats(roster.members, roster.clan_tag, familyClanTags);

  return (
    <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-card p-4 shadow-sm shadow-black/5 lg:grid-cols-4">
      <div className="rounded-2xl bg-muted/45 p-3.5">
        <p className="text-xs font-medium text-muted-foreground">{t("stats.members")}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{stats.totalMembers}</p>
      </div>

      <div className="rounded-2xl bg-muted/45 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t("stats.avgTh")}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{stats.avgTh || "—"}</p>
          </div>
          {stats.avgTh > 0 && (
            <Image src={townHallImageUrl(stats.avgTh)} alt="" width={36} height={36} unoptimized className="h-9 w-9 object-contain" />
          )}
        </div>
        {(roster.min_th || roster.max_th) && (
          <Badge variant="secondary" className="mt-2 border-0 bg-muted px-2 text-xs font-medium text-muted-foreground">
            {formatThRestriction(roster.min_th, roster.max_th)}
          </Badge>
        )}
      </div>

      <div className="rounded-2xl bg-muted/45 p-3.5">
        <p className="text-xs font-medium text-muted-foreground">{t("stats.avgHitrate")}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {stats.avgHitrate ? `${stats.avgHitrate}%` : "—"}
        </p>
      </div>

      <div className="rounded-2xl bg-muted/45 p-3.5">
        <p className="text-xs font-medium text-muted-foreground">{t("stats.distribution")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">{stats.inClan} {t("stats.clan")}</span>
          <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">{stats.inFamily} {t("stats.family")}</span>
          <span className="rounded-full bg-rose-500/10 px-2 py-1 text-rose-700 dark:text-rose-300">{stats.external} {t("stats.external")}</span>
        </div>
      </div>
    </div>
  );
}
