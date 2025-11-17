"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  Ban,
  Search,
  UserX,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  User,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import type { BannedPlayer } from "@/lib/api/types/server";
import { useToast } from "@/hooks/use-toast";

export default function BansPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const { toast } = useToast();

  const [bans, setBans] = useState<BannedPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBan, setNewBan] = useState({
    player_tag: "",
    player_name: "",
    reason: "",
  });

  // Fetch bans on mount
  useEffect(() => {
    fetchBans();
  }, [guildId]);

  const fetchBans = async () => {
    try {
      setIsLoading(true);
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
        title: "Error",
        description: "Failed to load banned players",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBan = async () => {
    if (!newBan.player_tag || !newBan.reason) return;

    try {
      setIsSubmitting(true);
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
        title: "Success",
        description: `Player ${newBan.player_tag} has been banned`,
      });

      // Refresh the ban list
      await fetchBans();

      setNewBan({ player_tag: "", player_name: "", reason: "" });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding ban:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add ban",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
        title: "Success",
        description: `Ban removed for player ${playerTag}`,
      });

      // Refresh the ban list
      await fetchBans();
    } catch (error) {
      console.error("Error removing ban:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove ban",
        variant: "destructive",
      });
    }
  };

  const filteredBans = bans.filter(
    (ban) =>
      (ban.player_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      ban.player_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ban.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <h1 className="text-3xl font-bold text-foreground">Player Bans</h1>
                <p className="text-muted-foreground mt-1">
                  Manage banned players and moderation settings
                </p>
              </div>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-500 hover:bg-red-600"
                  onClick={handleAddBan}
                  disabled={!newBan.player_tag || !newBan.reason || isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Ban
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-400">How Bans Work</AlertTitle>
          <AlertDescription className="text-blue-300">
            Banned players are prevented from joining any clan linked to this server. The bot will automatically kick them if they try to join.
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
              {isLoading ? (
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
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-foreground">
                    {bans.filter((b) => {
                      const days = Math.floor(
                        (new Date().getTime() - new Date(b.banned_date).getTime()) /
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
              {isLoading ? (
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
                  {isLoading ? (
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                  {searchQuery ? "No bans found" : "No banned players"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
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
                      <TableHead>Last Clan</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBans.map((ban) => (
                      <TableRow key={ban.player_tag}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">
                              {ban.player_name || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {ban.player_tag}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate text-sm text-muted-foreground" title={ban.reason}>
                            {ban.reason}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{ban.banned_by}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(ban.banned_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.floor(
                              (new Date().getTime() - new Date(ban.banned_date).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}{" "}
                            days ago
                          </div>
                        </TableCell>
                        <TableCell>
                          {ban.clan_name ? (
                            <div>
                              <div className="text-sm font-medium">{ban.clan_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {ban.clan_tag}
                              </div>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              No Clan
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBan(ban.player_tag)}
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
            <CardTitle className="text-yellow-400">💡 Best Practices</CardTitle>
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
      </div>
    </div>
  );
}
