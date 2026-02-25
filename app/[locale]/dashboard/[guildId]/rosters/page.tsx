"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Users, Trash2, Edit, Search, RefreshCw, Eye, Copy, ClipboardList, GitCompare, Check, X, FolderOpen, Pencil, Layers, Zap, Bell, Play, Pause, MessageSquare, Lock, Unlock, Archive, UserMinus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { useToast } from "@/components/ui/use-toast";

// Local imports
import { useRosters } from "./_hooks";
import { CloneDialog } from "./_components";
import * as api from "./_lib/api";
import type { Roster, RosterGroup, RosterStats, RosterAutomation, AutomationActionType, DiscordChannel, CreateRosterFormData, CloneRosterFormData } from "./_lib/types";
import { calculateRosterStats, formatThRestriction, getAutomationLabel, formatTimestamp, unixToDatetimeLocal, datetimeLocalToUnix } from "./_lib/utils";

// Roster Card Component
interface RosterCardProps {
  roster: Roster;
  stats: RosterStats;
  isSelected: boolean;
  compareMode: boolean;
  deleting: string | null;
  onSelect: () => void;
  onView: () => void;
  onClone: () => void;
  onDelete: () => void;
}

function RosterCard({
  roster,
  stats,
  isSelected,
  compareMode,
  deleting,
  onSelect,
  onView,
  onClone,
  onDelete,
}: RosterCardProps) {
  const t = useTranslations("RostersPage");
  return (
    <Card
      className={`bg-card border-border transition-all relative ${
        compareMode
          ? isSelected
            ? "ring-2 ring-primary border-primary bg-primary/5 cursor-pointer"
            : "hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
          : "hover:border-primary/50"
      }`}
      onClick={compareMode ? onSelect : undefined}
    >
      {/* Selection indicator in compare mode */}
      {compareMode && (
        <div className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected
            ? "bg-primary border-primary"
            : "border-muted-foreground/50 bg-background"
        }`}>
          {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
        </div>
      )}
      <CardHeader className="pb-3">
        <div className={`flex items-center gap-3 ${compareMode ? "pr-10" : ""}`}>
          {roster.clan_badge ? (
            <Avatar className="h-10 w-10">
              <AvatarImage src={roster.clan_badge} alt={roster.clan_name || ""} />
              <AvatarFallback>{roster.alias.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg text-foreground truncate">{roster.alias}</CardTitle>
              <Badge variant={roster.roster_type === "clan" ? "default" : "secondary"} className="text-xs">
                {roster.roster_type}
              </Badge>
            </div>
            {roster.clan_name && (
              <p className="text-sm text-muted-foreground truncate">{roster.clan_name}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.totalMembers}</p>
            <p className="text-xs text-muted-foreground">{t("rosterCard.members")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">{stats.avgTh || "-"}</p>
            <p className="text-xs text-muted-foreground">{t("rosterCard.avgTh")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {stats.avgHitrate ? `${stats.avgHitrate}%` : "-"}
            </p>
            <p className="text-xs text-muted-foreground">{t("rosterCard.avgHitrate")}</p>
          </div>
        </div>

        {/* TH Restriction */}
        {(roster.min_th || roster.max_th) && (
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="text-xs">
              {formatThRestriction(roster.min_th, roster.max_th)}
            </Badge>
          </div>
        )}

        {/* Member distribution */}
        {stats.totalMembers > 0 && (
          <div className="flex justify-center gap-2 text-xs">
            {stats.inClan > 0 && (
              <span className="text-green-400">{stats.inClan} {t("rosterCard.clan")}</span>
            )}
            {stats.inFamily > 0 && (
              <span className="text-yellow-400">{stats.inFamily} {t("rosterCard.family")}</span>
            )}
            {stats.external > 0 && (
              <span className="text-red-400">{stats.external} {t("rosterCard.external")}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onView}
          >
            <Eye className="w-4 h-4 mr-1" />
            {t("rosterCard.view")}
          </Button>
          <Button variant="outline" size="sm" onClick={onClone}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={deleting === roster.custom_id}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RostersPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params?.guildId as string;
  const locale = params?.locale as string;
  const t = useTranslations("RostersPage");
  const tCommon = useTranslations("Common");

  // Data hook
  const {
    rosters,
    clans,
    loading,
    error,
    refresh,
    createRoster,
    deleteRoster,
    cloneRoster,
  } = useRosters(guildId);

  // Groups state
  const [groups, setGroups] = useState<RosterGroup[]>([]);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ group_id: string; alias: string } | null>(null);
  const [newGroupAlias, setNewGroupAlias] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  // Group Automations state
  const [groupAutomationsDialogOpen, setGroupAutomationsDialogOpen] = useState(false);
  const [selectedGroupForAutomations, setSelectedGroupForAutomations] = useState<RosterGroup | null>(null);
  const [groupAutomations, setGroupAutomations] = useState<RosterAutomation[]>([]);
  const [createAutomationDialogOpen, setCreateAutomationDialogOpen] = useState(false);
  const [editAutomationDialogOpen, setEditAutomationDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<RosterAutomation | null>(null);
  const [newAutomation, setNewAutomation] = useState<Partial<RosterAutomation>>({
    action_type: "roster_ping",
    scheduled_time: Math.floor(Date.now() / 1000) + 3600,
    active: true,
  });
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);

  // Fetch groups
  const refreshGroups = () => {
    if (guildId) api.fetchGroups(guildId).then(setGroups).catch(() => setGroups([]));
  };

  useEffect(() => {
    refreshGroups();
    if (guildId) api.fetchChannels(guildId).then(setChannels).catch(() => setChannels([]));
  }, [guildId]);

  // Group rosters by group_id
  const rostersByGroup = useMemo(() => {
    const grouped: Record<string, Roster[]> = { ungrouped: [] };
    groups.forEach(g => { grouped[g.group_id] = []; });

    rosters.forEach(roster => {
      if (roster.group_id && grouped[roster.group_id]) {
        grouped[roster.group_id].push(roster);
      } else {
        grouped.ungrouped.push(roster);
      }
    });

    return grouped;
  }, [rosters, groups]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [rosterToClone, setRosterToClone] = useState<Roster | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedRosterIds, setSelectedRosterIds] = useState<string[]>([]);

  // Create form state
  const [newRosterData, setNewRosterData] = useState<CreateRosterFormData>({
    alias: "",
    roster_type: "clan",
    signup_scope: "clan-only",
    clan_tag: "",
  });

  // Filter rosters
  const filteredRosters = rosters.filter(roster =>
    (roster.alias && roster.alias.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (roster.clan_name && roster.clan_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Family clan tags for stats calculation
  const familyClanTags = clans.map(c => c.tag);

  // Calculate global stats
  const totalMembers = rosters.reduce((acc, r) => acc + (r.members?.length || 0), 0);
  const clanRosters = rosters.filter(r => r.roster_type === "clan").length;
  const familyRosters = rosters.filter(r => r.roster_type === "family").length;

  // Selection handlers
  const toggleRosterSelection = (rosterId: string) => {
    setSelectedRosterIds(prev => {
      if (prev.includes(rosterId)) {
        return prev.filter(id => id !== rosterId);
      }
      if (prev.length >= 4) {
        // Max 4 rosters
        return prev;
      }
      return [...prev, rosterId];
    });
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedRosterIds([]);
  };

  const handleCompareRosters = () => {
    if (selectedRosterIds.length >= 2) {
      router.push(`/${locale}/dashboard/${guildId}/rosters/compare?ids=${selectedRosterIds.join(',')}`);
    }
  };

  const handleCompareGroup = (groupId: string) => {
    router.push(`/${locale}/dashboard/${guildId}/rosters/compare?groupId=${groupId}`);
  };

  const handleCreateGroup = async () => {
    if (!newGroupAlias.trim()) return;
    setSavingGroup(true);
    try {
      const created = await api.createGroup(guildId, newGroupAlias.trim());
      setGroups(prev => [...prev, created]);
      setCreateGroupDialogOpen(false);
      setNewGroupAlias("");
      toast({ title: t("groupCreated") });
    } catch {
      toast({ title: t("groupError"), variant: "destructive" });
    } finally {
      setSavingGroup(false);
    }
  };

  const handleEditGroup = async () => {
    if (!editingGroup?.alias.trim()) return;
    setSavingGroup(true);
    try {
      const updated = await api.updateGroup(editingGroup.group_id, guildId, { alias: editingGroup.alias });
      setGroups(prev => prev.map(g => g.group_id === updated.group_id ? updated : g));
      setEditGroupDialogOpen(false);
      setEditingGroup(null);
      toast({ title: t("groupUpdated") });
    } catch {
      toast({ title: t("groupError"), variant: "destructive" });
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupAlias: string) => {
    if (!confirm(t("groups.deleteConfirm").replace("{name}", groupAlias))) return;
    setDeletingGroup(groupId);
    try {
      await api.deleteGroup(groupId, guildId);
      setGroups(prev => prev.filter(g => g.group_id !== groupId));
      toast({ title: t("groupDeleted") });
    } catch {
      toast({ title: t("groupError"), variant: "destructive" });
    } finally {
      setDeletingGroup(null);
    }
  };

  // Group Automation handlers
  const handleOpenGroupAutomations = async (group: RosterGroup) => {
    setSelectedGroupForAutomations(group);
    setGroupAutomationsDialogOpen(true);
    try {
      const automations = await api.fetchAutomations(guildId, undefined, group.group_id);
      setGroupAutomations(automations);
    } catch {
      setGroupAutomations([]);
    }
  };

  const handleToggleAutomation = async (automationId: string) => {
    const automation = groupAutomations.find(a => a.automation_id === automationId);
    if (!automation) return;
    try {
      const updated = await api.updateAutomation(automationId, { active: !automation.active });
      setGroupAutomations(prev => prev.map(a => a.automation_id === automationId ? updated : a));
      toast({ title: t("automationUpdated") });
    } catch {
      toast({ title: t("automationError"), variant: "destructive" });
    }
  };

  const handleDeleteAutomation = async (automationId: string) => {
    try {
      await api.deleteAutomation(automationId);
      setGroupAutomations(prev => prev.filter(a => a.automation_id !== automationId));
      toast({ title: t("automationDeleted") });
    } catch {
      toast({ title: t("automationError"), variant: "destructive" });
    }
  };

  const handleCreateAutomation = async () => {
    if (!newAutomation.action_type || !newAutomation.scheduled_time || !selectedGroupForAutomations) return;
    setSavingAutomation(true);
    try {
      const created = await api.createAutomation({
        server_id: parseInt(guildId),
        group_id: selectedGroupForAutomations.group_id,
        action_type: newAutomation.action_type as AutomationActionType,
        scheduled_time: newAutomation.scheduled_time,
        discord_channel_id: newAutomation.discord_channel_id,
        active: true,
      });
      setGroupAutomations(prev => [...prev, created]);
      toast({ title: t("automationCreated") });
      setCreateAutomationDialogOpen(false);
      setGroupAutomationsDialogOpen(true);
      setNewAutomation({
        action_type: "roster_ping",
        scheduled_time: Math.floor(Date.now() / 1000) + 3600,
        active: true,
      });
    } catch {
      toast({ title: t("automationError"), variant: "destructive" });
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleEditAutomation = async () => {
    if (!editingAutomation) return;
    try {
      const updated = await api.updateAutomation(editingAutomation.automation_id, {
        action_type: editingAutomation.action_type,
        scheduled_time: editingAutomation.scheduled_time,
        discord_channel_id: editingAutomation.discord_channel_id,
        active: editingAutomation.active,
      });
      setGroupAutomations(prev => prev.map(a => a.automation_id === updated.automation_id ? updated : a));
      toast({ title: t("automationUpdated") });
      setEditAutomationDialogOpen(false);
      setEditingAutomation(null);
      setGroupAutomationsDialogOpen(true);
    } catch {
      toast({ title: t("automationError"), variant: "destructive" });
    }
  };

  // Handlers
  const handleViewRoster = (roster: Roster) => {
    router.push(`/${locale}/dashboard/${guildId}/rosters/${roster.custom_id}`);
  };

  const handleDeleteRoster = async (roster: Roster) => {
    if (!confirm(t("deleteConfirm", { name: roster.alias }))) return;

    setDeleting(roster.custom_id);
    try {
      await deleteRoster(roster.custom_id);
      toast({
        title: tCommon("success"),
        description: t("deleteSuccessDesc", { name: roster.alias }),
      });
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleOpenClone = (roster: Roster) => {
    setRosterToClone(roster);
    setCloneDialogOpen(true);
  };

  const handleCloneRoster = async (data: CloneRosterFormData) => {
    if (!rosterToClone) return;

    try {
      const cloned = await cloneRoster(rosterToClone.custom_id, data);
      toast({
        title: tCommon("success"),
        description: t("cloneDialog.successDesc", { name: cloned.alias }),
      });
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleCreateRoster = async () => {
    if (!newRosterData.alias.trim()) {
      toast({
        title: tCommon("error"),
        description: t("createErrorAlias"),
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const created = await createRoster(newRosterData);
      toast({
        title: tCommon("success"),
        description: t("createSuccessDesc", { name: created.alias }),
      });
      setCreateDialogOpen(false);
      setNewRosterData({
        alias: "",
        roster_type: "clan",
        signup_scope: "clan-only",
        clan_tag: "",
      });
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={refresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t("retry")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-muted-foreground mt-1">{t("description")}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={refresh} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCreateGroupDialogOpen(true)}
              className="gap-2"
            >
              <Layers className="h-4 w-4" />
              {t("groups.create")}
            </Button>
            {rosters.length >= 2 && !compareMode && (
              <Button
                variant="outline"
                onClick={() => setCompareMode(true)}
                className="gap-2"
              >
                <GitCompare className="h-4 w-4" />
                {t("compare.enterMode")}
              </Button>
            )}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 gap-2">
                  <Plus className="h-4 w-4" />
                  {t("createRoster")}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("createDialog.title")}</DialogTitle>
                  <DialogDescription>{t("createDialog.description")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="roster-name">{t("createDialog.aliasLabel")}</Label>
                    <Input
                      id="roster-name"
                      value={newRosterData.alias}
                      onChange={(e) => setNewRosterData({ ...newRosterData, alias: e.target.value })}
                      placeholder={t("createDialog.aliasPlaceholder")}
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("createDialog.typeLabel")}</Label>
                    <Select
                      value={newRosterData.roster_type}
                      onValueChange={(value: "clan" | "family") =>
                        setNewRosterData({ ...newRosterData, roster_type: value })
                      }
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clan">{t("createDialog.typeClan")}</SelectItem>
                        <SelectItem value="family">{t("createDialog.typeFamily")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newRosterData.roster_type === "clan" && clans.length > 0 && (
                    <div className="space-y-2">
                      <Label>{t("createDialog.clanLabel")}</Label>
                      <Select
                        value={newRosterData.clan_tag}
                        onValueChange={(value) =>
                          setNewRosterData({ ...newRosterData, clan_tag: value })
                        }
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder={t("createDialog.clanPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {clans.map((clan) => (
                            <SelectItem key={clan.tag} value={clan.tag}>
                              {clan.name} ({clan.tag})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t("createDialog.signupScopeLabel")}</Label>
                    <Select
                      value={newRosterData.signup_scope}
                      onValueChange={(value: "clan-only" | "family-wide") =>
                        setNewRosterData({ ...newRosterData, signup_scope: value })
                      }
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clan-only">{t("createDialog.scopeClanOnly")}</SelectItem>
                        <SelectItem value="family-wide">{t("createDialog.scopeFamilyWide")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                    {tCommon("cancel")}
                  </Button>
                  <Button 
                    onClick={handleCreateRoster} 
                    disabled={
                      creating || 
                      !newRosterData.alias.trim() || 
                      (newRosterData.roster_type === "clan" && !newRosterData.clan_tag)
                    }
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("createDialog.creating")}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("createDialog.create")}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Compare Mode Banner */}
        {compareMode && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <GitCompare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t("compare.modeTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("compare.modeHint")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg">
                  <Badge variant="default" className="bg-primary">
                    {selectedRosterIds.length}
                  </Badge>
                  <span className="text-sm text-muted-foreground">/ 4 max</span>
                </div>
                <Button
                  variant="default"
                  onClick={handleCompareRosters}
                  disabled={selectedRosterIds.length < 2}
                  className="gap-2"
                >
                  <GitCompare className="w-4 h-4" />
                  {t("compare.button")} ({selectedRosterIds.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={exitCompareMode}
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("compare.exitMode")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stats.totalRosters")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-blue-500">{rosters.length}</div>
                <ClipboardList className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stats.totalMembers")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-500">{totalMembers}</div>
                <Users className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-orange-500/30 bg-orange-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stats.clanRosters")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-orange-500">{clanRosters}</div>
                <Users className="h-8 w-8 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stats.familyRosters")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-purple-500">{familyRosters}</div>
                <Users className="h-8 w-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </div>

        {/* Rosters Grid */}
        {filteredRosters.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-foreground font-medium">
                {searchQuery ? t("noSearchResults") : t("noRosters")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? t("noSearchResultsHint") : t("noRostersHint")}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  {t("createFirstRoster")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Groups with rosters */}
            {groups.filter(g => rostersByGroup[g.group_id]?.length > 0).map((group) => {
              const groupRosters = rostersByGroup[group.group_id].filter(roster =>
                (roster.alias && roster.alias.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (roster.clan_name && roster.clan_name.toLowerCase().includes(searchQuery.toLowerCase()))
              );
              if (groupRosters.length === 0) return null;

              return (
                <div key={group.group_id} className="space-y-4">
                  {/* Group Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10">
                        <FolderOpen className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">{group.alias}</h2>
                        <p className="text-sm text-muted-foreground">
                          {groupRosters.length} roster{groupRosters.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {groupRosters.length >= 2 && !compareMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompareGroup(group.group_id)}
                          className="gap-2"
                        >
                          <GitCompare className="h-4 w-4" />
                          {t("compare.compareGroup")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenGroupAutomations(group)}
                        className="text-muted-foreground hover:text-amber-500"
                        title={t("groups.automationsTitle")}
                      >
                        <Zap className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingGroup({ group_id: group.group_id, alias: group.alias }); setEditGroupDialogOpen(true); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.group_id, group.alias)}
                        disabled={deletingGroup === group.group_id}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {deletingGroup === group.group_id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Group Rosters Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupRosters.map((roster) => {
                      const stats = calculateRosterStats(roster.members, roster.clan_tag, familyClanTags);
                      const isSelected = selectedRosterIds.includes(roster.custom_id);
                      return (
                        <RosterCard
                          key={roster.custom_id}
                          roster={roster}
                          stats={stats}
                          isSelected={isSelected}
                          compareMode={compareMode}
                          deleting={deleting}
                          onSelect={() => toggleRosterSelection(roster.custom_id)}
                          onView={() => handleViewRoster(roster)}
                          onClone={() => handleOpenClone(roster)}
                          onDelete={() => handleDeleteRoster(roster)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Ungrouped rosters */}
            {(() => {
              const ungroupedRosters = rostersByGroup.ungrouped.filter(roster =>
                (roster.alias && roster.alias.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (roster.clan_name && roster.clan_name.toLowerCase().includes(searchQuery.toLowerCase()))
              );
              if (ungroupedRosters.length === 0) return null;

              return (
                <div className="space-y-4">
                  {groups.some(g => rostersByGroup[g.group_id]?.length > 0) && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <ClipboardList className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">{t("ungrouped")}</h2>
                        <p className="text-sm text-muted-foreground">
                          {ungroupedRosters.length} roster{ungroupedRosters.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ungroupedRosters.map((roster) => {
                      const stats = calculateRosterStats(roster.members, roster.clan_tag, familyClanTags);
                      const isSelected = selectedRosterIds.includes(roster.custom_id);
                      return (
                        <RosterCard
                          key={roster.custom_id}
                          roster={roster}
                          stats={stats}
                          isSelected={isSelected}
                          compareMode={compareMode}
                          deleting={deleting}
                          onSelect={() => toggleRosterSelection(roster.custom_id)}
                          onView={() => handleViewRoster(roster)}
                          onClone={() => handleOpenClone(roster)}
                          onDelete={() => handleDeleteRoster(roster)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Clone Dialog */}
        <CloneDialog
          open={cloneDialogOpen}
          onOpenChange={setCloneDialogOpen}
          roster={rosterToClone}
          onClone={handleCloneRoster}
          t={t}
        />

        {/* Create Group Dialog */}
        <Dialog open={createGroupDialogOpen} onOpenChange={(open) => { setCreateGroupDialogOpen(open); if (!open) setNewGroupAlias(""); }}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{t("groups.createTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label>{t("groups.nameLabel")}</Label>
              <Input
                value={newGroupAlias}
                onChange={(e) => setNewGroupAlias(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                className="bg-background border-border"
                placeholder={t("groups.namePlaceholder")}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateGroupDialogOpen(false)} disabled={savingGroup}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleCreateGroup} disabled={!newGroupAlias.trim() || savingGroup}>
                {savingGroup ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("groups.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Group Dialog */}
        <Dialog open={editGroupDialogOpen} onOpenChange={(open) => { setEditGroupDialogOpen(open); if (!open) setEditingGroup(null); }}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{t("groups.editTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label>{t("groups.nameLabel")}</Label>
              <Input
                value={editingGroup?.alias || ""}
                onChange={(e) => setEditingGroup(prev => prev ? { ...prev, alias: e.target.value } : null)}
                onKeyDown={(e) => e.key === "Enter" && handleEditGroup()}
                className="bg-background border-border"
                placeholder={t("groups.namePlaceholder")}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditGroupDialogOpen(false)} disabled={savingGroup}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleEditGroup} disabled={!editingGroup?.alias.trim() || savingGroup}>
                {savingGroup ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Group Automations Dialog */}
        <Dialog open={groupAutomationsDialogOpen} onOpenChange={(open) => {
          setGroupAutomationsDialogOpen(open);
          if (!open) setSelectedGroupForAutomations(null);
        }}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {t("groups.automationsTitle")} - {selectedGroupForAutomations?.alias}
              </DialogTitle>
              <DialogDescription>{t("groups.automationsDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {groupAutomations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{t("groups.noAutomations")}</p>
                  <p className="text-sm mt-1">{t("groups.noAutomationsHint")}</p>
                </div>
              ) : groupAutomations.map((automation) => (
                <div
                  key={automation.automation_id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${automation.active ? "bg-amber-500/10" : "bg-muted"}`}>
                      {automation.action_type === "roster_ping" && <Bell className={`w-4 h-4 ${automation.active ? "text-amber-500" : "text-muted-foreground"}`} />}
                      {automation.action_type === "roster_post" && <MessageSquare className={`w-4 h-4 ${automation.active ? "text-blue-500" : "text-muted-foreground"}`} />}
                      {automation.action_type === "roster_signup" && <Unlock className={`w-4 h-4 ${automation.active ? "text-emerald-500" : "text-muted-foreground"}`} />}
                      {automation.action_type === "roster_signup_close" && <Lock className={`w-4 h-4 ${automation.active ? "text-red-500" : "text-muted-foreground"}`} />}
                      {automation.action_type === "recurring_event" && <RefreshCw className={`w-4 h-4 ${automation.active ? "text-purple-500" : "text-muted-foreground"}`} />}
                      {automation.action_type === "roster_clear" && <UserMinus className={`w-4 h-4 ${automation.active ? "text-orange-500" : "text-muted-foreground"}`} />}
                      {automation.action_type === "roster_archive" && <Archive className={`w-4 h-4 ${automation.active ? "text-slate-500" : "text-muted-foreground"}`} />}
                      {automation.action_type === "roster_delete" && <Trash2 className={`w-4 h-4 ${automation.active ? "text-destructive" : "text-muted-foreground"}`} />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{getAutomationLabel(automation.action_type)}</p>
                      <p className="text-xs text-muted-foreground">{formatTimestamp(automation.scheduled_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={automation.active ? "default" : "secondary"} className="text-xs">
                      {automation.active ? t("automations.active") : t("automations.inactive")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleToggleAutomation(automation.automation_id)}
                    >
                      {automation.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setEditingAutomation(automation);
                        setGroupAutomationsDialogOpen(false);
                        setEditAutomationDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAutomation(automation.automation_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGroupAutomationsDialogOpen(false)}>
                {tCommon("close")}
              </Button>
              <Button onClick={() => {
                setGroupAutomationsDialogOpen(false);
                setCreateAutomationDialogOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                {t("groups.addAutomation")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Automation Dialog */}
        <Dialog open={createAutomationDialogOpen} onOpenChange={(open) => {
          setCreateAutomationDialogOpen(open);
          if (!open) setGroupAutomationsDialogOpen(true);
        }}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{t("automations.createTitle")}</DialogTitle>
              <DialogDescription>
                {t("automations.targetGroup")}: <strong>{selectedGroupForAutomations?.alias}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("automations.actionType")}</Label>
                <Select
                  value={newAutomation.action_type}
                  onValueChange={(value) =>
                    setNewAutomation({ ...newAutomation, action_type: value as AutomationActionType })
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roster_ping">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <span>{t("automations.actions.ping")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_post">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                        <span>{t("automations.actions.post")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_signup">
                      <div className="flex items-center gap-2">
                        <Unlock className="w-4 h-4 text-emerald-500" />
                        <span>{t("automations.actions.openSignup")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_signup_close">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-red-500" />
                        <span>{t("automations.actions.closeSignup")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="recurring_event">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-purple-500" />
                        <span>{t("automations.actions.recurring")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_clear">
                      <div className="flex items-center gap-2">
                        <UserMinus className="w-4 h-4 text-orange-500" />
                        <span>{t("automations.actions.clear")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_archive">
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-slate-500" />
                        <span>{t("automations.actions.archive")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_delete">
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-destructive" />
                        <span>{t("automations.actions.delete")}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("automations.scheduledTime")}</Label>
                <Input
                  type="datetime-local"
                  value={unixToDatetimeLocal(newAutomation.scheduled_time)}
                  onChange={(e) =>
                    setNewAutomation({
                      ...newAutomation,
                      scheduled_time: datetimeLocalToUnix(e.target.value) || 0,
                    })
                  }
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("automations.channel")}</Label>
                <ChannelCombobox
                  channels={channels}
                  value={newAutomation.discord_channel_id || ""}
                  onValueChange={(value) =>
                    setNewAutomation({
                      ...newAutomation,
                      discord_channel_id: value === "disabled" ? undefined : value,
                    })
                  }
                  placeholder={t("automations.selectChannel")}
                  showDisabled={true}
                />
                <p className="text-xs text-muted-foreground">{t("automations.channelHint")}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateAutomationDialogOpen(false); setGroupAutomationsDialogOpen(true); }}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleCreateAutomation} disabled={savingAutomation}>
                {savingAutomation ? <Loader2 className="w-4 h-4 animate-spin" /> : t("automations.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Automation Dialog */}
        <Dialog open={editAutomationDialogOpen} onOpenChange={(open) => {
          setEditAutomationDialogOpen(open);
          if (!open) { setEditingAutomation(null); setGroupAutomationsDialogOpen(true); }
        }}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {t("automations.editTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("automations.actionType")}</Label>
                <Select
                  value={editingAutomation?.action_type}
                  onValueChange={(value) =>
                    setEditingAutomation(prev => prev ? { ...prev, action_type: value as AutomationActionType } : null)
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roster_ping">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <span>{t("automations.actions.ping")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_post">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                        <span>{t("automations.actions.post")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_signup">
                      <div className="flex items-center gap-2">
                        <Unlock className="w-4 h-4 text-emerald-500" />
                        <span>{t("automations.actions.openSignup")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_signup_close">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-red-500" />
                        <span>{t("automations.actions.closeSignup")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="recurring_event">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-purple-500" />
                        <span>{t("automations.actions.recurring")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_clear">
                      <div className="flex items-center gap-2">
                        <UserMinus className="w-4 h-4 text-orange-500" />
                        <span>{t("automations.actions.clear")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_archive">
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-slate-500" />
                        <span>{t("automations.actions.archive")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="roster_delete">
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-destructive" />
                        <span>{t("automations.actions.delete")}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("automations.scheduledTime")}</Label>
                <Input
                  type="datetime-local"
                  value={editingAutomation ? unixToDatetimeLocal(editingAutomation.scheduled_time) : ""}
                  onChange={(e) =>
                    setEditingAutomation(prev => prev ? {
                      ...prev,
                      scheduled_time: datetimeLocalToUnix(e.target.value) || 0,
                    } : null)
                  }
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("automations.channel")}</Label>
                <ChannelCombobox
                  channels={channels}
                  value={editingAutomation?.discord_channel_id || ""}
                  onValueChange={(value) =>
                    setEditingAutomation(prev => prev ? {
                      ...prev,
                      discord_channel_id: value === "disabled" ? undefined : value,
                    } : null)
                  }
                  placeholder={t("automations.selectChannel")}
                  showDisabled={true}
                />
                <p className="text-xs text-muted-foreground">{t("automations.channelHint")}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${editingAutomation?.active ? "bg-emerald-500/10" : "bg-muted"}`}>
                    {editingAutomation?.active ? (
                      <Play className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Pause className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t("automations.activeLabel")}</p>
                    <p className="text-xs text-muted-foreground">
                      {editingAutomation?.active ? t("automations.willExecute") : t("automations.paused")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={editingAutomation?.active ?? false}
                  onCheckedChange={(checked) =>
                    setEditingAutomation(prev => prev ? { ...prev, active: checked } : null)
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditAutomationDialogOpen(false); setGroupAutomationsDialogOpen(true); }}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleEditAutomation}>
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
