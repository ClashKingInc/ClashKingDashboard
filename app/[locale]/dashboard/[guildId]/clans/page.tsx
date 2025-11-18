"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Plus,
  Users,
  Trash2,
  Hash,
  Shield,
  Loader2,
  AlertCircle,
  Save
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Types based on ClashKingAPI models
interface MemberCountWarning {
  channel?: number | null;
  above?: number | null;
  below?: number | null;
  role?: number | null;
}

interface LogButtonSettings {
  profile_button?: boolean | null;
  strike_button?: boolean | null;
  ban_button?: boolean | null;
}

interface ClanLogSettings {
  join_log?: LogButtonSettings | null;
  leave_log?: LogButtonSettings | null;
}

interface ClanSettings {
  generalRole?: number | null;
  leaderRole?: number | null;
  clanChannel?: number | null;
  category?: string | null;
  abbreviation?: string | null;
  greeting?: string | null;
  auto_greet_option?: string | null;
  leadership_eval?: boolean | null;
  warCountdown?: number | null;
  warTimerCountdown?: number | null;
  ban_alert_channel?: number | null;
  member_count_warning?: MemberCountWarning | null;
  logs?: ClanLogSettings | null;
}

interface Clan {
  tag: string;
  name: string;
  badge_url?: string | null;
  level?: number | null;
  member_count?: number | null;
  settings: ClanSettings;
}

interface Channel {
  id: string;
  name: string;
}

export default function ClansPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params.guildId as string;
  const t = useTranslations("ClansPage");
  const tCommon = useTranslations("Common");

  const [clans, setClans] = useState<Clan[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClanTag, setNewClanTag] = useState("");
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [clanSettings, setClanSettings] = useState<ClanSettings>({});

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push("/login");
          return;
        }

        // Fetch clans and channels in parallel
        const [clansRes, channelsRes] = await Promise.all([
          fetch(`/api/v2/server/${guildId}/clans`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`/api/v2/server/${guildId}/channels`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
        ]);

        if (!clansRes.ok) {
          if (clansRes.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            router.push("/login");
            return;
          }
          throw new Error(`Failed to fetch clans: ${clansRes.statusText}`);
        }

        const clansData = await clansRes.json();
        setClans(clansData || []);

        if (channelsRes.ok) {
          const channelsData = await channelsRes.json();
          setChannels(channelsData || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load clans");
        toast({
          title: "Error",
          description: "Failed to load clans. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  // Add clan
  const handleAddClan = async () => {
    if (!newClanTag.trim()) {
      toast({
        title: "Error",
        description: "Please enter a clan tag",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const accessToken = localStorage.getItem("access_token");

      const response = await fetch(`/api/v2/server/${guildId}/clans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tag: newClanTag }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add clan');
      }

      toast({
        title: "Success",
        description: "Clan added successfully",
      });

      // Refresh clans list
      const clansRes = await fetch(`/api/v2/server/${guildId}/clans`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (clansRes.ok) {
        const clansData = await clansRes.json();
        setClans(clansData || []);
      }

      setNewClanTag("");
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error("Error adding clan:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add clan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete clan
  const handleDeleteClan = async (clanTag: string) => {
    if (!confirm(`Are you sure you want to remove ${clanTag}? This will also delete all associated reminders and logs.`)) {
      return;
    }

    try {
      setSaving(true);
      const accessToken = localStorage.getItem("access_token");
      const encodedTag = encodeURIComponent(clanTag);

      const response = await fetch(`/api/v2/server/${guildId}/clan/${encodedTag}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete clan');
      }

      toast({
        title: "Success",
        description: "Clan removed successfully",
      });

      // Refresh clans list
      const clansRes = await fetch(`/api/v2/server/${guildId}/clans`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (clansRes.ok) {
        const clansData = await clansRes.json();
        setClans(clansData || []);
      }
    } catch (err) {
      console.error("Error deleting clan:", err);
      toast({
        title: "Error",
        description: "Failed to delete clan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Open settings dialog
  const handleOpenSettings = async (clan: Clan) => {
    setSelectedClan(clan);
    setClanSettings(clan.settings || {});
    setIsSettingsDialogOpen(true);
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!selectedClan) return;

    try {
      setSaving(true);
      const accessToken = localStorage.getItem("access_token");
      const encodedTag = encodeURIComponent(selectedClan.tag);

      const response = await fetch(
        `/api/v2/server/${guildId}/clan/${encodedTag}/settings`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clanSettings),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });

      // Refresh clans list
      const clansRes = await fetch(`/api/v2/server/${guildId}/clans`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (clansRes.ok) {
        const clansData = await clansRes.json();
        setClans(clansData || []);
      }

      setIsSettingsDialogOpen(false);
      setSelectedClan(null);
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Error</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalMembers = clans.reduce((sum, clan) => sum + (clan.member_count || 0), 0);
  const configuredClans = clans.filter(c =>
    c.settings?.clanChannel || c.settings?.generalRole
  ).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Clan Management</h1>
              <p className="text-muted-foreground mt-1">
                Configure your clans and their Discord integration settings
              </p>
            </div>
          </div>

          {/* Add Clan Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                <Plus className="h-4 w-4" />
                Add Clan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Clan</DialogTitle>
                <DialogDescription>
                  Enter your clan tag to add it to this server
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="clan-tag">Clan Tag</Label>
                  <Input
                    id="clan-tag"
                    placeholder="#YOURCLAN"
                    value={newClanTag}
                    onChange={(e) => setNewClanTag(e.target.value)}
                    className="bg-secondary border-border"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddClan()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include the # symbol at the start
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleAddClan}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Clan'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-card border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Clans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-blue-500">{clans.length}</div>
                <Shield className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Registered clans
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Configured</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-500">{configuredClans}</div>
                <Settings className="h-8 w-8 text-green-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                With settings configured
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-purple-500">{totalMembers}</div>
                <Users className="h-8 w-8 text-purple-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Across all clans
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-yellow-500">{channels.length}</div>
                <Hash className="h-8 w-8 text-yellow-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Available channels
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Clans Grid */}
        {clans.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Clans Yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first clan
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Clan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clans.map((clan) => {
              const isConfigured = !!(clan.settings?.clanChannel || clan.settings?.generalRole);

              return (
                <Card key={clan.tag} className="bg-card border-border hover:border-primary/50 transition-all duration-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14 border-2 border-border">
                          <AvatarImage src={clan.badge_url || ''} alt={clan.name} />
                          <AvatarFallback className="bg-secondary text-foreground">
                            {clan.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg font-bold text-foreground">
                            {clan.name}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground font-mono text-xs">
                            {clan.tag}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Clan Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Level</div>
                        <div className="text-lg font-bold text-foreground">{clan.level || 'N/A'}</div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Members</div>
                        <div className="text-lg font-bold text-foreground flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {clan.member_count || 0}/50
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge
                        variant={isConfigured ? "default" : "secondary"}
                        className={isConfigured ? "bg-green-600 hover:bg-green-700" : "bg-secondary"}
                      >
                        {isConfigured ? "Configured" : "Setup Required"}
                      </Badge>
                    </div>

                    <Separator className="bg-border" />

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-border hover:border-primary hover:bg-primary/10"
                        onClick={() => handleOpenSettings(clan)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-border hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteClan(clan.tag)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Settings Dialog */}
        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Configure {selectedClan?.name} ({selectedClan?.tag})
              </DialogTitle>
              <DialogDescription>
                Customize Discord integration settings for this clan
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="war">War Settings</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Member Role</Label>
                    <Input
                      placeholder="Role ID"
                      value={clanSettings?.generalRole || ''}
                      onChange={(e) => setClanSettings({...clanSettings, generalRole: e.target.value || null})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Leader Role</Label>
                    <Input
                      placeholder="Role ID"
                      value={clanSettings?.leaderRole || ''}
                      onChange={(e) => setClanSettings({...clanSettings, leaderRole: e.target.value || null})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Clan Channel</Label>
                    <Select
                      value={clanSettings.clanChannel?.toString() || 'none'}
                      onValueChange={(value) => setClanSettings({...clanSettings, clanChannel: value === 'none' ? null : value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {channels.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Clan Abbreviation</Label>
                    <Input
                      placeholder="e.g., CK"
                      value={clanSettings?.abbreviation || ''}
                      onChange={(e) => setClanSettings({...clanSettings, abbreviation: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Greeting Message</Label>
                    <Input
                      placeholder="Welcome {player} to {clan}!"
                      value={clanSettings?.greeting || ''}
                      onChange={(e) => setClanSettings({...clanSettings, greeting: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="space-y-0.5">
                      <Label>Leadership Eval</Label>
                      <p className="text-sm text-muted-foreground">
                        Auto-assign leadership roles
                      </p>
                    </div>
                    <Switch
                      checked={clanSettings?.leadership_eval || false}
                      onCheckedChange={(checked) => setClanSettings({...clanSettings, leadership_eval: checked})}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="war" className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>War Countdown Channel</Label>
                    <Select
                      value={clanSettings.warCountdown?.toString() || 'none'}
                      onValueChange={(value) => setClanSettings({...clanSettings, warCountdown: value === 'none' ? null : value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {channels.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>War Timer Countdown</Label>
                    <Select
                      value={clanSettings.warTimerCountdown?.toString() || 'none'}
                      onValueChange={(value) => setClanSettings({...clanSettings, warTimerCountdown: value === 'none' ? null : value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {channels.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Ban Alert Channel</Label>
                    <Select
                      value={clanSettings.ban_alert_channel?.toString() || 'none'}
                      onValueChange={(value) => setClanSettings({...clanSettings, ban_alert_channel: value === 'none' ? null : value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {channels.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      placeholder="Category name"
                      value={clanSettings?.category || ''}
                      onChange={(e) => setClanSettings({...clanSettings, category: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Auto Greet Option</Label>
                    <Select
                      value={clanSettings?.auto_greet_option || 'Never'}
                      onValueChange={(value) => setClanSettings({...clanSettings, auto_greet_option: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Never">Never</SelectItem>
                        <SelectItem value="Always">Always</SelectItem>
                        <SelectItem value="On Join">On Join</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
