"use client";

import React, { useState } from "react";
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
import { Loader2, Plus, Users, Trash2, Edit, Search, RefreshCw, Eye, Copy, ClipboardList } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Local imports
import { useRosters } from "./_hooks";
import { CloneDialog } from "./_components";
import type { Roster, CreateRosterFormData, CloneRosterFormData } from "./_lib/types";
import { calculateRosterStats, formatThRestriction } from "./_lib/utils";

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

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [rosterToClone, setRosterToClone] = useState<Roster | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form state
  const [newRosterData, setNewRosterData] = useState<CreateRosterFormData>({
    alias: "",
    roster_type: "clan",
    signup_scope: "clan-only",
    clan_tag: "",
  });

  // Filter rosters
  const filteredRosters = rosters.filter(roster =>
    roster.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
    roster.clan_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Family clan tags for stats calculation
  const familyClanTags = clans.map(c => c.tag);

  // Calculate global stats
  const totalMembers = rosters.reduce((acc, r) => acc + (r.members?.length || 0), 0);
  const clanRosters = rosters.filter(r => r.roster_type === "clan").length;
  const familyRosters = rosters.filter(r => r.roster_type === "family").length;

  // Handlers
  const handleViewRoster = (roster: Roster) => {
    router.push(`/${locale}/dashboard/${guildId}/rosters/${roster.custom_id}`);
  };

  const handleDeleteRoster = async (roster: Roster) => {
    if (!confirm(t("deleteConfirm").replace("{name}", roster.alias))) return;

    setDeleting(roster.custom_id);
    try {
      await deleteRoster(roster.custom_id);
      toast({
        title: tCommon("success"),
        description: t("deleteSuccessDesc").replace("{name}", roster.alias),
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
        description: t("cloneDialog.successDesc").replace("{name}", cloned.alias),
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
        description: t("createSuccessDesc").replace("{name}", created.alias),
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
                  <Button onClick={handleCreateRoster} disabled={creating || !newRosterData.alias.trim()}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRosters.map((roster) => {
              const stats = calculateRosterStats(roster.members, roster.clan_tag, familyClanTags);
              return (
                <Card key={roster.custom_id} className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
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
                        <div>
                          <CardTitle className="text-lg text-foreground">{roster.alias}</CardTitle>
                          {roster.clan_name && (
                            <p className="text-sm text-muted-foreground">{roster.clan_name}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={roster.roster_type === "clan" ? "default" : "secondary"}>
                        {roster.roster_type}
                      </Badge>
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
                          <span className="text-green-400">{stats.inClan} {t("rosterCard.inClan")}</span>
                        )}
                        {stats.inFamily > 0 && (
                          <span className="text-yellow-400">{stats.inFamily} {t("rosterCard.inFamily")}</span>
                        )}
                        {stats.external > 0 && (
                          <span className="text-red-400">{stats.external} {t("rosterCard.external")}</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewRoster(roster)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {t("rosterCard.view")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleOpenClone(roster)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRoster(roster)}
                        disabled={deleting === roster.custom_id}
                        className="text-destructive hover:text-destructive"
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

        {/* Clone Dialog */}
        <CloneDialog
          open={cloneDialogOpen}
          onOpenChange={setCloneDialogOpen}
          roster={rosterToClone}
          onClone={handleCloneRoster}
          t={t}
        />
      </div>
    </div>
  );
}
