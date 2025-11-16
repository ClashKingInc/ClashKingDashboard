"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
  Shield,
  Loader2,
  Activity,
  Hash,
  Bell,
  Ban,
  AlertTriangle,
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

const LOG_TYPES = {
  "clan": [
    { key: "join_log", label: "Join/Leave Logs", icon: Users, description: "Track members joining and leaving your clans", color: "green" },
    { key: "donation_log", label: "Donation Logs", icon: Gift, description: "Track troop donations and requests", color: "purple" },
    { key: "war_log", label: "War Attack Logs", icon: Swords, description: "Log attacks and defenses during wars", color: "red" },
    { key: "capital_donations", label: "Capital Donation Logs", icon: Castle, description: "Track capital gold donations", color: "yellow" },
    { key: "capital_attacks", label: "Capital Raid Logs", icon: Swords, description: "Track raid weekend attacks", color: "orange" },
  ],
  "player": [
    { key: "th_upgrade", label: "Town Hall Upgrades", icon: TrendingUp, description: "Town hall level increases", color: "blue" },
    { key: "hero_upgrade", label: "Hero Upgrades", icon: Shield, description: "Hero level increases", color: "blue" },
    { key: "troop_upgrade", label: "Troop Upgrades", icon: TrendingUp, description: "Troop level increases", color: "blue" },
    { key: "spell_upgrade", label: "Spell Upgrades", icon: TrendingUp, description: "Spell level increases", color: "blue" },
    { key: "hero_equipment_upgrade", label: "Equipment Upgrades", icon: Shield, description: "Hero equipment upgrades", color: "blue" },
    { key: "legend_log_attacks", label: "Legend Attacks", icon: Trophy, description: "Legend league attacks", color: "yellow" },
    { key: "legend_log_defenses", label: "Legend Defenses", icon: Trophy, description: "Legend league defenses", color: "yellow" },
  ],
  "moderation": [
    { key: "leave_log", label: "Leave Logs", icon: Users, description: "When members leave the clan", color: "red" },
  ],
};

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
      const token = localStorage.getItem('token');
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

  const handleUpdateLog = async (logKey: string, channelOrThreadId: string) => {
    if (!selectedClan) return;

    try {
      setSaving(logKey);
      const token = localStorage.getItem('access_token');

      // Check if "disabled" was selected
      if (channelOrThreadId === "disabled") {
        // We don't have a disable endpoint yet, so skip for now
        setSaving(null);
        return;
      }

      const isThread = threads.some(t => t.id === channelOrThreadId);
      const requestBody = {
        channel_id: isThread ? null : parseInt(channelOrThreadId),
        thread_id: isThread ? parseInt(channelOrThreadId) : null,
        log_types: [logKey]
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

  const getSelectedValue = (logConfig: ClanLogTypeConfig | null) => {
    if (!logConfig) return "";
    if (logConfig.thread) {
      return threads.find(t => parseInt(t.id) === logConfig.thread)?.id || "";
    }
    // Try to find channel from webhook
    // For now, we'll just return empty if we only have webhook
    return "";
  };

  const countActiveLogs = () => {
    const currentClan = getCurrentClan();
    if (!currentClan) return 0;

    const allLogTypes = [...LOG_TYPES.clan, ...LOG_TYPES.player, ...LOG_TYPES.moderation];
    return allLogTypes.filter(log => {
      const config = currentClan[log.key as keyof ClanLogsConfig];
      return config && typeof config === 'object' && config.webhook;
    }).length;
  };

  const getThreadsForChannel = (channelId: string) => {
    return threads.filter(t => t.parent_channel_id === channelId);
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
  const allLogTypes = [...LOG_TYPES.clan, ...LOG_TYPES.player, ...LOG_TYPES.moderation];

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
                  Configure automatic logging for clan activities
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
                Out of {allLogTypes.length} log types
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

        {/* Log Configuration with Tabs */}
        {currentClan && (
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

            {/* Clan Logs Tab */}
            <TabsContent value="clan" className="space-y-4">
              {LOG_TYPES.clan.map((logType) => {
                const currentConfig = currentClan[logType.key as keyof ClanLogsConfig] as ClanLogTypeConfig | null;
                const isEnabled = currentConfig && currentConfig.webhook;
                const selectedValue = getSelectedValue(currentConfig);

                return (
                  <Card key={logType.key} className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <logType.icon className={`h-5 w-5 text-${logType.color}-500`} />
                          <div>
                            <CardTitle>{logType.label}</CardTitle>
                            <CardDescription>{logType.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {saving === logType.key && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {isEnabled && !saving && (
                            <div className="text-xs text-green-600 font-medium">Configured</div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Channel / Thread</Label>
                          <Select
                            value={selectedValue}
                            onValueChange={(value) => handleUpdateLog(logType.key, value)}
                            disabled={saving === logType.key}
                            onOpenChange={(open) => {
                              if (open) loadThreadsIfNeeded();
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select channel or thread" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disabled">Disabled</SelectItem>
                              <Separator className="my-2" />
                              {channels.map((channel) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  # {channel.name}
                                  {channel.parent_name && ` (${channel.parent_name})`}
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
                );
              })}
            </TabsContent>

            {/* Player Logs Tab */}
            <TabsContent value="player" className="space-y-4">
              {LOG_TYPES.player.map((logType) => {
                const currentConfig = currentClan[logType.key as keyof ClanLogsConfig] as ClanLogTypeConfig | null;
                const isEnabled = currentConfig && currentConfig.webhook;
                const selectedValue = getSelectedValue(currentConfig);

                return (
                  <Card key={logType.key} className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <logType.icon className={`h-5 w-5 text-${logType.color}-500`} />
                          <div>
                            <CardTitle>{logType.label}</CardTitle>
                            <CardDescription>{logType.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {saving === logType.key && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {isEnabled && !saving && (
                            <div className="text-xs text-green-600 font-medium">Configured</div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Channel / Thread</Label>
                          <Select
                            value={selectedValue}
                            onValueChange={(value) => handleUpdateLog(logType.key, value)}
                            disabled={saving === logType.key}
                            onOpenChange={(open) => {
                              if (open) loadThreadsIfNeeded();
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select channel or thread" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disabled">Disabled</SelectItem>
                              <Separator className="my-2" />
                              {channels.map((channel) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  # {channel.name}
                                  {channel.parent_name && ` (${channel.parent_name})`}
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
                );
              })}
            </TabsContent>

            {/* Moderation Tab */}
            <TabsContent value="moderation" className="space-y-4">
              {LOG_TYPES.moderation.map((logType) => {
                const currentConfig = currentClan[logType.key as keyof ClanLogsConfig] as ClanLogTypeConfig | null;
                const isEnabled = currentConfig && currentConfig.webhook;
                const selectedValue = getSelectedValue(currentConfig);

                return (
                  <Card key={logType.key} className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <logType.icon className={`h-5 w-5 text-${logType.color}-500`} />
                          <div>
                            <CardTitle>{logType.label}</CardTitle>
                            <CardDescription>{logType.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {saving === logType.key && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {isEnabled && !saving && (
                            <div className="text-xs text-green-600 font-medium">Configured</div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Channel / Thread</Label>
                          <Select
                            value={selectedValue}
                            onValueChange={(value) => handleUpdateLog(logType.key, value)}
                            disabled={saving === logType.key}
                            onOpenChange={(open) => {
                              if (open) loadThreadsIfNeeded();
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select channel or thread" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disabled">Disabled</SelectItem>
                              <Separator className="my-2" />
                              {channels.map((channel) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  # {channel.name}
                                  {channel.parent_name && ` (${channel.parent_name})`}
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
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
