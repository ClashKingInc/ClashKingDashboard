"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Search,
  Trash2,
  User,
  Shield,
  CheckCircle,
  XCircle,
  Link,
  Download,
  Filter,
  BarChart3,
  Users,
  Settings,
  Clock,
  Plus
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  // Filter states
  const [filterVerified, setFilterVerified] = useState<"all" | "verified" | "unverified">("all");
  const [filterMinAccounts, setFilterMinAccounts] = useState<number>(0);

  // Bulk actions states
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);

  // Link account dialog states
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [newPlayerTag, setNewPlayerTag] = useState("");
  const [newApiToken, setNewApiToken] = useState("");
  const [linking, setLinking] = useState(false);

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

  // Filter members based on search query and filters
  useEffect(() => {
    if (!linksData) return;

    let filtered = linksData.members;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member =>
        member.username.toLowerCase().includes(query) ||
        member.display_name.toLowerCase().includes(query) ||
        member.linked_accounts.some(acc =>
          acc.player_name?.toLowerCase().includes(query) ||
          acc.player_tag.toLowerCase().includes(query)
        )
      );
    }

    // Verified filter
    if (filterVerified !== "all") {
      filtered = filtered.filter(member => {
        const hasVerified = member.linked_accounts.some(acc => acc.is_verified);
        const hasUnverified = member.linked_accounts.some(acc => !acc.is_verified);

        if (filterVerified === "verified") {
          return hasVerified;
        } else {
          return hasUnverified;
        }
      });
    }

    // Min accounts filter
    if (filterMinAccounts > 0) {
      filtered = filtered.filter(member => member.account_count >= filterMinAccounts);
    }

    setFilteredMembers(filtered);
  }, [searchQuery, linksData, filterVerified, filterMinAccounts]);

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

  const handleExportCSV = () => {
    if (!linksData) return;

    const csvContent = [
      ['User ID', 'Username', 'Display Name', 'Player Tag', 'Player Name', 'Town Hall', 'Verified', 'Added At'].join(','),
      ...linksData.members.flatMap(member =>
        member.linked_accounts.map(account =>
          [
            member.user_id,
            member.username,
            member.display_name,
            account.player_tag,
            account.player_name || '',
            account.town_hall || '',
            account.is_verified ? 'Yes' : 'No',
            account.added_at || ''
          ].join(',')
        )
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-${guildId}-links.csv`;
    a.click();
  };

  const handleExportJSON = () => {
    if (!linksData) return;

    const jsonContent = JSON.stringify(linksData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-${guildId}-links.json`;
    a.click();
  };

  const toggleMemberSelection = (userId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedMembers(newSelection);
  };

  const selectAll = () => {
    setSelectedMembers(new Set(filteredMembers.map(m => m.user_id)));
  };

  const deselectAll = () => {
    setSelectedMembers(new Set());
  };

  const handleBulkUnlink = async () => {
    // This would need a backend endpoint for bulk operations
    alert('Bulk unlink feature coming soon!');
    setBulkActionDialogOpen(false);
  };

  const pendingVerifications = linksData?.members.flatMap(member =>
    member.linked_accounts
      .filter(acc => !acc.is_verified)
      .map(acc => ({ ...acc, user: member }))
  ) || [];

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
            <Link className="h-4 w-4 text-muted-foreground" />
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

      {/* Main Content with Tabs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Account Links</CardTitle>
          <CardDescription className="text-muted-foreground">
            View and manage all Discord-Clash of Clans account links
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">
                <Users className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="pending">
                <Clock className="h-4 w-4 mr-2" />
                Pending ({pendingVerifications.length})
              </TabsTrigger>
              <TabsTrigger value="bulk">
                <Settings className="h-4 w-4 mr-2" />
                Bulk Actions
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-6">
              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by member name, username, player name, or tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background border-border text-foreground"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={filterVerified} onValueChange={(v: any) => setFilterVerified(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      <SelectItem value="verified">Verified Only</SelectItem>
                      <SelectItem value="unverified">Unverified Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterMinAccounts.toString()} onValueChange={(v) => setFilterMinAccounts(parseInt(v))}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Min accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Members</SelectItem>
                      <SelectItem value="1">1+ accounts</SelectItem>
                      <SelectItem value="2">2+ accounts</SelectItem>
                      <SelectItem value="3">3+ accounts</SelectItem>
                      <SelectItem value="5">5+ accounts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportJSON}>
                      <Download className="h-4 w-4 mr-2" />
                      Export JSON
                    </Button>
                  </div>
                </div>

                {filteredMembers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-border rounded-lg bg-secondary/20">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No members found</p>
                    <p className="text-sm">
                      {searchQuery ? 'Try adjusting your search or filters.' : 'No members with linked accounts.'}
                    </p>
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.user_id}
                      className="border border-border rounded-lg p-4 bg-secondary/50 space-y-3 hover:bg-secondary/70 transition-colors"
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
                              className="flex items-center justify-between gap-2 p-2 rounded bg-background/50 hover:bg-background transition-colors"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                {account.town_hall && (
                                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-bold text-primary">{account.town_hall}</span>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">
                                      {account.player_name || account.player_tag}
                                    </span>
                                    {account.is_verified ? (
                                      <Badge variant="default" className="bg-green-600 text-white text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Verified
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-yellow-600 text-white text-xs">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Unverified
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{account.player_tag}</p>
                                  {account.added_at && (
                                    <p className="text-xs text-muted-foreground">
                                      Added: {new Date(account.added_at).toLocaleDateString()}
                                    </p>
                                  )}
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
            </TabsContent>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Pending Verifications</h3>
                    <p className="text-sm text-muted-foreground">
                      {pendingVerifications.length} accounts awaiting verification
                    </p>
                  </div>
                </div>

                {pendingVerifications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-border rounded-lg bg-secondary/20">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                    <p className="text-lg font-medium">All accounts verified!</p>
                    <p className="text-sm">There are no pending verifications at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingVerifications.map((item) => (
                      <div
                        key={`${item.user.user_id}-${item.player_tag}`}
                        className="border border-yellow-500/30 rounded-lg p-4 bg-yellow-500/5 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {item.user.avatar_url && (
                                <img
                                  src={item.user.avatar_url}
                                  alt={item.user.display_name}
                                  className="w-6 h-6 rounded-full"
                                />
                              )}
                              <span className="font-medium text-foreground">{item.user.display_name}</span>
                              <span className="text-sm text-muted-foreground">@{item.user.username}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-8">
                              {item.town_hall && (
                                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                                  <span className="text-xs font-bold text-primary">{item.town_hall}</span>
                                </div>
                              )}
                              <span className="text-foreground">{item.player_name || item.player_tag}</span>
                              <span className="text-sm text-muted-foreground">{item.player_tag}</span>
                            </div>
                            {item.added_at && (
                              <p className="text-xs text-muted-foreground ml-8">
                                Linked: {new Date(item.added_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="bg-yellow-600 text-white">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Bulk Actions Tab */}
            <TabsContent value="bulk" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Bulk Actions</h3>
                  <p className="text-sm text-muted-foreground">
                    Perform actions on multiple members at once
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All ({filteredMembers.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedMembers.size === 0}
                    onClick={() => setBulkActionDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Unlink Selected ({selectedMembers.size})
                  </Button>
                </div>

                <div className="space-y-3">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.user_id}
                      className={`border rounded-lg p-4 transition-colors ${
                        selectedMembers.has(member.user_id)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-secondary/50 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedMembers.has(member.user_id)}
                          onCheckedChange={() => toggleMemberSelection(member.user_id)}
                        />
                        {member.avatar_url && (
                          <img
                            src={member.avatar_url}
                            alt={member.display_name}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{member.display_name}</span>
                            <span className="text-sm text-muted-foreground">@{member.username}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {member.account_count} linked {member.account_count === 1 ? 'account' : 'accounts'}
                          </p>
                        </div>
                        <Badge variant={member.account_count > 0 ? "default" : "secondary"}>
                          {member.account_count}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Link Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Overview of linking statistics and trends
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-secondary/50 border-border">
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground">Verification Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Verified</span>
                          <span className="text-foreground font-medium">{linksData?.verified_accounts || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Unverified</span>
                          <span className="text-foreground font-medium">
                            {(linksData?.total_linked_accounts || 0) - (linksData?.verified_accounts || 0)}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2.5 mt-2">
                          <div
                            className="bg-green-600 h-2.5 rounded-full"
                            style={{
                              width: `${linksData?.total_linked_accounts
                                ? (linksData.verified_accounts / linksData.total_linked_accounts) * 100
                                : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/50 border-border">
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground">Account Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">1 account</span>
                          <span className="text-foreground font-medium">
                            {linksData?.members.filter(m => m.account_count === 1).length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">2-3 accounts</span>
                          <span className="text-foreground font-medium">
                            {linksData?.members.filter(m => m.account_count >= 2 && m.account_count <= 3).length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">4+ accounts</span>
                          <span className="text-foreground font-medium">
                            {linksData?.members.filter(m => m.account_count >= 4).length || 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/50 border-border">
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground">Town Hall Levels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[17, 16, 15].map(th => {
                          const count = linksData?.members.flatMap(m => m.linked_accounts).filter(a => a.town_hall === th).length || 0;
                          return (
                            <div key={th} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">TH {th}</span>
                              <span className="text-foreground font-medium">{count}</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Other</span>
                          <span className="text-foreground font-medium">
                            {linksData?.members.flatMap(m => m.linked_accounts).filter(a => a.town_hall && a.town_hall < 15).length || 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/50 border-border">
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground">Coverage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Linked members</span>
                          <span className="text-foreground font-medium">
                            {linksData?.members_with_links || 0} / {linksData?.total_members || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Coverage rate</span>
                          <span className="text-foreground font-medium">
                            {linksData?.total_members
                              ? Math.round((linksData.members_with_links / linksData.total_members) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2.5 mt-2">
                          <div
                            className="bg-primary h-2.5 rounded-full"
                            style={{
                              width: `${linksData?.total_members
                                ? (linksData.members_with_links / linksData.total_members) * 100
                                : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-blue-500/5 border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="text-blue-400">Link Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-blue-300">
                    <p>
                      <strong>Average accounts per member:</strong>{' '}
                      {linksData?.members_with_links
                        ? (linksData.total_linked_accounts / linksData.members_with_links).toFixed(2)
                        : 0}
                    </p>
                    <p>
                      <strong>Most linked accounts:</strong>{' '}
                      {Math.max(...(linksData?.members.map(m => m.account_count) || [0]))}
                    </p>
                    <p>
                      <strong>Members without links:</strong>{' '}
                      {(linksData?.total_members || 0) - (linksData?.members_with_links || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
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

      {/* Bulk Action Dialog */}
      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Bulk Unlink Accounts</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to unlink all accounts for {selectedMembers.size} selected members? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkUnlink}
              className="bg-destructive hover:bg-destructive/90"
            >
              Unlink All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
