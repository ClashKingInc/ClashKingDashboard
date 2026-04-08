"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import {
  Ban,
  Search,
  UserX,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  AlertTriangle,
  Scale,
  List,
  Users,
  ChevronRight,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import type { BannedPlayer, Strike } from "@/lib/api/types/server";
import { useToast } from "@/components/ui/use-toast";

export default function BansPage() { // NOSONAR — React page component: complexity is aggregate state/handler management, not a single logic unit
  const params = useParams();
  const guildId = params.guildId as string;
  const locale = params.locale as string;
  const { toast } = useToast();
  const t = useTranslations("BansPage");
  const tCommon = useTranslations("Common");

  // Bans state
  const [bans, setBans] = useState<BannedPlayer[]>([]);
  const [isLoadingBans, setIsLoadingBans] = useState(true);
  const [searchQueryBans, setSearchQueryBans] = useState("");
  const [isAddBanDialogOpen, setIsAddBanDialogOpen] = useState(false);
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);
  const [newBan, setNewBan] = useState({
    player_tag: "",
    reason: "",
  });

  // Strikes state
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [isLoadingStrikes, setIsLoadingStrikes] = useState(true);
  const [searchQueryStrikes, setSearchQueryStrikes] = useState("");
  const [isAddStrikeDialogOpen, setIsAddStrikeDialogOpen] = useState(false);
  const [isSubmittingStrike, setIsSubmittingStrike] = useState(false);
  const [newStrike, setNewStrike] = useState({
    player_tag: "",
    reason: "",
    strike_weight: 1,
    rollover_days: undefined as number | undefined,
  });
  const [activeTab, setActiveTab] = useState("bans");
  const [strikeViewMode, setStrikeViewMode] = useState<"grouped" | "all">("grouped");
  const [expandedPlayerTags, setExpandedPlayerTags] = useState<string[]>([]);

  const getClashProfileUrl = (playerTag: string) => {
    const cleanTag = playerTag.replace(/^#/, "");
    return `https://link.clashofclans.com/en/?action=OpenPlayerProfile&tag=%23${encodeURIComponent(cleanTag)}`;
  };

  const PlayerProfilePopover = ({
    playerName,
    playerTag,
  }: {
    playerName: string;
    playerTag: string;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-left cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="font-medium text-foreground">{playerName}</div>
          <div className="text-xs text-muted-foreground">{playerTag}</div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-foreground truncate">{playerName}</p>
            <p className="text-xs text-muted-foreground">{playerTag}</p>
          </div>
          <Button asChild variant="outline" className="w-full gap-2">
            <a
              href={getClashProfileUrl(playerTag)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              View clash profile
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  // Fetch bans and strikes on mount
  useEffect(() => {
    fetchBans();
    fetchStrikes();
  }, [guildId]);

  const fetchBans = async () => {
    try {
      setIsLoadingBans(true);
      const token = localStorage.getItem("access_token");
      if (!token) return;

      
      const response = await apiCache.get(`bans-${guildId}`, async () => {
        return await apiClient.servers.getBans(guildId);
      });

      if (response.error) {
        throw new Error(response.error || "Failed to fetch bans");
      }

      // Convert added_by to string to preserve precision for large Discord IDs
      const bans = (response.data?.items || []).map((ban: any) => ({
        ...ban,
        added_by: String(ban.added_by), // Ensure added_by is always a string
      }));

      setBans(bans);
    } catch (error) {
      console.error("Error fetching bans:", error);
      toast({
        title: tCommon("error"),
        description: t("toast.errorLoadingBans"),
        variant: "destructive",
      });
    } finally {
      setIsLoadingBans(false);
    }
  };

  const fetchStrikes = async () => {
    try {
      setIsLoadingStrikes(true);
      const token = localStorage.getItem("access_token");
      if (!token) return;


      const response = await apiCache.get(`strikes-${guildId}`, async () => {
        return await apiClient.servers.getStrikes(guildId);
      });

      if (response.error) {
        throw new Error(response.error || "Failed to fetch strikes");
      }

      // Convert added_by to string to preserve precision for large Discord IDs
      const strikes = (response.data?.items || []).map((strike: any) => ({
        ...strike,
        added_by: String(strike.added_by), // Ensure added_by is always a string
      }));

      setStrikes(strikes);
    } catch (error) {
      console.error("Error fetching strikes:", error);
      toast({
        title: tCommon("error"),
        description: t("toast.errorLoadingStrikes"),
        variant: "destructive",
      });
    } finally {
      setIsLoadingStrikes(false);
    }
  };

  const handleAddBan = async () => {
    if (!newBan.player_tag || !newBan.reason) return;

    try {
      setIsSubmittingBan(true);
      const token = localStorage.getItem("access_token");
      const user = localStorage.getItem("user");
      // Preserve precision for large Discord IDs by using string instead of number
      const userId = user ? JSON.parse(user).user_id : "0";

      if (!token) return;


      // Clean player tag (remove # if present)
      const cleanTag = newBan.player_tag.replace(/^#/, "");

      const response = await apiClient.servers.addBan(guildId, cleanTag, {
        reason: newBan.reason,
        added_by: userId, // Send as string to preserve precision for large Discord IDs
        image: null,
      });

      if (response.error) {
        // Handle error - could be string, object, or array
        let errorMessage = t("toast.errorAddingBan");

        if (typeof response.error === 'string') {
          errorMessage = response.error;
        } else if (Array.isArray(response.error)) {
          errorMessage = (response.error as any[]).map((e: any) =>
            typeof e === 'string' ? e : e.msg || e.message || JSON.stringify(e)
          ).join(', ');
        } else if (typeof response.error === 'object' && response.error !== null) {
          errorMessage = (response.error as any).detail || (response.error as any).message || JSON.stringify(response.error);
        }

        throw new Error(errorMessage);
      }

      toast({
        title: tCommon("success"),
        description: t("toast.banAdded"),
      });

      // Invalidate cache and refresh the ban list
      apiCache.invalidate(`bans-${guildId}`);
      await fetchBans();

      setNewBan({ player_tag: "", reason: "" });
      setIsAddBanDialogOpen(false);
    } catch (error) {
      console.error("Error adding ban:", error);
      toast({
        title: tCommon("error"),
        description: error instanceof Error ? error.message : t("toast.errorAddingBan"),
        variant: "destructive",
      });
    } finally {
      setIsSubmittingBan(false);
    }
  };

  const handleAddStrike = async () => {
    if (!newStrike.player_tag || !newStrike.reason) return;

    try {
      setIsSubmittingStrike(true);
      const token = localStorage.getItem("access_token");
      const user = localStorage.getItem("user");
      // Preserve precision for large Discord IDs by using string instead of number
      const userId = user ? JSON.parse(user).user_id : "0";

      if (!token) return;


      // Clean player tag (remove # if present)
      const cleanTag = newStrike.player_tag.replace(/^#/, "");

      const response = await apiClient.servers.addStrike(guildId, cleanTag, {
        reason: newStrike.reason,
        added_by: userId, // Send as string to preserve precision for large Discord IDs
        strike_weight: newStrike.strike_weight,
        rollover_days: newStrike.rollover_days,
      });

      if (response.error) {
        // Handle error - could be string, object, or array
        let errorMessage = t("toast.errorAddingStrike");

        if (typeof response.error === 'string') {
          errorMessage = response.error;
        } else if (Array.isArray(response.error)) {
          errorMessage = (response.error as any[]).map((e: any) =>
            typeof e === 'string' ? e : e.msg || e.message || JSON.stringify(e)
          ).join(', ');
        } else if (typeof response.error === 'object' && response.error !== null) {
          errorMessage = (response.error as any).detail || (response.error as any).message || JSON.stringify(response.error);
        }

        throw new Error(errorMessage);
      }

      toast({
        title: tCommon("success"),
        description: t("toast.strikeAdded"),
      });

      // Invalidate cache and refresh the strikes list
      apiCache.invalidate(`strikes-${guildId}`);
      await fetchStrikes();

      setNewStrike({ player_tag: "", reason: "", strike_weight: 1, rollover_days: undefined });
      setIsAddStrikeDialogOpen(false);
    } catch (error) {
      console.error("Error adding strike:", error);
      toast({
        title: tCommon("error"),
        description: error instanceof Error ? error.message : t("toast.errorAddingStrike"),
        variant: "destructive",
      });
    } finally {
      setIsSubmittingStrike(false);
    }
  };

  const handleRemoveBan = async (playerTag: string) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;


      // Clean player tag (remove # if present)
      const cleanTag = playerTag.replace(/^#/, "");

      const response = await apiClient.servers.removeBan(guildId, cleanTag);

      if (response.error) {
        // Handle error - could be string, object, or array
        let errorMessage = t("toast.errorRemovingBan");

        if (typeof response.error === 'string') {
          errorMessage = response.error;
        } else if (Array.isArray(response.error)) {
          errorMessage = (response.error as any[]).map((e: any) =>
            typeof e === 'string' ? e : e.msg || e.message || JSON.stringify(e)
          ).join(', ');
        } else if (typeof response.error === 'object' && response.error !== null) {
          errorMessage = (response.error as any).detail || (response.error as any).message || JSON.stringify(response.error);
        }

        throw new Error(errorMessage);
      }

      toast({
        title: tCommon("success"),
        description: t("toast.banRemoved"),
      });

      // Invalidate cache and refresh the ban list
      apiCache.invalidate(`bans-${guildId}`);
      await fetchBans();
    } catch (error) {
      console.error("Error removing ban:", error);
      toast({
        title: tCommon("error"),
        description: error instanceof Error ? error.message : t("toast.errorRemovingBan"),
        variant: "destructive",
      });
    }
  };

  const handleRemoveStrike = async (strikeId: string) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;


      const response = await apiClient.servers.removeStrike(guildId, strikeId);

      if (response.error) {
        // Handle error - could be string, object, or array
        let errorMessage = t("toast.errorRemovingStrike");

        if (typeof response.error === 'string') {
          errorMessage = response.error;
        } else if (Array.isArray(response.error)) {
          errorMessage = (response.error as any[]).map((e: any) =>
            typeof e === 'string' ? e : e.msg || e.message || JSON.stringify(e)
          ).join(', ');
        } else if (typeof response.error === 'object' && response.error !== null) {
          errorMessage = (response.error as any).detail || (response.error as any).message || JSON.stringify(response.error);
        }

        throw new Error(errorMessage);
      }

      toast({
        title: tCommon("success"),
        description: t("toast.strikeRemoved"),
      });

      // Invalidate cache and refresh the strikes list
      apiCache.invalidate(`strikes-${guildId}`);
      await fetchStrikes();
    } catch (error) {
      console.error("Error removing strike:", error);
      toast({
        title: tCommon("error"),
        description: error instanceof Error ? error.message : t("toast.errorRemovingStrike"),
        variant: "destructive",
      });
    }
  };

  const filteredBans = bans.filter(
    (ban) =>
      (ban.VillageName?.toLowerCase() || ban.name?.toLowerCase() || "").includes(searchQueryBans.toLowerCase()) ||
      ban.VillageTag.toLowerCase().includes(searchQueryBans.toLowerCase()) ||
      ban.Notes.toLowerCase().includes(searchQueryBans.toLowerCase())
  );

  const filteredStrikes = strikes.filter(
    (strike) =>
      (strike.player_name?.toLowerCase() || "").includes(searchQueryStrikes.toLowerCase()) ||
      strike.tag.toLowerCase().includes(searchQueryStrikes.toLowerCase()) ||
      strike.reason.toLowerCase().includes(searchQueryStrikes.toLowerCase())
  );

  const groupedStrikes = Object.values(
    filteredStrikes.reduce((acc, strike) => {
      const tag = strike.tag;
      if (!acc[tag]) {
        acc[tag] = {
          tag: tag,
          player_name: strike.player_name,
          total_weight: 0,
          count: 0,
          last_strike: strike.date_created,
          strikes: [],
        };
      }
      acc[tag].total_weight += strike.strike_weight;
      acc[tag].count += 1;
      if (new Date(strike.date_created) > new Date(acc[tag].last_strike)) {
        acc[tag].last_strike = strike.date_created;
      }
      acc[tag].strikes.push(strike);
      return acc;
    }, {} as Record<string, {
      tag: string,
      player_name?: string,
      total_weight: number,
      count: number,
      last_strike: string,
      strikes: Strike[]
    }>)
  ).sort((a, b) => b.total_weight - a.total_weight);

  // Calculate strike statistics
  const totalStrikeWeight = strikes.reduce((sum, strike) => sum + strike.strike_weight, 0);
  const recentStrikes = strikes.filter((s) => {
    const days = Math.floor(
      (new Date().getTime() - new Date(s.date_created).getTime()) /
      (1000 * 60 * 60 * 24)
    );
    return days <= 7;
  }).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <Ban className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
                <p className="text-muted-foreground mt-1">
                  {t("description")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bans">
              <Ban className="mr-2 h-4 w-4" />
              {t("tabs.bans")}
            </TabsTrigger>
            <TabsTrigger value="strikes">
              <AlertTriangle className="mr-2 h-4 w-4" />
              {t("tabs.strikes")}
            </TabsTrigger>
          </TabsList>

          {/* Bans Tab */}
          <TabsContent value="bans" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-card border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("bans.stats.total")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingBans ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-20 animate-pulse" />
                        <Skeleton className="h-8 w-8 animate-pulse" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-blue-500">{bans.length}</div>
                        <UserX className="h-8 w-8 text-blue-500/50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Active bans on server
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("bans.stats.recent")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingBans ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-20 animate-pulse" />
                        <Skeleton className="h-8 w-8 animate-pulse" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-green-500">
                          {bans.filter((b) => {
                            const days = Math.floor(
                              (new Date().getTime() - new Date(b.DateCreated).getTime()) /
                              (1000 * 60 * 60 * 24)
                            );
                            return days <= 7;
                          }).length}
                        </div>
                        <Calendar className="h-8 w-8 text-green-500/50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        In the last 7 days
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-purple-500/30 bg-purple-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("bans.stats.commonReason")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingBans ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-32 animate-pulse" />
                        <Skeleton className="h-8 w-8 animate-pulse" />
                      </div>
                    </>
                  ) : bans.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-purple-500 truncate">
                          {t("bans.stats.commonReasonValue")}
                        </div>
                        <AlertCircle className="h-8 w-8 text-purple-500/50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t("bans.stats.percentOfAll", { percent: Math.round((1 / bans.length) * 100) })}
                      </p>
                    </>
                  ) : (
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("bans.stats.noBans")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Ban List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div>
                      <CardTitle>{t("bans.list.title")}</CardTitle>
                      <CardDescription>
                        {isLoadingBans ? (
                          <Skeleton className="h-4 w-24" />
                        ) : (
                          t("bans.list.count", { count: filteredBans.length })
                        )}
                      </CardDescription>
                    </div>
                    <Dialog open={isAddBanDialogOpen} onOpenChange={setIsAddBanDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-red-500 hover:bg-red-600 w-full md:w-auto">
                          <Plus className="mr-2 h-4 w-4" />
                          {t("bans.addBan")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">{t("bans.addDialog.title")}</DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            {t("bans.addDialog.description")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="player-tag" className="text-foreground">
                              {t("bans.addDialog.playerTagLabel")}
                              <span className="text-destructive ml-1">*</span>
                            </Label>
                            <Input
                              id="player-tag"
                              placeholder={t("bans.addDialog.playerTagPlaceholder")}
                              value={newBan.player_tag}
                              onChange={(e) =>
                                setNewBan({ ...newBan, player_tag: e.target.value })
                              }
                              disabled={isSubmittingBan}
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reason" className="text-foreground">
                              {t("bans.addDialog.reasonLabel")}
                              <span className="text-destructive ml-1">*</span>
                            </Label>
                            <Textarea
                              id="reason"
                              placeholder={t("bans.addDialog.reasonPlaceholder")}
                              value={newBan.reason}
                              onChange={(e) =>
                                setNewBan({ ...newBan, reason: e.target.value })
                              }
                              rows={4}
                              disabled={isSubmittingBan}
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsAddBanDialogOpen(false)}
                            disabled={isSubmittingBan}
                            className="border-border"
                          >
                            {tCommon("cancel")}
                          </Button>
                          <Button
                            className="bg-red-500 hover:bg-red-600"
                            onClick={handleAddBan}
                            disabled={!newBan.player_tag || !newBan.reason || isSubmittingBan}
                          >
                            {isSubmittingBan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("bans.addDialog.submit")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="relative w-full md:w-64 xl:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("bans.list.searchPlaceholder")}
                      value={searchQueryBans}
                      onChange={(e) => setSearchQueryBans(e.target.value)}
                      className="pl-8 bg-background border-border text-foreground"
                      disabled={isLoadingBans}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                  {isLoadingBans ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : filteredBans.length === 0 ? (
                    <div className="text-center py-12">
                      <UserX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {searchQueryBans ? t("bans.list.noBansFound") : t("bans.list.noBans")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQueryBans
                          ? t("bans.list.adjustSearch")
                          : t("bans.list.getStarted")}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("bans.table.player")}</TableHead>
                            <TableHead>{t("bans.table.reason")}</TableHead>
                            <TableHead>{t("bans.table.bannedBy")}</TableHead>
                            <TableHead>{t("bans.table.date")}</TableHead>
                            <TableHead className="text-right">{tCommon("actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBans.map((ban, index) => (
                            <TableRow key={`${ban.VillageTag}-${index}`}>
                              <TableCell>
                                <PlayerProfilePopover
                                  playerName={ban.VillageName || ban.name || tCommon("unknown")}
                                  playerTag={ban.VillageTag}
                                />
                              </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate text-sm text-muted-foreground" title={ban.Notes}>
                                {ban.Notes && ban.Notes !== "No Notes" ? ban.Notes : t("bans.table.noReason")}
                                </div>
                              </TableCell>
                              <TableCell>
                                <DiscordUserDisplay
                                  userId={String(ban.added_by)}
                                  username={ban.added_by_username}
                                  avatarUrl={ban.added_by_avatar_url}
                                  size="sm"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(ban.DateCreated).toLocaleDateString(locale)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t("bans.table.daysAgo", {
                                    days: Math.floor(
                                      (new Date().getTime() - new Date(ban.DateCreated).getTime()) /
                                      (1000 * 60 * 60 * 24)
                                    )
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveBan(ban.VillageTag)}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  {tCommon("remove")}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Alert */}
              <Alert className="border-blue-500/30 bg-blue-500/5">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-400">{t("bans.howItWorks.title")}</AlertTitle>
                <AlertDescription className="text-blue-300">
                  {t.rich("bans.howItWorks.description", {
                    clansTab: (chunks) => (
                      <Link
                        href={`/dashboard/${guildId}/clans`}
                        className="underline font-medium text-blue-200 hover:text-blue-100"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </AlertDescription>
              </Alert>

              {/* Best Practices */}
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="text-yellow-400">{t("bans.bestPractices.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-yellow-300">
                  <p>
                    <strong className="text-yellow-400 block mb-1">{t("bans.bestPractices.document.title")}</strong>
                    {t("bans.bestPractices.document.desc")}
                  </p>
                  <p>
                    <strong className="text-yellow-400 block mb-1">{t("bans.bestPractices.review.title")}</strong>
                    {t("bans.bestPractices.review.desc")}
                  </p>
                  <p>
                    <strong className="text-yellow-400 block mb-1">{t("bans.bestPractices.consistent.title")}</strong>
                    {t("bans.bestPractices.consistent.desc")}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Strikes Tab */}
            <TabsContent value="strikes" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-card border-blue-500/30 bg-blue-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t("strikes.stats.total")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStrikes ? (
                      <>
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-8 w-20 animate-pulse" />
                          <Skeleton className="h-8 w-8 animate-pulse" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="text-3xl font-bold text-blue-500">{strikes.length}</div>
                          <AlertTriangle className="h-8 w-8 text-blue-500/50" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Active strikes on server
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-green-500/30 bg-green-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t("strikes.stats.recent")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStrikes ? (
                      <>
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-8 w-20 animate-pulse" />
                          <Skeleton className="h-8 w-8 animate-pulse" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="text-3xl font-bold text-green-500">{recentStrikes}</div>
                          <Calendar className="h-8 w-8 text-green-500/50" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          In the last 7 days
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-purple-500/30 bg-purple-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t("strikes.stats.totalWeight")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStrikes ? (
                      <>
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-8 w-20 animate-pulse" />
                          <Skeleton className="h-8 w-8 animate-pulse" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="text-3xl font-bold text-purple-500">{totalStrikeWeight}</div>
                          <Scale className="h-8 w-8 text-purple-500/50" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Cumulative strike weight
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Strikes List */}
              <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div>
                      <CardTitle>{t("strikes.list.title")}</CardTitle>
                      <CardDescription>
                        {isLoadingStrikes ? (
                          <Skeleton className="h-4 w-24" />
                        ) : (
                          t("strikes.list.count", { count: filteredStrikes.length })
                        )}
                      </CardDescription>
                    </div>
                    <Tabs value={strikeViewMode} onValueChange={(v) => setStrikeViewMode(v as any)} className="hidden md:block">
                      <TabsList className="grid grid-cols-2 w-fit">
                        <TabsTrigger value="grouped">
                          <Users className="h-4 w-4 mr-2" />
                          {t("strikes.list.viewGrouped")}
                        </TabsTrigger>
                        <TabsTrigger value="all">
                          <List className="h-4 w-4 mr-2" />
                          {t("strikes.list.viewAll")}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Dialog open={isAddStrikeDialogOpen} onOpenChange={setIsAddStrikeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-orange-500 hover:bg-orange-600">
                          <Plus className="mr-2 h-4 w-4" />
                          {t("strikes.addStrike")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">{t("strikes.addDialog.title")}</DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            {t("strikes.addDialog.description")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="strike-player-tag" className="text-foreground">
                              {t("strikes.addDialog.playerTagLabel")}
                              <span className="text-destructive ml-1">*</span>
                            </Label>
                            <Input
                              id="strike-player-tag"
                              placeholder={t("strikes.addDialog.playerTagPlaceholder")}
                              value={newStrike.player_tag}
                              onChange={(e) =>
                                setNewStrike({ ...newStrike, player_tag: e.target.value })
                              }
                              disabled={isSubmittingStrike}
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="strike-reason" className="text-foreground">
                              {t("strikes.addDialog.reasonLabel")}
                              <span className="text-destructive ml-1">*</span>
                            </Label>
                            <Textarea
                              id="strike-reason"
                              placeholder={t("strikes.addDialog.reasonPlaceholder")}
                              value={newStrike.reason}
                              onChange={(e) =>
                                setNewStrike({ ...newStrike, reason: e.target.value })
                              }
                              rows={4}
                              disabled={isSubmittingStrike}
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="strike-weight" className="text-foreground">
                                {t("strikes.addDialog.weightLabel")}
                                <span className="text-destructive ml-1">*</span>
                              </Label>
                              <Input
                                id="strike-weight"
                                type="number"
                                min="1"
                                placeholder={t("strikes.addDialog.weightPlaceholder")}
                                value={newStrike.strike_weight}
                                onChange={(e) =>
                                  setNewStrike({ ...newStrike, strike_weight: parseInt(e.target.value) || 1 })
                                }
                                disabled={isSubmittingStrike}
                                className="bg-background border-border text-foreground"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="rollover-days" className="text-foreground">{t("strikes.addDialog.rolloverLabel")}</Label>
                              <Input
                                id="rollover-days"
                                type="number"
                                min="1"
                                placeholder={t("strikes.addDialog.rolloverPlaceholder")}
                                value={newStrike.rollover_days || ""}
                                onChange={(e) =>
                                  setNewStrike({ ...newStrike, rollover_days: e.target.value ? parseInt(e.target.value) : undefined })
                                }
                                disabled={isSubmittingStrike}
                                className="bg-background border-border text-foreground"
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsAddStrikeDialogOpen(false)}
                            disabled={isSubmittingStrike}
                            className="border-border"
                          >
                            {tCommon("cancel")}
                          </Button>
                          <Button
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={handleAddStrike}
                            disabled={!newStrike.player_tag || !newStrike.reason || isSubmittingStrike}
                          >
                            {isSubmittingStrike && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("strikes.addDialog.submit")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                    <Tabs value={strikeViewMode} onValueChange={(v) => setStrikeViewMode(v as any)} className="md:hidden w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="grouped">
                          <Users className="h-4 w-4 mr-2" />
                          {t("strikes.list.viewGrouped")}
                        </TabsTrigger>
                        <TabsTrigger value="all">
                          <List className="h-4 w-4 mr-2" />
                          {t("strikes.list.viewAll")}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="relative w-full md:w-64 xl:w-72">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t("strikes.list.searchPlaceholder")}
                        value={searchQueryStrikes}
                        onChange={(e) => setSearchQueryStrikes(e.target.value)}
                        className="pl-8 bg-background border-border text-foreground"
                        disabled={isLoadingStrikes}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
                <CardContent>
                  {isLoadingStrikes ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : filteredStrikes.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {searchQueryStrikes ? t("strikes.list.noStrikesFound") : t("strikes.list.noStrikes")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQueryStrikes
                          ? t("strikes.list.adjustSearch")
                          : t("strikes.list.getStarted")}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border">
                      {strikeViewMode === "all" ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("strikes.table.player")}</TableHead>
                              <TableHead>{t("strikes.table.reason")}</TableHead>
                              <TableHead>{t("strikes.table.weight")}</TableHead>
                              <TableHead>{t("strikes.table.addedBy")}</TableHead>
                              <TableHead>{t("strikes.table.date")}</TableHead>
                              <TableHead>{t("strikes.table.expires")}</TableHead>
                              <TableHead className="text-right">{tCommon("actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredStrikes.map((strike, index) => (
                              <TableRow key={`${strike.strike_id}-${index}`}>
                                <TableCell>
                                  <PlayerProfilePopover
                                    playerName={strike.player_name || tCommon("unknown")}
                                    playerTag={strike.tag}
                                  />
                                </TableCell>
                              <TableCell className="max-w-xs">
                                <div className="truncate text-sm text-muted-foreground" title={strike.reason}>
                                  {strike.reason && strike.reason !== "No Notes" ? strike.reason : t("bans.table.noReason")}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                                    {strike.strike_weight}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <DiscordUserDisplay
                                    userId={String(strike.added_by)}
                                    username={strike.added_by_username}
                                    avatarUrl={strike.added_by_avatar_url}
                                    size="sm"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {new Date(strike.date_created).toLocaleDateString(locale)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {t("strikes.table.daysAgo", {
                                      days: Math.floor(
                                        (new Date().getTime() - new Date(strike.date_created).getTime()) /
                                        (1000 * 60 * 60 * 24)
                                      )
                                    })}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {strike.rollover_date ? (
                                    <div className="text-sm text-muted-foreground">
                                      {new Date(strike.rollover_date * 1000).toLocaleDateString(locale)}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">{t("strikes.table.never")}</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveStrike(strike.strike_id)}
                                    className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {tCommon("remove")}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("strikes.table.player")}</TableHead>
                              <TableHead className="text-center">{t("strikes.table.totalStrikes")}</TableHead>
                              <TableHead className="text-center">{t("strikes.table.totalWeight")}</TableHead>
                              <TableHead>{t("strikes.table.lastStrike")}</TableHead>
                              <TableHead className="text-right">{tCommon("actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupedStrikes.map((group, index) => {
                              const isExpanded = expandedPlayerTags.includes(group.tag);
                              return (
                                <Fragment key={`${group.tag}-${index}`}>
                                  <TableRow className={isExpanded ? "border-b-0 bg-muted/30" : ""}>
                                    <TableCell>
                                      <PlayerProfilePopover
                                        playerName={group.player_name || tCommon("unknown")}
                                        playerTag={group.tag}
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className="font-bold">{group.count}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                                        {group.total_weight}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm">
                                        {new Date(group.last_strike).toLocaleDateString(locale)}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => { // NOSONAR — inline toggle updater in JSX handler, standard React pattern
                                          setExpandedPlayerTags(prev =>
                                            prev.includes(group.tag)
                                              ? prev.filter(t => t !== group.tag)
                                              : [...prev, group.tag]
                                          );
                                        }}
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4 mr-1" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 mr-1" />
                                        )}
                                        {tCommon("details")}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow className="bg-muted/30 border-t-0">
                                      <TableCell colSpan={5} className="p-0">
                                        <div className="px-4 pb-4">
                                          <div className="rounded-lg border border-border bg-background overflow-hidden">
                                            <Table>
                                              <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                  <TableHead className="h-8 text-[10px] uppercase font-bold text-muted-foreground">{t("strikes.table.reason")}</TableHead>
                                                  <TableHead className="h-8 text-[10px] uppercase font-bold text-muted-foreground text-center">{t("strikes.table.weight")}</TableHead>
                                                  <TableHead className="h-8 text-[10px] uppercase font-bold text-muted-foreground">{t("strikes.table.addedBy")}</TableHead>
                                                  <TableHead className="h-8 text-[10px] uppercase font-bold text-muted-foreground">{t("strikes.table.date")}</TableHead>
                                                  <TableHead className="h-8 text-[10px] uppercase font-bold text-muted-foreground">{t("strikes.table.expires")}</TableHead>
                                                  <TableHead className="h-8 text-[10px] uppercase font-bold text-muted-foreground text-right">{tCommon("actions")}</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {group.strikes.map((s, idx) => (
                                                  <TableRow key={`${s.strike_id}-${idx}`} className="hover:bg-muted/20">
                                                    <TableCell className="py-2 max-w-[200px]">
                                                      <div className="truncate text-xs text-muted-foreground" title={s.reason}>
                                                        {s.reason && s.reason !== "No Notes" ? s.reason : t("bans.table.noReason")}
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-center">
                                                      <Badge variant="outline" className="text-[10px] px-1.5 h-5 bg-orange-500/10 text-orange-500 border-orange-500/30">
                                                        {s.strike_weight}
                                                      </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                      <DiscordUserDisplay
                                                        userId={String(s.added_by)}
                                                        username={s.added_by_username}
                                                        avatarUrl={s.added_by_avatar_url}
                                                        size="sm"
                                                      />
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                      <div className="text-[11px] text-muted-foreground">
                                                        {new Date(s.date_created).toLocaleDateString(locale)}
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                      <div className="text-[11px] text-muted-foreground">
                                                        {s.rollover_date ? (
                                                          new Date(s.rollover_date * 1000).toLocaleDateString(locale)
                                                        ) : (
                                                          t("strikes.table.never")
                                                        )}
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-right">
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-red-500/70 hover:text-red-500 hover:bg-red-500/10"
                                                        onClick={() => handleRemoveStrike(s.strike_id)}
                                                      >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                      </Button>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Alert */}
              <Alert className="border-orange-500/30 bg-orange-500/5">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertTitle className="text-orange-400">{t("strikes.howItWorks.title")}</AlertTitle>
                <AlertDescription className="text-orange-300">
                  {t("strikes.howItWorks.description")}
                </AlertDescription>
              </Alert>

              {/* Guidelines */}
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="text-yellow-400">{t("strikes.guidelines.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-yellow-300">
                  <p>
                    <strong className="text-yellow-400 block mb-1">{t("strikes.guidelines.weights.title")}</strong>
                    {t("strikes.guidelines.weights.desc")}
                  </p>
                  <p>
                    <strong className="text-yellow-400 block mb-1">{t("strikes.guidelines.expiration.title")}</strong>
                    {t("strikes.guidelines.expiration.desc")}
                  </p>
                  <p>
                    <strong className="text-yellow-400 block mb-1">{t("strikes.guidelines.patterns.title")}</strong>
                    {t("strikes.guidelines.patterns.desc")}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
