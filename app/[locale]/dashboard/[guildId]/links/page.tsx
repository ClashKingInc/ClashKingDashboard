"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Trash2, User, Shield, CheckCircle, XCircle } from "lucide-react";
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

// Type definitions
interface LinkedAccount {
  player_tag: string;
  player_name: string | null;
  town_hall: number | null;
  is_verified: boolean;
  added_at: string | null;
}

interface MemberLinks {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  linked_accounts: LinkedAccount[];
  account_count: number;
}

interface ServerLinksResponse {
  members: MemberLinks[];
  total_members: number;
  members_with_links: number;
  total_linked_accounts: number;
  verified_accounts: number;
}

export default function LinksManagementPage() {
  const params = useParams();
  const guildId = params?.guildId as string;

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [linksData, setLinksData] = useState<ServerLinksResponse | null>(null);
  const [filteredMembers, setFilteredMembers] = useState<MemberLinks[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ userId: string; playerTag: string; playerName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch links data
  useEffect(() => {
    const fetchLinksData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v2/server/${guildId}/links?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch links data');
        }

        const data: ServerLinksResponse = await response.json();
        setLinksData(data);
        setFilteredMembers(data.members);
      } catch (error) {
        console.error('Error fetching links:', error);
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchLinksData();
    }
  }, [guildId]);

  // Filter members based on search query
  useEffect(() => {
    if (!linksData) return;

    if (!searchQuery.trim()) {
      setFilteredMembers(linksData.members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = linksData.members.filter(member =>
      member.username.toLowerCase().includes(query) ||
      member.display_name.toLowerCase().includes(query) ||
      member.linked_accounts.some(acc =>
        acc.player_name?.toLowerCase().includes(query) ||
        acc.player_tag.toLowerCase().includes(query)
      )
    );

    setFilteredMembers(filtered);
  }, [searchQuery, linksData]);

  const handleUnlinkAccount = async () => {
    if (!accountToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/v2/server/${guildId}/links/${accountToDelete.userId}/${accountToDelete.playerTag}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to unlink account');
      }

      // Refresh data
      const refreshResponse = await fetch(`/api/v2/server/${guildId}/links?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (refreshResponse.ok) {
        const data: ServerLinksResponse = await refreshResponse.json();
        setLinksData(data);
        setFilteredMembers(data.members);
      }

      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    } catch (error) {
      console.error('Error unlinking account:', error);
      alert('Failed to unlink account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (userId: string, playerTag: string, playerName: string) => {
    setAccountToDelete({ userId, playerTag, playerName });
    setDeleteDialogOpen(true);
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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Links Management</h1>
        <p className="text-muted-foreground">
          Manage Discord member account links and verify player ownership
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Members</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{linksData?.total_members || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Members with Links</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{linksData?.members_with_links || 0}</div>
            <p className="text-xs text-muted-foreground">
              {linksData?.total_members ? Math.round((linksData.members_with_links / linksData.total_members) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Linked Accounts</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{linksData?.total_linked_accounts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {linksData?.members_with_links ? (linksData.total_linked_accounts / linksData.members_with_links).toFixed(1) : 0} per member
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Verified Accounts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{linksData?.verified_accounts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {linksData?.total_linked_accounts ? Math.round((linksData.verified_accounts / linksData.total_linked_accounts) * 100) : 0}% verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by member name, username, player name, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Server Members ({filteredMembers.length})</CardTitle>
          <CardDescription className="text-muted-foreground">
            Showing members {searchQuery ? 'matching search criteria' : 'with linked accounts first'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No members found matching your search.' : 'No members with linked accounts.'}
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.user_id}
                  className="border border-border rounded-lg p-4 bg-secondary/50 space-y-3"
                >
                  {/* Member Header */}
                  <div className="flex items-center gap-3">
                    {member.avatar_url && (
                      <img
                        src={member.avatar_url}
                        alt={member.display_name}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{member.display_name}</h3>
                      <p className="text-sm text-muted-foreground">@{member.username}</p>
                    </div>
                    <Badge variant={member.account_count > 0 ? "default" : "secondary"} className="bg-primary text-primary-foreground">
                      {member.account_count} {member.account_count === 1 ? 'account' : 'accounts'}
                    </Badge>
                  </div>

                  {/* Linked Accounts */}
                  {member.linked_accounts.length > 0 && (
                    <div className="pl-4 space-y-2 border-l-2 border-primary/20">
                      {member.linked_accounts.map((account) => (
                        <div
                          key={account.player_tag}
                          className="flex items-center justify-between gap-2 p-2 rounded bg-background/50"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {account.town_hall && (
                              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">{account.town_hall}</span>
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {account.player_name || account.player_tag}
                                </span>
                                {account.is_verified ? (
                                  <Badge variant="default" className="bg-green-600 text-white">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-yellow-600 text-white">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Unverified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{account.player_tag}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openDeleteDialog(member.user_id, account.player_tag, account.player_name || account.player_tag)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Unlink Account</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to unlink <strong>{accountToDelete?.playerName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkAccount}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Unlinking...
                </>
              ) : (
                'Unlink'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
