"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  Loader2,
} from "lucide-react";

interface Channel {
  id: string;
  name: string;
  type: string;
  parent_name?: string;
}

interface Thread {
  id: string;
  name: string;
  parent_channel_id: string;
  parent_channel_name?: string;
}

interface ClanLogTypeConfig {
  webhook: number | null;
  thread: number | null;
}

interface ClanLogsConfig {
  tag: string;
  name: string;
  join_log: ClanLogTypeConfig | null;
  leave_log: ClanLogTypeConfig | null;
  donation_log: ClanLogTypeConfig | null;
  war_log: ClanLogTypeConfig | null;
  capital_donations: ClanLogTypeConfig | null;
  capital_attacks: ClanLogTypeConfig | null;
  th_upgrade: ClanLogTypeConfig | null;
  troop_upgrade: ClanLogTypeConfig | null;
  hero_upgrade: ClanLogTypeConfig | null;
  spell_upgrade: ClanLogTypeConfig | null;
  hero_equipment_upgrade: ClanLogTypeConfig | null;
  legend_log_attacks: ClanLogTypeConfig | null;
  legend_log_defenses: ClanLogTypeConfig | null;
}

export default function LogsPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoaded, setThreadsLoaded] = useState(false);
  const [clanLogs, setClanLogs] = useState<ClanLogsConfig[]>([]);
  const [selectedClan, setSelectedClan] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');

        const [channelsRes, clanLogsRes] = await Promise.all([
          fetch(`/api/v2/server/${guildId}/channels`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/v2/server/${guildId}/clan-logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (channelsRes.ok) {
          const data = await channelsRes.json();
          setChannels(data);
        }

        if (clanLogsRes.ok) {
          const data = await clanLogsRes.json();
          setClanLogs(data);
          if (data.length > 0 && !selectedClan) {
            setSelectedClan(data[0].tag);
          }
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
  }, [guildId, selectedClan]);

  const loadThreadsIfNeeded = async () => {
    if (threadsLoaded) return;

    try {
      const token = localStorage.getItem('access_token');
      const threadsRes = await fetch(`/api/v2/server/${guildId}/threads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (threadsRes.ok) {
        const data = await threadsRes.json();
        setThreads(data);
        setThreadsLoaded(true);
      }
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    }
  };

  const handleUpdateLog = async (logKeys: string[], channelOrThreadId: string) => {
    if (!selectedClan) return;

    try {
      setSaving(logKeys[0]);
      const token = localStorage.getItem('access_token');

      // Check if "disabled" was selected
      if (channelOrThreadId === "disabled") {
        setSaving(null);
        return;
      }

      const isThread = threads.some(t => t.id === channelOrThreadId);
      const requestBody = {
        channel_id: isThread ? null : parseInt(channelOrThreadId),
        thread_id: isThread ? parseInt(channelOrThreadId) : null,
        log_types: logKeys
      };

      const response = await fetch(`/api/v2/server/${guildId}/clan/${selectedClan}/logs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to update clan logs');
      }

      // Refresh clan logs
      const clanLogsRes = await fetch(`/api/v2/server/${guildId}/clan-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (clanLogsRes.ok) {
        const data = await clanLogsRes.json();
        setClanLogs(data);
      }
    } catch (error) {
      console.error("Failed to update clan logs:", error);
    } finally {
      setSaving(null);
    }
  };

  const getCurrentClan = () => {
    return clanLogs.find(c => c.tag === selectedClan);
  };

  const getSelectedValueForLogs = (logKeys: string[]) => {
    const currentClan = getCurrentClan();
    if (!currentClan) return "";

    // Check first log key
    const firstLogConfig = currentClan[logKeys[0] as keyof ClanLogsConfig] as ClanLogTypeConfig | null;
    if (!firstLogConfig) return "";

    if (firstLogConfig.thread) {
      return threads.find(t => parseInt(t.id) === firstLogConfig.thread)?.id || "";
    }

    return "";
  };

  const isLogEnabled = (logKeys: string[]) => {
    const currentClan = getCurrentClan();
    if (!currentClan) return false;

    const firstLogConfig = currentClan[logKeys[0] as keyof ClanLogsConfig] as ClanLogTypeConfig | null;
    return firstLogConfig && firstLogConfig.webhook;
  };

  const countActiveLogs = () => {
    const currentClan = getCurrentClan();
    if (!currentClan) return 0;

    const allLogKeys = [
      'join_log', 'leave_log', 'donation_log', 'war_log',
      'capital_donations', 'capital_attacks',
      'th_upgrade', 'troop_upgrade', 'hero_upgrade', 'spell_upgrade', 'hero_equipment_upgrade',
      'legend_log_attacks', 'legend_log_defenses'
    ];

    return allLogKeys.filter(key => {
      const config = currentClan[key as keyof ClanLogsConfig];
      return config && typeof config === 'object' && config.webhook;
    }).length;
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

  const currentClan = getCurrentClan();

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
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-card border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-blue-500">{countActiveLogs()}</div>
                <Activity className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Out of 13 log types
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
                <div className="text-3xl font-bold text-yellow-500">{clanLogs.length}</div>
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
                {saving ? "Saving..." : "Ready to configure"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Clan Selector - Compact version */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Clan:</Label>
            <Select value={selectedClan} onValueChange={setSelectedClan}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a clan" />
              </SelectTrigger>
              <SelectContent>
                {clanLogs.map((clan) => (
                  <SelectItem key={clan.tag} value={clan.tag}>
                    {clan.name} ({clan.tag})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                  {isLogEnabled(['join_log']) && (
                    <div className="text-xs text-green-600 font-medium">Configured</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Log Channel</Label>
                    <Select
                      value={getSelectedValueForLogs(['join_log', 'leave_log'])}
                      onValueChange={(value) => handleUpdateLog(['join_log', 'leave_log'], value)}
                      disabled={saving === 'join_log'}
                      onOpenChange={(open) => {
                        if (open) loadThreadsIfNeeded();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <Separator className="my-2" />
                        {channels.map(ch => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                            {ch.parent_name && ` (${ch.parent_name})`}
                          </SelectItem>
                        ))}
                        {threadsLoaded && threads.length > 0 && <Separator className="my-2" />}
                        {threadsLoaded && threads.map((thread) => (
                          <SelectItem key={thread.id} value={thread.id}>
                            🧵 {thread.name}
                            {thread.parent_channel_name && ` (${thread.parent_channel_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
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
                  {isLogEnabled(['donation_log']) && (
                    <div className="text-xs text-green-600 font-medium">Configured</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Log Channel</Label>
                    <Select
                      value={getSelectedValueForLogs(['donation_log'])}
                      onValueChange={(value) => handleUpdateLog(['donation_log'], value)}
                      disabled={saving === 'donation_log'}
                      onOpenChange={(open) => {
                        if (open) loadThreadsIfNeeded();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <Separator className="my-2" />
                        {channels.map(ch => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                            {ch.parent_name && ` (${ch.parent_name})`}
                          </SelectItem>
                        ))}
                        {threadsLoaded && threads.length > 0 && <Separator className="my-2" />}
                        {threadsLoaded && threads.map((thread) => (
                          <SelectItem key={thread.id} value={thread.id}>
                            🧵 {thread.name}
                            {thread.parent_channel_name && ` (${thread.parent_channel_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* War Attack Logs */}
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
                  {isLogEnabled(['war_log']) && (
                    <div className="text-xs text-green-600 font-medium">Configured</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Log Channel</Label>
                    <Select
                      value={getSelectedValueForLogs(['war_log'])}
                      onValueChange={(value) => handleUpdateLog(['war_log'], value)}
                      disabled={saving === 'war_log'}
                      onOpenChange={(open) => {
                        if (open) loadThreadsIfNeeded();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <Separator className="my-2" />
                        {channels.map(ch => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                            {ch.parent_name && ` (${ch.parent_name})`}
                          </SelectItem>
                        ))}
                        {threadsLoaded && threads.length > 0 && <Separator className="my-2" />}
                        {threadsLoaded && threads.map((thread) => (
                          <SelectItem key={thread.id} value={thread.id}>
                            🧵 {thread.name}
                            {thread.parent_channel_name && ` (${thread.parent_channel_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
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
                  {isLogEnabled(['capital_donations']) && (
                    <div className="text-xs text-green-600 font-medium">Configured</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Log Channel</Label>
                    <Select
                      value={getSelectedValueForLogs(['capital_donations'])}
                      onValueChange={(value) => handleUpdateLog(['capital_donations'], value)}
                      disabled={saving === 'capital_donations'}
                      onOpenChange={(open) => {
                        if (open) loadThreadsIfNeeded();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <Separator className="my-2" />
                        {channels.map(ch => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                            {ch.parent_name && ` (${ch.parent_name})`}
                          </SelectItem>
                        ))}
                        {threadsLoaded && threads.length > 0 && <Separator className="my-2" />}
                        {threadsLoaded && threads.map((thread) => (
                          <SelectItem key={thread.id} value={thread.id}>
                            🧵 {thread.name}
                            {thread.parent_channel_name && ` (${thread.parent_channel_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
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
                  {isLogEnabled(['capital_attacks']) && (
                    <div className="text-xs text-green-600 font-medium">Configured</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Log Channel</Label>
                    <Select
                      value={getSelectedValueForLogs(['capital_attacks'])}
                      onValueChange={(value) => handleUpdateLog(['capital_attacks'], value)}
                      disabled={saving === 'capital_attacks'}
                      onOpenChange={(open) => {
                        if (open) loadThreadsIfNeeded();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <Separator className="my-2" />
                        {channels.map(ch => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                            {ch.parent_name && ` (${ch.parent_name})`}
                          </SelectItem>
                        ))}
                        {threadsLoaded && threads.length > 0 && <Separator className="my-2" />}
                        {threadsLoaded && threads.map((thread) => (
                          <SelectItem key={thread.id} value={thread.id}>
                            🧵 {thread.name}
                            {thread.parent_channel_name && ` (${thread.parent_channel_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
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
                        Track Town Hall, hero, troop, spell, and equipment upgrades
                      </CardDescription>
                    </div>
                  </div>
                  {isLogEnabled(['th_upgrade']) && (
                    <div className="text-xs text-green-600 font-medium">Configured</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Log Channel</Label>
                    <Select
                      value={getSelectedValueForLogs(['th_upgrade', 'hero_upgrade', 'troop_upgrade', 'spell_upgrade', 'hero_equipment_upgrade'])}
                      onValueChange={(value) => handleUpdateLog(['th_upgrade', 'hero_upgrade', 'troop_upgrade', 'spell_upgrade', 'hero_equipment_upgrade'], value)}
                      disabled={saving === 'th_upgrade'}
                      onOpenChange={(open) => {
                        if (open) loadThreadsIfNeeded();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <Separator className="my-2" />
                        {channels.map(ch => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                            {ch.parent_name && ` (${ch.parent_name})`}
                          </SelectItem>
                        ))}
                        {threadsLoaded && threads.length > 0 && <Separator className="my-2" />}
                        {threadsLoaded && threads.map((thread) => (
                          <SelectItem key={thread.id} value={thread.id}>
                            🧵 {thread.name}
                            {thread.parent_channel_name && ` (${thread.parent_channel_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legend Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <div>
                      <CardTitle>Legend Logs</CardTitle>
                      <CardDescription>
                        Track Legend league attacks and defenses
                      </CardDescription>
                    </div>
                  </div>
                  {isLogEnabled(['legend_log_attacks']) && (
                    <div className="text-xs text-green-600 font-medium">Configured</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Log Channel</Label>
                    <Select
                      value={getSelectedValueForLogs(['legend_log_attacks', 'legend_log_defenses'])}
                      onValueChange={(value) => handleUpdateLog(['legend_log_attacks', 'legend_log_defenses'], value)}
                      disabled={saving === 'legend_log_attacks'}
                      onOpenChange={(open) => {
                        if (open) loadThreadsIfNeeded();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <Separator className="my-2" />
                        {channels.map(ch => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                            {ch.parent_name && ` (${ch.parent_name})`}
                          </SelectItem>
                        ))}
                        {threadsLoaded && threads.length > 0 && <Separator className="my-2" />}
                        {threadsLoaded && threads.map((thread) => (
                          <SelectItem key={thread.id} value={thread.id}>
                            🧵 {thread.name}
                            {thread.parent_channel_name && ` (${thread.parent_channel_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MODERATION TAB */}
          <TabsContent value="moderation" className="space-y-6">
            {/* Ban Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-red-600" />
                    <div>
                      <CardTitle>Ban Logs</CardTitle>
                      <CardDescription>
                        Track player bans across your clans
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ban logs are not yet available in per-clan configuration.
                </p>
              </CardContent>
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
                        Track strikes issued to players
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Strike logs are not yet available in per-clan configuration.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
