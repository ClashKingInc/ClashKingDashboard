"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Search, X, CheckCircle2, AlertCircle } from "lucide-react";
import type { ClanMember, RosterMember } from "../_lib/types";
import { parseBulkTags } from "../_lib/utils";

interface AddMembersDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onAddMembers: (tags: string[]) => Promise<void>;
  readonly serverMembers: ClanMember[];
  readonly clanMembers: ClanMember[];
  readonly existingMembers?: RosterMember[];
  readonly loadServerMembers: () => void;
  readonly loadingServerMembers: boolean;
  readonly t: (key: string) => string;
}

export function AddMembersDialog({
  open,
  onOpenChange,
  onAddMembers,
  serverMembers,
  clanMembers,
  existingMembers = [],
  loadServerMembers,
  loadingServerMembers,
  t,
}: AddMembersDialogProps) {
  const [bulkTags, setBulkTags] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validTags, setValidTags] = useState<string[]>([]);
  const [invalidTags, setInvalidTags] = useState<string[]>([]);

  // Parse bulk tags on change
  useEffect(() => {
    if (bulkTags.trim()) {
      const { valid, invalid } = parseBulkTags(bulkTags);
      setValidTags(valid);
      setInvalidTags(invalid);
    } else {
      setValidTags([]);
      setInvalidTags([]);
    }
  }, [bulkTags]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setBulkTags("");
      setSelectedMembers(new Set());
      setMemberSearch("");
      setValidTags([]);
      setInvalidTags([]);
    }
  }, [open]);

  const existingTags = new Set(existingMembers.map(m => m.tag));

  const filteredServerMembers = serverMembers.filter(member =>
    !existingTags.has(member.tag) &&
    (member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
     member.tag.toLowerCase().includes(memberSearch.toLowerCase()) ||
     member.clan_name.toLowerCase().includes(memberSearch.toLowerCase()))
  ).slice(0, 50);

  const filteredClanMembers = clanMembers.filter(member =>
    member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.tag.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    const tagsToAdd = new Set<string>();

    // Add valid bulk tags
    validTags.forEach(tag => tagsToAdd.add(tag));

    // Add selected members
    selectedMembers.forEach(tag => tagsToAdd.add(tag));

    if (tagsToAdd.size === 0) return;

    setSaving(true);
    try {
      await onAddMembers(Array.from(tagsToAdd));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (tag: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedMembers(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t("addMembers.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("addMembers.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bulk tags textarea */}
          <div className="space-y-2">
            <Label htmlFor="bulk-tags" className="text-foreground">
              {t("addMembers.bulkTagsLabel")}
            </Label>
            <Textarea
              id="bulk-tags"
              placeholder="#ABC123, #DEF456&#10;#GHI789"
              value={bulkTags}
              onChange={(e) => setBulkTags(e.target.value)}
              className="bg-background border-border text-foreground font-mono text-sm"
              rows={4}
            />
            {/* Validation feedback */}
            {bulkTags.trim().length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-4 text-sm">
                  {validTags.length > 0 && (
                    <span className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="w-4 h-4" />
                      {validTags.length} {t("bulkValidation.valid")}
                    </span>
                  )}
                  {invalidTags.length > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      {invalidTags.length} {t("bulkValidation.invalid")}
                    </span>
                  )}
                </div>
                {invalidTags.length > 0 && (
                  <p className="text-xs text-red-400">
                    {t("bulkValidation.invalidTags")}: {invalidTags.slice(0, 3).join(', ')}
                    {invalidTags.length > 3 && ` ... +${invalidTags.length - 3}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Member Autocomplete */}
          <div className="space-y-2">
            <Label className="text-foreground">{t("memberAutocomplete.label")}</Label>
            <Popover open={autocompleteOpen} onOpenChange={setAutocompleteOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={autocompleteOpen}
                  className="w-full justify-between bg-background border-border text-foreground"
                  onClick={() => loadServerMembers()}
                >
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    {t("memberAutocomplete.placeholder")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={t("memberAutocomplete.searchPlaceholder")}
                    value={memberSearch}
                    onValueChange={setMemberSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {loadingServerMembers
                        ? t("memberAutocomplete.loading")
                        : t("memberAutocomplete.noResults")
                      }
                    </CommandEmpty>
                    <CommandGroup heading={t("memberAutocomplete.groupHeading")}>
                      {filteredServerMembers.map((member) => (
                        <CommandItem
                          key={member.tag}
                          value={`${member.name} ${member.tag} ${member.clan_name}`}
                          onSelect={() => toggleMember(member.tag)}
                          className={selectedMembers.has(member.tag)
                            ? "bg-destructive/15 text-destructive hover:bg-destructive/15 data-[selected=true]:bg-destructive/15 data-[selected=true]:text-destructive"
                            : ""
                          }
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">{member.townhall}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{member.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.tag} • {member.clan_name}
                              </p>
                            </div>
                            {selectedMembers.has(member.tag) && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected members display */}
          <div className="space-y-2">
            <Label className="text-foreground">{t("memberAutocomplete.selectedLabel")}</Label>
            <div className="min-h-14 max-h-24 overflow-y-auto rounded-md border border-border bg-background/30 p-2">
              {selectedMembers.size > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedMembers).map((tag) => {
                    const member = serverMembers.find(m => m.tag === tag) || clanMembers.find(m => m.tag === tag);
                    return (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1 cursor-pointer hover:bg-destructive/20"
                        onClick={() => toggleMember(tag)}
                      >
                        {member ? `${member.name} (TH${member.townhall})` : tag}
                        <X className="h-3 w-3" />
                      </Badge>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedMembers.size} {t("memberAutocomplete.membersSelected")}
            </p>
          </div>

          {/* Fallback: Clan members list */}
          {serverMembers.length === 0 && clanMembers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-foreground">{t("memberAutocomplete.clanMembersLabel")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("memberAutocomplete.searchPlaceholder")}
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="bg-background border-border text-foreground pl-9"
                />
              </div>
              <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
                {filteredClanMembers.map((member) => (
                  <button
                    key={member.tag}
                    className={`flex items-center justify-between p-3 border-b border-border last:border-0 cursor-pointer transition-colors w-full text-left ${
                      selectedMembers.has(member.tag)
                        ? "bg-destructive/15 text-destructive hover:bg-destructive/15"
                        : "hover:bg-secondary/50"
                    }`}
                    onClick={() => toggleMember(member.tag)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{member.townhall}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.tag} • {member.clan_name}
                        </p>
                      </div>
                    </div>
                    {selectedMembers.has(member.tag) && (
                      <Badge variant="default" className="bg-primary">
                        {t("memberAutocomplete.selected")}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-border"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || (validTags.length === 0 && selectedMembers.size === 0)}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("addMembers.adding")}
              </>
            ) : (
              t("addMembers.submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
