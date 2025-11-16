"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Users,
  Gift,
  Swords,
  Castle,
  TrendingUp,
  Trophy,
  Ban,
  AlertTriangle,
  Activity,
  Bell,
  Hash,
  MessageSquare,
  Eye,
  Settings,
  Loader2,
} from "lucide-react";
import { createApiClient } from "@/lib/api";

interface LogConfig {
  enabled: boolean;
  channel: string;
  thread?: string;
  includeButtons?: boolean;
  pingRole?: string;
  clans?: string[];
}

interface Channel {
  id: string;
  name: string;
}

interface Clan {
  tag: string;
  name: string;
}

export default function LogsPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [joinLeaveLog, setJoinLeaveLog] = useState<LogConfig>({
    enabled: false,
    channel: "",
    includeButtons: false,
    clans: [],
  });

  const [donationLog, setDonationLog] = useState<LogConfig>({
    enabled: false,
    channel: "",
    clans: [],
  });

  const [warLog, setWarLog] = useState<LogConfig>({
    enabled: false,
    channel: "",
    clans: [],
  });

  const [capitalDonationLog, setCapitalDonationLog] = useState<LogConfig>({
    enabled: false,
    channel: "",
    clans: [],
  });

  const [capitalRaidLog, setCapitalRaidLog] = useState<LogConfig>({
    enabled: false,
    channel: "",
    clans: [],
  });

  const [playerUpgradeLog, setPlayerUpgradeLog] = useState<LogConfig>({
    enabled: false,
    channel: "",
    includeButtons: false,
    clans: [],
  });

  const [legendLog, setLegendLog] = useState<LogConfig>({
    enabled: false,
    channel: "",
    clans: [],
  });

  const [banLog, setBanLog] = useState<LogConfig>({
    enabled: false,
    channel: "",
    pingRole: "",
    clans: [],
  });

  const [strikeLog, setStrikeLog] = useState<LogConfig>({
    enabled: false,
    channel: "",
    clans: [],
  });

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const api = createApiClient();

        // Fetch channels and logs config
        const [channelsRes, logsRes] = await Promise.all([
          api.server.getChannels(Number(guildId)),
          api.server.getLogsConfig(Number(guildId)),
        ]);

        if (channelsRes.data) {
          setChannels(channelsRes.data);
        }

        if (logsRes.data) {
          // Map API response to state (API uses snake_case)
          const config = logsRes.data;
          if (config.join_leave_log) setJoinLeaveLog(config.join_leave_log);
          if (config.donation_log) setDonationLog(config.donation_log);
          if (config.war_log) setWarLog(config.war_log);
          if (config.capital_donation_log) setCapitalDonationLog(config.capital_donation_log);
          if (config.capital_raid_log) setCapitalRaidLog(config.capital_raid_log);
          if (config.player_upgrade_log) setPlayerUpgradeLog(config.player_upgrade_log);
          if (config.legend_log) setLegendLog(config.legend_log);
          if (config.ban_log) setBanLog(config.ban_log);
          if (config.strike_log) setStrikeLog(config.strike_log);
        }
      } catch (error) {
        console.error("Failed to fetch logs data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
  }, [guildId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const api = createApiClient();

      const logsConfig = {
        join_leave_log: joinLeaveLog,
        donation_log: donationLog,
        war_log: warLog,
        capital_donation_log: capitalDonationLog,
        capital_raid_log: capitalRaidLog,
        player_upgrade_log: playerUpgradeLog,
        legend_log: legendLog,
        ban_log: banLog,
        strike_log: strikeLog,
      };

      await api.server.saveLogsConfig(Number(guildId), logsConfig);

      // Show success message (you can add toast notification here)
      console.log("Logs configuration saved successfully");
    } catch (error) {
      console.error("Failed to save logs configuration:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleClan = (config: LogConfig, setConfig: (config: LogConfig) => void, clanTag: string) => {
    const clans = config.clans || [];
    const newClans = clans.includes(clanTag)
      ? clans.filter(tag => tag !== clanTag)
      : [...clans, clanTag];
    setConfig({ ...config, clans: newClans });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading logs configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>
                <p className="text-muted-foreground mt-1">
                  Configure automatic logging for clan and player activities
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Preview Logs
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Settings className="mr-2 h-4 w-4" />
                  Save All Settings
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-card border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-blue-500">
                  {[joinLeaveLog, donationLog, warLog, capitalDonationLog, capitalRaidLog, playerUpgradeLog, legendLog, banLog, strikeLog].filter(log => log.enabled).length}
                </div>
                <Activity className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Out of 9 log types
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Log Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-500">{channels.length}</div>
                <Hash className="h-8 w-8 text-green-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Available channels
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tracked Clans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-yellow-500">{clans.length}</div>
                <Users className="h-8 w-8 text-yellow-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Configured clans
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-purple-500">
                  {saving ? <Loader2 className="h-8 w-8 animate-spin" /> : <Bell className="h-8 w-8" />}
                </div>
                <Bell className="h-8 w-8 text-purple-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {saving ? "Saving..." : "Ready to save"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="clan" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="clan">
              <Castle className="mr-2 h-4 w-4" />
              Clan Logs
            </TabsTrigger>
            <TabsTrigger value="player">
              <Users className="mr-2 h-4 w-4" />
              Player Logs
            </TabsTrigger>
            <TabsTrigger value="moderation">
              <Ban className="mr-2 h-4 w-4" />
              Moderation
            </TabsTrigger>
          </TabsList>

          {/* CLAN LOGS TAB */}
          <TabsContent value="clan" className="space-y-6">
            {/* Join/Leave Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    <div>
                      <CardTitle className="text-foreground">Join/Leave Logs</CardTitle>
                      <CardDescription>
                        Track members joining and leaving your clans
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={joinLeaveLog.enabled}
                    onCheckedChange={(checked) => setJoinLeaveLog({ ...joinLeaveLog, enabled: checked })}
                  />
                </div>
              </CardHeader>
              {joinLeaveLog.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="jl-channel">Log Channel</Label>
                      <Select value={joinLeaveLog.channel} onValueChange={(value) => setJoinLeaveLog({ ...joinLeaveLog, channel: value })}>
                        <SelectTrigger id="jl-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map(ch => (
                            <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jl-thread">Thread (Optional)</Label>
                      <Input
                        id="jl-thread"
                        placeholder="Thread ID or name"
                        value={joinLeaveLog.thread || ""}
                        onChange={(e) => setJoinLeaveLog({ ...joinLeaveLog, thread: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="space-y-0.5">
                      <Label>Include Action Buttons</Label>
                      <p className="text-xs text-muted-foreground">
                        Add ban/strike buttons on leave messages
                      </p>
                    </div>
                    <Switch
                      checked={joinLeaveLog.includeButtons}
                      onCheckedChange={(checked) => setJoinLeaveLog({ ...joinLeaveLog, includeButtons: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Active Clans</Label>
                    <div className="flex flex-wrap gap-2">
                      {clans.map(clan => (
                        <Badge
                          key={clan.tag}
                          variant={joinLeaveLog.clans?.includes(clan.tag) ? "default" : "outline"}
                          className={`cursor-pointer ${joinLeaveLog.clans?.includes(clan.tag) ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}
                          onClick={() => handleToggleClan(joinLeaveLog, setJoinLeaveLog, clan.tag)}
                        >
                          {clan.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click to toggle which clans trigger this log
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Donation Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-purple-500" />
                    <div>
                      <CardTitle>Donation Logs</CardTitle>
                      <CardDescription>
                        Track troop donations and requests
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={donationLog.enabled}
                    onCheckedChange={(checked) => setDonationLog({ ...donationLog, enabled: checked })}
                  />
                </div>
              </CardHeader>
              {donationLog.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dono-channel">Log Channel</Label>
                      <Select value={donationLog.channel} onValueChange={(value) => setDonationLog({ ...donationLog, channel: value })}>
                        <SelectTrigger id="dono-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map(ch => (
                            <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dono-thread">Thread (Optional)</Label>
                      <Input
                        id="dono-thread"
                        placeholder="Thread ID or name"
                        value={donationLog.thread || ""}
                        onChange={(e) => setDonationLog({ ...donationLog, thread: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Active Clans</Label>
                    <div className="flex flex-wrap gap-2">
                      {clans.map(clan => (
                        <Badge
                          key={clan.tag}
                          variant={donationLog.clans?.includes(clan.tag) ? "default" : "outline"}
                          className={`cursor-pointer ${donationLog.clans?.includes(clan.tag) ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}
                          onClick={() => handleToggleClan(donationLog, setDonationLog, clan.tag)}
                        >
                          {clan.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* War Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-red-500" />
                    <div>
                      <CardTitle>War Attack Logs</CardTitle>
                      <CardDescription>
                        Log attacks and defenses during wars
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={warLog.enabled}
                    onCheckedChange={(checked) => setWarLog({ ...warLog, enabled: checked })}
                  />
                </div>
              </CardHeader>
              {warLog.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="war-channel">Log Channel</Label>
                      <Select value={warLog.channel} onValueChange={(value) => setWarLog({ ...warLog, channel: value })}>
                        <SelectTrigger id="war-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map(ch => (
                            <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="war-thread">Thread (Optional)</Label>
                      <Input
                        id="war-thread"
                        placeholder="Thread ID or name"
                        value={warLog.thread || ""}
                        onChange={(e) => setWarLog({ ...warLog, thread: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Active Clans</Label>
                    <div className="flex flex-wrap gap-2">
                      {clans.map(clan => (
                        <Badge
                          key={clan.tag}
                          variant={warLog.clans?.includes(clan.tag) ? "default" : "outline"}
                          className={`cursor-pointer ${warLog.clans?.includes(clan.tag) ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}
                          onClick={() => handleToggleClan(warLog, setWarLog, clan.tag)}
                        >
                          {clan.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Capital Donation Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Castle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <CardTitle>Capital Donation Logs</CardTitle>
                      <CardDescription>
                        Track capital gold donations
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={capitalDonationLog.enabled}
                    onCheckedChange={(checked) => setCapitalDonationLog({ ...capitalDonationLog, enabled: checked })}
                  />
                </div>
              </CardHeader>
              {capitalDonationLog.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cap-dono-channel">Log Channel</Label>
                      <Select value={capitalDonationLog.channel} onValueChange={(value) => setCapitalDonationLog({ ...capitalDonationLog, channel: value })}>
                        <SelectTrigger id="cap-dono-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map(ch => (
                            <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cap-dono-thread">Thread (Optional)</Label>
                      <Input
                        id="cap-dono-thread"
                        placeholder="Thread ID or name"
                        value={capitalDonationLog.thread || ""}
                        onChange={(e) => setCapitalDonationLog({ ...capitalDonationLog, thread: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Active Clans</Label>
                    <div className="flex flex-wrap gap-2">
                      {clans.map(clan => (
                        <Badge
                          key={clan.tag}
                          variant={capitalDonationLog.clans?.includes(clan.tag) ? "default" : "outline"}
                          className={`cursor-pointer ${capitalDonationLog.clans?.includes(clan.tag) ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}
                          onClick={() => handleToggleClan(capitalDonationLog, setCapitalDonationLog, clan.tag)}
                        >
                          {clan.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Capital Raid Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-orange-500" />
                    <div>
                      <CardTitle>Capital Raid Logs</CardTitle>
                      <CardDescription>
                        Track raid weekend attacks
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={capitalRaidLog.enabled}
                    onCheckedChange={(checked) => setCapitalRaidLog({ ...capitalRaidLog, enabled: checked })}
                  />
                </div>
              </CardHeader>
              {capitalRaidLog.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cap-raid-channel">Log Channel</Label>
                      <Select value={capitalRaidLog.channel} onValueChange={(value) => setCapitalRaidLog({ ...capitalRaidLog, channel: value })}>
                        <SelectTrigger id="cap-raid-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map(ch => (
                            <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cap-raid-thread">Thread (Optional)</Label>
                      <Input
                        id="cap-raid-thread"
                        placeholder="Thread ID or name"
                        value={capitalRaidLog.thread || ""}
                        onChange={(e) => setCapitalRaidLog({ ...capitalRaidLog, thread: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Active Clans</Label>
                    <div className="flex flex-wrap gap-2">
                      {clans.map(clan => (
                        <Badge
                          key={clan.tag}
                          variant={capitalRaidLog.clans?.includes(clan.tag) ? "default" : "outline"}
                          className={`cursor-pointer ${capitalRaidLog.clans?.includes(clan.tag) ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}
                          onClick={() => handleToggleClan(capitalRaidLog, setCapitalRaidLog, clan.tag)}
                        >
                          {clan.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* PLAYER LOGS TAB */}
          <TabsContent value="player" className="space-y-6">
            {/* Player Upgrade Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <div>
                      <CardTitle>Player Upgrade Logs</CardTitle>
                      <CardDescription>
                        Track Town Hall, hero, and troop upgrades
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={playerUpgradeLog.enabled}
                    onCheckedChange={(checked) => setPlayerUpgradeLog({ ...playerUpgradeLog, enabled: checked })}
                  />
                </div>
              </CardHeader>
              {playerUpgradeLog.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="upgrade-channel">Log Channel</Label>
                      <Select value={playerUpgradeLog.channel} onValueChange={(value) => setPlayerUpgradeLog({ ...playerUpgradeLog, channel: value })}>
                        <SelectTrigger id="upgrade-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map(ch => (
                            <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="upgrade-thread">Thread (Optional)</Label>
                      <Input
                        id="upgrade-thread"
                        placeholder="Thread ID or name"
                        value={playerUpgradeLog.thread || ""}
                        onChange={(e) => setPlayerUpgradeLog({ ...playerUpgradeLog, thread: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-200">Tracked Upgrades</p>
                        <p className="text-xs text-blue-300/80">
                          • Town Hall levels • Hero levels • Troop levels • Pet levels • Spell levels
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Filter by Clan (Optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="cursor-pointer">
                        All Players
                      </Badge>
                      {mockClans.map(clan => (
                        <Badge
                          key={clan.tag}
                          variant={playerUpgradeLog.clans?.includes(clan.tag) ? "default" : "outline"}
                          className={`cursor-pointer ${playerUpgradeLog.clans?.includes(clan.tag) ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}
                          onClick={() => handleToggleClan(playerUpgradeLog, setPlayerUpgradeLog, clan.tag)}
                        >
                          {clan.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to track all linked players
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Legend Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <div>
                      <CardTitle>Legend League Logs</CardTitle>
                      <CardDescription>
                        Track Legend League attacks and trophy changes
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={legendLog.enabled}
                    onCheckedChange={(checked) => setLegendLog({ ...legendLog, enabled: checked })}
                  />
                </div>
              </CardHeader>
              {legendLog.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="legend-channel">Log Channel</Label>
                      <Select value={legendLog.channel} onValueChange={(value) => setLegendLog({ ...legendLog, channel: value })}>
                        <SelectTrigger id="legend-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map(ch => (
                            <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="legend-thread">Thread (Optional)</Label>
                      <Input
                        id="legend-thread"
                        placeholder="Thread ID or name"
                        value={legendLog.thread || ""}
                        onChange={(e) => setLegendLog({ ...legendLog, thread: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-yellow-200">Legend League Tracking</p>
                        <p className="text-xs text-yellow-300/80">
                          Logs will show attacks, defenses, and trophy changes for players in Legend League
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* MODERATION LOGS TAB */}
          <TabsContent value="moderation" className="space-y-6">
            {/* Ban Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-red-500" />
                    <div>
                      <CardTitle>Ban Logs</CardTitle>
                      <CardDescription>
                        Track player bans and ban list changes
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={banLog.enabled}
                    onCheckedChange={(checked) => setBanLog({ ...banLog, enabled: checked })}
                  />
                </div>
              </CardHeader>
              {banLog.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ban-channel">Log Channel</Label>
                      <Select value={banLog.channel} onValueChange={(value) => setBanLog({ ...banLog, channel: value })}>
                        <SelectTrigger id="ban-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map(ch => (
                            <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ban-ping">Ping Role (Optional)</Label>
                      <Input
                        id="ban-ping"
                        placeholder="@Moderators"
                        value={banLog.pingRole || ""}
                        onChange={(e) => setBanLog({ ...banLog, pingRole: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-start gap-2">
                      <Ban className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-red-200">Ban Tracking</p>
                        <p className="text-xs text-red-300/80">
                          Logs when players are added/removed from ban list and when banned players try to join clans
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Strike Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <div>
                      <CardTitle>Strike Logs</CardTitle>
                      <CardDescription>
                        Track strikes and warnings issued to players
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={strikeLog.enabled}
                    onCheckedChange={(checked) => setStrikeLog({ ...strikeLog, enabled: checked })}
                  />
                </div>
              </CardHeader>
              {strikeLog.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="strike-channel">Log Channel</Label>
                      <Select value={strikeLog.channel} onValueChange={(value) => setStrikeLog({ ...strikeLog, channel: value })}>
                        <SelectTrigger id="strike-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map(ch => (
                            <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="strike-thread">Thread (Optional)</Label>
                      <Input
                        id="strike-thread"
                        placeholder="Thread ID or name"
                        value={strikeLog.thread || ""}
                        onChange={(e) => setStrikeLog({ ...strikeLog, thread: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-orange-200">Strike System</p>
                        <p className="text-xs text-orange-300/80">
                          Logs when strikes are issued, updated, or removed. Helps maintain accountability.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="mt-8 bg-card border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-foreground">About Activity Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Webhooks:</strong> Logs use webhooks for efficient message delivery. ClashKing will create webhooks automatically in your selected channels.
            </p>
            <p>
              <strong className="text-foreground">Threads:</strong> Optionally post logs to specific threads to keep channels organized.
            </p>
            <p>
              <strong className="text-foreground">Clan Filtering:</strong> Configure which clans trigger each log type. Leave empty to track all clans.
            </p>
            <p>
              <strong className="text-foreground">Performance:</strong> Logs are processed in real-time as events occur in Clash of Clans.
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4 mt-8">
          <Button variant="outline">Reset All Changes</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save All Log Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
