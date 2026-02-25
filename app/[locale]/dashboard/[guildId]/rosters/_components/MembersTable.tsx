"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2, Pencil, X } from "lucide-react";
import type { RosterMember, Clan } from "../_lib/types";
import { getColumnLabel } from "../_lib/utils";

interface MembersTableProps {
  members: RosterMember[];
  columns: string[];
  rosterClanTag?: string | null;
  familyClans: Clan[];
  onRemoveMember: (tag: string) => void;
  removingMember?: string | null;
  onCategoryClick?: () => void;
  onUpdateMemberStatus?: (tag: string, status: string | null) => void;
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
  onUpdateMemberStatus,
  t,
}: MembersTableProps) {
  const familyClanTags = familyClans.map(c => c.tag);
  const [statusPopoverTag, setStatusPopoverTag] = useState<string | null>(null);
  const [statusInput, setStatusInput] = useState('');

  const openStatusPopover = (member: RosterMember) => {
    setStatusInput(member.member_status || '');
    setStatusPopoverTag(member.tag);
  };

  const saveStatus = (tag: string) => {
    const trimmed = statusInput.trim();
    onUpdateMemberStatus?.(tag, trimmed || null);
    setStatusPopoverTag(null);
  };

  const clearStatus = (tag: string) => {
    onUpdateMemberStatus?.(tag, null);
    setStatusPopoverTag(null);
  };

  const renderCell = (member: RosterMember, column: string) => {
    switch (column) {
      case 'townhall':
        return <span className="text-orange-400 font-medium">TH{member.townhall}</span>;

      case 'name':
        return (
          <span className="font-medium text-foreground">
            {member.name}
            {member.sub && <span className="text-xs text-yellow-600 ml-1">(Sub)</span>}
          </span>
        );

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

      case 'member_status':
        if (!onUpdateMemberStatus) {
          return member.member_status
            ? <Badge variant="secondary" className="text-xs">{member.member_status}</Badge>
            : <span className="text-muted-foreground">-</span>;
        }
        return (
          <Popover
            open={statusPopoverTag === member.tag}
            onOpenChange={(open) => {
              if (open) openStatusPopover(member);
              else setStatusPopoverTag(null);
            }}
          >
            <PopoverTrigger asChild>
              <div
                className="flex items-center gap-1 cursor-pointer group"
                onClick={(e) => e.stopPropagation()}
              >
                {member.member_status ? (
                  <Badge
                    variant="secondary"
                    className="text-xs group-hover:bg-secondary/80 transition-colors"
                  >
                    {member.member_status}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Pencil className="w-3 h-3" />
                    {t("members.setStatus")}
                  </span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <p className="text-xs text-muted-foreground mb-2">{t("members.statusPlaceholder")}</p>
              <Input
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveStatus(member.tag);
                  if (e.key === 'Escape') setStatusPopoverTag(null);
                }}
                className="h-8 text-sm mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => saveStatus(member.tag)}>
                  Save
                </Button>
                {member.member_status && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => clearStatus(member.tag)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">#</th>
            {columns.map((col) => (
              <th key={col} className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">
                {getColumnLabel(col)}
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
              <td className="py-3 px-4 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveMember(member.tag)}
                  disabled={removingMember === member.tag}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
