"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users, Trash2, Edit, Shield, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Type definitions
interface RosterMember {
  tag: string;
  name: string;
  town_hall: number;
  group: string;
  clan_tag?: string;
  clan_name?: string;
}

interface Roster {
  _id: string;
  alias: string;
  roster_type: string;
  clan_tag?: string;
  clan_name?: string;
  members: RosterMember[];
  groups: string[];
  created_at?: string;
  server_id: number;
}

interface RostersListResponse {
  rosters: Roster[];
  count: number;
}

export default function RostersPage() {
  const params = useParams();
  const guildId = params?.guildId as string;

  const [loading, setLoading] = useState(true);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<Roster | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // New roster form state
  const [newRosterName, setNewRosterName] = useState("");
  const [newRosterType, setNewRosterType] = useState("clan");
  const [newRosterClanTag, setNewRosterClanTag] = useState("");

  // Fetch rosters
  useEffect(() => {
    const fetchRosters = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v2/roster/${guildId}/list`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch rosters');
        }

        const data: RostersListResponse = await response.json();
        setRosters(data.rosters || []);
      } catch (error) {
        console.error('Error fetching rosters:', error);
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchRosters();
    }
  }, [guildId]);

  const handleCreateRoster = async () => {
    setCreating(true);
    try {
      const rosterData = {
        alias: newRosterName,
        roster_type: newRosterType,
        clan_tag: newRosterType === 'clan' ? newRosterClanTag : undefined,
        groups: ["Main", "Benched", "Substitutes"]
      };

      const response = await fetch(`/api/v2/roster?server_id=${guildId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(rosterData)
      });

      if (!response.ok) {
        throw new Error('Failed to create roster');
      }

      // Refresh rosters list
      const refreshResponse = await fetch(`/api/v2/roster/${guildId}/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (refreshResponse.ok) {
        const data: RostersListResponse = await refreshResponse.json();
        setRosters(data.rosters || []);
      }

      setCreateDialogOpen(false);
      setNewRosterName("");
      setNewRosterClanTag("");
      setNewRosterType("clan");
    } catch (error) {
      console.error('Error creating roster:', error);
      alert('Failed to create roster. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRoster = async (rosterId: string) => {
    setDeleting(rosterId);
    try {
      const response = await fetch(`/api/v2/roster/${rosterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete roster');
      }

      // Refresh rosters list
      const refreshResponse = await fetch(`/api/v2/roster/${guildId}/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (refreshResponse.ok) {
        const data: RostersListResponse = await refreshResponse.json();
        setRosters(data.rosters || []);
      }

      if (selectedRoster?._id === rosterId) {
        setDetailsDialogOpen(false);
        setSelectedRoster(null);
      }
    } catch (error) {
      console.error('Error deleting roster:', error);
      alert('Failed to delete roster. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleViewRoster = async (roster: Roster) => {
    // Fetch full roster details if needed
    try {
      const response = await fetch(`/api/v2/roster/${roster._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const fullRoster = await response.json();
        setSelectedRoster(fullRoster);
        setDetailsDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching roster details:', error);
      setSelectedRoster(roster);
      setDetailsDialogOpen(true);
    }
  };

  // Group members by their group assignment
  const getMembersByGroup = (roster: Roster) => {
    const grouped: Record<string, RosterMember[]> = {};

    roster.members?.forEach(member => {
      const group = member.group || "Unassigned";
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(member);
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Rosters & Lineups</h1>
          <p className="text-muted-foreground">
            Manage war rosters, lineups, and member assignments
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Create Roster
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create New Roster</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Create a new war roster or lineup for your server
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roster-name" className="text-foreground">Roster Name</Label>
                <Input
                  id="roster-name"
                  placeholder="e.g., CWL Main, War Team A"
                  value={newRosterName}
                  onChange={(e) => setNewRosterName(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roster-type" className="text-foreground">Roster Type</Label>
                <Select value={newRosterType} onValueChange={setNewRosterType}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="clan">Clan-Specific</SelectItem>
                    <SelectItem value="family">Family-Wide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newRosterType === 'clan' && (
                <div className="space-y-2">
                  <Label htmlFor="clan-tag" className="text-foreground">Clan Tag</Label>
                  <Input
                    id="clan-tag"
                    placeholder="#2PP"
                    value={newRosterClanTag}
                    onChange={(e) => setNewRosterClanTag(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRoster}
                disabled={creating || !newRosterName || (newRosterType === 'clan' && !newRosterClanTag)}
                className="bg-primary hover:bg-primary/90"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Roster'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Rosters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{rosters.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Members</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {rosters.reduce((sum, r) => sum + (r.members?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Clan Rosters</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {rosters.filter(r => r.roster_type === 'clan').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rosters List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">All Rosters</CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your war rosters and lineups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rosters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No rosters created yet</p>
              <p className="text-sm">Create your first roster to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rosters.map((roster) => (
                <Card key={roster._id} className="bg-secondary/50 border-border">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-foreground">{roster.alias}</CardTitle>
                        {roster.clan_name && (
                          <p className="text-sm text-muted-foreground mt-1">{roster.clan_name}</p>
                        )}
                      </div>
                      <Badge
                        variant={roster.roster_type === 'clan' ? 'default' : 'secondary'}
                        className="bg-primary/10 text-primary"
                      >
                        {roster.roster_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Members:</span>
                      <span className="font-semibold text-foreground">{roster.members?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Groups:</span>
                      <span className="font-semibold text-foreground">{roster.groups?.length || 0}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewRoster(roster)}
                        className="flex-1 border-border"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteRoster(roster._id)}
                        disabled={deleting === roster._id}
                      >
                        {deleting === roster._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roster Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selectedRoster?.alias}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedRoster?.clan_name && `${selectedRoster.clan_name} • `}
              {selectedRoster?.members?.length || 0} members
            </DialogDescription>
          </DialogHeader>

          {selectedRoster && (
            <div className="space-y-4">
              {Object.entries(getMembersByGroup(selectedRoster)).map(([group, members]) => (
                <div key={group} className="space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Badge variant="outline" className="border-primary text-primary">
                      {group}
                    </Badge>
                    <span className="text-sm text-muted-foreground">({members.length})</span>
                  </h3>
                  <div className="grid gap-2">
                    {members.map((member) => (
                      <div
                        key={member.tag}
                        className="flex items-center justify-between p-3 rounded bg-background border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{member.town_hall}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.tag}</p>
                          </div>
                        </div>
                        {member.clan_name && (
                          <Badge variant="secondary" className="bg-secondary text-foreground">
                            {member.clan_name}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {(!selectedRoster.members || selectedRoster.members.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No members in this roster yet</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
