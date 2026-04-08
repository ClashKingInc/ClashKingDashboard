"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import {
  Loader2, ArrowLeft, Settings as SettingsIcon, Users, Zap, FolderTree,
  RefreshCw, UserPlus, Clock, Calendar, Plus, Trash2, Bell, Lock, Unlock,
  MessageSquare, UserMinus, Building2, Globe, Hash, Shield, UserCheck,
  Layers, Tag, FileText, Home, Pencil, Columns3, ChevronUp, ChevronDown, GripVertical,
  Info, Lightbulb, Play, Pause, List, LayoutGrid, Archive, X, Copy, ExternalLink, Link2,
  CheckCircle2, AlertTriangle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useToast } from "@/components/ui/use-toast";

// Local imports
import { useRosterDetail } from "../_hooks";
import {
  RosterStatsCard,
  MembersTable,
  AddMembersDialog,
  MissingMembersDialog,
  MembersByCategory,
} from "../_components";
import {
  unixToDatetimeLocal,
  datetimeLocalToUnix,
  getTimezoneOffset,
  getAutomationLabel,
  formatTimestamp,
  getColumnLabel,
  getColumnInternal,
  getSortLabel,
  getSortInternal,
  ROSTER_COLUMNS,
  SORT_OPTIONS,
  buildOffsetSeconds,
  parseOffsetSeconds,
  formatOffsetSeconds,
} from "../_lib";
import type { OffsetUnit } from "../_lib";
import type { EditRosterFormData, RosterAutomation, AutomationActionType, RosterGroup } from "../_lib/types";
import { generateRosterToken, fetchRosters } from "../_lib/api";
import type { RosterTokenResult } from "../_lib/api";
import { useGameConstants } from "../_hooks";

// ────────────────────────────────────────────────────────────────────────────

export default function RosterDetailPage() { // NOSONAR — React page component: complexity is aggregate state/handler management, not a single logic unit
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const guildId = params.guildId as string;
  const rosterId = params.rosterId as string;
  const locale = params.locale as string;
  const t = useTranslations("RostersPage");

  // Game constants
  const { minTh, maxTh } = useGameConstants();

  // Data hook
  const {
    roster,
    clans,
    clanMembers,
    serverMembers,
    automations,
    groups,
    categories,
    channels,
    missingMembers,
    loading,
    loadingMissingMembers,
    loadingServerMembers,
    error,
    refreshRoster,
    updateRoster,
    addMembers,
    removeMember,
    clearMembers,
    updateMemberCategory,
    refreshMember,
    loadMissingMembers,
    loadServerMembers,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useRosterDetail(rosterId, guildId);

  // UI State
  const [activeTab, setActiveTab] = useState("members");
  const [membersViewMode, setMembersViewMode] = useState<"list" | "grouped">("list");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [clearingMembers, setClearingMembers] = useState(false);
  const [clearMembersOpen, setClearMembersOpen] = useState(false);

  // Dialogs
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);
  const [missingMembersDialogOpen, setMissingMembersDialogOpen] = useState(false);
  const [createAutomationDialogOpen, setCreateAutomationDialogOpen] = useState(false);
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [editAutomationDialogOpen, setEditAutomationDialogOpen] = useState(false);
  const [groupAutomationsDialogOpen, setGroupAutomationsDialogOpen] = useState(false);
  const [selectedGroupForAutomations, setSelectedGroupForAutomations] = useState<RosterGroup | null>(null);

  // Form state
  const [editData, setEditData] = useState<EditRosterFormData>({
    alias: "",
    description: "",
    roster_type: "clan",
    signup_scope: "clan-only",
    clan_tag: "",
    min_th: "",
    max_th: "",
    roster_size: "",
    min_signups: "",
    max_accounts_per_user: "",
    event_start_time: "",
    recurrence_days: "",
    recurrence_day_of_month: "",
    recurrence_mode: "days",
    default_signup_category: "",
    columns: [],
    sort: [],
    group_id: "",
    allowed_signup_categories: [],
  });

  const [newAutomation, setNewAutomation] = useState<Partial<RosterAutomation> & { target_type?: 'roster' | 'group'; target_group_id?: string; _offsetVal?: string; _offsetUnit?: 'minutes' | 'hours' | 'days' }>({
    action_type: "roster_ping",
    offset_seconds: -86400,
    active: true,
    target_type: 'roster',
    _offsetVal: '1',
    _offsetUnit: 'days',
  });

  const [newCategory, setNewCategory] = useState({ custom_id: "", alias: "" });
  const [editingCategory, setEditingCategory] = useState<{ custom_id: string; alias: string } | null>(null);
  const [editingAutomation, setEditingAutomation] = useState<RosterAutomation | null>(null);

  // Group duplicate map: tag → list of other roster aliases in the same group
  const [groupDuplicateMap, setGroupDuplicateMap] = useState<Record<string, string[]>>({});

  React.useEffect(() => {
    if (!roster?.group_id) {
      setGroupDuplicateMap({});
      return;
    }
    fetchRosters(guildId, roster.group_id).then((groupRosters) => {
      const map: Record<string, string[]> = {};
      for (const r of groupRosters) {
        if (r.custom_id === rosterId) continue;
        for (const m of r.members ?? []) {
          if (!map[m.tag]) map[m.tag] = [];
          map[m.tag].push(r.alias);
        }
      }
      setGroupDuplicateMap(map);
    }).catch(() => {});
  }, [roster?.group_id, guildId, rosterId]);

  // Column configuration state
  const defaultColumns = ['townhall', 'name', 'tag', 'hitrate', 'current_clan_tag'];
  const [localColumns, setLocalColumns] = useState<string[]>(defaultColumns);
  const [columnPopoverOpen, setColumnPopoverOpen] = useState(false);

  // Sync edit form with roster data
  React.useEffect(() => {
    if (roster) {
      setEditData({
        alias: roster.alias,
        description: roster.description || "",
        roster_type: roster.roster_type || "clan",
        signup_scope: roster.signup_scope || "clan-only",
        clan_tag: roster.clan_tag || "",
        min_th: roster.min_th?.toString() || "",
        max_th: roster.max_th?.toString() || "",
        roster_size: roster.roster_size?.toString() || "",
        min_signups: roster.min_signups?.toString() || "",
        max_accounts_per_user: roster.max_accounts_per_user?.toString() || "",
        event_start_time: unixToDatetimeLocal(roster.event_start_time),
        recurrence_days: roster.recurrence_days?.toString() || "",
        recurrence_day_of_month: roster.recurrence_day_of_month?.toString() || "",
        recurrence_mode: roster.recurrence_day_of_month ? "day_of_month" : "days",
        default_signup_category: roster.default_signup_category || "",
        columns: (roster.columns || []).map(getColumnLabel),
        sort: (roster.sort || []).map(getSortLabel),
        group_id: roster.group_id || "",
        allowed_signup_categories: roster.allowed_signup_categories || [],
      });
    }
  }, [roster]);

  // Sync localColumns when roster changes
  React.useEffect(() => {
    if (roster?.columns?.length) {
      setLocalColumns(roster.columns.map(getColumnInternal));
    }
  }, [roster?.columns]);

  // Family clan tags
  const familyClanTags = clans.map(c => c.tag);

  // Categories filtered to only those allowed for this roster
  const rosterCategories = roster?.allowed_signup_categories?.length
    ? categories.filter(c => roster.allowed_signup_categories!.includes(c.custom_id))
    : categories;

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshRoster();
      toast({ title: t("refreshSuccess") });
    } catch (err) {
      toast({
        title: t("refreshError"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateRoster({
        alias: editData.alias,
        description: editData.description || null,
        roster_type: editData.roster_type,
        signup_scope: editData.signup_scope,
        clan_tag: editData.clan_tag || null,
        min_th: editData.min_th ? parseInt(editData.min_th) : null,
        max_th: editData.max_th ? parseInt(editData.max_th) : null,
        roster_size: editData.roster_size ? parseInt(editData.roster_size) : null,
        min_signups: editData.min_signups ? parseInt(editData.min_signups) : null,
        max_accounts_per_user: editData.max_accounts_per_user ? parseInt(editData.max_accounts_per_user) : null,
        event_start_time: datetimeLocalToUnix(editData.event_start_time),
        recurrence_days: editData.recurrence_mode === 'days' && editData.recurrence_days
          ? parseInt(editData.recurrence_days) : null,
        recurrence_day_of_month: editData.recurrence_mode === 'day_of_month' && editData.recurrence_day_of_month
          ? parseInt(editData.recurrence_day_of_month) : null,
        columns: editData.columns.map(getColumnInternal),
        sort: editData.sort.map(getSortInternal),
        group_id: editData.group_id || null,
        allowed_signup_categories: editData.allowed_signup_categories.length > 0 ? editData.allowed_signup_categories : undefined,
        default_signup_category: editData.default_signup_category || null,
      });
      toast({ title: t("saveSuccess") });
    } catch (err) {
      toast({
        title: t("saveError"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembers = async (tags: string[]) => {
    try {
      await addMembers(tags);
      toast({
        title: t("addMembersSuccess"),
        description: t("addMembersSuccessDesc", { count: tags.length }),
      });
    } catch (err) {
      toast({
        title: t("addMembersError"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleRemoveMember = async (tag: string) => {
    setRemovingMember(tag);
    try {
      await removeMember(tag);
      toast({ title: t("removeMemberSuccess") });
    } catch (err) {
      toast({
        title: t("removeMemberError"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRemovingMember(null);
    }
  };

  const handleClearMembers = async () => {
    setClearingMembers(true);
    try {
      await clearMembers();
      toast({ title: t("clearMembersSuccess") });
    } catch (err) {
      toast({
        title: t("clearMembersError"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setClearingMembers(false);
    }
  };

  const handleCreateAutomation = async () => {
    if (!newAutomation.action_type) return;
    if (newAutomation.target_type === 'group' && !newAutomation.target_group_id) return;
    if (newAutomation.action_type === 'roster_ping' && !newAutomation.options?.ping_type) return;

    setSaving(true);
    try {
      await createAutomation({
        server_id: guildId,
        roster_id: newAutomation.target_type === 'roster' ? rosterId : undefined,
        group_id: newAutomation.target_type === 'group' ? newAutomation.target_group_id : undefined,
        action_type: newAutomation.action_type as AutomationActionType,
        offset_seconds: newAutomation.offset_seconds ?? -86400,
        discord_channel_id: newAutomation.discord_channel_id,
        options: newAutomation.options,
        active: true,
      });
      toast({ title: t("automationCreated") });
      setCreateAutomationDialogOpen(false);
      setNewAutomation({
        action_type: "roster_ping",
        offset_seconds: -86400,
        active: true,
        target_type: 'roster',
        _offsetVal: '1',
        _offsetUnit: 'days',
      });
    } catch (err) {
      toast({
        title: t("automationError"),
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutomation = async (automationId: string) => {
    const automation = automations.find(a => a.automation_id === automationId);
    if (!automation) return;

    try {
      await updateAutomation(automationId, { active: !automation.active });
      toast({ title: t("automationUpdated") });
    } catch (err) {
      toast({
        title: t("automationError"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteAutomation = async (automationId: string) => {
    try {
      await deleteAutomation(automationId);
      toast({ title: t("automationDeleted") });
    } catch (err) {
      toast({
        title: t("automationError"),
        variant: "destructive",
      });
    }
  };


  const handleEditAutomation = async () => {
    if (!editingAutomation) return;
    if (editingAutomation.action_type === 'roster_ping' && !editingAutomation.options?.ping_type) return;
    try {
      await updateAutomation(editingAutomation.automation_id, {
        action_type: editingAutomation.action_type,
        offset_seconds: editingAutomation.offset_seconds,
        discord_channel_id: editingAutomation.discord_channel_id,
        options: editingAutomation.options,
        active: editingAutomation.active,
      });
      toast({ title: t("automationUpdated") });
      setEditAutomationDialogOpen(false);
      setEditingAutomation(null);
    } catch (err) {
      toast({
        title: t("automationError"),
        variant: "destructive",
      });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.alias.trim()) return;
    try {
      const created = await createCategory(newCategory.alias);
      // Auto-select the new category in allowed_signup_categories
      setEditData(prev => ({
        ...prev,
        allowed_signup_categories: [...prev.allowed_signup_categories, created.custom_id],
      }));
      toast({ title: t("categoryCreated") });
      setCreateCategoryDialogOpen(false);
      setNewCategory({ custom_id: "", alias: "" });
    } catch (err) {
      toast({ title: t("categoryError"), variant: "destructive" });
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategory.alias.trim()) return;
    try {
      await updateCategory(editingCategory.custom_id, { alias: editingCategory.alias });
      toast({ title: t("categoryUpdated") });
      setEditCategoryDialogOpen(false);
      setEditingCategory(null);
    } catch (err) {
      toast({ title: t("categoryError"), variant: "destructive" });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" disabled>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t("stats.members")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t("stats.averageTH")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t("stats.clans")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("tabs.members")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !roster) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-destructive">{error || "Roster not found"}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back")}
          </Button>
        </div>
      </div>
    );
  }

  const handleToggleColumn = (columnValue: string) => {
    setLocalColumns(prev => {
      if (prev.includes(columnValue)) {
        return prev.filter(c => c !== columnValue);
      } else {
        return [...prev, columnValue];
      }
    });
  };

  const handleMoveColumn = (columnValue: string, direction: 'up' | 'down') => {
    setLocalColumns(prev => {
      const index = prev.indexOf(columnValue);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newColumns = [...prev];
      [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];
      return newColumns;
    });
  };

  const handleSaveColumns = async () => {
    try {
      await updateRoster({ columns: localColumns });
      toast({ title: t("columnsUpdated") });
      setColumnPopoverOpen(false);
    } catch (err) {
      toast({ title: t("columnsError"), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            {roster.clan_badge ? (
              <Avatar className="h-12 w-12">
                <AvatarImage src={roster.clan_badge} alt={roster.clan_name || ""} />
                <AvatarFallback>{roster.alias.charAt(0)}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{roster.alias}</h1>
              {roster.clan_name && (
                <p className="text-muted-foreground">{roster.clan_name}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {t("refresh")}
          </Button>
          <Button onClick={() => setAddMembersDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            {t("addMembers.submit")}
          </Button>
        </div>
      </div>

      {/* Stats Card */}
      <RosterStatsCard roster={roster} familyClanTags={familyClanTags} t={t} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            {t("tabs.members")}
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Zap className="w-4 h-4" />
            {t("tabs.automations")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            {t("tabs.settings")}
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              {roster.members?.length || 0} {t("members.count")}
            </p>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              {rosterCategories.length > 0 && (
                <div className="flex items-center border border-border rounded-lg p-1">
                  <Button
                    variant={membersViewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setMembersViewMode("list")}
                    title={t("members.viewList")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={membersViewMode === "grouped" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setMembersViewMode("grouped")}
                    title={t("members.viewGrouped")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <Popover open={columnPopoverOpen} onOpenChange={setColumnPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns3 className="w-4 h-4 mr-2" />
                    {t("columns.configure")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b border-border">
                    <h4 className="font-medium">{t("columns.title")}</h4>
                    <p className="text-sm text-muted-foreground">{t("columns.description")}</p>
                  </div>
                  <div className="p-2 max-h-[300px] overflow-y-auto">
                    {/* Selected columns with reorder */}
                    <div className="space-y-1 mb-2">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">{t("columns.selected")}</p>
                      {localColumns.map((col, index) => {
                        const columnDef = ROSTER_COLUMNS.find(c => c.value === col);
                        return (
                          <div
                            key={col}
                            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{columnDef ? t(`memberColumns.${col}`) : col}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleMoveColumn(col, 'up')}
                                disabled={index === 0}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleMoveColumn(col, 'down')}
                                disabled={index === localColumns.length - 1}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive"
                                onClick={() => handleToggleColumn(col)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Available columns */}
                    <div className="space-y-1 border-t border-border pt-2">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">{t("columns.available")}</p>
                      {ROSTER_COLUMNS.filter(c => !localColumns.includes(c.value)).map((col) => (
                        <button
                          key={col.value}
                          className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer w-full text-left"
                          onClick={() => handleToggleColumn(col.value)}
                        >
                          <span className="text-sm text-muted-foreground">{t(`memberColumns.${col.value}`)}</span>
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-2 border-t border-border">
                    <Button size="sm" className="w-full" onClick={handleSaveColumns}>
                      {t("columns.save")}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {roster.clan_tag && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMissingMembersDialogOpen(true)}
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  {t("missingMembers.button")}
                </Button>
              )}
              {(roster.members?.length || 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClearMembersOpen(true)}
                  disabled={clearingMembers}
                  className="text-destructive hover:text-destructive"
                >
                  {clearingMembers
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Trash2 className="w-4 h-4 mr-2" />}
                  {t("clearMembers")}
                </Button>
              )}
            </div>
          </div>

          <Card className="bg-card border-border">
            <CardContent className={membersViewMode === "grouped" ? "p-4" : "p-0"}>
              {membersViewMode === "grouped" && rosterCategories.length > 0 ? (
                <MembersByCategory
                  members={roster.members || []}
                  categories={rosterCategories}
                  columns={localColumns}
                  rosterClanTag={roster.clan_tag}
                  familyClans={clans}
                  onRemoveMember={handleRemoveMember}
                  onUpdateMemberCategory={updateMemberCategory}
                  removingMember={removingMember}
                  t={t}
                />
              ) : (
                <MembersTable
                  members={roster.members || []}
                  columns={localColumns}
                  rosterClanTag={roster.clan_tag}
                  familyClans={clans}
                  categories={rosterCategories}
                  onRemoveMember={handleRemoveMember}
                  removingMember={removingMember}
                  onCategoryClick={() => setMembersViewMode("grouped")}
                  onUpdateMemberCategory={updateMemberCategory}
                  onRefreshMember={refreshMember}
                  groupDuplicateMap={groupDuplicateMap}
                  t={t}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{t("automations.description")}</p>
            <Button onClick={() => setCreateAutomationDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("automations.create")}
            </Button>
          </div>

          {/* Info Box */}
          <Alert className="bg-blue-500/5 border-blue-500/20">
            <Lightbulb className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm text-muted-foreground">
              {t("automations.infoBox")}
            </AlertDescription>
          </Alert>

          {automations.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <Zap className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">{t("automations.empty")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("automations.emptyHint")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {automations.map((automation) => {
                // Icon color based on action type
                const getActionColor = (type: string) => {
                  switch (type) {
                    case "roster_ping": return "amber";
                    case "roster_post": return "blue";
                    case "roster_signup": return "emerald";
                    case "roster_signup_close": return "red";
                    default: return "gray";
                  }
                };
                const iconColor = getActionColor(automation.action_type);

                // Border color: indigo for group automations, primary for roster automations
                const getBorderColor = () => {
                  if (!automation.active) return undefined;
                  return automation._isGroupAutomation
                    ? "rgb(99, 102, 241)" // indigo-500 for group
                    : "hsl(var(--primary))"; // primary for roster
                };

                return (
                  <Card
                    key={automation.automation_id}
                    className={`bg-card border-l-4 transition-all hover:shadow-md ${
                      !automation.active ? "border-l-muted opacity-60" : ""
                    }`}
                    style={{ borderLeftColor: getBorderColor() }}
                  >
                    <CardContent className="p-4">
                      {/* Header with icon and status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2.5 rounded-xl ${
                          automation.active
                            ? `bg-${iconColor}-500/10`
                            : "bg-muted"
                        }`}>
                          {automation.action_type === "roster_ping" && <Bell className={`w-5 h-5 ${automation.active ? "text-amber-500" : "text-muted-foreground"}`} />}
                          {automation.action_type === "roster_post" && <MessageSquare className={`w-5 h-5 ${automation.active ? "text-blue-500" : "text-muted-foreground"}`} />}
                          {automation.action_type === "roster_signup" && <Unlock className={`w-5 h-5 ${automation.active ? "text-emerald-500" : "text-muted-foreground"}`} />}
                          {automation.action_type === "roster_signup_close" && <Lock className={`w-5 h-5 ${automation.active ? "text-red-500" : "text-muted-foreground"}`} />}
                          {automation.action_type === "roster_clear" && <UserMinus className={`w-5 h-5 ${automation.active ? "text-orange-500" : "text-muted-foreground"}`} />}
                          {automation.action_type === "roster_archive" && <Archive className={`w-5 h-5 ${automation.active ? "text-slate-500" : "text-muted-foreground"}`} />}
                          {automation.action_type === "roster_delete" && <Trash2 className={`w-5 h-5 ${automation.active ? "text-destructive" : "text-muted-foreground"}`} />}
                        </div>
                        <div className="flex items-center gap-2">
                          {automation._isGroupAutomation && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30 text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {groups.find(g => g.group_id === automation.group_id)?.alias || t("automations.group")}
                            </Badge>
                          )}
                          {automation.executed ? (
                            automation.execution_status === "missed" ? (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {t("automations.missed")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {t("automations.executed")}
                                {automation.executed_at && (
                                  <span className="ml-1 opacity-70">
                                    {new Date(automation.executed_at * 1000).toLocaleDateString()}
                                  </span>
                                )}
                              </Badge>
                            )
                          ) : (() => {
                            const currentTrigger = roster?.event_start_time != null
                              ? roster.event_start_time + automation.offset_seconds
                              : null;
                            const isCurrentMissed = currentTrigger != null && (automation.last_missed_at ?? 0) >= currentTrigger;
                            const isCurrentTriggered = currentTrigger != null && (automation.last_triggered_at ?? 0) >= currentTrigger;
                            if (isCurrentMissed) return (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {t("automations.missed")}
                              </Badge>
                            );
                            if (isCurrentTriggered) return (
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {t("automations.executed")}
                                <span className="ml-1 opacity-70">
                                  {new Date(automation.last_triggered_at! * 1000).toLocaleDateString()}
                                </span>
                              </Badge>
                            );
                            return (
                              <Badge
                                variant="outline"
                                className={automation.active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""}
                              >
                                {automation.active ? t("automations.active") : t("automations.inactive")}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="font-semibold text-foreground mb-2">
                        {getAutomationLabel(automation.action_type)}
                        {automation.action_type === "roster_ping" && automation.options?.ping_type && (
                          <span className="font-normal text-muted-foreground ml-1.5 text-sm">
                            · {t(`automations.pingType_${automation.options.ping_type}`)}
                          </span>
                        )}
                      </h4>

                      {/* Details */}
                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{formatOffsetSeconds(automation.offset_seconds, t)}</span>
                        </div>
                        {roster?.event_start_time && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{formatTimestamp(roster.event_start_time + automation.offset_seconds)}</span>
                          </div>
                        )}
                        {automation.discord_channel_id && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Hash className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">
                              {channels.find(c => c.id === automation.discord_channel_id)?.name || automation.discord_channel_id}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 pt-3 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => handleToggleAutomation(automation.automation_id)}
                        >
                          {automation.active ? t("automations.disable") : t("automations.enable")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingAutomation(automation);
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

                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-card overflow-hidden">
            <CardContent className="p-0 divide-y divide-border/60">

              {/* Section: Identity */}
              <div className="p-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  {t("settings.general")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t("settings.name")}</Label>
                    <Input
                      value={editData.alias}
                      onChange={(e) => setEditData({ ...editData, alias: e.target.value })}
                      className="bg-muted/30"
                      placeholder="CWL Week 1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t("settings.group")}</Label>
                    <Select
                      value={editData.group_id || "__none__"}
                      onValueChange={(value) => setEditData({ ...editData, group_id: value === "__none__" ? "" : value })}
                    >
                      <SelectTrigger className="bg-muted/30">
                        <SelectValue placeholder={t("settings.noGroup")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("settings.noGroup")}</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.group_id} value={group.group_id}>
                            {group.alias}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{t("settings.description")}</Label>
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="bg-muted/30 resize-none"
                    rows={2}
                    placeholder={t("settings.descriptionPlaceholder")}
                  />
                </div>
              </div>

              {/* Section: Type & Scope */}
              <div className="p-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {t("settings.typeAndScope")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t("settings.rosterType")}</Label>
                    <Select
                      value={editData.roster_type}
                      onValueChange={(value: "clan" | "family") => setEditData({ ...editData, roster_type: value })}
                    >
                      <SelectTrigger className="bg-muted/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clan">
                          <span className="flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            {t("settings.typeClan")}
                          </span>
                        </SelectItem>
                        <SelectItem value="family">
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {t("settings.typeFamily")}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t("settings.signupScope")}</Label>
                    <Select
                      value={editData.signup_scope}
                      onValueChange={(value: "clan-only" | "family-wide") => setEditData({ ...editData, signup_scope: value })}
                    >
                      <SelectTrigger className="bg-muted/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clan-only">{t("settings.scopeClanOnly")}</SelectItem>
                        <SelectItem value="family-wide">{t("settings.scopeFamilyWide")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editData.roster_type === "clan" && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">{t("settings.clan")}</Label>
                      <Select
                        value={editData.clan_tag}
                        onValueChange={(value) => setEditData({ ...editData, clan_tag: value })}
                      >
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue placeholder={t("settings.selectClan")} />
                        </SelectTrigger>
                        <SelectContent>
                          {clans.map((clan) => (
                            <SelectItem key={clan.tag} value={clan.tag}>
                              {clan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Event & Recurrence */}
              <div className="p-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  {t("settings.eventTime")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t("settings.eventTime")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="datetime-local"
                        value={editData.event_start_time}
                        onChange={(e) => setEditData({ ...editData, event_start_time: e.target.value })}
                        className="bg-muted/30 flex-1"
                      />
                      <Badge variant="outline" className="shrink-0 bg-muted/30">
                        <Clock className="w-3 h-3 mr-1" />
                        {getTimezoneOffset()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("settings.eventTimeHint")}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                      {t("settings.recurrenceDays")}
                    </Label>
                    <div className="flex gap-2">
                      <Button type="button" size="sm"
                        variant={editData.recurrence_mode === 'days' ? 'default' : 'outline'}
                        className="h-8 text-xs"
                        onClick={() => setEditData({ ...editData, recurrence_mode: 'days', recurrence_day_of_month: '' })}>
                        {t("settings.recurrenceModeDays")}
                      </Button>
                      <Button type="button" size="sm"
                        variant={editData.recurrence_mode === 'day_of_month' ? 'default' : 'outline'}
                        className="h-8 text-xs"
                        onClick={() => setEditData({ ...editData, recurrence_mode: 'day_of_month', recurrence_days: '' })}>
                        {t("settings.recurrenceModeMonthly")}
                      </Button>
                    </div>
                    {editData.recurrence_mode === 'days' ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          placeholder="—"
                          value={editData.recurrence_days}
                          onChange={(e) => setEditData({ ...editData, recurrence_days: e.target.value })}
                          className="bg-muted/30 w-24"
                        />
                        <span className="text-sm text-muted-foreground">{t("settings.recurrenceDaysUnit")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{t("settings.recurrenceDayOfMonthPrefix")}</span>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          placeholder="1"
                          value={editData.recurrence_day_of_month}
                          onChange={(e) => setEditData({ ...editData, recurrence_day_of_month: e.target.value })}
                          className="bg-muted/30 w-20"
                        />
                        <span className="text-sm text-muted-foreground">{t("settings.recurrenceDayOfMonthSuffix")}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {editData.recurrence_mode === 'days'
                        ? t("settings.recurrenceDaysHint")
                        : t("settings.recurrenceDayOfMonthHint")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section: Restrictions */}
              <div className="p-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  {t("settings.restrictions")}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("settings.minTh")}</Label>
                    <Input
                      type="number"
                      min={minTh}
                      max={maxTh}
                      value={editData.min_th}
                      onChange={(e) => setEditData({ ...editData, min_th: e.target.value })}
                      className="bg-muted/30"
                      placeholder={String(minTh)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("settings.maxTh")}</Label>
                    <Input
                      type="number"
                      min={minTh}
                      max={maxTh}
                      value={editData.max_th}
                      onChange={(e) => setEditData({ ...editData, max_th: e.target.value })}
                      className="bg-muted/30"
                      placeholder={String(maxTh)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("settings.rosterSize")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editData.roster_size}
                      onChange={(e) => setEditData({ ...editData, roster_size: e.target.value })}
                      className="bg-muted/30"
                      placeholder="50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("settings.minSignups")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editData.min_signups}
                      onChange={(e) => setEditData({ ...editData, min_signups: e.target.value })}
                      className="bg-muted/30"
                      placeholder="15"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("settings.maxAccountsPerUser")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editData.max_accounts_per_user}
                      onChange={(e) => setEditData({ ...editData, max_accounts_per_user: e.target.value })}
                      className="bg-muted/30"
                      placeholder="2"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Signup Categories */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-500" />
                    {t("settings.allowedCategories")}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10"
                    onClick={() => setCreateCategoryDialogOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {t("categories.create")}
                  </Button>
                </div>
                {categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Badge
                        key={category.custom_id}
                        variant={editData.allowed_signup_categories.includes(category.custom_id) ? "default" : "outline"}
                        className={`cursor-pointer transition-all hover:scale-105 ${
                          editData.allowed_signup_categories.includes(category.custom_id)
                            ? "bg-purple-500 hover:bg-purple-600"
                            : "hover:border-purple-500"
                        }`}
                        onClick={() => {
                          const current = editData.allowed_signup_categories;
                          const updated = current.includes(category.custom_id)
                            ? current.filter((id) => id !== category.custom_id)
                            : [...current, category.custom_id];
                          setEditData({ ...editData, allowed_signup_categories: updated });
                        }}
                      >
                        {category.alias}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t("categories.noCategories")}</p>
                )}
                <p className="text-xs text-muted-foreground">{t("settings.allowedCategoriesHint")}</p>

                {/* Default signup category */}
                {editData.allowed_signup_categories.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-sm font-medium">{t("settings.defaultSignupCategory")}</Label>
                    <Select
                      value={editData.default_signup_category || "__none__"}
                      onValueChange={(v) =>
                        setEditData({ ...editData, default_signup_category: v === "__none__" ? "" : v })
                      }
                    >
                      <SelectTrigger className="bg-muted/30 w-56">
                        <SelectValue placeholder={t("settings.defaultSignupCategoryNone")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("settings.defaultSignupCategoryNone")}</SelectItem>
                        {(editData.allowed_signup_categories.length > 0
                          ? categories.filter((c) => editData.allowed_signup_categories.includes(c.custom_id))
                          : categories
                        ).map((c) => (
                          <SelectItem key={c.custom_id} value={c.custom_id}>
                            {c.alias}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t("settings.defaultSignupCategoryHint")}</p>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Save — sticky at the bottom */}
          <div className="sticky bottom-4 flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              size="lg"
              className="min-w-[200px] shadow-lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("settings.saving")}
                </>
              ) : (
                <>
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  {t("settings.save")}
                </>
              )}
            </Button>
          </div>

        </TabsContent>
      </Tabs>

      {/* Add Members Dialog */}
      <AddMembersDialog
        open={addMembersDialogOpen}
        onOpenChange={setAddMembersDialogOpen}
        onAddMembers={handleAddMembers}
        serverMembers={serverMembers}
        clanMembers={clanMembers}
        existingMembers={roster.members}
        loadServerMembers={loadServerMembers}
        loadingServerMembers={loadingServerMembers}
        t={t}
      />

      {/* Missing Members Dialog */}
      <MissingMembersDialog
        open={missingMembersDialogOpen}
        onOpenChange={setMissingMembersDialogOpen}
        data={missingMembers}
        loading={loadingMissingMembers}
        onLoad={loadMissingMembers}
        onAddMembers={handleAddMembers}
        groupId={roster?.group_id}
      />

      {/* Create Automation Dialog */}
      <Dialog open={createAutomationDialogOpen} onOpenChange={setCreateAutomationDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t("automations.createTitle")}</DialogTitle>
            <DialogDescription>{t("automations.createDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Target selector */}
            <div className="space-y-2">
              <Label>{t("automations.target")}</Label>
              <Select
                value={newAutomation.target_type === 'group' ? `group:${newAutomation.target_group_id}` : 'roster'}
                onValueChange={(value) => {
                  if (value === 'roster') {
                    setNewAutomation({ ...newAutomation, target_type: 'roster', target_group_id: undefined });
                  } else if (value.startsWith('group:')) {
                    setNewAutomation({ ...newAutomation, target_type: 'group', target_group_id: value.replace('group:', '') });
                  }
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roster">{t("automations.targetThisRoster")} ({roster?.alias})</SelectItem>
                  {groups.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{t("automations.targetGroups")}</div>
                      {groups.map((group) => (
                        <SelectItem key={group.group_id} value={`group:${group.group_id}`}>
                          {group.alias}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("automations.targetHint")}</p>
            </div>
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
              {newAutomation.action_type && (
                <p className="text-xs text-muted-foreground">
                  {t(`automations.actionDescriptions.${newAutomation.action_type}`)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("automations.offsetFromEvent")}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("automations.offsetBefore")}</span>
                <Input
                  type="number"
                  min={1}
                  value={newAutomation._offsetVal ?? '1'}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    const unit = (newAutomation._offsetUnit ?? 'days') as OffsetUnit;
                    setNewAutomation({ ...newAutomation, _offsetVal: e.target.value, offset_seconds: buildOffsetSeconds('before', val, unit) });
                  }}
                  className="bg-background w-20"
                />
                <Select
                  value={newAutomation._offsetUnit ?? 'days'}
                  onValueChange={(v) => {
                    const unit = v as OffsetUnit;
                    const val = parseInt(newAutomation._offsetVal ?? '1') || 1;
                    setNewAutomation({ ...newAutomation, _offsetUnit: unit, offset_seconds: buildOffsetSeconds('before', val, unit) });
                  }}
                >
                  <SelectTrigger className="bg-background w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">{t("automations.offsetUnit_days")}</SelectItem>
                    <SelectItem value="hours">{t("automations.offsetUnit_hours")}</SelectItem>
                    <SelectItem value="minutes">{t("automations.offsetUnit_minutes")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {roster?.event_start_time ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t("automations.offsetPreview", { date: formatTimestamp(roster.event_start_time + (newAutomation.offset_seconds ?? -86400)) })}
                </p>
              ) : (
                <p className="text-xs text-amber-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {t("automations.offsetNoEventDate")}
                </p>
              )}
            </div>
            {newAutomation.action_type === "roster_ping" && (
              <div className="space-y-2">
                <Label>{t("automations.pingType")}</Label>
                <Select
                  value={newAutomation.options?.ping_type ?? ""}
                  onValueChange={(v) =>
                    setNewAutomation({ ...newAutomation, options: { ...newAutomation.options, ping_type: v as import("../_lib/types").PingType } })
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t("automations.pingType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="signup_reminder">{t("automations.pingType_signup_reminder")}</SelectItem>
                    <SelectItem value="missing">{t("automations.pingType_missing")}</SelectItem>
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
            <Button variant="outline" onClick={() => setCreateAutomationDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateAutomation} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("automations.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Automation Dialog */}
      <Dialog open={editAutomationDialogOpen} onOpenChange={(open) => {
        setEditAutomationDialogOpen(open);
        if (!open) setEditingAutomation(null);
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {t("automations.editTitle")}
            </DialogTitle>
            {editingAutomation && (
              <DialogDescription className="flex items-center gap-2">
                {editingAutomation.group_id ? (
                  <>
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>{t("automations.targetGroup")}: <strong>{groups.find(g => g.group_id === editingAutomation.group_id)?.alias}</strong></span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>{t("automations.targetRoster")}: <strong>{roster?.alias}</strong></span>
                  </>
                )}
              </DialogDescription>
            )}
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
              {editingAutomation?.action_type && (
                <p className="text-xs text-muted-foreground">
                  {t(`automations.actionDescriptions.${editingAutomation.action_type}`)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("automations.offsetFromEvent")}</Label>
              {editingAutomation && (() => {
                const parsed = parseOffsetSeconds(editingAutomation.offset_seconds ?? 0);
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t("automations.offsetBefore")}</span>
                      <Input
                        type="number"
                        min={1}
                        value={parsed.val}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
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
                        <SelectTrigger className="bg-background w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">{t("automations.offsetUnit_minutes")}</SelectItem>
                          <SelectItem value="hours">{t("automations.offsetUnit_hours")}</SelectItem>
                          <SelectItem value="days">{t("automations.offsetUnit_days")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {roster?.event_start_time ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {t("automations.offsetPreview", { date: formatTimestamp(roster.event_start_time + editingAutomation.offset_seconds) })}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {t("automations.offsetNoEventDate")}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
            {editingAutomation?.action_type === "roster_ping" && (
              <div className="space-y-2">
                <Label>{t("automations.pingType")}</Label>
                <Select
                  value={editingAutomation.options?.ping_type ?? ""}
                  onValueChange={(v) =>
                    setEditingAutomation(prev => prev ? { ...prev, options: { ...prev.options, ping_type: v as import("../_lib/types").PingType } } : null)
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t("automations.pingType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="signup_reminder">{t("automations.pingType_signup_reminder")}</SelectItem>
                    <SelectItem value="missing">{t("automations.pingType_missing")}</SelectItem>
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
            <Button variant="outline" onClick={() => setEditAutomationDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEditAutomation}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={createCategoryDialogOpen} onOpenChange={setCreateCategoryDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t("categories.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("categories.nameLabel")}</Label>
              <Input
                value={newCategory.alias}
                onChange={(e) => setNewCategory({ ...newCategory, alias: e.target.value })}
                className="bg-background"
                placeholder="Main"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCategoryDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!newCategory.alias.trim()}
            >
              {t("categories.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryDialogOpen} onOpenChange={(open) => {
        setEditCategoryDialogOpen(open);
        if (!open) setEditingCategory(null);
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t("categories.editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("categories.idLabel")}</Label>
              <Input
                value={editingCategory?.custom_id || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("categories.nameLabel")}</Label>
              <Input
                value={editingCategory?.alias || ""}
                onChange={(e) => setEditingCategory(prev => prev ? { ...prev, alias: e.target.value } : null)}
                className="bg-background"
                placeholder="Tank"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategoryDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEditCategory} disabled={!editingCategory?.alias.trim()}>
              {t("common.save")}
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
            {(() => {
              const groupAutomations = automations.filter(
                a => a.group_id === selectedGroupForAutomations?.group_id
              );
              if (groupAutomations.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{t("groups.noAutomations")}</p>
                    <p className="text-sm mt-1">{t("groups.noAutomationsHint")}</p>
                  </div>
                );
              }
              return groupAutomations.map((automation) => (
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
                        setEditAutomationDialogOpen(true);
                        setGroupAutomationsDialogOpen(false);
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
              ));
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupAutomationsDialogOpen(false)}>
              {t("common.close")}
            </Button>
            <Button onClick={() => {
              // Pre-select the group in the create automation dialog
              setNewAutomation(prev => ({
                ...prev,
                target_type: 'group',
                target_group_id: selectedGroupForAutomations?.group_id,
              }));
              setGroupAutomationsDialogOpen(false);
              setCreateAutomationDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              {t("groups.addAutomation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      <AlertDialog open={clearMembersOpen} onOpenChange={setClearMembersOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t("clearMembers")}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("clearMembersConfirm", { name: roster?.alias || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { setClearMembersOpen(false); handleClearMembers(); }}
            >
              {t("clearMembers")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
