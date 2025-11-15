"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Bell,
  MessageSquare,
  ChevronRight
} from "lucide-react";

// Mock data for clans
const initialClans = [
  {
    tag: "#CLAN123",
    name: "Elite Warriors",
    badge: "https://api-assets.clashofclans.com/badges/70/xxxx.png",
    level: 15,
    memberCount: 48,
    isConfigured: true,
  },
  {
    tag: "#CLAN456",
    name: "Training Ground",
    badge: "https://api-assets.clashofclans.com/badges/70/yyyy.png",
    level: 12,
    memberCount: 42,
    isConfigured: true,
  },
  {
    tag: "#CLAN789",
    name: "War Masters",
    badge: "https://api-assets.clashofclans.com/badges/70/zzzz.png",
    level: 18,
    memberCount: 50,
    isConfigured: false,
  },
];

// Mock data for Discord roles and channels
const mockRoles = [
  { id: "1", name: "@everyone" },
  { id: "2", name: "Members" },
  { id: "3", name: "Elder" },
  { id: "4", name: "Co-Leader" },
  { id: "5", name: "Leader" },
];

const mockChannels = [
  { id: "1", name: "general" },
  { id: "2", name: "clan-chat" },
  { id: "3", name: "war-room" },
  { id: "4", name: "logs" },
];

interface ClanSettings {
  // Roles
  memberRole: string;
  elderRole: string;
  coLeaderRole: string;
  leaderRole: string;

  // Channels
  clanChannel: string;
  logChannel: string;

  // Webhooks
  joinLeaveWebhook: string;
  donationWebhook: string;
  warWebhook: string;

  // Greeting
  greetingEnabled: boolean;
  greetingMessage: string;
  autoNickname: boolean;
}

export default function ClansPage() {
  const [clans, setClans] = useState(initialClans);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClanTag, setNewClanTag] = useState("");
  const [selectedClan, setSelectedClan] = useState<typeof initialClans[0] | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // Default settings for a clan
  const [clanSettings, setClanSettings] = useState<ClanSettings>({
    memberRole: "",
    elderRole: "",
    coLeaderRole: "",
    leaderRole: "",
    clanChannel: "",
    logChannel: "",
    joinLeaveWebhook: "",
    donationWebhook: "",
    warWebhook: "",
    greetingEnabled: false,
    greetingMessage: "Welcome {player} to {clan}!",
    autoNickname: false,
  });

  const handleAddClan = () => {
    if (newClanTag.trim()) {
      // In real implementation, this would call the API
      const newClan = {
        tag: newClanTag,
        name: "New Clan",
        badge: "https://api-assets.clashofclans.com/badges/70/default.png",
        level: 1,
        memberCount: 0,
        isConfigured: false,
      };
      setClans([...clans, newClan]);
      setNewClanTag("");
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteClan = (clanTag: string) => {
    setClans(clans.filter(clan => clan.tag !== clanTag));
  };

  const handleOpenSettings = (clan: typeof initialClans[0]) => {
    setSelectedClan(clan);
    setIsSettingsDialogOpen(true);
  };

  const handleSaveSettings = () => {
    // In real implementation, this would save to API
    setIsSettingsDialogOpen(false);
    setSelectedClan(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clan Management</h1>
            <p className="text-muted-foreground mt-1">
              Configure your clans and their Discord integration settings
            </p>
          </div>

          {/* Add Clan Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
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
                <Button className="bg-primary hover:bg-primary/90" onClick={handleAddClan}>
                  Add Clan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Clans Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clans.map((clan) => (
            <Card key={clan.tag} className="bg-card border-border hover:border-primary/50 transition-all duration-200 group">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 border-2 border-border">
                      <AvatarImage src={clan.badge} alt={clan.name} />
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
                    <div className="text-lg font-bold text-foreground">{clan.level}</div>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Members</div>
                    <div className="text-lg font-bold text-foreground flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {clan.memberCount}/50
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={clan.isConfigured ? "default" : "secondary"}
                    className={clan.isConfigured ? "bg-green-600 hover:bg-green-700" : "bg-secondary"}
                  >
                    {clan.isConfigured ? "Configured" : "Setup Required"}
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
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {clans.length === 0 && (
          <Card className="bg-card border-border border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-secondary p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No clans added yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Add your first clan to start managing Discord integrations
              </p>
              <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Clan
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Settings Dialog */}
        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedClan && (
                  <>
                    <Avatar className="h-10 w-10 border-2 border-border">
                      <AvatarImage src={selectedClan.badge} alt={selectedClan.name} />
                      <AvatarFallback>{selectedClan.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-lg font-bold">{selectedClan.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{selectedClan.tag}</div>
                    </div>
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Configure Discord integration settings for this clan
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="roles" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-secondary">
                <TabsTrigger value="roles" className="data-[state=active]:bg-primary">
                  <Shield className="h-4 w-4 mr-2" />
                  Roles
                </TabsTrigger>
                <TabsTrigger value="channels" className="data-[state=active]:bg-primary">
                  <Hash className="h-4 w-4 mr-2" />
                  Channels
                </TabsTrigger>
                <TabsTrigger value="webhooks" className="data-[state=active]:bg-primary">
                  <Bell className="h-4 w-4 mr-2" />
                  Webhooks
                </TabsTrigger>
                <TabsTrigger value="greeting" className="data-[state=active]:bg-primary">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Greeting
                </TabsTrigger>
              </TabsList>

              {/* Roles Tab */}
              <TabsContent value="roles" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="member-role">Member Role</Label>
                    <Select
                      value={clanSettings.memberRole}
                      onValueChange={(value) => setClanSettings({...clanSettings, memberRole: value})}
                    >
                      <SelectTrigger id="member-role" className="bg-secondary border-border">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Role assigned to clan members
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="elder-role">Elder Role</Label>
                    <Select
                      value={clanSettings.elderRole}
                      onValueChange={(value) => setClanSettings({...clanSettings, elderRole: value})}
                    >
                      <SelectTrigger id="elder-role" className="bg-secondary border-border">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Role assigned to clan elders
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coleader-role">Co-Leader Role</Label>
                    <Select
                      value={clanSettings.coLeaderRole}
                      onValueChange={(value) => setClanSettings({...clanSettings, coLeaderRole: value})}
                    >
                      <SelectTrigger id="coleader-role" className="bg-secondary border-border">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Role assigned to clan co-leaders
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leader-role">Leader Role</Label>
                    <Select
                      value={clanSettings.leaderRole}
                      onValueChange={(value) => setClanSettings({...clanSettings, leaderRole: value})}
                    >
                      <SelectTrigger id="leader-role" className="bg-secondary border-border">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Role assigned to the clan leader
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Channels Tab */}
              <TabsContent value="channels" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clan-channel">Clan Channel</Label>
                    <Select
                      value={clanSettings.clanChannel}
                      onValueChange={(value) => setClanSettings({...clanSettings, clanChannel: value})}
                    >
                      <SelectTrigger id="clan-channel" className="bg-secondary border-border">
                        <SelectValue placeholder="Select a channel" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockChannels.map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}>#{channel.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Main channel for clan discussions
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="log-channel">Log Channel</Label>
                    <Select
                      value={clanSettings.logChannel}
                      onValueChange={(value) => setClanSettings({...clanSettings, logChannel: value})}
                    >
                      <SelectTrigger id="log-channel" className="bg-secondary border-border">
                        <SelectValue placeholder="Select a channel" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockChannels.map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}>#{channel.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Channel for clan activity logs
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Webhooks Tab */}
              <TabsContent value="webhooks" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="join-leave-webhook">Join/Leave Webhook URL</Label>
                    <Input
                      id="join-leave-webhook"
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={clanSettings.joinLeaveWebhook}
                      onChange={(e) => setClanSettings({...clanSettings, joinLeaveWebhook: e.target.value})}
                      className="bg-secondary border-border font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Webhook for member join/leave notifications
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="donation-webhook">Donation Webhook URL</Label>
                    <Input
                      id="donation-webhook"
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={clanSettings.donationWebhook}
                      onChange={(e) => setClanSettings({...clanSettings, donationWebhook: e.target.value})}
                      className="bg-secondary border-border font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Webhook for donation tracking
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="war-webhook">War Webhook URL</Label>
                    <Input
                      id="war-webhook"
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={clanSettings.warWebhook}
                      onChange={(e) => setClanSettings({...clanSettings, warWebhook: e.target.value})}
                      className="bg-secondary border-border font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Webhook for war updates and results
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Greeting Tab */}
              <TabsContent value="greeting" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="greeting-enabled">Enable Greeting Messages</Label>
                      <p className="text-xs text-muted-foreground">
                        Send a welcome message when members join
                      </p>
                    </div>
                    <Switch
                      id="greeting-enabled"
                      checked={clanSettings.greetingEnabled}
                      onCheckedChange={(checked) => setClanSettings({...clanSettings, greetingEnabled: checked})}
                    />
                  </div>

                  {clanSettings.greetingEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="greeting-message">Greeting Message</Label>
                        <Input
                          id="greeting-message"
                          placeholder="Welcome {player} to {clan}!"
                          value={clanSettings.greetingMessage}
                          onChange={(e) => setClanSettings({...clanSettings, greetingMessage: e.target.value})}
                          className="bg-secondary border-border"
                        />
                        <p className="text-xs text-muted-foreground">
                          Available variables: {"{player}"}, {"{clan}"}, {"{tag}"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="auto-nickname">Auto Nickname</Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically set member nickname to their player name
                          </p>
                        </div>
                        <Switch
                          id="auto-nickname"
                          checked={clanSettings.autoNickname}
                          onCheckedChange={(checked) => setClanSettings({...clanSettings, autoNickname: checked})}
                        />
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveSettings}>
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
