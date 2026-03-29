"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2, AlertCircle, Clock, RefreshCw, Plus, X, ChevronUp, ChevronDown, ChevronsUpDown, Copy } from "lucide-react";
import type { RosterMember, Clan, SignupCategory } from "../_lib/types";

const STALE_THRESHOLD_SECONDS = 2 * 24 * 60 * 60; // 2 days

interface MembersTableProps {
  members: RosterMember[];
  columns: string[];
  rosterClanTag?: string | null;
  familyClans: Clan[];
  categories?: SignupCategory[];
  groupDuplicateMap?: Record<string, string[]>;
  onRemoveMember: (tag: string) => void;
  removingMember?: string | null;
  onCategoryClick?: () => void;
  onUpdateMemberCategory?: (tag: string, categoryId: string | null) => Promise<void>;
  onRefreshMember?: (tag: string) => Promise<void>;
  t: (key: string) => string;
}

export function MembersTable({
  members,
  columns,
  rosterClanTag,
  familyClans,
  categories = [],
  groupDuplicateMap = {},
  onRemoveMember,
  removingMember,
  onCategoryClick,
  onUpdateMemberCategory,
  onRefreshMember,
  t,
}: MembersTableProps) {
  const familyClanTags = familyClans.map(c => c.tag);
  const [refreshingMember, setRefreshingMember] = useState<string | null>(null);
  const [categoryPopoverTag, setCategoryPopoverTag] = useState<string | null>(null);
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection(col === 'name' ? 'asc' : 'desc');
    }
  };

  const getSortValue = (member: RosterMember, col: string): string | number => {
    switch (col) {
      case 'townhall': return member.townhall ?? 0;
      case 'name': return member.name?.toLowerCase() ?? '';
      case 'tag': return member.tag?.toLowerCase() ?? '';
      case 'hitrate': return member.hitrate ?? -1;
      case 'trophies': return member.trophies ?? 0;
      case 'current_clan_tag': return member.current_clan_tag?.toLowerCase() ?? '';
      case 'discord': return member.discord_username?.toLowerCase() ?? '';
      case 'hero_lvs': return member.hero_lvs ?? '';
      case 'war_pref': return member.war_pref ? 1 : 0;
      case 'signup_group': return member.signup_group?.toLowerCase() ?? '';
      default: return '';
    }
  };

  const sortedMembers = sortColumn
    ? [...members].sort((a, b) => {
        const av = getSortValue(a, sortColumn);
        const bv = getSortValue(b, sortColumn);
        let cmp = 0;
        if (typeof av === 'number' && typeof bv === 'number') {
          cmp = av - bv;
        } else {
          cmp = String(av).localeCompare(String(bv));
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      })
    : members;

  const handleRefresh = async (tag: string) => {
    if (!onRefreshMember) return;
    setRefreshingMember(tag);
    try {
      await onRefreshMember(tag);
    } finally {
      setRefreshingMember(null);
    }
  };

  const handleSetCategory = async (tag: string, categoryId: string | null) => {
    if (!onUpdateMemberCategory) return;
    setUpdatingCategory(tag);
    setCategoryPopoverTag(null);
    try {
      await onUpdateMemberCategory(tag, categoryId);
    } finally {
      setUpdatingCategory(null);
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
        const duplicateRosters = groupDuplicateMap[member.tag];
        return (
          <span className="font-medium text-foreground flex items-center gap-1.5">
            {member.name}
            {duplicateRosters?.length > 0 && (
              <span title={`${t("members.alsoIn")}: ${duplicateRosters.join(', ')}`}>
                <Copy className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              </span>
            )}
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

      case 'signup_group': {
        const isUpdating = updatingCategory === member.tag;

        if (member.signup_group) {
          return (
            <div className="flex items-center gap-1 group">
              <Badge
                variant="outline"
                className="text-xs cursor-pointer hover:bg-purple-500/20 hover:border-purple-500 transition-colors"
                onClick={(e) => { e.stopPropagation(); onCategoryClick?.(); }}
                title={t("members.clickToGroup")}
              >
                {member.signup_group}
              </Badge>
              {onUpdateMemberCategory && (
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleSetCategory(member.tag, null); }}
                  title={t("members.removeCategory")}
                  disabled={isUpdating}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        }

        if (!onUpdateMemberCategory || categories.length === 0) {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <Popover
            open={categoryPopoverTag === member.tag}
            onOpenChange={(open) => setCategoryPopoverTag(open ? member.tag : null)}
          >
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
                disabled={isUpdating}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs">{t("members.addCategory")}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              {categories.map((cat) => (
                <button
                  key={cat.custom_id}
                  className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-secondary transition-colors"
                  onClick={() => handleSetCategory(member.tag, cat.custom_id)}
                >
                  {cat.alias}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        );
      }

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
            {columns.map((col) => {
              const isSorted = sortColumn === col;
              return (
                <th
                  key={col}
                  className="text-left py-3 px-4 text-muted-foreground font-medium text-sm"
                >
                  <button
                    onClick={() => handleSort(col)}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {t(`memberColumns.${col}`)}
                    {isSorted ? (
                      sortDirection === 'asc'
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>
              );
            })}
            <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">
              {t("members.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedMembers.map((member, index) => (
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
