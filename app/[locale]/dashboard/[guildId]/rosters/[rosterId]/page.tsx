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
  Loader2, ArrowLeft, Settings as SettingsIcon, Users, Zap, FolderTree,
  RefreshCw, UserPlus, Clock, Calendar, Plus, Trash2, Bell, Lock, Unlock,
  MessageSquare, UserMinus
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Local imports
import { useRosterDetail } from "../_hooks";
import {
  RosterStatsCard,
  MembersTable,
  AddMembersDialog,
  MissingMembersDialog,
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
} from "../_lib";
import type { EditRosterFormData, RosterAutomation, AutomationActionType } from "../_lib/types";
import { useGameConstants } from "../_hooks";

export default function RosterDetailPage() {
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
    missingMembers,
    loading,
    loadingMissingMembers,
    loadingServerMembers,
    error,
    refresh,
    refreshRoster,
    updateRoster,
    addMembers,
    removeMember,
    loadMissingMembers,
    loadServerMembers,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    createGroup,
    deleteGroup,
    createCategory,
    deleteCategory,
  } = useRosterDetail(rosterId, guildId);

  // UI State
  const [activeTab, setActiveTab] = useState("members");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  // Dialogs
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);
  const [missingMembersDialogOpen, setMissingMembersDialogOpen] = useState(false);
  const [createAutomationDialogOpen, setCreateAutomationDialogOpen] = useState(false);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);

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
    columns: [],
    sort: [],
    group_id: "",
    allowed_signup_categories: [],
  });

  const [newAutomation, setNewAutomation] = useState<Partial<RosterAutomation>>({
    action_type: "roster_ping",
    scheduled_time: Math.floor(Date.now() / 1000) + 3600,
    active: true,
  });

  const [newGroup, setNewGroup] = useState({ alias: "" });
  const [newCategory, setNewCategory] = useState({ custom_id: "", alias: "" });

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
        columns: (roster.columns || []).map(getColumnLabel),
        sort: (roster.sort || []).map(getSortLabel),
        group_id: roster.group_id || "",
        allowed_signup_categories: roster.allowed_signup_categories || [],
      });
    }
  }, [roster]);

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
        min_th: editData.min_th ? parseInt(editData.min_th) : null,
        max_th: editData.max_th ? parseInt(editData.max_th) : null,
        roster_size: editData.roster_size ? parseInt(editData.roster_size) : null,
        min_signups: editData.min_signups ? parseInt(editData.min_signups) : null,
        max_accounts_per_user: editData.max_accounts_per_user ? parseInt(editData.max_accounts_per_user) : null,
        event_start_time: datetimeLocalToUnix(editData.event_start_time),
        columns: editData.columns.map(getColumnInternal),
        sort: editData.sort.map(getSortInternal),
        group_id: editData.group_id || null,
        allowed_signup_categories: editData.allowed_signup_categories.length > 0 ? editData.allowed_signup_categories : null,
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
        description: t("addMembersSuccessDesc").replace("{count}", tags.length.toString()),
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

  const handleCreateAutomation = async () => {
    if (!newAutomation.action_type || !newAutomation.scheduled_time) return;

    setSaving(true);
    try {
      await createAutomation({
        server_id: parseInt(guildId),
        roster_id: rosterId,
        action_type: newAutomation.action_type as AutomationActionType,
        scheduled_time: newAutomation.scheduled_time,
        discord_channel_id: newAutomation.discord_channel_id,
        options: newAutomation.options,
        active: true,
      });
      toast({ title: t("automationCreated") });
      setCreateAutomationDialogOpen(false);
      setNewAutomation({
        action_type: "roster_ping",
        scheduled_time: Math.floor(Date.now() / 1000) + 3600,
        active: true,
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

  const handleCreateGroup = async () => {
    if (!newGroup.alias.trim()) return;
    try {
      await createGroup(newGroup.alias);
      toast({ title: t("groupCreated") });
      setCreateGroupDialogOpen(false);
      setNewGroup({ alias: "" });
    } catch (err) {
      toast({ title: t("groupError"), variant: "destructive" });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.custom_id.trim() || !newCategory.alias.trim()) return;
    try {
      await createCategory(newCategory.custom_id, newCategory.alias);
      toast({ title: t("categoryCreated") });
      setCreateCategoryDialogOpen(false);
      setNewCategory({ custom_id: "", alias: "" });
    } catch (err) {
      toast({ title: t("categoryError"), variant: "destructive" });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
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

  const displayColumns = roster.columns?.length ? roster.columns : ['townhall', 'name', 'tag', 'hitrate', 'current_clan_tag'];

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
          <TabsTrigger value="groups" className="gap-2">
            <FolderTree className="w-4 h-4" />
            {t("tabs.groups")}
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
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <MembersTable
                members={roster.members || []}
                columns={displayColumns}
                rosterClanTag={roster.clan_tag}
                familyClans={clans}
                onRemoveMember={handleRemoveMember}
                removingMember={removingMember}
                t={t}
              />
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

          {automations.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-foreground">{t("automations.empty")}</p>
                <p className="text-sm text-muted-foreground">{t("automations.emptyHint")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {automations.map((automation) => (
                <Card key={automation.automation_id} className="bg-card border-border">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded ${automation.active ? "bg-primary/10" : "bg-muted"}`}>
                        {automation.action_type === "roster_ping" && <Bell className="w-4 h-4" />}
                        {automation.action_type === "roster_post" && <MessageSquare className="w-4 h-4" />}
                        {automation.action_type === "roster_signup" && <Unlock className="w-4 h-4" />}
                        {automation.action_type === "roster_signup_close" && <Lock className="w-4 h-4" />}
                        {automation.action_type === "recurring_event" && <RefreshCw className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {getAutomationLabel(automation.action_type)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatTimestamp(automation.scheduled_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={automation.active ? "default" : "secondary"}>
                        {automation.active ? t("automations.active") : t("automations.inactive")}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAutomation(automation.automation_id)}
                      >
                        {automation.active ? t("automations.disable") : t("automations.enable")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAutomation(automation.automation_id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{t("groups.description")}</p>
            <Button onClick={() => setCreateGroupDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("groups.create")}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <Card key={group.group_id} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{group.alias}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGroup(group.group_id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {group.roster_count || 0} {t("groups.rostersCount")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Categories */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-foreground">{t("categories.title")}</h3>
              <Button variant="outline" onClick={() => setCreateCategoryDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("categories.create")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category.custom_id}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1"
                >
                  {category.alias}
                  <button
                    onClick={() => deleteCategory(category.custom_id)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {/* General Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("settings.general")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("settings.name")}</Label>
                  <Input
                    value={editData.alias}
                    onChange={(e) => setEditData({ ...editData, alias: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.rosterType")}</Label>
                  <Select
                    value={editData.roster_type}
                    onValueChange={(value: "clan" | "family") => setEditData({ ...editData, roster_type: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clan">{t("settings.typeClan")}</SelectItem>
                      <SelectItem value="family">{t("settings.typeFamily")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.signupScope")}</Label>
                  <Select
                    value={editData.signup_scope}
                    onValueChange={(value: "clan-only" | "family-wide") => setEditData({ ...editData, signup_scope: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clan-only">{t("settings.scopeClanOnly")}</SelectItem>
                      <SelectItem value="family-wide">{t("settings.scopeFamilyWide")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editData.roster_type === "clan" && (
                  <div className="space-y-2">
                    <Label>{t("settings.clan")}</Label>
                    <Select
                      value={editData.clan_tag}
                      onValueChange={(value) => setEditData({ ...editData, clan_tag: value })}
                    >
                      <SelectTrigger className="bg-background">
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

              <div className="space-y-2">
                <Label>{t("settings.description")}</Label>
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="bg-background"
                  rows={3}
                />
              </div>

              {/* Event Time */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t("settings.eventTime")}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    value={editData.event_start_time}
                    onChange={(e) => setEditData({ ...editData, event_start_time: e.target.value })}
                    className="bg-background flex-1"
                  />
                  <Badge variant="outline">{getTimezoneOffset()}</Badge>
                </div>
              </div>

              {/* Group */}
              {groups.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("settings.group")}</Label>
                  <Select
                    value={editData.group_id}
                    onValueChange={(value) => setEditData({ ...editData, group_id: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t("settings.noGroup")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("settings.noGroup")}</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.group_id} value={group.group_id}>
                          {group.alias}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Restrictions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>{t("settings.restrictions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("settings.minTh")}</Label>
                  <Input
                    type="number"
                    min={minTh}
                    max={maxTh}
                    value={editData.min_th}
                    onChange={(e) => setEditData({ ...editData, min_th: e.target.value })}
                    className="bg-background"
                    placeholder={String(minTh)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.maxTh")}</Label>
                  <Input
                    type="number"
                    min={minTh}
                    max={maxTh}
                    value={editData.max_th}
                    onChange={(e) => setEditData({ ...editData, max_th: e.target.value })}
                    className="bg-background"
                    placeholder={String(maxTh)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.rosterSize")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editData.roster_size}
                    onChange={(e) => setEditData({ ...editData, roster_size: e.target.value })}
                    className="bg-background"
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.minSignups")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editData.min_signups}
                    onChange={(e) => setEditData({ ...editData, min_signups: e.target.value })}
                    className="bg-background"
                    placeholder="15"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.maxAccountsPerUser")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editData.max_accounts_per_user}
                    onChange={(e) => setEditData({ ...editData, max_accounts_per_user: e.target.value })}
                    className="bg-background"
                    placeholder="2"
                  />
                </div>
              </div>

              {/* Allowed Signup Categories */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("settings.allowedCategories")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Badge
                        key={category.custom_id}
                        variant={editData.allowed_signup_categories.includes(category.custom_id) ? "default" : "outline"}
                        className="cursor-pointer"
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
                  <p className="text-xs text-muted-foreground">{t("settings.allowedCategoriesHint")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSaveSettings} disabled={saving} className="w-full md:w-auto">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("settings.saving")}
              </>
            ) : (
              t("settings.save")
            )}
          </Button>
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
        t={t}
      />

      {/* Create Automation Dialog */}
      <Dialog open={createAutomationDialogOpen} onOpenChange={setCreateAutomationDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t("automations.createTitle")}</DialogTitle>
            <DialogDescription>{t("automations.createDesc")}</DialogDescription>
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
                  <SelectItem value="roster_ping">Ping Roster</SelectItem>
                  <SelectItem value="roster_post">Post Roster</SelectItem>
                  <SelectItem value="roster_signup">Open Signup</SelectItem>
                  <SelectItem value="roster_signup_close">Close Signup</SelectItem>
                  <SelectItem value="recurring_event">Recurring Event</SelectItem>
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

      {/* Create Group Dialog */}
      <Dialog open={createGroupDialogOpen} onOpenChange={setCreateGroupDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t("groups.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("groups.nameLabel")}</Label>
              <Input
                value={newGroup.alias}
                onChange={(e) => setNewGroup({ alias: e.target.value })}
                className="bg-background"
                placeholder={t("groups.namePlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGroupDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateGroup} disabled={!newGroup.alias.trim()}>
              {t("groups.create")}
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
              <Label>{t("categories.idLabel")}</Label>
              <Input
                value={newCategory.custom_id}
                onChange={(e) => setNewCategory({ ...newCategory, custom_id: e.target.value })}
                className="bg-background"
                placeholder="tank"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("categories.nameLabel")}</Label>
              <Input
                value={newCategory.alias}
                onChange={(e) => setNewCategory({ ...newCategory, alias: e.target.value })}
                className="bg-background"
                placeholder="Tank"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCategoryDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!newCategory.custom_id.trim() || !newCategory.alias.trim()}
            >
              {t("categories.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
