"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { Loader2, Plus, Users, Trash2, Search, RefreshCw, Eye, Copy, ClipboardList, GitCompare, Check, X, FolderOpen, Pencil, Layers, Zap, Bell, Play, Pause, MessageSquare, Lock, Unlock, Archive, UserMinus, Tag, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { useToast } from "@/components/ui/use-toast";
import { apiCache } from "@/lib/api-cache";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Local imports
import { useRosters } from "./_hooks";
import { CloneDialog } from "./_components";
import * as api from "./_lib/api";
import type { Roster, RosterGroup, RosterStats, RosterAutomation, AutomationActionType, DiscordChannel, CreateRosterFormData, CloneRosterFormData, SignupCategory } from "./_lib/types";
import { calculateRosterStats, formatThRestriction, getAutomationLabel, buildOffsetSeconds, parseOffsetSeconds, formatOffsetSeconds } from "./_lib/utils";
import type { OffsetUnit } from "./_lib/utils";

function getGroupsCacheKey(guildId: string): string {
  return `rosters-groups-${guildId}`;
}

function getCategoriesCacheKey(guildId: string): string {
  return `rosters-categories-${guildId}`;
}

function getChannelsCacheKey(guildId: string): string {
  return `rosters-channels-${guildId}`;
}

// Roster Card Component
interface RosterCardProps {
  readonly roster: Roster;
  readonly stats: RosterStats;
  readonly isSelected: boolean;
  readonly compareMode: boolean;
  readonly deleting: string | null;
  readonly groups: RosterGroup[];
  readonly onSelect: () => void;
  readonly onView: () => void;
  readonly onClone: () => void;
  readonly onDelete: () => void;
  readonly onMoveToGroup: (groupId: string | null) => void;
}

function RosterCard({
  roster,
  stats,
  isSelected,
  compareMode,
  deleting,
  groups,
  onSelect,
  onView,
  onClone,
  onDelete,
  onMoveToGroup,
}: RosterCardProps) {
  const t = useTranslations("RostersPage");
  return (
    <Card
      className={`bg-card border-border transition-all relative ${
        compareMode
          ? isSelected // NOSONAR — JSX nested ternary for multi-branch display state
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
        <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>{/* NOSONAR — stopPropagation wrapper div — keyboard handled by inner button children */}
          <Button variant="default" size="sm" className="flex-1" onClick={onView}>
            <Eye className="w-4 h-4 mr-1" />
            {t("rosterCard.view")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {groups.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{t("rosterCard.moveToGroup")}</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => onMoveToGroup(null)}
                    className={roster.group_id ? "" : "font-medium"}
                  >
                    <FolderOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                    {t("rosterCard.noGroup")}
                  </DropdownMenuItem>
                  {groups.map((g) => (
                    <DropdownMenuItem
                      key={g.group_id}
                      onClick={() => onMoveToGroup(g.group_id)}
                      className={roster.group_id === g.group_id ? "font-medium" : ""}
                    >
                      <FolderOpen className="w-4 h-4 mr-2 text-indigo-500" />
                      {g.alias}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onClone}>
                <Copy className="w-4 h-4 mr-2" />
                {t("rosterCard.clone")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                {t("rosterCard.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RostersPage() { // NOSONAR — React page component: complexity is aggregate state/handler management, not a single logic unit
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
  const [editingGroup, setEditingGroup] = useState<RosterGroup | null>(null);
  const [newGroupAlias, setNewGroupAlias] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{ groupId: string; groupAlias: string } | null>(null);
  const [rosterToDelete, setRosterToDelete] = useState<Roster | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ categoryId: string; categoryAlias: string } | null>(null);

  // Group Automations state
  const [groupAutomationsDialogOpen, setGroupAutomationsDialogOpen] = useState(false);
  const [selectedGroupForAutomations, setSelectedGroupForAutomations] = useState<RosterGroup | null>(null);
  const [groupAutomations, setGroupAutomations] = useState<RosterAutomation[]>([]);
  const [createAutomationDialogOpen, setCreateAutomationDialogOpen] = useState(false);
  const [editAutomationDialogOpen, setEditAutomationDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<RosterAutomation | null>(null);
  const [newAutomation, setNewAutomation] = useState<Partial<RosterAutomation> & { _offsetVal?: string; _offsetUnit?: OffsetUnit }>({
    action_type: "roster_ping",
    offset_seconds: -86400,
    _offsetVal: '1',
    _offsetUnit: 'days',
    active: true,
  });
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [categories, setCategories] = useState<SignupCategory[]>([]);
  const [newCategoryAlias, setNewCategoryAlias] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  // Category management (standalone, outside group dialog)
  const [manageCategoriesDialogOpen, setManageCategoriesDialogOpen] = useState(false);
  const [standaloneNewAlias, setStandaloneNewAlias] = useState("");
  const [categoryAliasesById, setCategoryAliasesById] = useState<Record<string, string>>({});
  const [editingStandaloneCategoryId, setEditingStandaloneCategoryId] = useState<string | null>(null);
  const groupsRequestIdRef = useRef(0);
  const categoriesRequestIdRef = useRef(0);
  const channelsRequestIdRef = useRef(0);

  // Fetch groups
  const refreshGroups = useCallback((forceRefresh = false) => {
    if (!guildId) return;
    const requestId = ++groupsRequestIdRef.current;
    if (forceRefresh) {
      apiCache.invalidate(getGroupsCacheKey(guildId));
    }
    apiCache
      .get(getGroupsCacheKey(guildId), () => api.fetchGroups(guildId))
      .then((nextGroups) => {
        if (requestId === groupsRequestIdRef.current) {
          setGroups(nextGroups);
        }
      })
      .catch(() => {
        if (requestId === groupsRequestIdRef.current) {
          setGroups([]);
        }
      });
  }, [guildId]);

  const refreshCategories = useCallback((forceRefresh = false) => {
    if (!guildId) return;
    const requestId = ++categoriesRequestIdRef.current;
    if (forceRefresh) {
      apiCache.invalidate(getCategoriesCacheKey(guildId));
    }
    apiCache
      .get(getCategoriesCacheKey(guildId), () => api.fetchCategories(guildId))
      .then((nextCategories) => {
        if (requestId === categoriesRequestIdRef.current) {
          setCategories(nextCategories);
        }
      })
      .catch(() => {
        if (requestId === categoriesRequestIdRef.current) {
          setCategories([]);
        }
      });
  }, [guildId]);

  const refreshChannels = useCallback((forceRefresh = false) => {
    if (!guildId) return;
    const requestId = ++channelsRequestIdRef.current;
    if (forceRefresh) {
      apiCache.invalidate(getChannelsCacheKey(guildId));
    }
    apiCache
      .get(getChannelsCacheKey(guildId), () => api.fetchChannels(guildId))
      .then((nextChannels) => {
        if (requestId === channelsRequestIdRef.current) {
          setChannels(nextChannels);
        }
      })
      .catch(() => {
        if (requestId === channelsRequestIdRef.current) {
          setChannels([]);
        }
      });
  }, [guildId]);

  useEffect(() => {
    refreshGroups();
    refreshCategories();
    refreshChannels();
  }, [refreshGroups, refreshCategories, refreshChannels]);

  useEffect(() => {
    if (!manageCategoriesDialogOpen) return;
    setCategoryAliasesById(
      Object.fromEntries(categories.map((cat) => [cat.custom_id, cat.alias]))
    );
  }, [categories, manageCategoriesDialogOpen]);

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
    roster.alias?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    roster.clan_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
      apiCache.invalidate(getGroupsCacheKey(guildId));
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

  const handleCreateCategoryInline = async () => {
    if (!newCategoryAlias.trim()) return;
    setSavingCategory(true);
    try {
      const created = await api.createCategory(guildId, newCategoryAlias.trim());
      apiCache.invalidate(getCategoriesCacheKey(guildId));
      setCategories(prev => [...prev, created]);
      // Auto-select the new category in the editing group
      setEditingGroup(prev => prev ? {
        ...prev,
        allowed_signup_categories: [...(prev.allowed_signup_categories ?? []), created.custom_id],
      } : null);
      setNewCategoryAlias("");
    } catch {
      toast({ title: t("categoryError"), variant: "destructive" });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleEditGroup = async () => {
    if (!editingGroup?.alias.trim()) return;
    setSavingGroup(true);
    try {
      const updated = await api.updateGroup(editingGroup.group_id, guildId, {
        alias: editingGroup.alias,
        max_accounts_per_user: editingGroup.max_accounts_per_user ?? null,
        roster_size: editingGroup.roster_size ?? null,
        min_signups: editingGroup.min_signups ?? null,
        // Only send allowed_signup_categories if it was explicitly set in the dialog
        // (undefined means user never touched it, so don't cascade)
        ...(editingGroup.allowed_signup_categories !== undefined && {
          allowed_signup_categories: editingGroup.allowed_signup_categories,
        }),
        ...(editingGroup.default_signup_category !== undefined && {
          default_signup_category: editingGroup.default_signup_category ?? null,
        }),
      });
      apiCache.invalidate(getGroupsCacheKey(guildId));
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

  const handleDeleteGroup = async (groupId: string) => {
    setDeletingGroup(groupId);
    try {
      await api.deleteGroup(groupId, guildId);
      apiCache.invalidate(getGroupsCacheKey(guildId));
      setGroups(prev => prev.filter(g => g.group_id !== groupId));
      toast({ title: t("groupDeleted") });
    } catch {
      toast({ title: t("groupError"), variant: "destructive" });
    } finally {
      setDeletingGroup(null);
    }
  };

  // Category management handlers (standalone, not inside group dialog)
  const handleCreateCategoryStandalone = async () => {
    if (!standaloneNewAlias.trim()) return;
    setSavingCategory(true);
    try {
      await api.createCategory(guildId, standaloneNewAlias.trim());
      refreshCategories(true);
      setStandaloneNewAlias("");
      toast({ title: t("categoryCreated") });
    } catch {
      toast({ title: t("categoryError"), variant: "destructive" });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUpdateCategoryStandalone = async (categoryId: string) => {
    const nextAlias = categoryAliasesById[categoryId]?.trim();
    if (!nextAlias) return;
    setSavingCategory(true);
    try {
      await api.updateCategory(categoryId, guildId, { alias: nextAlias });
      apiCache.invalidate(getCategoriesCacheKey(guildId));
      setCategories(prev => prev.map(c =>
        c.custom_id === categoryId ? { ...c, alias: nextAlias } : c
      ));
      setEditingStandaloneCategoryId(null);
      toast({ title: t("categoryUpdated") });
    } catch {
      toast({ title: t("categoryError"), variant: "destructive" });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategoryStandalone = async (categoryId: string) => {
    try {
      await api.deleteCategory(categoryId, guildId);
      apiCache.invalidate(getCategoriesCacheKey(guildId));
      setCategories(prev => prev.filter(c => c.custom_id !== categoryId));
      setCategoryAliasesById(prev => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
      toast({ title: t("categoryDeleted") });
    } catch {
      toast({ title: t("categoryError"), variant: "destructive" });
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
      const updated = await api.updateAutomation(automationId, guildId, { active: !automation.active });
      setGroupAutomations(prev => prev.map(a => a.automation_id === automationId ? updated : a));
      toast({ title: t("automationUpdated") });
    } catch {
      toast({ title: t("automationError"), variant: "destructive" });
    }
  };

  const handleDeleteAutomation = async (automationId: string) => {
    try {
      await api.deleteAutomation(automationId, guildId);
      setGroupAutomations(prev => prev.filter(a => a.automation_id !== automationId));
      toast({ title: t("automationDeleted") });
    } catch {
      toast({ title: t("automationError"), variant: "destructive" });
    }
  };

  const handleCreateAutomation = async () => {
    if (!newAutomation.action_type || !selectedGroupForAutomations) return;
    if (newAutomation.action_type === 'roster_ping' && !newAutomation.options?.ping_type) return;
    setSavingAutomation(true);
    try {
      const created = await api.createAutomation({
        server_id: guildId,
        group_id: selectedGroupForAutomations.group_id,
        action_type: newAutomation.action_type as AutomationActionType,
        offset_seconds: newAutomation.offset_seconds ?? -86400,
        discord_channel_id: newAutomation.discord_channel_id,
        active: true,
      });
      setGroupAutomations(prev => [...prev, created]);
      toast({ title: t("automationCreated") });
      setCreateAutomationDialogOpen(false);
      setGroupAutomationsDialogOpen(true);
      setNewAutomation({
        action_type: "roster_ping",
        offset_seconds: -86400,
        _offsetVal: '1',
        _offsetUnit: 'days',
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
      if (editingAutomation.action_type === 'roster_ping' && !editingAutomation.options?.ping_type) return;
      const updated = await api.updateAutomation(editingAutomation.automation_id, guildId, {
        action_type: editingAutomation.action_type,
        offset_seconds: editingAutomation.offset_seconds,
        discord_channel_id: editingAutomation.discord_channel_id,
        options: editingAutomation.options,
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

  const handleMoveRosterToGroup = async (roster: Roster, groupId: string | null) => {
    try {
      await api.updateRoster(roster.custom_id, guildId, { group_id: groupId });
      refresh();
    } catch {
      toast({ title: t("saveError"), variant: "destructive" });
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
    if (newRosterData.roster_type === "clan" && clans.length > 0 && !newRosterData.clan_tag) {
      toast({
        title: tCommon("error"),
        description: t("createErrorClan"),
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const rosterName = newRosterData.alias;
      await createRoster(newRosterData);
      toast({
        title: tCommon("success"),
        description: t("createSuccessDesc", { name: rosterName }),
      });
      setCreateDialogOpen(false);
      setNewRosterData({
        alias: "",
        roster_type: "clan",
        signup_scope: "clan-only",
        clan_tag: "",
      });
      refresh();
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

  const isCreateRosterValid =
    newRosterData.alias.trim().length > 0 &&
    newRosterData.roster_type.length > 0 &&
    newRosterData.signup_scope.length > 0 &&
    (newRosterData.roster_type !== "clan" || clans.length === 0 || newRosterData.clan_tag.length > 0);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
                <p className="text-muted-foreground mt-1">{t("description")}</p>
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.totalRosters")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-9 w-16" />
                  <ClipboardList className="h-8 w-8 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.totalMembers")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-9 w-16" />
                  <Users className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-orange-500/30 bg-orange-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.clanRosters")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-9 w-16" />
                  <Users className="h-8 w-8 text-orange-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-purple-500/30 bg-purple-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.familyRosters")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-9 w-16" />
                  <Users className="h-8 w-8 text-purple-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" /> // NOSONAR — index is the only stable key for these items (skeleton/static list)
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

          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button onClick={refresh} variant="outline" size="icon" className="shrink-0">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCreateGroupDialogOpen(true)}
              className="gap-2 shrink-0"
            >
              <Layers className="h-4 w-4" />
              {t("groups.create")}
            </Button>
            {rosters.length >= 2 && !compareMode && (
              <Button
                variant="outline"
                onClick={() => setCompareMode(true)}
                className="gap-2 shrink-0"
              >
                <GitCompare className="h-4 w-4" />
                {t("compare.enterMode")}
              </Button>
            )}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 gap-2 shrink-0">
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
                    <Label htmlFor="roster-name">
                      {t("createDialog.aliasLabel")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="roster-name"
                      value={newRosterData.alias}
                      onChange={(e) => setNewRosterData({ ...newRosterData, alias: e.target.value })}
                      placeholder={t("createDialog.aliasPlaceholder")}
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {t("createDialog.typeLabel")} <span className="text-destructive">*</span>
                    </Label>
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
                      <Label>
                        {t("createDialog.clanLabel")} <span className="text-destructive">*</span>
                      </Label>
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
                    <Label>
                      {t("createDialog.signupScopeLabel")} <span className="text-destructive">*</span>
                    </Label>
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
                  <Button onClick={handleCreateRoster} disabled={creating || !isCreateRosterValid}>
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
        <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
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

        {/* Search + Categories */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="relative max-w-md w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0 py-1">
            <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              <Tag className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{t("categories.title")}</span>
            </div>
            {categories.map((cat) => (
              <Badge
                key={cat.custom_id}
                variant="secondary"
                className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
              >
                {cat.alias}
              </Badge>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setStandaloneNewAlias("");
                setManageCategoriesDialogOpen(true);
              }}
            >
              <Pencil className="w-3 h-3 mr-1" />
              {t("categories.manage")}
            </Button>
          </div>
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
            {/* Groups */}
            {groups.map((group) => {
              const groupRosters = (rostersByGroup[group.group_id] ?? []).filter(roster =>
                roster.alias?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                roster.clan_name?.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (groupRosters.length === 0 && searchQuery) return null;

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
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <p className="text-sm text-muted-foreground">
                            {groupRosters.length} roster{groupRosters.length > 1 ? "s" : ""}
                          </p>
                          {group.max_accounts_per_user && (
                            <Badge variant="outline" className="text-xs h-5">{t("groups.rules.maxAccountsBadge", { count: group.max_accounts_per_user })}</Badge>
                          )}
                          {group.roster_size && (
                            <Badge variant="outline" className="text-xs h-5">{t("groups.rules.rosterSizeBadge", { size: group.roster_size })}</Badge>
                          )}
                          {group.min_signups && (
                            <Badge variant="outline" className="text-xs h-5">{t("groups.rules.minSignupsBadge", { count: group.min_signups })}</Badge>
                          )}
                          {group.allowed_signup_categories && group.allowed_signup_categories.length > 0 && (
                            <Badge variant="outline" className="text-xs h-5 text-indigo-500 border-indigo-500/30">{t("groups.rules.categoriesBadge", { count: group.allowed_signup_categories.length })}</Badge>
                          )}
                        </div>
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
                        onClick={() => { setEditingGroup(group); setEditGroupDialogOpen(true); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGroupToDelete({ groupId: group.group_id, groupAlias: group.alias })}
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
                  {groupRosters.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic px-1">{t("groups.emptyGroup")}</p>
                  ) : (
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
                          groups={groups}
                          onSelect={() => toggleRosterSelection(roster.custom_id)}
                          onView={() => handleViewRoster(roster)}
                          onClone={() => handleOpenClone(roster)}
                          onDelete={() => setRosterToDelete(roster)}
                          onMoveToGroup={(groupId) => handleMoveRosterToGroup(roster, groupId)}
                        />
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped rosters */}
            {(() => {
              const ungroupedRosters = rostersByGroup.ungrouped.filter(roster =>
                roster.alias?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                roster.clan_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
                          groups={groups}
                          onSelect={() => toggleRosterSelection(roster.custom_id)}
                          onView={() => handleViewRoster(roster)}
                          onClone={() => handleOpenClone(roster)}
                          onDelete={() => setRosterToDelete(roster)}
                          onMoveToGroup={(groupId) => handleMoveRosterToGroup(roster, groupId)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Manage Categories Dialog */}
        <Dialog open={manageCategoriesDialogOpen} onOpenChange={(open) => {
          setManageCategoriesDialogOpen(open);
          if (!open) {
            setStandaloneNewAlias("");
            setEditingStandaloneCategoryId(null);
          }
        }}>
          <DialogContent className="bg-card border-border w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("categories.manage")}</DialogTitle>
              <DialogDescription>{t("categories.description")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("categories.createTitle")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={standaloneNewAlias}
                    onChange={(e) => setStandaloneNewAlias(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateCategoryStandalone()}
                    className="bg-background border-border"
                    placeholder={t("groups.rules.newCategoryPlaceholder")}
                    autoFocus
                  />
                  <Button onClick={handleCreateCategoryStandalone} disabled={!standaloneNewAlias.trim() || savingCategory}>
                    {savingCategory ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {t("categories.create")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("categories.editTitle")}</Label>
                {categories.length > 0 ? (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {categories.map((cat) => (
                      <div key={cat.custom_id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2">
                        {editingStandaloneCategoryId === cat.custom_id ? (
                          <Input
                            value={categoryAliasesById[cat.custom_id] ?? ""}
                            onChange={(e) => setCategoryAliasesById(prev => ({ ...prev, [cat.custom_id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdateCategoryStandalone(cat.custom_id)}
                            className="bg-background border-border"
                            autoFocus
                          />
                        ) : (
                          <div className="h-10 w-full flex items-center px-3 rounded-md border border-border bg-muted/20 text-sm">
                            {cat.alias}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2 w-full sm:w-auto sm:shrink-0 sm:ml-auto">
                          {editingStandaloneCategoryId === cat.custom_id ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateCategoryStandalone(cat.custom_id)}
                                disabled={!categoryAliasesById[cat.custom_id]?.trim() || savingCategory}
                                className="gap-1.5"
                              >
                                <Pencil className="w-4 h-4" />
                                {tCommon("save")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingStandaloneCategoryId(null)}
                                disabled={savingCategory}
                              >
                                {tCommon("cancel")}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingStandaloneCategoryId(cat.custom_id)}
                                disabled={savingCategory}
                                className="gap-1.5"
                              >
                                <Pencil className="w-4 h-4" />
                                {tCommon("edit")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCategoryToDelete({ categoryId: cat.custom_id, categoryAlias: cat.alias })}
                                disabled={savingCategory}
                                className="gap-1.5 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                                {tCommon("delete")}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t("categories.noCategories")}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManageCategoriesDialogOpen(false)}>
                {tCommon("close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
        <Dialog open={editGroupDialogOpen} onOpenChange={(open) => { setEditGroupDialogOpen(open); if (!open) { setEditingGroup(null); setNewCategoryAlias(""); } }}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("groups.editTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto pr-1">
              {/* Name */}
              <div className="space-y-2">
                <Label>{t("groups.nameLabel")}</Label>
                <Input
                  value={editingGroup?.alias || ""}
                  onChange={(e) => setEditingGroup(prev => prev ? { ...prev, alias: e.target.value } : null)}
                  className="bg-background border-border"
                  placeholder={t("groups.namePlaceholder")}
                />
              </div>

              {/* Rules */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t("groups.rules.title")}</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("groups.rules.maxAccounts")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingGroup?.max_accounts_per_user ?? ""}
                      onChange={(e) => setEditingGroup(prev => prev ? {
                        ...prev,
                        max_accounts_per_user: e.target.value ? Number.parseInt(e.target.value) : undefined,
                      } : null)}
                      placeholder="∞"
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("groups.rules.rosterSize")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingGroup?.roster_size ?? ""}
                      onChange={(e) => setEditingGroup(prev => prev ? {
                        ...prev,
                        roster_size: e.target.value ? Number.parseInt(e.target.value) : undefined,
                      } : null)}
                      placeholder="∞"
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("groups.rules.minSignups")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingGroup?.min_signups ?? ""}
                      onChange={(e) => setEditingGroup(prev => prev ? {
                        ...prev,
                        min_signups: e.target.value ? Number.parseInt(e.target.value) : undefined,
                      } : null)}
                      placeholder="—"
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t("groups.rules.rulesHint")}</p>
              </div>

              {/* Signup Categories */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t("groups.rules.categoriesTitle")}</Label>
                <p className="text-xs text-muted-foreground">{t("groups.rules.categoriesHint")}</p>
                {/* Existing categories as checkboxes */}
                {categories.length > 0 ? (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {categories.map((cat) => {
                      const selected = editingGroup?.allowed_signup_categories?.includes(cat.custom_id) ?? false;
                      return (
                        <div key={cat.custom_id} className="flex items-center gap-3 px-3 py-2">
                          <input
                            type="checkbox"
                            id={`cat-${cat.custom_id}`}
                            checked={selected}
                            onChange={(e) => setEditingGroup(prev => { // NOSONAR — inline state updater in JSX handler, standard React pattern
                              if (!prev) return null;
                              const current = prev.allowed_signup_categories ?? [];
                              return {
                                ...prev,
                                allowed_signup_categories: e.target.checked
                                  ? [...current, cat.custom_id]
                                  : current.filter(id => id !== cat.custom_id), // NOSONAR — JSX inline handler nesting is structural, not logic complexity
                              };
                            })}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                          <label htmlFor={`cat-${cat.custom_id}`} className="text-sm cursor-pointer flex-1">
                            {cat.alias}
                          </label>
                          <span className="text-xs text-muted-foreground font-mono">{cat.custom_id}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t("groups.rules.noCategories")}</p>
                )}
                {/* Default signup category */}
                {(editingGroup?.allowed_signup_categories?.length ?? 0) > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("settings.defaultSignupCategory")}</Label>
                    <Select
                      value={editingGroup?.default_signup_category ?? "__none__"}
                      onValueChange={(v) => setEditingGroup(prev => prev ? {
                        ...prev,
                        default_signup_category: v === "__none__" ? null : v,
                      } : null)}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder={t("settings.defaultSignupCategoryNone")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("settings.defaultSignupCategoryNone")}</SelectItem>
                        {categories
                          .filter(c => editingGroup?.allowed_signup_categories?.includes(c.custom_id))
                          .map(c => (
                            <SelectItem key={c.custom_id} value={c.custom_id}>{c.alias}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Inline category creation */}
                <div className="flex gap-2">
                  <Input
                    value={newCategoryAlias}
                    onChange={(e) => setNewCategoryAlias(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateCategoryInline()}
                    placeholder={t("groups.rules.newCategoryPlaceholder")}
                    className="bg-background border-border"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateCategoryInline}
                    disabled={!newCategoryAlias.trim() || savingCategory}
                  >
                    {savingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
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
              ) : groupAutomations.map((automation) => ( // NOSONAR — JSX render callback; complexity is structural UI display, not logic
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
                      {automation.action_type === "roster_clear" && <UserMinus className={`w-4 h-4 ${automation.active ? "text-orange-500" : "text-muted-foreground"}`} />}
                      {automation.action_type === "roster_archive" && <Archive className={`w-4 h-4 ${automation.active ? "text-slate-500" : "text-muted-foreground"}`} />}
                      {automation.action_type === "roster_delete" && <Trash2 className={`w-4 h-4 ${automation.active ? "text-destructive" : "text-muted-foreground"}`} />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{getAutomationLabel(automation.action_type)}</p>
                      <p className="text-xs text-muted-foreground">{formatOffsetSeconds(automation.offset_seconds, t)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {automation.executed ? (
                      automation.execution_status === "missed" ? ( // NOSONAR — JSX nested ternary for multi-branch display state
                        <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {t("automations.missed")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {t("automations.executed")}
                          {automation.executed_at && (
                            <span className="ml-1 opacity-70">
                              {new Date(automation.executed_at * 1000).toLocaleDateString()}
                            </span>
                          )}
                        </Badge>
                      )
                    ) : automation.last_missed_at ? ( // NOSONAR — JSX nested ternary for multi-branch display state
                      <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {t("automations.missed")}
                      </Badge>
                    ) : automation.last_triggered_at ? ( // NOSONAR — JSX nested ternary for multi-branch display state
                      <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-border">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {t("automations.lastRun")}
                        <span className="ml-1 opacity-70">
                          {new Date(automation.last_triggered_at * 1000).toLocaleDateString()}
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={`text-xs ${automation.active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""}`}>
                        {automation.active ? t("automations.active") : t("automations.inactive")}
                      </Badge>
                    )}
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
                <Label>{t("automations.offsetFromEvent")}</Label>
                <div className="flex gap-2">
                  <span className="text-sm text-muted-foreground self-center">{t("automations.offsetBefore")}</span>
                  <Input
                    type="number"
                    min={1}
                    value={newAutomation._offsetVal ?? '1'}
                    onChange={(e) => {
                      const val = Number.parseInt(e.target.value) || 1;
                      const unit = (newAutomation._offsetUnit ?? 'days') as OffsetUnit;
                      setNewAutomation({ ...newAutomation, _offsetVal: e.target.value, offset_seconds: buildOffsetSeconds('before', val, unit) });
                    }}
                    className="bg-background w-20"
                  />
                  <Select
                    value={newAutomation._offsetUnit ?? 'days'}
                    onValueChange={(v) => {
                      const unit = v as OffsetUnit;
                      const val = Number.parseInt(newAutomation._offsetVal ?? '1') || 1;
                      setNewAutomation({ ...newAutomation, _offsetUnit: unit, offset_seconds: buildOffsetSeconds('before', val, unit) });
                    }}
                  >
                    <SelectTrigger className="bg-background flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">{t("automations.offsetUnit_days")}</SelectItem>
                      <SelectItem value="hours">{t("automations.offsetUnit_hours")}</SelectItem>
                      <SelectItem value="minutes">{t("automations.offsetUnit_minutes")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {newAutomation.action_type === "roster_ping" && (
                <div className="space-y-2">
                  <Label>{t("automations.pingType")}</Label>
                  <Select
                    value={newAutomation.options?.ping_type ?? ""}
                    onValueChange={(v) =>
                      setNewAutomation({ ...newAutomation, options: { ...newAutomation.options, ping_type: v as import("./_lib/types").PingType } })
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t("automations.pingType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="signup_reminder">{t("automations.pingType_signup_reminder")}</SelectItem>
                      <SelectItem value="missing">{t("automations.pingType_missing")}</SelectItem>
                      <SelectItem value="sub_needed">{t("automations.pingType_sub_needed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                <Label>{t("automations.offsetFromEvent")}</Label>
                {(() => {
                  const parsed = parseOffsetSeconds(editingAutomation?.offset_seconds ?? -86400);
                  return (
                    <div className="flex gap-2">
                      <span className="text-sm text-muted-foreground self-center">{t("automations.offsetBefore")}</span>
                      <Input
                        type="number"
                        min={1}
                        value={parsed.val}
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value) || 1;
                          setEditingAutomation(prev => prev ? { ...prev, offset_seconds: buildOffsetSeconds('before', val, parsed.unit) } : null);
                        }}
                        className="bg-background w-20"
                      />
                      <Select
                        value={parsed.unit}
                        onValueChange={(v) => {
                          const unit = v as OffsetUnit;
                          setEditingAutomation(prev => prev ? { ...prev, offset_seconds: buildOffsetSeconds('before', parsed.val, unit) } : null);
                        }}
                      >
                        <SelectTrigger className="bg-background flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">{t("automations.offsetUnit_minutes")}</SelectItem>
                          <SelectItem value="hours">{t("automations.offsetUnit_hours")}</SelectItem>
                          <SelectItem value="days">{t("automations.offsetUnit_days")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}
              </div>
              {editingAutomation?.action_type === "roster_ping" && (
                <div className="space-y-2">
                  <Label>{t("automations.pingType")}</Label>
                  <Select
                    value={editingAutomation.options?.ping_type ?? ""}
                    onValueChange={(v) =>
                      setEditingAutomation(prev => prev ? { ...prev, options: { ...prev.options, ping_type: v as import("./_lib/types").PingType } } : null)
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t("automations.pingType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="signup_reminder">{t("automations.pingType_signup_reminder")}</SelectItem>
                      <SelectItem value="missing">{t("automations.pingType_missing")}</SelectItem>
                      <SelectItem value="sub_needed">{t("automations.pingType_sub_needed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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

      {/* Delete category confirmation */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={open => !open && setCategoryToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{tCommon("confirm")}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("categories.deleteConfirm", { name: categoryToDelete?.categoryAlias ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                handleDeleteCategoryStandalone(categoryToDelete!.categoryId);
                setCategoryToDelete(null);
              }}
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete group confirmation */}
      <AlertDialog open={!!groupToDelete} onOpenChange={open => !open && setGroupToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{tCommon("confirm")}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("groups.deleteConfirm", { name: groupToDelete?.groupAlias ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { handleDeleteGroup(groupToDelete!.groupId); setGroupToDelete(null); }}
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete roster confirmation */}
      <AlertDialog open={!!rosterToDelete} onOpenChange={open => !open && setRosterToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{tCommon("confirm")}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("deleteConfirm", { name: rosterToDelete?.alias ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { handleDeleteRoster(rosterToDelete!); setRosterToDelete(null); }} // NOSONAR — non-null assertion guards against null safely in context
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
