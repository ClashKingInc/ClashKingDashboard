"use client";

import React, { useEffect, useState } from "react";
import Image from "@/components/app-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import { PlayerProfilePopover } from "@/components/ui/player-profile-popover";
import { ClanProfilePopover } from "@/components/ui/clan-profile-popover";
import { Trash2, AlertCircle, Clock, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown, Copy } from "lucide-react";
import type { RosterMember, Clan } from "../_lib/types";
import { townHallImageUrl, clanBadgeUrl, playerLeagueImageUrl } from "@/lib/clash-asset-urls";
import { RosterTownhallStatus } from "@/components/roster-townhall-status";
import { heroGradient } from "../_lib/hero-gradient";
import { useTranslations } from "use-intl";

const STALE_THRESHOLD_SECONDS = 2 * 24 * 60 * 60; // 2 days

interface MembersTableProps {
  readonly heroAnchors?: readonly [number, number, number];
  readonly members: RosterMember[];
  readonly columns: string[];
  readonly rosterClanTag?: string | null;
  readonly minTownhall?: number | null;
  readonly maxTownhall?: number | null;
  readonly familyClans: Clan[];
  readonly groupDuplicateMap?: Record<string, string[]>;
  readonly onRemoveMember: (tag: string) => void;
  readonly removingMember?: string | null;
  readonly onRefreshMember?: (tag: string) => Promise<void>;
  readonly onRefreshDiscordIdentity?: (tag: string) => Promise<void>;
  readonly t: (key: string) => string;
}

export function MembersTable({
  heroAnchors = [50, 75, 90],
  members,
  columns,
  minTownhall,
  maxTownhall,
  familyClans,
  groupDuplicateMap = {},
  onRemoveMember,
  removingMember,
  onRefreshMember,
  t,
}: MembersTableProps) {
  const cwl = useTranslations("RostersPage.cwlBonuses");
  const getClanBadgeUrl = (clanTag?: string | null): string | null => {
    if (!clanTag) return null;
    const clan = familyClans.find((c) => c.tag === clanTag);
    return clan?.badge_url || clan?.badge || clanBadgeUrl(clanTag);
  };
  const [refreshingMember, setRefreshingMember] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);

  useEffect(() => {
    setCurrentTimeSeconds(Math.floor(Date.now() / 1000));
    const timer = window.setInterval(() => setCurrentTimeSeconds(Math.floor(Date.now() / 1000)), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const townhallStatus = (member: RosterMember) => <RosterTownhallStatus townhall={member.townhall}
    minTownhall={minTownhall} maxTownhall={maxTownhall} now={currentTimeSeconds * 1000}
    refreshedAt={member.member_status === "api_error" ? null : member.refreshed_at} />;

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
      case 'hero_lvs': return member.hero_max_level_sum ? 100 * (member.hero_lvs ?? 0) / member.hero_max_level_sum : -1;
      case 'war_pref': return member.war_pref ? 1 : 0;
      default: return '';
    }
  };

  const sortedMembers = sortColumn
    ? [...members].sort((a, b) => {
        const av = getSortValue(a, sortColumn);
        const bv = getSortValue(b, sortColumn);
        if (sortColumn === 'trophies' && (a.league_id ?? 0) !== (b.league_id ?? 0)) {
          const tier = (a.league_id ?? 0) - (b.league_id ?? 0);
          return sortDirection === 'asc' ? tier : -tier;
        }
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
    return clanTag ? 'text-foreground' : 'text-muted-foreground';
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
          return withPlayerPopover(
            member,
            <span className="flex flex-col"><span style={{ color: heroGradient(member.hitrate) }} className="font-medium">{member.hitrate.toFixed(1)}%</span><small className="text-[10px] leading-4 whitespace-nowrap text-muted-foreground">{cwl("attacks", { count: member.hitrate_attacks ?? 0 })}</small></span>
          );
        }
        return <span className="text-muted-foreground">-</span>;

      case 'current_clan':
        return renderClanCell(
          member,
          (colorClass) => (
            <span className={`${colorClass} flex items-center gap-2 font-medium`}><Image src={clanBadgeUrl(member.current_clan_tag!)} alt="" width={24} height={24} /><span className="whitespace-nowrap">{member.current_clan || member.current_clan_tag}</span></span>
          )
        );

      case 'current_clan_tag':
        return renderClanCell(
          member,
          (colorClass) => <span className={`${colorClass} font-mono text-xs`}>{member.current_clan_tag}</span>
        );

      case 'discord':
        if (member.discord_cache_ready === false) return <span className="text-muted-foreground">—</span>;
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
          <span style={member.hero_max_level_sum ? { color: heroGradient(100 * (member.hero_lvs ?? 0) / member.hero_max_level_sum, heroAnchors) } : undefined}>
            {member.hero_lvs ?? "—"}{!!member.hero_max_level_sum && <small className="block text-[10px] leading-4">({(100 * (member.hero_lvs ?? 0) / member.hero_max_level_sum).toFixed(1)}%)</small>}
          </span>
        );

      case 'trophies':
        return withPlayerPopover(
          member,
          <span className="flex items-center gap-1.5 text-foreground">{member.current_league && <Image src={playerLeagueImageUrl(member.current_league)} alt={member.current_league} width={28} height={28} />}{member.trophies?.toLocaleString() ?? "—"}</span>
        );

      case 'war_pref':
        return withPlayerPopover(
          member,
          member.war_pref === undefined ? <span className="text-muted-foreground">—</span> : member.war_pref ? (
            <Badge variant="secondary" className="border-0 bg-green-600 text-white dark:text-white hover:bg-green-600 text-xs">In</Badge>
          ) : (
            <Badge variant="secondary" className="border-0 bg-red-600 text-white dark:text-white hover:bg-red-600 text-xs">Out</Badge>
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
          {townhallStatus(member)}
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
              <td className="py-3 px-4 text-muted-foreground text-sm">{index + 1}{columns.length === 0 && townhallStatus(member)}</td>
              {columns.map((col, columnIndex) => (
                <td key={col} className="py-3 px-4 align-middle">
                  <div className="flex flex-col items-start justify-center">
                  {renderCell(member, col)}
                  {columnIndex === 0 && <div>{townhallStatus(member)}</div>}
                  </div>
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
    </>
  );
}
