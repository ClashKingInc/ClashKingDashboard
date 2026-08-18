"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import { PlayerProfilePopover } from "@/components/ui/player-profile-popover";
import { ClanProfilePopover } from "@/components/ui/clan-profile-popover";
import { Trash2, AlertCircle, Clock, RefreshCw, AtSign, ChevronUp, ChevronDown, ChevronsUpDown, Copy } from "lucide-react";
import type { RosterMember, Clan } from "../_lib/types";
import { townHallImageUrl } from "@/lib/theme";

const STALE_THRESHOLD_SECONDS = 2 * 24 * 60 * 60; // 2 days

interface MembersTableProps {
  readonly members: RosterMember[];
  readonly columns: string[];
  readonly rosterClanTag?: string | null;
  readonly familyClans: Clan[];
  readonly groupDuplicateMap?: Record<string, string[]>;
  readonly onRemoveMember: (tag: string) => void;
  readonly removingMember?: string | null;
  readonly onRefreshMember?: (tag: string) => Promise<void>;
  readonly onRefreshDiscordIdentity?: (tag: string) => Promise<void>;
  readonly t: (key: string) => string;
}

export function MembersTable({
  members,
  columns,
  rosterClanTag,
  familyClans,
  groupDuplicateMap = {},
  onRemoveMember,
  removingMember,
  onRefreshMember,
  onRefreshDiscordIdentity,
  t,
}: MembersTableProps) {
  const familyClanTags = new Set(familyClans.map(c => c.tag));
  const getClanBadgeUrl = (clanTag?: string | null): string | null => {
    if (!clanTag) return null;
    const clan = familyClans.find((c) => c.tag === clanTag);
    return clan?.badge_url || clan?.badge || null;
  };
  const [refreshingMember, setRefreshingMember] = useState<string | null>(null);
  const [refreshingDiscordMember, setRefreshingDiscordMember] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);

  useEffect(() => {
    setCurrentTimeSeconds(Math.floor(Date.now() / 1000));
  }, []);

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
      case 'current_clan': return member.current_clan?.toLowerCase() ?? '';
      case 'current_clan_tag': return member.current_clan_tag?.toLowerCase() ?? '';
      case 'discord': return member.discord_username?.toLowerCase() ?? '';
      case 'hero_lvs': return member.hero_lvs ?? '';
      case 'war_pref': return member.war_pref ? 1 : 0;
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

  const handleDiscordRefresh = async (tag: string) => {
	if (!onRefreshDiscordIdentity) return;
	setRefreshingDiscordMember(tag);
	try {
		await onRefreshDiscordIdentity(tag);
	} finally {
		setRefreshingDiscordMember(null);
	}
  };

  const withPlayerPopover = (member: RosterMember, content: React.ReactNode) => (
    <PlayerProfilePopover
      playerName={member.name || member.tag}
      playerTag={member.tag}
      clanName={member.current_clan}
      townhallLevel={member.townhall}
      trophies={member.trophies}
      warPreference={member.war_pref}
      heroLevels={member.hero_lvs}
      hitrate={member.hitrate}
      showTagInTrigger={false}
      triggerClassName="text-left cursor-pointer hover:opacity-80 transition-opacity"
    >
      {content}
    </PlayerProfilePopover>
  );

  const getClanColorClass = (clanTag?: string | null): string => {
    if (!clanTag || clanTag === '#') return 'text-red-400';
    if (rosterClanTag && clanTag === rosterClanTag) return 'text-green-400';
    if (familyClanTags.has(clanTag)) return 'text-yellow-400';
    return 'text-red-400';
  };

  const renderClanCell = (
    member: RosterMember,
    content: (colorClass: string) => React.ReactNode,
  ) => {
    if (!member.current_clan_tag || member.current_clan_tag === '#') {
      return <span className="text-muted-foreground">-</span>;
    }

    const colorClass = getClanColorClass(member.current_clan_tag);
    return (
      <ClanProfilePopover
        clanName={member.current_clan || member.current_clan_tag}
        clanTag={member.current_clan_tag}
        clanBadgeUrl={getClanBadgeUrl(member.current_clan_tag)}
        showTagInTrigger={false}
        triggerClassName="text-left cursor-pointer hover:opacity-80 transition-opacity"
      >
        {content(colorClass)}
      </ClanProfilePopover>
    );
  };

  const renderCell = (member: RosterMember, column: string) => { // NOSONAR — exhaustive switch over table column types, presentation logic only
    switch (column) {
      case 'townhall':
        return withPlayerPopover(
          member,
          <div className="flex items-center gap-1.5">
              <Image
                src={townHallImageUrl(member.townhall)}
                alt={`TH${member.townhall}`}
                width={28}
                height={28}
                unoptimized
                className="w-7 h-7 object-contain"
              />
              <span className="text-orange-400 font-medium">TH{member.townhall}</span>
            </div>
        );

      case 'name': {
        const isStale = member.last_updated != null && (currentTimeSeconds - member.last_updated) > STALE_THRESHOLD_SECONDS;
        const staleDate = member.last_updated ? new Date(member.last_updated * 1000).toLocaleDateString() : null;
        const duplicateRosters = groupDuplicateMap[member.tag];
        return (
          <span className="font-medium text-foreground flex items-center gap-1.5">
            {withPlayerPopover(
              member,
              <span className="font-medium text-foreground">{member.name || member.tag}</span>
            )}
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
        return withPlayerPopover(
          member,
            <span className="font-mono text-muted-foreground text-xs">{member.tag}</span>
        );

      case 'hitrate':
        if (member.hitrate !== null && member.hitrate !== undefined) {
          const hitColor = member.hitrate >= 80 ? 'text-green-400' : member.hitrate >= 60 ? 'text-yellow-400' : 'text-red-400'; // NOSONAR — JSX nested ternary for multi-branch display state
          return withPlayerPopover(
            member,
            <span className={`${hitColor} font-medium`}>{member.hitrate}%</span>
          );
        }
        return <span className="text-muted-foreground">-</span>;

      case 'current_clan':
        return renderClanCell(
          member,
          (colorClass) => (
            <span className={`${colorClass} font-medium truncate`}>{member.current_clan || member.current_clan_tag}</span>
          )
        );

      case 'current_clan_tag':
        return renderClanCell(
          member,
          (colorClass) => <span className={`${colorClass} font-mono text-xs`}>{member.current_clan_tag}</span>
        );

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
        return withPlayerPopover(
          member,
          <span className="text-purple-400">{member.hero_lvs || '-'}</span>
        );

      case 'trophies':
        return withPlayerPopover(
          member,
          <span className="text-yellow-400">{member.trophies?.toLocaleString() || '-'}</span>
        );

      case 'war_pref':
        return withPlayerPopover(
          member,
          member.war_pref ? (
            <Badge variant="default" className="bg-green-600 text-xs">In</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Out</Badge>
          )
        );

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
    <>
    <div className="space-y-2 md:hidden">
      {sortedMembers.map((member, index) => (
        <article key={member.tag} className="rounded-2xl bg-muted/35 p-4">
          <div className="flex items-start gap-3">
            <span className="pt-0.5 text-xs font-medium text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1 space-y-3">
              {columns.map((col) => (
                <div key={col} className="grid grid-cols-[minmax(5.5rem,0.7fr)_minmax(0,1.3fr)] items-start gap-3">
                  <span className="text-xs text-muted-foreground">{t(`memberColumns.${col}`)}</span>
                  <div className="min-w-0 text-sm">{renderCell(member, col)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-1 border-t border-border/60 pt-2">
            {onRefreshMember && (
              <Button variant="ghost" size="touch-icon" onClick={() => handleRefresh(member.tag)} disabled={refreshingMember === member.tag} aria-label={t("members.refresh")}>
                <RefreshCw className={`h-4 w-4 ${refreshingMember === member.tag ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {onRefreshDiscordIdentity && member.discord && (
              <Button variant="ghost" size="touch-icon" onClick={() => handleDiscordRefresh(member.tag)} disabled={refreshingDiscordMember === member.tag} aria-label="Refresh Discord username and avatar">
                <AtSign className={`h-4 w-4 ${refreshingDiscordMember === member.tag ? "animate-pulse" : ""}`} />
              </Button>
            )}
            <Button variant="ghost" size="touch-icon" onClick={() => onRemoveMember(member.tag)} disabled={removingMember === member.tag} className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={t("members.actions")}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </article>
      ))}
    </div>
    <div className="hidden overflow-x-auto md:block">
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
                      sortDirection === 'asc' // NOSONAR — JSX nested ternary for multi-branch display state
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
				  {onRefreshDiscordIdentity && member.discord && (
					<Button
					  variant="ghost"
					  size="sm"
					  onClick={() => handleDiscordRefresh(member.tag)}
					  disabled={refreshingDiscordMember === member.tag}
					  className="text-muted-foreground hover:text-foreground"
					  title="Refresh Discord username and avatar"
					>
					  <AtSign className={`w-4 h-4 ${refreshingDiscordMember === member.tag ? "animate-pulse" : ""}`} />
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
    </>
  );
}
