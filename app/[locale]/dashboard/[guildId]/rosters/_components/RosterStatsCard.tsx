"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Target, Shield } from "lucide-react";
import type { Roster } from "../_lib/types";
import { calculateRosterStats, formatThRestriction } from "../_lib/utils";

interface RosterStatsCardProps {
  roster: Roster;
  familyClanTags?: string[];
  t: (key: string) => string;
}

export function RosterStatsCard({ roster, familyClanTags = [], t }: RosterStatsCardProps) {
  const stats = calculateRosterStats(roster.members, roster.clan_tag, familyClanTags);
  const capacityPercent = roster.roster_size
    ? Math.min(100, (stats.totalMembers / roster.roster_size) * 100)
    : 0;

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Members */}
      <Card className="bg-card border-blue-500/30 bg-blue-500/5 min-h-[150px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("stats.members")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-bold text-blue-500">{stats.totalMembers}</div>
              {roster.roster_size && (
                <div className="mt-2">
                  <Progress value={capacityPercent} className="h-1 w-20" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.totalMembers}/{roster.roster_size}
                  </p>
                </div>
              )}
            </div>
            <Users className="h-8 w-8 text-blue-500/50 shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Average TH */}
      <Card className="bg-card border-orange-500/30 bg-orange-500/5 min-h-[150px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("stats.avgTh")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-bold text-orange-500">{stats.avgTh || "-"}</div>
              {(roster.min_th || roster.max_th) && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {formatThRestriction(roster.min_th, roster.max_th)}
                </Badge>
              )}
            </div>
            <Shield className="h-8 w-8 text-orange-500/50 shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Average Hitrate */}
      <Card className="bg-card border-green-500/30 bg-green-500/5 min-h-[150px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("stats.avgHitrate")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="text-3xl font-bold text-green-500">
              {stats.avgHitrate ? `${stats.avgHitrate}%` : "-"}
            </div>
            <Target className="h-8 w-8 text-green-500/50 shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Member Distribution */}
      <Card className="bg-card border-purple-500/30 bg-purple-500/5 min-h-[150px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("stats.distribution")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-green-400">{stats.inClan} {t("stats.clan")}</span>
              <span className="text-yellow-400">{stats.inFamily} {t("stats.family")}</span>
              <span className="text-red-400">{stats.external} {t("stats.external")}</span>
              {stats.subs > 0 && (
                <span className="text-yellow-600">+{stats.subs} subs</span>
              )}
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500/50 shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
