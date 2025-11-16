"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Mock data for banned players
const mockBannedPlayers = [
  {
    player_tag: "#ABC123",
    player_name: "BadPlayer1",
    reason: "Harassment and toxic behavior in clan chat",
    banned_by: "Admin#1234",
    banned_date: "2024-01-15",
    clan_tag: "#CLAN123",
    clan_name: "Elite Warriors",
  },
  {
    player_tag: "#DEF456",
    player_name: "Cheater2",
    reason: "Using third-party tools to cheat in wars",
    banned_by: "Moderator#5678",
    banned_date: "2024-01-10",
    clan_tag: "#CLAN456",
    clan_name: "War Masters",
  },
  {
    player_tag: "#GHI789",
    player_name: "Spammer3",
    reason: "Repeated spam and advertising",
    banned_by: "Admin#1234",
    banned_date: "2024-01-05",
    clan_tag: null,
    clan_name: null,
  },
];

export default function BansPage() {
  const [bans, setBans] = useState(mockBannedPlayers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBan, setNewBan] = useState({
    player_tag: "",
    player_name: "",
    reason: "",
  });

  const handleAddBan = () => {
    // TODO: Connect to API
    const ban = {
      ...newBan,
      banned_by: "CurrentUser#0000",
      banned_date: new Date().toISOString().split("T")[0],
      clan_tag: null,
      clan_name: null,
    };
    setBans([...bans, ban]);
    setNewBan({ player_tag: "", player_name: "", reason: "" });
    setIsAddDialogOpen(false);
  };

  const handleRemoveBan = (playerTag: string) => {
    // TODO: Connect to API
    setBans(bans.filter((ban) => ban.player_tag !== playerTag));
  };

  const filteredBans = bans.filter(
    (ban) =>
      ban.player_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-500 hover:bg-red-600"
                  onClick={handleAddBan}
                  disabled={!newBan.player_tag || !newBan.reason}
                >
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
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-foreground">{bans.length}</div>
                <UserX className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recent Bans (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Common Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-foreground truncate">
                Harassment & Toxicity
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((1 / bans.length) * 100)}% of all bans
              </p>
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
                  {filteredBans.length} player{filteredBans.length !== 1 ? "s" : ""} banned
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, tag, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredBans.length === 0 ? (
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
