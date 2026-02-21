"use client";

import React, { useState } from "react";
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
import { Loader2, UserMinus, CheckCircle2, UserPlus } from "lucide-react";
import type { MissingMembersResult, MissingMember } from "../_lib/types";

interface MissingMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MissingMembersResult | null;
  loading: boolean;
  onLoad: () => void;
  onAddMembers: (tags: string[]) => Promise<void>;
  t: (key: string) => string;
}

export function MissingMembersDialog({
  open,
  onOpenChange,
  data,
  loading,
  onLoad,
  onAddMembers,
  t,
}: MissingMembersDialogProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  // Load data when dialog opens
  React.useEffect(() => {
    if (open && !data && !loading) {
      onLoad();
    }
  }, [open, data, loading, onLoad]);

  // Reset selection when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedMembers(new Set());
    }
  }, [open]);

  const toggleMember = (tag: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedMembers(newSelected);
  };

  const toggleAll = () => {
    if (!data?.missing_members) return;
    if (selectedMembers.size === data.missing_members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(data.missing_members.map(m => m.tag)));
    }
  };

  const handleAddSelected = async () => {
    if (selectedMembers.size === 0) return;
    setAdding(true);
    try {
      await onAddMembers(Array.from(selectedMembers));
      setSelectedMembers(new Set());
      onLoad(); // Refresh data
    } finally {
      setAdding(false);
    }
  };

  const handleAddAll = async () => {
    if (!data?.missing_members || data.missing_members.length === 0) return;
    setAdding(true);
    try {
      await onAddMembers(data.missing_members.map(m => m.tag));
      onLoad(); // Refresh data
    } finally {
      setAdding(false);
    }
  };

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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : data?.state === 'error' ? (
          <div className="text-center py-8">
            <p className="text-red-400">{data.error_message || t("missingMembers.error")}</p>
          </div>
        ) : data?.missing_members && data.missing_members.length > 0 ? (
          <div className="space-y-4">
            {/* Summary */}
            {data.summary && (
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t("missingMembers.coverage")}</span>
                  <span className="text-sm font-medium text-foreground">
                    {data.summary.coverage_percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={data.summary.coverage_percentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {data.summary.total_clan_members - data.summary.total_missing} / {data.summary.total_clan_members} {t("missingMembers.registered")}
                </p>
              </div>
            )}

            {/* Select all */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedMembers.size === data.missing_members.length}
                  onCheckedChange={toggleAll}
                />
                <label htmlFor="select-all" className="text-sm text-foreground cursor-pointer">
                  {t("missingMembers.selectAll")} ({data.missing_members.length})
                </label>
              </div>
              {selectedMembers.size > 0 && (
                <Badge variant="secondary">{selectedMembers.size} {t("missingMembers.selected")}</Badge>
              )}
            </div>

            {/* Members list */}
            <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
              {data.missing_members.map((member: MissingMember) => (
                <div
                  key={member.tag}
                  className={`flex items-center justify-between p-3 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors ${
                    selectedMembers.has(member.tag) ? "bg-primary/10" : ""
                  }`}
                  onClick={() => toggleMember(member.tag)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedMembers.has(member.tag)}
                      onCheckedChange={() => toggleMember(member.tag)}
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
                  <div className="text-right">
                    <p className="text-sm text-yellow-400">{member.trophies.toLocaleString()}</p>
                  </div>
                </div>
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
          {data?.missing_members && data.missing_members.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleAddAll}
                disabled={adding}
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {t("missingMembers.addAll")}
              </Button>
              <Button
                onClick={handleAddSelected}
                disabled={adding || selectedMembers.size === 0}
                className="bg-primary hover:bg-primary/90"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {t("missingMembers.addSelected")} ({selectedMembers.size})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
