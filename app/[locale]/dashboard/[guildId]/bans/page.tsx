"use client";

import { useState, useEffect } from "react";
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
  Ban,
  Search,
  UserX,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  User,
  Loader2,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import type { BannedPlayer, Strike } from "@/lib/api/types/server";
import { useToast } from "@/components/ui/use-toast";

export default function BansPage() {
  const params = useParams();
  const guildId = params.guildId as string;
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
    player_name: "",
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

      apiClient.setAccessToken(token);
      const response = await apiClient.servers.getBans(guildId);

      if (response.error || !response.data) {
        throw new Error(response.error || "Failed to fetch bans");
      }

      setBans(response.data.items || []);
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

      apiClient.setAccessToken(token);
      const response = await apiClient.servers.getStrikes(guildId);

      if (response.error || !response.data) {
        throw new Error(response.error || "Failed to fetch strikes");
      }

      setStrikes(response.data.items || []);
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
      const username = user ? JSON.parse(user).username : "Unknown";

      if (!token) return;

      apiClient.setAccessToken(token);

      // Clean player tag (remove # if present)
      const cleanTag = newBan.player_tag.replace(/^#/, "");

      const response = await apiClient.servers.addBan(guildId, cleanTag, {
        reason: newBan.reason,
        added_by: username,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: tCommon("success"),
        description: `Player ${newBan.player_tag} has been banned`,
      });

      // Refresh the ban list
      await fetchBans();

      setNewBan({ player_tag: "", player_name: "", reason: "" });
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
      const userId = user ? JSON.parse(user).id : 0;

      if (!token) return;

      apiClient.setAccessToken(token);

      // Clean player tag (remove # if present)
      const cleanTag = newStrike.player_tag.replace(/^#/, "");

      const response = await apiClient.servers.addStrike(guildId, cleanTag, {
        reason: newStrike.reason,
        added_by: userId,
        strike_weight: newStrike.strike_weight,
        rollover_days: newStrike.rollover_days,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: tCommon("success"),
        description: `Strike added to player ${newStrike.player_tag}`,
      });

      // Refresh the strikes list
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

      apiClient.setAccessToken(token);

      // Clean player tag (remove # if present)
      const cleanTag = playerTag.replace(/^#/, "");

      const response = await apiClient.servers.removeBan(guildId, cleanTag);

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: tCommon("success"),
        description: `Ban removed for player ${playerTag}`,
      });

      // Refresh the ban list
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

      apiClient.setAccessToken(token);

      const response = await apiClient.servers.removeStrike(guildId, strikeId);

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: tCommon("success"),
        description: "Strike removed successfully",
      });

      // Refresh the strikes list
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
      (ban.name?.toLowerCase() || "").includes(searchQueryBans.toLowerCase()) ||
      ban.VillageTag.toLowerCase().includes(searchQueryBans.toLowerCase()) ||
      ban.Notes.toLowerCase().includes(searchQueryBans.toLowerCase())
  );

  const filteredStrikes = strikes.filter(
    (strike) =>
      (strike.player_name?.toLowerCase() || "").includes(searchQueryStrikes.toLowerCase()) ||
      strike.tag.toLowerCase().includes(searchQueryStrikes.toLowerCase()) ||
      strike.reason.toLowerCase().includes(searchQueryStrikes.toLowerCase())
  );

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <Ban className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Moderation</h1>
                <p className="text-muted-foreground mt-1">
                  Manage player bans and strikes
                </p>
              </div>
            </div>
          </div>
          {activeTab === "bans" && (
            <Dialog open={isAddBanDialogOpen} onOpenChange={setIsAddBanDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-500 hover:bg-red-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Ban
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Ban a Player</DialogTitle>
                  <DialogDescription>
                    Add a player to the ban list. They will be prevented from joining any clan on this server.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="player-tag">Player Tag *</Label>
                    <Input
                      id="player-tag"
                      placeholder="#ABC123DEF"
                      value={newBan.player_tag}
                      onChange={(e) =>
                        setNewBan({ ...newBan, player_tag: e.target.value })
                      }
                      disabled={isSubmittingBan}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="player-name">Player Name (optional)</Label>
                    <Input
                      id="player-name"
                      placeholder="Enter player name"
                      value={newBan.player_name}
                      onChange={(e) =>
                        setNewBan({ ...newBan, player_name: e.target.value })
                      }
                      disabled={isSubmittingBan}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Ban *</Label>
                    <Textarea
                      id="reason"
                      placeholder="Explain why this player is being banned..."
                      value={newBan.reason}
                      onChange={(e) =>
                        setNewBan({ ...newBan, reason: e.target.value })
                      }
                      rows={4}
                      disabled={isSubmittingBan}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddBanDialogOpen(false)}
                    disabled={isSubmittingBan}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-red-500 hover:bg-red-600"
                    onClick={handleAddBan}
                    disabled={!newBan.player_tag || !newBan.reason || isSubmittingBan}
                  >
                    {isSubmittingBan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Ban
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {activeTab === "strikes" && (
            <Dialog open={isAddStrikeDialogOpen} onOpenChange={setIsAddStrikeDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Strike
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add a Strike</DialogTitle>
                  <DialogDescription>
                    Issue a strike to a player. Strikes can have different weights and expiration dates.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="strike-player-tag">Player Tag *</Label>
                    <Input
                      id="strike-player-tag"
                      placeholder="#ABC123DEF"
                      value={newStrike.player_tag}
                      onChange={(e) =>
                        setNewStrike({ ...newStrike, player_tag: e.target.value })
                      }
                      disabled={isSubmittingStrike}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strike-reason">Reason *</Label>
                    <Textarea
                      id="strike-reason"
                      placeholder="Explain why this strike is being issued..."
                      value={newStrike.reason}
                      onChange={(e) =>
                        setNewStrike({ ...newStrike, reason: e.target.value })
                      }
                      rows={4}
                      disabled={isSubmittingStrike}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="strike-weight">Strike Weight *</Label>
                      <Input
                        id="strike-weight"
                        type="number"
                        min="1"
                        placeholder="1"
                        value={newStrike.strike_weight}
                        onChange={(e) =>
                          setNewStrike({ ...newStrike, strike_weight: parseInt(e.target.value) || 1 })
                        }
                        disabled={isSubmittingStrike}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rollover-days">Expires in (days)</Label>
                      <Input
                        id="rollover-days"
                        type="number"
                        min="1"
                        placeholder="Optional"
                        value={newStrike.rollover_days || ""}
                        onChange={(e) =>
                          setNewStrike({ ...newStrike, rollover_days: e.target.value ? parseInt(e.target.value) : undefined })
                        }
                        disabled={isSubmittingStrike}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddStrikeDialogOpen(false)}
                    disabled={isSubmittingStrike}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={handleAddStrike}
                    disabled={!newStrike.player_tag || !newStrike.reason || isSubmittingStrike}
                  >
                    {isSubmittingStrike && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Strike
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bans">
              <Ban className="mr-2 h-4 w-4" />
              Bans
            </TabsTrigger>
            <TabsTrigger value="strikes">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Strikes
            </TabsTrigger>
          </TabsList>

          {/* Bans Tab */}
          <TabsContent value="bans" className="space-y-6">
            {/* Info Alert */}
            <Alert className="border-blue-500/30 bg-blue-500/5">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-400">How Bans Work</AlertTitle>
              <AlertDescription className="text-blue-300">
                Banned players are prevented from joining any clan linked to this server. The bot will warn you if they join one of the clans.
                Bans are server-wide and apply to all your clans.
              </AlertDescription>
            </Alert>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Bans
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingBans ? (
                    <Skeleton className="h-10 w-20" />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold text-foreground">{bans.length}</div>
                      <UserX className="h-8 w-8 text-red-500/50" />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Recent Bans (7 days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingBans ? (
                    <Skeleton className="h-10 w-20" />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold text-foreground">
                        {bans.filter((b) => {
                          const days = Math.floor(
                            (new Date().getTime() - new Date(b.DateCreated).getTime()) /
                            (1000 * 60 * 60 * 24)
                          );
                          return days <= 7;
                        }).length}
                      </div>
                      <Calendar className="h-8 w-8 text-orange-500/50" />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Most Common Reason
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingBans ? (
                    <Skeleton className="h-10 w-32" />
                  ) : bans.length > 0 ? (
                    <>
                      <div className="text-sm font-medium text-foreground truncate">
                        Harassment & Toxicity
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round((1 / bans.length) * 100)}% of all bans
                      </p>
                    </>
                  ) : (
                    <div className="text-sm font-medium text-muted-foreground">
                      No bans yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Ban List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Banned Players</CardTitle>
                    <CardDescription>
                      {isLoadingBans ? (
                        <Skeleton className="h-4 w-24" />
                      ) : (
                        `${filteredBans.length} player${filteredBans.length !== 1 ? "s" : ""} banned`
                      )}
                    </CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, tag, or reason..."
                      value={searchQueryBans}
                      onChange={(e) => setSearchQueryBans(e.target.value)}
                      className="pl-8"
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
                        {searchQueryBans ? "No bans found" : "No banned players"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQueryBans
                          ? "Try adjusting your search query"
                          : "Add a ban to get started with player moderation"}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Banned By</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBans.map((ban, index) => (
                            <TableRow key={`${ban.VillageTag}-${index}`}>
                              <TableCell>
                                <div>
                                  <div className="font-medium text-foreground">
                                    {ban.name || "Unknown"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {ban.VillageTag}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div className="truncate text-sm text-muted-foreground" title={ban.Notes}>
                                  {ban.Notes}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{ban.added_by}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(ban.DateCreated).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {Math.floor(
                                    (new Date().getTime() - new Date(ban.DateCreated).getTime()) /
                                    (1000 * 60 * 60 * 24)
                                  )}{" "}
                                  days ago
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
                                  Remove
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

              {/* Additional Info */}
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="text-yellow-400">Best Practices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-yellow-300">
                  <p>
                    <strong>Document thoroughly:</strong> Always provide a detailed reason for each ban to help other moderators understand the context.
                  </p>
                  <p>
                    <strong>Review regularly:</strong> Periodically review your ban list to ensure all bans are still necessary and justified.
                  </p>
                  <p>
                    <strong>Be consistent:</strong> Apply bans fairly and consistently across all players to maintain a healthy community.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Strikes Tab */}
            <TabsContent value="strikes" className="space-y-6">
              {/* Info Alert */}
              <Alert className="border-orange-500/30 bg-orange-500/5">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertTitle className="text-orange-400">How Strikes Work</AlertTitle>
                <AlertDescription className="text-orange-300">
                  Strikes are warnings given to players for rule violations. Each strike has a weight (severity) and can optionally expire after a set number of days. Strikes help track player behavior before issuing bans.
                </AlertDescription>
              </Alert>

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Strikes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStrikes ? (
                      <Skeleton className="h-10 w-20" />
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-foreground">{strikes.length}</div>
                        <AlertTriangle className="h-8 w-8 text-orange-500/50" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Recent Strikes (7 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStrikes ? (
                      <Skeleton className="h-10 w-20" />
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-foreground">{recentStrikes}</div>
                        <Calendar className="h-8 w-8 text-orange-500/50" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Strike Weight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStrikes ? (
                      <Skeleton className="h-10 w-20" />
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-foreground">{totalStrikeWeight}</div>
                        <Scale className="h-8 w-8 text-orange-500/50" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Strikes List */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Player Strikes</CardTitle>
                      <CardDescription>
                        {isLoadingStrikes ? (
                          <Skeleton className="h-4 w-24" />
                        ) : (
                          `${filteredStrikes.length} strike${filteredStrikes.length !== 1 ? "s" : ""} issued`
                        )}
                      </CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, tag, or reason..."
                        value={searchQueryStrikes}
                        onChange={(e) => setSearchQueryStrikes(e.target.value)}
                        className="pl-8"
                        disabled={isLoadingStrikes}
                      />
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
                        {searchQueryStrikes ? "No strikes found" : "No strikes issued"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQueryStrikes
                          ? "Try adjusting your search query"
                          : "Add a strike to start tracking player violations"}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead>Added By</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStrikes.map((strike, index) => (
                            <TableRow key={`${strike.strike_id}-${index}`}>
                              <TableCell>
                                <div>
                                  <div className="font-medium text-foreground">
                                    {strike.player_name || "Unknown"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {strike.tag}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div className="truncate text-sm text-muted-foreground" title={strike.reason}>
                                  {strike.reason}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                                  {strike.strike_weight}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{strike.added_by}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(strike.date_created).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {Math.floor(
                                    (new Date().getTime() - new Date(strike.date_created).getTime()) /
                                    (1000 * 60 * 60 * 24)
                                  )}{" "}
                                  days ago
                                </div>
                              </TableCell>
                              <TableCell>
                                {strike.rollover_date ? (
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(strike.rollover_date * 1000).toLocaleDateString()}
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">Never</div>
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
                                  Remove
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

              {/* Best Practices */}
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="text-yellow-400">Strike Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-yellow-300">
                  <p>
                    <strong>Use weights wisely:</strong> Assign higher weights (2-3) for serious violations and lower weights (1) for minor issues.
                  </p>
                  <p>
                    <strong>Set expiration dates:</strong> Consider setting expiration dates for strikes to give players a chance to improve their behavior over time.
                  </p>
                  <p>
                    <strong>Track patterns:</strong> Use strikes to identify repeat offenders before escalating to permanent bans.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
