"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Trash2, Edit, Eye, Copy } from "lucide-react";
import type { Roster } from "../_lib/types";
import { calculateRosterStats, formatThRestriction } from "../_lib/utils";

interface RosterCardProps {
  roster: Roster;
  familyClanTags?: string[];
  onView: (roster: Roster) => void;
  onEdit: (roster: Roster) => void;
  onDelete: (roster: Roster) => void;
  onClone: (roster: Roster) => void;
  deleting?: boolean;
  t: (key: string) => string;
}

export function RosterCard({
  roster,
  familyClanTags = [],
  onView,
  onEdit,
  onDelete,
  onClone,
  deleting,
  t,
}: RosterCardProps) {
  const stats = calculateRosterStats(roster.members, roster.clan_tag, familyClanTags);

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {roster.clan_badge ? (
              <Avatar className="h-10 w-10">
                <AvatarImage src={roster.clan_badge} alt={roster.clan_name || ""} />
                <AvatarFallback>{roster.alias.charAt(0)}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg text-foreground">{roster.alias}</CardTitle>
              {roster.clan_name && (
                <p className="text-sm text-muted-foreground">{roster.clan_name}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Badge
              variant={roster.roster_type === "clan" ? "default" : "secondary"}
              className="text-xs"
            >
              {roster.roster_type}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.totalMembers}</p>
            <p className="text-xs text-muted-foreground">{t("rosterCard.members")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">{stats.avgTh || "-"}</p>
            <p className="text-xs text-muted-foreground">{t("rosterCard.avgTh")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {stats.avgHitrate ? `${stats.avgHitrate}%` : "-"}
            </p>
            <p className="text-xs text-muted-foreground">{t("rosterCard.avgHitrate")}</p>
          </div>
        </div>

        {/* TH Restriction */}
        {(roster.min_th || roster.max_th) && (
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="text-xs">
              {formatThRestriction(roster.min_th, roster.max_th)}
            </Badge>
          </div>
        )}

        {/* Member distribution */}
        {stats.totalMembers > 0 && (
          <div className="flex justify-center gap-2 text-xs">
            {stats.inClan > 0 && (
              <span className="text-green-400">{stats.inClan} {t("rosterCard.inClan")}</span>
            )}
            {stats.inFamily > 0 && (
              <span className="text-yellow-400">{stats.inFamily} {t("rosterCard.inFamily")}</span>
            )}
            {stats.external > 0 && (
              <span className="text-red-400">{stats.external} {t("rosterCard.external")}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onView(roster)}
          >
            <Eye className="w-4 h-4 mr-1" />
            {t("rosterCard.view")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(roster)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onClone(roster)}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(roster)}
            disabled={deleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
