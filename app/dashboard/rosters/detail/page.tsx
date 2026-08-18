"use client";

import { useGuildId, useRosterId } from "@/lib/dashboard-route";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
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
import { Switch } from "@/components/ui/switch";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { ClanCombobox } from "@/components/ui/clan-combobox";
import {
  Loader2, ArrowLeft, Settings as SettingsIcon, Users, Zap,
  RefreshCw, UserPlus, Clock, Calendar, Plus, Trash2, Bell, Lock, Unlock,
  MessageSquare, UserMinus, Building2, Hash, Shield,
  Tag, FileText, Home, Pencil, Columns3, ChevronUp, ChevronDown, GripVertical,
  Info, Lightbulb, Play, Pause, Archive,
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
import { useRosterDetail, useGameConstants } from "../_hooks";
import {
  RosterStatsCard,
  MembersTable,
  AddMembersDialog,
  MissingMembersDialog,
  SignupQuestionsEditor,
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
} from "../_lib";
import type { EditRosterFormData, RosterAutomation, AutomationActionType, RosterGroup } from "../_lib/types";
import { fetchRosters } from "../_lib/api";

// ────────────────────────────────────────────────────────────────────────────

function normalizeClanColumns(cols: string[] | undefined): string[] {
  if (!cols || cols.length === 0) return [];
  const hasClanName = cols.includes("current_clan");
  const hasClanTag = cols.includes("current_clan_tag");
  if (hasClanTag && !hasClanName) {
    return cols.map((c) => (c === "current_clan_tag" ? "current_clan" : c));
  }
  return cols;
}

function sanitizeColumns(cols: string[], allowed: string[], fallback: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const col of cols) {
    if (!allowed.includes(col) || seen.has(col)) continue;
    seen.add(col);
    cleaned.push(col);
  }

  return cleaned.length > 0 ? cleaned : fallback;
}

const DEFAULT_COLUMNS = ['townhall', 'name', 'hitrate', 'current_clan'];

export default function RosterDetailPage() { // NOSONAR — React page component: complexity is aggregate state/handler management, not a single logic unit
  const guildId = useGuildId();
  const router = useRouter();
  const { toast } = useToast();

  const rosterId = useRosterId();
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
    refreshMember,
    refreshDiscordIdentity,
    loadMissingMembers,
    loadServerMembers,
    createAutomation,
    updateAutomation,
    deleteAutomation,
  } = useRosterDetail(rosterId, guildId);

  // UI State
  const [activeTab, setActiveTab] = useState("members");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [clearingMembers, setClearingMembers] = useState(false);
  const [clearMembersOpen, setClearMembersOpen] = useState(false);

  // Dialogs
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);
  const [missingMembersDialogOpen, setMissingMembersDialogOpen] = useState(false);
  const [createAutomationDialogOpen, setCreateAutomationDialogOpen] = useState(false);
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
    min_signups: "",
    max_accounts_per_user: "",
    event_start_time: "",
    recurrence_days: "",
    recurrence_day_of_month: "",
    recurrence_mode: "days",
    signup_questions: [],
    columns: [],
    sort: [],
    group_id: "",
  });

  const [newAutomation, setNewAutomation] = useState<Partial<RosterAutomation> & { target_type?: 'roster' | 'group'; target_group_id?: string }>(() => ({
    action_type: "roster_ping",
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    active: true,
    target_type: 'roster',
  }));

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
        if (r.id === rosterId) continue;
        for (const m of r.members ?? []) {
          if (!map[m.tag]) map[m.tag] = [];
          map[m.tag].push(r.alias);
        }
      }
      setGroupDuplicateMap(map);
    }).catch(() => {});
  }, [roster?.group_id, guildId, rosterId]);

  // Column configuration state
  const [localColumns, setLocalColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [columnPopoverOpen, setColumnPopoverOpen] = useState(false);
  const [columnsInitialized, setColumnsInitialized] = useState(false);
  const columnsStorageKey = `roster-columns-${guildId}-${rosterId}`;

  // Sync edit form with roster data
  React.useEffect(() => {
    if (roster) {
      const normalizedColumns = normalizeClanColumns(roster.columns || []);
      setEditData({
        alias: roster.alias,
        description: roster.description || "",
        roster_type: roster.roster_type || "clan",
        signup_scope: roster.signup_scope || "clan-only",
        clan_tag: roster.clan_tag || "",
        min_th: roster.min_th?.toString() || "",
        max_th: roster.max_th?.toString() || "",
        min_signups: roster.min_signups?.toString() || "",
        max_accounts_per_user: roster.max_accounts_per_user?.toString() || "",
        event_start_time: unixToDatetimeLocal(roster.event_start_time),
        recurrence_days: roster.recurrence_days?.toString() || "",
        recurrence_day_of_month: roster.recurrence_day_of_month?.toString() || "",
        recurrence_mode: roster.recurrence_day_of_month ? "day_of_month" : "days",
        signup_questions: roster.signup_questions || [],
        columns: normalizedColumns.map(getColumnLabel),
		sort: (roster.sort || []).map((item) => getSortLabel(`${item.columnId}_${item.direction}`)),
        group_id: roster.group_id || "",
      });
    }
  }, [roster]);

  // Initialize local columns from localStorage (fallback to API/default)
  React.useEffect(() => {
    const allowedColumns = ROSTER_COLUMNS.map((c) => c.value);
    const normalizedApiColumns = normalizeClanColumns(roster?.columns).map(getColumnInternal);
    const fallback = sanitizeColumns(DEFAULT_COLUMNS, allowedColumns, DEFAULT_COLUMNS);

    let resolved = normalizedApiColumns.length
      ? sanitizeColumns(normalizedApiColumns, allowedColumns, fallback)
      : fallback;

    if (globalThis.window !== undefined) {
      const raw = localStorage.getItem(columnsStorageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            resolved = sanitizeColumns(parsed as string[], allowedColumns, resolved);
          }
        } catch {
          // Ignore malformed storage and use API/default fallback.
        }
      }
    }

    setLocalColumns(resolved);
    setColumnsInitialized(true);
  }, [columnsStorageKey, roster?.columns]);

  // Persist local columns immediately so refresh keeps same order/selection
  React.useEffect(() => {
    if (!columnsInitialized || globalThis.window === undefined) return;
    localStorage.setItem(columnsStorageKey, JSON.stringify(localColumns));
  }, [columnsInitialized, columnsStorageKey, localColumns]);

  // Family clan tags
  const familyClanTags = clans.map(c => c.tag);

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
        min_th: editData.min_th ? Number.parseInt(editData.min_th) : null,
        max_th: editData.max_th ? Number.parseInt(editData.max_th) : null,
        min_signups: editData.min_signups ? Number.parseInt(editData.min_signups) : null,
        max_accounts_per_user: editData.max_accounts_per_user ? Number.parseInt(editData.max_accounts_per_user) : null,
        event_start_time: datetimeLocalToUnix(editData.event_start_time),
        recurrence_days: editData.recurrence_mode === 'days' && editData.recurrence_days
          ? Number.parseInt(editData.recurrence_days) : null,
        recurrence_day_of_month: editData.recurrence_mode === 'day_of_month' && editData.recurrence_day_of_month
          ? Number.parseInt(editData.recurrence_day_of_month) : null,
        columns: editData.columns.map(getColumnInternal),
		sort: editData.sort.map((label) => {
		  const internal = getSortInternal(label);
		  return {
			columnId: internal.replace(/_(asc|desc)$/, ""),
			direction: internal.endsWith("_desc") ? "desc" as const : "asc" as const,
		  };
		}),
        group_id: editData.group_id || null,
        signup_questions: editData.signup_questions,
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
        scheduled_at: newAutomation.scheduled_at ?? new Date(Date.now() + 86400000).toISOString(),
        discord_channel_id: newAutomation.discord_channel_id,
        options: newAutomation.options,
        active: true,
      });
      toast({ title: t("automationCreated") });
      setCreateAutomationDialogOpen(false);
      setNewAutomation({
        action_type: "roster_ping",
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        active: true,
        target_type: 'roster',
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
    } catch {
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
    } catch {
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
        scheduled_at: editingAutomation.scheduled_at,
        discord_channel_id: editingAutomation.discord_channel_id,
        options: editingAutomation.options,
        active: editingAutomation.active,
      });
      toast({ title: t("automationUpdated") });
      setEditAutomationDialogOpen(false);
      setEditingAutomation(null);
    } catch {
      toast({
        title: t("automationError"),
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" disabled>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3 min-w-0">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="min-w-0 h-12 flex flex-col justify-center gap-1.5">
                  <Skeleton className="h-6 w-56 max-w-[60vw] md:max-w-none" />
                  <Skeleton className="h-3 w-40 max-w-[45vw] md:max-w-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex">
              <Skeleton className="h-9 w-full md:w-28" />
              <Skeleton className="h-9 w-full md:w-36" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-card p-4 shadow-sm shadow-black/5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2 rounded-2xl bg-muted/45 p-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <DashboardTabsList className="grid-cols-3">
              <DashboardTabTrigger value="members" artwork={<Users />}>
                {t("tabs.members")}
              </DashboardTabTrigger>
              <DashboardTabTrigger value="automations" artwork={<Zap />}>
                {t("tabs.automations")}
              </DashboardTabTrigger>
              <DashboardTabTrigger value="settings" artwork={<SettingsIcon />}>
                {t("tabs.settings")}
              </DashboardTabTrigger>
            </DashboardTabsList>

            <TabsContent value="members" className="space-y-4">
              <Card className="rounded-[24px] border-0 bg-card shadow-sm shadow-black/5">
                <CardContent className="pt-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automations" className="space-y-4">
              <Card className="rounded-[24px] border-0 bg-card shadow-sm shadow-black/5">
                <CardContent className="pt-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="rounded-[24px] border-0 bg-card shadow-sm shadow-black/5">
                <CardContent className="pt-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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

  const isDefaultColumns =
    localColumns.length === DEFAULT_COLUMNS.length &&
    localColumns.every((col, index) => col === DEFAULT_COLUMNS[index]);

  const handleResetColumns = () => {
    setLocalColumns([...DEFAULT_COLUMNS]);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 rounded-xl" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            {roster.clan_badge ? (
              <Avatar className="h-12 w-12 rounded-2xl">
                <AvatarImage src={roster.clan_badge} alt={roster.clan_name || ""} />
                <AvatarFallback>{roster.alias.charAt(0)}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="min-w-0 h-12 flex flex-col justify-center gap-1">
              <h1 className="text-2xl leading-7 font-bold text-foreground truncate">{roster.alias}</h1>
              {roster.clan_name ? (
                <p className="text-muted-foreground leading-4 truncate">{roster.clan_name}</p>
              ) : (
                <p className="leading-4 opacity-0 select-none">.</p>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex">
          <Button variant="secondary" onClick={handleRefresh} disabled={refreshing} className="w-full rounded-xl border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted md:w-auto">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {t("refresh")}
          </Button>
          <Button onClick={() => setAddMembersDialogOpen(true)} className="w-full md:w-auto">
            <UserPlus className="w-4 h-4 mr-2" />
            {t("addMembers.submit")}
          </Button>
        </div>
      </div>

      {/* Stats Card */}
      <RosterStatsCard roster={roster} familyClanTags={familyClanTags} t={t} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <DashboardTabsList className="grid-cols-3">
          <DashboardTabTrigger value="members" artwork={<Users />} count={roster.members?.length || 0}>
            {t("tabs.members")}
          </DashboardTabTrigger>
          <DashboardTabTrigger value="automations" artwork={<Zap />} count={automations.length}>
            {t("tabs.automations")}
          </DashboardTabTrigger>
          <DashboardTabTrigger value="settings" artwork={<SettingsIcon />}>
            {t("tabs.settings")}
          </DashboardTabTrigger>
        </DashboardTabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-5 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-muted-foreground">
              {roster.members?.length || 0} {t("members.count")}
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Popover open={columnPopoverOpen} onOpenChange={setColumnPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="shrink-0 whitespace-nowrap rounded-xl border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted">
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={handleResetColumns}
                      disabled={isDefaultColumns}
                    >
                      {t("columns.reset")}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {roster.clan_tag && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMissingMembersDialogOpen(true)}
                  className="shrink-0 whitespace-nowrap rounded-xl border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  {t("missingMembers.button")}
                </Button>
              )}
              {(roster.members?.length || 0) > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setClearMembersOpen(true)}
                  disabled={clearingMembers}
                  className="shrink-0 whitespace-nowrap rounded-xl border-0 bg-destructive/10 text-destructive shadow-sm shadow-black/5 hover:bg-destructive/15 hover:text-destructive"
                >
                  {clearingMembers
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Trash2 className="w-4 h-4 mr-2" />}
                  {t("clearMembers")}
                </Button>
              )}
            </div>
          </div>

          <Card className="overflow-hidden rounded-[24px] border-0 bg-card shadow-sm shadow-black/5">
            <CardContent className="p-0">
              <MembersTable
                members={roster.members || []}
                columns={localColumns}
                rosterClanTag={roster.clan_tag}
                familyClans={clans}
                onRemoveMember={handleRemoveMember}
                removingMember={removingMember}
                onRefreshMember={refreshMember}
                onRefreshDiscordIdentity={refreshDiscordIdentity}
                groupDuplicateMap={groupDuplicateMap}
                t={t}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="mt-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">{t("automations.description")}</p>
            <Button onClick={() => setCreateAutomationDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("automations.create")}
            </Button>
          </div>

          {/* Info Box */}
          <Alert className="rounded-2xl border-0 bg-blue-500/10">
            <Lightbulb className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm text-muted-foreground">
              {t("automations.infoBox")}
            </AlertDescription>
          </Alert>

          {automations.length === 0 ? (
            <Card className="rounded-[24px] border-0 bg-card shadow-sm shadow-black/5">
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
                return (
                  <Card
                    key={automation.automation_id}
                    className={`rounded-[24px] border-0 bg-card shadow-sm shadow-black/5 transition-[box-shadow,opacity] hover:shadow-md ${
                      automation.active ? "" : "opacity-60"
                    }`}
                  >
                    <CardContent className="p-4">
                      {/* Header with icon and status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className={`rounded-xl p-2.5 ${automation.active ? "bg-muted/65" : "bg-muted"}`}>
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
                            <Badge variant="secondary" className="border-0 bg-purple-500/10 text-xs text-purple-500">
                              <Users className="w-3 h-3 mr-1" />
                              {groups.find(g => g.group_id === automation.group_id)?.alias || t("automations.group")}
                            </Badge>
                          )}
                          {automation.executed ? (
                            automation.execution_status === "missed" ? ( // NOSONAR — JSX nested ternary for multi-branch display state
                              <Badge variant="secondary" className="border-0 bg-amber-500/10 text-amber-500">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {t("automations.missed")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="border-0 bg-emerald-500/10 text-emerald-500">
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
			const currentTrigger = Math.floor(new Date(automation.scheduled_at).getTime() / 1000);
                            const isCurrentMissed = currentTrigger != null && (automation.last_missed_at ?? 0) >= currentTrigger;
                            const isCurrentTriggered = currentTrigger != null && (automation.last_triggered_at ?? 0) >= currentTrigger;
                            if (isCurrentMissed) return (
                              <Badge variant="secondary" className="border-0 bg-amber-500/10 text-amber-500">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {t("automations.missed")}
                              </Badge>
                            );
                            if (isCurrentTriggered) return (
                              <Badge variant="secondary" className="border-0 bg-emerald-500/10 text-emerald-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {t("automations.executed")}
                                <span className="ml-1 opacity-70">
                                  {new Date(automation.last_triggered_at! * 1000).toLocaleDateString()}
                                </span>
                              </Badge>
                            );
                            return (
                              <Badge
                                variant="secondary"
                                className={automation.active ? "border-0 bg-emerald-500/10 text-emerald-500" : "border-0"}
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
                          <span className="truncate">{formatTimestamp(Math.floor(new Date(automation.scheduled_at).getTime() / 1000))}</span>
                        </div>
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
                      <div className="flex items-center gap-1 rounded-xl bg-muted/45 p-1">
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
        <TabsContent value="settings" className="mt-5 space-y-4">
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="space-y-4 p-0">

              {/* Section: Identity */}
              <div className="space-y-4 rounded-[24px] bg-card p-5 shadow-sm shadow-black/5 md:p-6">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Tag className="w-3.5 h-3.5" />
                  {t("settings.general")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t("settings.name")}</Label>
                    <Input
                      value={editData.alias}
                      onChange={(e) => setEditData({ ...editData, alias: e.target.value })}
                      className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"
                      placeholder="CWL Week 1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t("settings.group")}</Label>
                    <Select
                      value={editData.group_id || "__none__"}
                      onValueChange={(value) => setEditData({ ...editData, group_id: value === "__none__" ? "" : value })}
                    >
                      <SelectTrigger className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5">
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
                    className="resize-none rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"
                    rows={2}
                    placeholder={t("settings.descriptionPlaceholder")}
                  />
                </div>
              </div>

              {/* Section: Type & Scope */}
              <div className="space-y-4 rounded-[24px] bg-card p-5 shadow-sm shadow-black/5 md:p-6">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
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
                      <SelectTrigger className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5">
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
                      <SelectTrigger className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5">
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
                      <ClanCombobox
                        clans={clans}
                        value={editData.clan_tag}
                        onValueChange={(value) => setEditData({ ...editData, clan_tag: value })}
                        placeholder={t("settings.selectClan")}
                        className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Event & Recurrence */}
              <div className="space-y-4 rounded-[24px] bg-card p-5 shadow-sm shadow-black/5 md:p-6">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
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
                        className="flex-1 rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"
                      />
                      <Badge variant="secondary" className="shrink-0 border-0 bg-muted/65">
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
                          className="w-24 rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"
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
                          className="w-20 rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"
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
              <div className="space-y-4 rounded-[24px] bg-card p-5 shadow-sm shadow-black/5 md:p-6">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  {t("settings.restrictions")}
                </p>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("settings.minTh")}</Label>
                    <Input
                      type="number"
                      min={minTh}
                      max={maxTh}
                      value={editData.min_th}
                      onChange={(e) => setEditData({ ...editData, min_th: e.target.value })}
                      className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"
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
                      className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"
                      placeholder={String(maxTh)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("settings.minSignups")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editData.min_signups}
                      onChange={(e) => setEditData({ ...editData, min_signups: e.target.value })}
                      className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"
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
                      className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"
                      placeholder="2"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Configurable signup form */}
              <div className="rounded-[24px] bg-card p-5 shadow-sm shadow-black/5 md:p-6">
                <SignupQuestionsEditor
                  questions={editData.signup_questions}
                  onChange={(signupQuestions) =>
                    setEditData({ ...editData, signup_questions: signupQuestions })
                  }
                />
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
        <DialogContent variant="form" className="bg-card">
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
			  <Label>{t("automations.scheduledAt")}</Label>
			  <Input
				type="datetime-local"
				value={newAutomation.scheduled_at ? unixToDatetimeLocal(Math.floor(new Date(newAutomation.scheduled_at).getTime() / 1000)) : ""}
				onChange={(e) => {
				  const scheduledAt = datetimeLocalToUnix(e.target.value);
				  setNewAutomation({
					...newAutomation,
					scheduled_at: scheduledAt === null ? undefined : new Date(scheduledAt * 1000).toISOString(),
				  });
				}}
				className="bg-muted/55 border-0 shadow-sm shadow-black/5"
			  />
			  <p className="text-xs text-muted-foreground">{t("automations.scheduledAtHint")}</p>
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
        <DialogContent variant="form" className="bg-card">
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
			  <Label>{t("automations.scheduledAt")}</Label>
			  {editingAutomation && (
				<Input
				  type="datetime-local"
				  value={unixToDatetimeLocal(Math.floor(new Date(editingAutomation.scheduled_at).getTime() / 1000))}
				  onChange={(e) => {
					const scheduledAt = datetimeLocalToUnix(e.target.value);
					setEditingAutomation(prev => prev && scheduledAt !== null
					  ? { ...prev, scheduled_at: new Date(scheduledAt * 1000).toISOString() }
					  : prev);
				  }}
				  className="bg-muted/55 border-0 shadow-sm shadow-black/5"
				/>
			  )}
			  <p className="text-xs text-muted-foreground">{t("automations.scheduledAtHint")}</p>
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

      {/* Group Automations Dialog */}
      <Dialog open={groupAutomationsDialogOpen} onOpenChange={(open) => {
        setGroupAutomationsDialogOpen(open);
        if (!open) setSelectedGroupForAutomations(null);
      }}>
        <DialogContent variant="form" className="bg-card sm:max-w-2xl">
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
					  <p className="text-xs text-muted-foreground">{formatTimestamp(Math.floor(new Date(automation.scheduled_at).getTime() / 1000))}</p>
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
