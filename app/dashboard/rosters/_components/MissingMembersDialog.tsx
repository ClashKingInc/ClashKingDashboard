"use client";

import React, { useState } from "react";
import { useTranslations } from "use-intl";
import Image from "@/components/app-image";
import { Input } from "@/components/ui/input";
import { townHallImageUrl, clanBadgeUrl, playerLeagueImageUrl } from "@/lib/clash-asset-urls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, UserMinus, CheckCircle2, UserPlus, Layers, User, Check } from "lucide-react";
import type { MissingMembersResult, MissingMembersRosterResult, MissingMember } from "../_lib/types";

interface MissingMembersDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly data: MissingMembersResult | null;
  readonly loading: boolean;
  readonly onLoad: (groupId?: string) => void;
  readonly onAddMembers: (tags: string[]) => Promise<void>;
  readonly groupId?: string | null;
}

export function MissingMembersDialog({
  open,
  onOpenChange,
  data,
  loading,
  onLoad,
  onAddMembers,
  groupId,
}: MissingMembersDialogProps) {
  const t = useTranslations("RostersPage");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<'roster' | 'group'>('roster');

  // Load data when dialog opens or view mode changes
  React.useEffect(() => {
    if (open) {
      onLoad(viewMode === 'group' && groupId ? groupId : undefined);
    }
  }, [groupId, onLoad, open, viewMode]);

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedMembers(new Set());
      setSearch("");
      setViewMode('roster');
    }
  }, [open]);

  const handleViewModeChange = (mode: 'roster' | 'group') => {
    setSelectedMembers(new Set());
    setViewMode(mode);
  };

  const validResults = data?.results?.filter(r => r.state === 'ok') ?? [];
  const allMissingMembers = [...new Map(validResults.flatMap(r => r.missing_members ?? []).map(member => [member.tag, member])).values()];
  const query = search.trim().toLocaleLowerCase();
  const filteredResults = validResults.map(result => ({ ...result, missing_members: result.missing_members?.filter(member =>
    [member.name, member.tag, member.clan_name, member.clan_tag].some(value => value?.toLocaleLowerCase().includes(query))) }));
  const visibleMembers = [...new Map(filteredResults.flatMap(result => result.missing_members ?? []).map(member => [member.tag, member])).values()];

  const toggleMember = (tag: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const toggleAll = () => {
    const allSelected = visibleMembers.every(member => selectedMembers.has(member.tag));
    setSelectedMembers(previous => {
      const next = new Set(previous);
      visibleMembers.forEach(member => allSelected ? next.delete(member.tag) : next.add(member.tag));
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selectedMembers.size === 0) return;
    setAdding(true);
    try {
      await onAddMembers(Array.from(selectedMembers));
      setSelectedMembers(new Set());
      onLoad(viewMode === 'group' && groupId ? groupId : undefined);
    } finally {
      setAdding(false);
    }
  };

  const handleAddAll = async () => {
    if (allMissingMembers.length === 0) return;
    setAdding(true);
    try {
      await onAddMembers(allMissingMembers.map(m => m.tag));
      onLoad(viewMode === 'group' && groupId ? groupId : undefined);
    } finally {
      setAdding(false);
    }
  };

  const hasError = (data?.results?.length ?? 0) > 0 && data?.results?.every(r => r.state === 'error');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="form" className="flex max-h-[85dvh] flex-col overflow-hidden bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <UserMinus className="w-5 h-5" />
            {t("missingMembers.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("missingMembers.description")}
          </DialogDescription>
        </DialogHeader>

        {/* View mode toggle — only if roster belongs to a group */}
        {groupId && (
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'roster' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewModeChange('roster')}
              className="gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              {t("missingMembers.thisRoster")}
            </Button>
            <Button
              variant={viewMode === 'group' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewModeChange('group')}
              className="gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              {t("missingMembers.wholeGroup")}
            </Button>
          </div>
        )}

        <Input aria-label={t("addMembersDialog.searchLabel")} placeholder={t("addMembersDialog.searchPlaceholder")} value={search}
          onChange={event => setSearch(event.target.value)} className="h-10 shrink-0 rounded-xl border-0 bg-muted/55" />
        <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : hasError ? ( // NOSONAR — JSX nested ternary for multi-branch display state
          <div className="text-center py-8">
            <p className="text-red-400">
              {data?.results?.find(r => r.state === 'error')?.error_message || t("missingMembers.error")}
            </p>
          </div>
        ) : allMissingMembers.length > 0 ? ( // NOSONAR — JSX nested ternary for multi-branch display state
          <div className="space-y-4">
            {/* Select all */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={visibleMembers.length > 0 && visibleMembers.every(member => selectedMembers.has(member.tag))}
                  disabled={visibleMembers.length === 0}
                  onCheckedChange={toggleAll}
                />
                <label htmlFor="select-all" className="text-sm text-foreground cursor-pointer">
                  {t("missingMembers.selectAll")} ({visibleMembers.length})
                </label>
              </div>
              <Badge
                variant="secondary"
                className={`min-w-[110px] justify-center tabular-nums ${
                  selectedMembers.size > 0 ? "" : "invisible"
                }`}
              >
                {selectedMembers.size} {t("missingMembers.selected")}
              </Badge>
            </div>

            {/* Results — one section per roster (errors silently skipped) */}
            <div className="space-y-3">
              {filteredResults.map((result, i) => (
                <RosterResultSection
                  key={`${result.roster_info?.roster_id}:${result.roster_info?.clan_tag}:${i}`}
                  result={result}
                  showHeader={viewMode === 'group' || validResults.length > 1}
                  selectedMembers={selectedMembers}
                  onToggle={toggleMember}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-foreground font-medium">{t("missingMembers.allCaughtUp")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("missingMembers.allCaughtUpDesc")}</p>
          </div>
        )}

        </div>
        <DialogFooter className="shrink-0 gap-2 bg-card pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            {t("common.close")}
          </Button>
          {allMissingMembers.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleAddAll}
                disabled={adding}
              >
                {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {t("missingMembers.addAll")}
              </Button>
              <Button
                onClick={handleAddSelected}
                disabled={adding || selectedMembers.size === 0}
                className="bg-primary hover:bg-primary/90 min-w-[170px] justify-center tabular-nums"
              >
                {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {t("missingMembers.addSelected", { count: selectedMembers.size })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RosterResultSection({
  result,
  showHeader,
  selectedMembers,
  onToggle,
}: {
  readonly result: MissingMembersRosterResult;
  readonly showHeader: boolean;
  readonly selectedMembers: Set<string>;
  readonly onToggle: (tag: string) => void;
}) {
  const t = useTranslations("RostersPage");
  const positions = useTranslations("RolesPage.familyPositions");
  if (result.state === 'error' || !result.missing_members?.length) return null;

  return (
    <div className="space-y-2">
      {showHeader && result.roster_info && (
        <div className="flex items-center justify-between px-1">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Image src={clanBadgeUrl(result.roster_info.clan_tag)} alt="" width={24} height={24} />
            {result.roster_info.clan_name} · {result.roster_info.alias}
          </span>
          {result.summary && (
            <div className="flex items-center gap-3">
              <Progress value={result.summary.coverage_percentage} className="h-1.5 w-24" />
              <span className="text-xs text-muted-foreground">
                {result.summary.coverage_percentage.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}
      {!showHeader && result.summary && (
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-muted-foreground">{t("missingMembers.coverage")}</span>
            <span className="text-sm font-medium">{result.summary.coverage_percentage.toFixed(1)}%</span>
          </div>
          <Progress value={result.summary.coverage_percentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {result.summary.total_clan_members - result.summary.total_missing} / {result.summary.total_clan_members}
          </p>
        </div>
      )}
      <div className="space-y-2">
        {result.missing_members.map((member: MissingMember) => (
          <button
            key={member.tag}
            type="button"
            aria-pressed={selectedMembers.has(member.tag)}
            className={`flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-muted/65 ${
              selectedMembers.has(member.tag) ? "bg-primary/10" : ""
            }`}
            onClick={() => onToggle(member.tag)}
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid place-content-center h-4 w-4 shrink-0 rounded-sm border ${
                  selectedMembers.has(member.tag)
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border bg-background"
                }`}
                aria-hidden="true"
              >
                {selectedMembers.has(member.tag) && <Check className="h-3 w-3" />}
              </span>
              <Image src={townHallImageUrl(member.townhall)} alt={`TH${member.townhall}`} width={40} height={40} className="shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {member.tag} · {positions(member.role === "admin" ? "elder" : ["leader", "coLeader", "elder"].includes(member.role) ? member.role : "member")}
                </p>
                {member.clan_tag && <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Image src={clanBadgeUrl(member.clan_tag)} alt="" width={16} height={16} />{member.clan_name}
                </span>}
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums">
              {member.league_name && <Image src={playerLeagueImageUrl(member.league_name)} alt={member.league_name} width={28} height={28} />}
              {member.trophies.toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
