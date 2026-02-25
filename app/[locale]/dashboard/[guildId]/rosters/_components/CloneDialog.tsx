"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Copy } from "lucide-react";
import type { Roster, CloneRosterFormData } from "../_lib/types";

interface CloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roster: Roster | null;
  onClone: (data: CloneRosterFormData) => Promise<void>;
  t: (key: string) => string;
}

export function CloneDialog({
  open,
  onOpenChange,
  roster,
  onClone,
  t,
}: CloneDialogProps) {
  const [cloneData, setCloneData] = useState<CloneRosterFormData>({
    new_alias: "",
    copy_members: false,
  });
  const [cloning, setCloning] = useState(false);

  // Reset form when roster changes or dialog opens
  useEffect(() => {
    if (roster && open) {
      setCloneData({
        new_alias: `${roster.alias} (Clone)`,
        copy_members: false,
      });
    }
  }, [roster, open]);

  const handleSubmit = async () => {
    if (!cloneData.new_alias.trim()) return;

    setCloning(true);
    try {
      await onClone(cloneData);
      onOpenChange(false);
    } finally {
      setCloning(false);
    }
  };

  if (!roster) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Copy className="w-5 h-5" />
            {t("cloneDialog.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("cloneDialog.description", { name: roster.alias })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clone-name" className="text-foreground">
              {t("cloneDialog.newNameLabel")}
            </Label>
            <Input
              id="clone-name"
              value={cloneData.new_alias}
              onChange={(e) => setCloneData({ ...cloneData, new_alias: e.target.value })}
              placeholder={t("cloneDialog.newNamePlaceholder")}
              className="bg-background border-border text-foreground"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="copy-members"
              checked={cloneData.copy_members}
              onCheckedChange={(checked) =>
                setCloneData({ ...cloneData, copy_members: checked === true })
              }
            />
            <Label
              htmlFor="copy-members"
              className="text-foreground cursor-pointer"
            >
              {t("cloneDialog.copyMembersLabel")}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("cloneDialog.copyMembersHint")}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cloning}
            className="border-border"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={cloning || !cloneData.new_alias.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {cloning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("cloneDialog.cloning")}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                {t("cloneDialog.submit")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
