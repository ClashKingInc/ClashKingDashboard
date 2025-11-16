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
  Activity,
  Bell,
  Hash,
  Loader2,
  Shield,
  Star,
  Zap,
  Target,
  Award,
  FileCheck,
  MessageCircle,
  ScrollText,
  Map,
  BarChart,
  UserCog,
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
  channel: string | null;  // Channel ID as string to match channel list
  thread: number | null;
}

interface ClanLogsConfig {
  tag: string;
  name: string;
  // Clan logs
  join_log: ClanLogTypeConfig | null;
  leave_log: ClanLogTypeConfig | null;
  donation_log: ClanLogTypeConfig | null;
  clan_achievement_log: ClanLogTypeConfig | null;
  clan_requirements_log: ClanLogTypeConfig | null;
  clan_description_log: ClanLogTypeConfig | null;
  // War logs
  war_log: ClanLogTypeConfig | null;
  war_panel: ClanLogTypeConfig | null;
  cwl_lineup_change_log: ClanLogTypeConfig | null;
  // Capital logs
  capital_donations: ClanLogTypeConfig | null;
  capital_attacks: ClanLogTypeConfig | null;
  raid_panel: ClanLogTypeConfig | null;
  capital_weekly_summary: ClanLogTypeConfig | null;
  // Player logs
  role_change: ClanLogTypeConfig | null;
  troop_upgrade: ClanLogTypeConfig | null;
  super_troop_boost_log: ClanLogTypeConfig | null;
  th_upgrade: ClanLogTypeConfig | null;
  league_change: ClanLogTypeConfig | null;
  spell_upgrade: ClanLogTypeConfig | null;
  hero_upgrade: ClanLogTypeConfig | null;
  hero_equipment_upgrade: ClanLogTypeConfig | null;
  name_change: ClanLogTypeConfig | null;
  legend_log_attacks: ClanLogTypeConfig | null;
  legend_log_defenses: ClanLogTypeConfig | null;
}

interface LogTypeDefinition {
  keys: string[];
  label: string;
  description: string;
  icon: any;
  color: string;
}

const CLAN_LOGS: LogTypeDefinition[] = [
  { keys: ['join_log'], label: 'Member Join', description: 'Track members joining the clan', icon: Users, color: 'green' },
  { keys: ['leave_log'], label: 'Member Leave', description: 'Track members leaving the clan', icon: Users, color: 'red' },
  { keys: ['donation_log'], label: 'Member Donation', description: 'Track troop and spell donations', icon: Gift, color: 'purple' },
  { keys: ['clan_achievement_log'], label: 'Clan Achievements', description: 'Track clan achievements earned', icon: Award, color: 'yellow' },
  { keys: ['clan_requirements_log'], label: 'Clan Requirements', description: 'Track changes to clan requirements', icon: FileCheck, color: 'blue' },
  { keys: ['clan_description_log'], label: 'Clan Description', description: 'Track changes to clan description', icon: MessageCircle, color: 'gray' },
];

const WAR_LOGS: LogTypeDefinition[] = [
  { keys: ['war_log'], label: 'War Log', description: 'Track war attacks and results', icon: Swords, color: 'red' },
  { keys: ['war_panel'], label: 'War Panel', description: 'Interactive war panel with live updates', icon: ScrollText, color: 'orange' },
  { keys: ['cwl_lineup_change_log'], label: 'CWL Lineup Change', description: 'Track CWL lineup changes', icon: Users, color: 'blue' },
];

const CAPITAL_LOGS: LogTypeDefinition[] = [
  { keys: ['capital_donations'], label: 'Capital Donations', description: 'Track capital gold donations', icon: Castle, color: 'yellow' },
  { keys: ['capital_attacks'], label: 'Capital Attacks', description: 'Track raid weekend attacks', icon: Swords, color: 'orange' },
  { keys: ['raid_panel'], label: 'Capital Panel', description: 'Interactive raid panel with live updates', icon: Map, color: 'purple' },
  { keys: ['capital_weekly_summary'], label: 'Capital Weekly Summary', description: 'Weekly summary of capital performance', icon: BarChart, color: 'blue' },
];

const PLAYER_LOGS: LogTypeDefinition[] = [
  { keys: ['role_change'], label: 'Role Change', description: 'Track player role changes in clan', icon: UserCog, color: 'blue' },
  { keys: ['troop_upgrade'], label: 'Troop Upgrade', description: 'Track troop level upgrades', icon: TrendingUp, color: 'green' },
  { keys: ['super_troop_boost_log'], label: 'Super Troop Boosts', description: 'Track super troop activations', icon: Zap, color: 'yellow' },
  { keys: ['th_upgrade'], label: 'Townhall Upgrade', description: 'Track town hall upgrades', icon: Castle, color: 'orange' },
  { keys: ['league_change'], label: 'League Change', description: 'Track league tier changes', icon: Target, color: 'purple' },
  { keys: ['spell_upgrade'], label: 'Spell Upgrade', description: 'Track spell level upgrades', icon: Star, color: 'blue' },
  { keys: ['hero_upgrade'], label: 'Hero Upgrade', description: 'Track hero level upgrades', icon: Shield, color: 'red' },
  { keys: ['hero_equipment_upgrade'], label: 'Hero Equipment Upgrade', description: 'Track hero equipment upgrades', icon: Shield, color: 'orange' },
  { keys: ['name_change'], label: 'Name Change', description: 'Track player name changes', icon: Users, color: 'gray' },
  { keys: ['legend_log_attacks'], label: 'Legend Attacks', description: 'Track legend league attacks', icon: Trophy, color: 'yellow' },
  { keys: ['legend_log_defenses'], label: 'Legend Defenses', description: 'Track legend league defenses', icon: Trophy, color: 'blue' },
];

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

  const handleChannelChange = async (logKeys: string[], channelId: string) => {
    if (!selectedClan) return;

    try {
      setSaving(logKeys[0]);
      const token = localStorage.getItem('access_token');

      // Set channel_id to null if "disabled" was selected
      const requestBody = {
        channel_id: channelId === "disabled" ? null : channelId,
        thread_id: null,
        log_types: logKeys
      };

      const response = await fetch(`/api/v2/server/${guildId}/clan/${encodeURIComponent(selectedClan)}/logs`, {
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

  const handleThreadChange = async (logKeys: string[], threadId: string) => {
    if (!selectedClan) return;

    try {
      setSaving(logKeys[0]);
      const token = localStorage.getItem('access_token');

      // Get current channel
      const currentChannel = getSelectedChannelForLogs(logKeys);
      if (!currentChannel) return;

      const requestBody = {
        channel_id: currentChannel,
        thread_id: threadId === "none" ? null : threadId,
        log_types: logKeys
      };

      const response = await fetch(`/api/v2/server/${guildId}/clan/${encodeURIComponent(selectedClan)}/logs`, {
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

  const getSelectedChannelForLogs = (logKeys: string[]) => {
    const currentClan = getCurrentClan();
    if (!currentClan) return "";

    const firstLogConfig = currentClan[logKeys[0] as keyof ClanLogsConfig] as ClanLogTypeConfig | null;
    if (!firstLogConfig || !firstLogConfig.channel) return "";

    return firstLogConfig.channel;
  };

  const getSelectedThreadForLogs = (logKeys: string[]) => {
    const currentClan = getCurrentClan();
    if (!currentClan) return "";

    const firstLogConfig = currentClan[logKeys[0] as keyof ClanLogsConfig] as ClanLogTypeConfig | null;
    if (!firstLogConfig || !firstLogConfig.thread) return "";

    return firstLogConfig.thread.toString();
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
      ...CLAN_LOGS.flatMap(l => l.keys),
      ...WAR_LOGS.flatMap(l => l.keys),
      ...CAPITAL_LOGS.flatMap(l => l.keys),
      ...PLAYER_LOGS.flatMap(l => l.keys),
    ];

    return allLogKeys.filter(key => {
      const config = currentClan[key as keyof ClanLogsConfig];
      return config && typeof config === 'object' && config.webhook;
    }).length;
  };

  const renderLogCard = (logDef: LogTypeDefinition) => {
    const Icon = logDef.icon;
    const isEnabled = isLogEnabled(logDef.keys);
    const selectedChannel = getSelectedChannelForLogs(logDef.keys);
    const selectedThread = getSelectedThreadForLogs(logDef.keys);

    // Filter threads for the selected channel
    const channelThreads = selectedChannel
      ? threads.filter(t => t.parent_channel_id === selectedChannel)
      : [];

    return (
      <Card key={logDef.keys[0]} className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 text-${logDef.color}-500`} />
              <div>
                <CardTitle className="text-foreground">{logDef.label}</CardTitle>
                <CardDescription>{logDef.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving === logDef.keys[0] && (
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
              <Label>Channel</Label>
              <Select
                value={selectedChannel || "disabled"}
                onValueChange={(value) => handleChannelChange(logDef.keys, value)}
                disabled={saving === logDef.keys[0]}
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
                </SelectContent>
              </Select>
            </div>

            {selectedChannel && channelThreads.length > 0 && (
              <div className="space-y-2">
                <Label>Thread (Optional)</Label>
                <Select
                  value={selectedThread || "none"}
                  onValueChange={(value) => handleThreadChange(logDef.keys, value)}
                  disabled={saving === logDef.keys[0]}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select thread" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Thread</SelectItem>
                    <Separator className="my-2" />
                    {channelThreads.map((thread) => (
                      <SelectItem key={thread.id} value={thread.id}>
                        🧵 {thread.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
                Out of 26 log types
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
          <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
            <TabsTrigger value="clan">
              <Users className="mr-2 h-4 w-4" />
              Clan Logs
            </TabsTrigger>
            <TabsTrigger value="war">
              <Swords className="mr-2 h-4 w-4" />
              War Logs
            </TabsTrigger>
            <TabsTrigger value="capital">
              <Castle className="mr-2 h-4 w-4" />
              Capital Logs
            </TabsTrigger>
            <TabsTrigger value="player">
              <TrendingUp className="mr-2 h-4 w-4" />
              Player Logs
            </TabsTrigger>
          </TabsList>

          {/* CLAN LOGS TAB */}
          <TabsContent value="clan" className="space-y-6">
            {CLAN_LOGS.map(renderLogCard)}
          </TabsContent>

          {/* WAR LOGS TAB */}
          <TabsContent value="war" className="space-y-6">
            {WAR_LOGS.map(renderLogCard)}
          </TabsContent>

          {/* CAPITAL LOGS TAB */}
          <TabsContent value="capital" className="space-y-6">
            {CAPITAL_LOGS.map(renderLogCard)}
          </TabsContent>

          {/* PLAYER LOGS TAB */}
          <TabsContent value="player" className="space-y-6">
            {PLAYER_LOGS.map(renderLogCard)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
