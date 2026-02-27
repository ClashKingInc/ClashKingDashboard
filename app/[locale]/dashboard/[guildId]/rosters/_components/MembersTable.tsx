"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import { Trash2, AlertCircle, Clock, RefreshCw } from "lucide-react";
import type { RosterMember, Clan } from "../_lib/types";

const STALE_THRESHOLD_SECONDS = 2 * 24 * 60 * 60; // 2 days

interface MembersTableProps {
  members: RosterMember[];
  columns: string[];
  rosterClanTag?: string | null;
  familyClans: Clan[];
  onRemoveMember: (tag: string) => void;
  removingMember?: string | null;
  onCategoryClick?: () => void;
  onRefreshMember?: (tag: string) => Promise<void>;
  t: (key: string) => string;
}

export function MembersTable({
  members,
  columns,
  rosterClanTag,
  familyClans,
  onRemoveMember,
  removingMember,
  onCategoryClick,
  onRefreshMember,
  t,
}: MembersTableProps) {
  const familyClanTags = familyClans.map(c => c.tag);
  const [refreshingMember, setRefreshingMember] = useState<string | null>(null);

  const handleRefresh = async (tag: string) => {
    if (!onRefreshMember) return;
    setRefreshingMember(tag);
    try {
      await onRefreshMember(tag);
    } finally {
      setRefreshingMember(null);
    }
  };

  const renderCell = (member: RosterMember, column: string) => {
    switch (column) {
      case 'townhall':
        return <span className="text-orange-400 font-medium">TH{member.townhall}</span>;

      case 'name': {
        const now = Math.floor(Date.now() / 1000);
        const isStale = member.last_updated != null && (now - member.last_updated) > STALE_THRESHOLD_SECONDS;
        const staleDate = member.last_updated ? new Date(member.last_updated * 1000).toLocaleDateString() : null;
        return (
          <span className="font-medium text-foreground flex items-center gap-1.5">
            {member.name}
            {member.sub && <span className="text-xs text-yellow-600">(Sub)</span>}
            {member.member_status === 'api_error' ? (
              <span title={member.error_details || t("members.apiErrorTooltip")}>
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              </span>
            ) : isStale && (
              <span title={`${t("members.staleDataTooltip")} ${staleDate}`}>
                <Clock className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              </span>
            )}
          </span>
        );
      }

      case 'tag':
        return <span className="font-mono text-muted-foreground text-xs">{member.tag}</span>;

      case 'hitrate':
        if (member.hitrate !== null && member.hitrate !== undefined) {
          const hitColor = member.hitrate >= 80 ? 'text-green-400' : member.hitrate >= 60 ? 'text-yellow-400' : 'text-red-400';
          return <span className={`${hitColor} font-medium`}>{member.hitrate}%</span>;
        }
        return <span className="text-muted-foreground">-</span>;

      case 'current_clan_tag':
        if (member.current_clan_tag && member.current_clan_tag !== '#') {
          let colorClass = 'text-red-400';
          if (rosterClanTag && member.current_clan_tag === rosterClanTag) {
            colorClass = 'text-green-400';
          } else if (familyClanTags.includes(member.current_clan_tag)) {
            colorClass = 'text-yellow-400';
          }
          return <span className={`${colorClass} font-mono text-xs`}>{member.current_clan_tag}</span>;
        }
        return <span className="text-muted-foreground">-</span>;

      case 'discord':
        return (
          <DiscordUserDisplay
            username={member.discord_username}
            avatarUrl={member.discord_avatar_url}
            rawDiscordValue={member.discord}
            size="sm"
          />
        );

      case 'hero_lvs':
        return <span className="text-purple-400">{member.hero_lvs || '-'}</span>;

      case 'trophies':
        return <span className="text-yellow-400">{member.trophies?.toLocaleString() || '-'}</span>;

      case 'war_pref':
        return member.war_pref ? (
          <Badge variant="default" className="bg-green-600 text-xs">In</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Out</Badge>
        );

      case 'signup_group':
        if (member.signup_group) {
          return (
            <Badge
              variant="outline"
              className="text-xs cursor-pointer hover:bg-purple-500/20 hover:border-purple-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onCategoryClick?.();
              }}
              title={t("members.clickToGroup")}
            >
              {member.signup_group}
            </Badge>
          );
        }
        return <span className="text-muted-foreground">-</span>;

      default:
        return <span className="text-muted-foreground">-</span>;
    }
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("members.noMembers")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("members.noMembersHint")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">#</th>
            {columns.map((col) => (
              <th key={col} className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">
                {t(`memberColumns.${col}`)}
              </th>
            ))}
            <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">
              {t("members.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, index) => (
            <tr
              key={member.tag}
              className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
            >
              <td className="py-3 px-4 text-muted-foreground text-sm">{index + 1}</td>
              {columns.map((col) => (
                <td key={col} className="py-3 px-4">
                  {renderCell(member, col)}
                </td>
              ))}
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  {onRefreshMember && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRefresh(member.tag)}
                      disabled={refreshingMember === member.tag}
                      className="text-muted-foreground hover:text-foreground"
                      title={t("members.refresh")}
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshingMember === member.tag ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveMember(member.tag)}
                    disabled={removingMember === member.tag}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
