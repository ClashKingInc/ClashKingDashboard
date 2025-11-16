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
  Check,
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
  "member": [
    { key: "join_log", label: "Join Logs", icon: Users, description: "When members join the clan" },
    { key: "leave_log", label: "Leave Logs", icon: Users, description: "When members leave the clan" },
  ],
  "war": [
    { key: "war_log", label: "War Logs", icon: Swords, description: "War attacks and results" },
  ],
  "donations": [
    { key: "donation_log", label: "Donation Logs", icon: Gift, description: "Troop and spell donations" },
  ],
  "capital": [
    { key: "capital_donations", label: "Capital Donations", icon: Castle, description: "Clan capital gold donations" },
    { key: "capital_attacks", label: "Capital Attacks", icon: Castle, description: "Raid weekend attacks" },
  ],
  "upgrades": [
    { key: "th_upgrade", label: "Town Hall Upgrades", icon: TrendingUp, description: "Town hall level increases" },
    { key: "hero_upgrade", label: "Hero Upgrades", icon: Shield, description: "Hero level increases" },
    { key: "troop_upgrade", label: "Troop Upgrades", icon: TrendingUp, description: "Troop level increases" },
    { key: "spell_upgrade", label: "Spell Upgrades", icon: TrendingUp, description: "Spell level increases" },
    { key: "hero_equipment_upgrade", label: "Equipment Upgrades", icon: Shield, description: "Hero equipment upgrades" },
  ],
  "legend": [
    { key: "legend_log_attacks", label: "Legend Attacks", icon: Trophy, description: "Legend league attacks" },
    { key: "legend_log_defenses", label: "Legend Defenses", icon: Trophy, description: "Legend league defenses" },
  ],
};

export default function LogsPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [clanLogs, setClanLogs] = useState<ClanLogsConfig[]>([]);
  const [selectedClan, setSelectedClan] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        const [channelsRes, threadsRes, clanLogsRes] = await Promise.all([
          fetch(`/api/v2/server/${guildId}/channels`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/v2/server/${guildId}/threads`, {
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

        if (threadsRes.ok) {
          const data = await threadsRes.json();
          setThreads(data);
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

  const handleUpdateClanLog = async (clanTag: string, logTypes: string[], channelOrThreadId: string) => {
    try {
      setSaving(clanTag);
      const token = localStorage.getItem('token');

      // Determine if it's a channel or thread
      const isThread = threads.some(t => t.id === channelOrThreadId);
      const requestBody = {
        channel_id: isThread ? null : parseInt(channelOrThreadId),
        thread_id: isThread ? parseInt(channelOrThreadId) : null,
        log_types: logTypes
      };

      const response = await fetch(`/api/v2/server/${guildId}/clan/${clanTag}/logs`, {
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

  const getChannelOrThreadById = (webhook: number | null, thread: number | null) => {
    if (thread) {
      const foundThread = threads.find(t => parseInt(t.id) === thread);
      if (foundThread) return { id: foundThread.id, name: `🧵 ${foundThread.name} (${foundThread.parent_channel_name})`, isThread: true };
    }
    // If we have a webhook, try to find the channel from existing logs
    return null;
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
                  Configure automatic logging for clan activities
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clan Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Clan</CardTitle>
            <CardDescription>Choose which clan to configure logs for</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedClan} onValueChange={setSelectedClan}>
              <SelectTrigger className="w-full">
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
          </CardContent>
        </Card>

        {/* Log Configuration */}
        {currentClan && (
          <Tabs defaultValue="member" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="member">Members</TabsTrigger>
              <TabsTrigger value="war">War</TabsTrigger>
              <TabsTrigger value="donations">Donations</TabsTrigger>
              <TabsTrigger value="capital">Capital</TabsTrigger>
              <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
              <TabsTrigger value="legend">Legend</TabsTrigger>
            </TabsList>

            {Object.entries(LOG_TYPES).map(([category, logTypes]) => (
              <TabsContent key={category} value={category} className="space-y-4">
                {logTypes.map((logType) => {
                  const currentConfig = currentClan[logType.key as keyof ClanLogsConfig] as ClanLogTypeConfig | null;
                  const currentLocation = getChannelOrThreadById(currentConfig?.webhook || null, currentConfig?.thread || null);

                  return (
                    <Card key={logType.key}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <logType.icon className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle>{logType.label}</CardTitle>
                            <CardDescription>{logType.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Channel / Thread</Label>
                            <Select
                              value={currentLocation?.id || ""}
                              onValueChange={(value) => handleUpdateClanLog(currentClan.tag, [logType.key], value)}
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
                                {threads.length > 0 && <Separator className="my-2" />}
                                {threads.map((thread) => (
                                  <SelectItem key={thread.id} value={thread.id}>
                                    🧵 {thread.name}
                                    {thread.parent_channel_name && ` (${thread.parent_channel_name})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            {currentConfig?.webhook && (
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <Check className="h-4 w-4" />
                                <span>Configured</span>
                              </div>
                            )}
                            {saving === currentClan.tag && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Saving...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
