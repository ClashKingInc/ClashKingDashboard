"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
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
import { Loader2, UserMinus, CheckCircle2, UserPlus, Layers, User } from "lucide-react";
import type { MissingMembersResult, MissingMembersRosterResult, MissingMember } from "../_lib/types";

interface MissingMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MissingMembersResult | null;
  loading: boolean;
  onLoad: (groupId?: string) => void;
  onAddMembers: (tags: string[]) => Promise<void>;
  groupId?: string | null;
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
  const [viewMode, setViewMode] = useState<'roster' | 'group'>('roster');

  // Load data when dialog opens or view mode changes
  React.useEffect(() => {
    if (open) {
      onLoad(viewMode === 'group' && groupId ? groupId : undefined);
    }
  }, [open, viewMode]);

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedMembers(new Set());
      setViewMode('roster');
    }
  }, [open]);

  const handleViewModeChange = (mode: 'roster' | 'group') => {
    setViewMode(mode);
  };

  const validResults = data?.results?.filter(r => r.state === 'ok') ?? [];
  const allMissingMembers = validResults.flatMap(r => r.missing_members ?? []);

  const toggleMember = (tag: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedMembers.size === allMissingMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(allMissingMembers.map(m => m.tag)));
    }
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

  const hasError = (data?.results?.length ?? 0) > 0 && data!.results!.every(r => r.state === 'error');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : hasError ? (
          <div className="text-center py-8">
            <p className="text-red-400">
              {data?.results?.find(r => r.state === 'error')?.error_message || t("missingMembers.error")}
            </p>
          </div>
        ) : allMissingMembers.length > 0 ? (
          <div className="space-y-4">
            {/* Select all */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedMembers.size === allMissingMembers.length && allMissingMembers.length > 0}
                  onCheckedChange={toggleAll}
                />
                <label htmlFor="select-all" className="text-sm text-foreground cursor-pointer">
                  {t("missingMembers.selectAll")} ({allMissingMembers.length})
                </label>
              </div>
              {selectedMembers.size > 0 && (
                <Badge variant="secondary">{selectedMembers.size} {t("missingMembers.selected")}</Badge>
              )}
            </div>

            {/* Results — one section per roster (errors silently skipped) */}
            <div className="space-y-3">
              {validResults.map((result, i) => (
                <RosterResultSection
                  key={i}
                  result={result}
                  showHeader={viewMode === 'group'}
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

        <DialogFooter className="gap-2">
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
                className="bg-primary hover:bg-primary/90"
              >
                {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {t("missingMembers.addSelected")} ({selectedMembers.size})
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
  result: MissingMembersRosterResult;
  showHeader: boolean;
  selectedMembers: Set<string>;
  onToggle: (tag: string) => void;
}) {
  if (result.state === 'error' || !result.missing_members?.length) return null;

  return (
    <div className="space-y-2">
      {showHeader && result.roster_info && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium text-foreground">{result.roster_info.alias}</span>
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
            <span className="text-sm text-muted-foreground">Coverage</span>
            <span className="text-sm font-medium">{result.summary.coverage_percentage.toFixed(1)}%</span>
          </div>
          <Progress value={result.summary.coverage_percentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {result.summary.total_clan_members - result.summary.total_missing} / {result.summary.total_clan_members}
          </p>
        </div>
      )}
      <div className="border border-border rounded-lg overflow-hidden">
        {result.missing_members.map((member: MissingMember) => (
          <div
            key={member.tag}
            className={`flex items-center justify-between p-3 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors ${
              selectedMembers.has(member.tag) ? "bg-primary/10" : ""
            }`}
            onClick={() => onToggle(member.tag)}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedMembers.has(member.tag)}
                onCheckedChange={() => onToggle(member.tag)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{member.townhall}</span>
              </div>
              <div>
                <p className="font-medium text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {member.tag} • {member.role}
                </p>
              </div>
            </div>
            <p className="text-sm text-yellow-400">{member.trophies.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
