"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiCache } from "@/lib/api-cache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
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
  AlertCircle,
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
  exampleLink?: string;
}

const LOG_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  gray: { bg: 'bg-gray-500/10', text: 'text-gray-500' },
};

function getLogColorClasses(color: string): { bg: string; text: string } {
  return LOG_COLOR_MAP[color] ?? LOG_COLOR_MAP.gray;
}

export default function LogsPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const t = useTranslations("LogsPage");
  const tCommon = useTranslations("Common");

  const CLAN_LOGS: LogTypeDefinition[] = [
    { keys: ['join_log'], label: t('clanLogs.joinLog.label'), description: t('clanLogs.joinLog.description'), icon: Users, color: 'green', exampleLink: 'https://discord.com/channels/923764211845312533/1128182552121839648' },
    { keys: ['leave_log'], label: t('clanLogs.leaveLog.label'), description: t('clanLogs.leaveLog.description'), icon: Users, color: 'red', exampleLink: 'https://discord.com/channels/923764211845312533/1128182846218055722' },
    { keys: ['donation_log'], label: t('clanLogs.donationLog.label'), description: t('clanLogs.donationLog.description'), icon: Gift, color: 'purple' },
    { keys: ['clan_achievement_log'], label: t('clanLogs.clanAchievementLog.label'), description: t('clanLogs.clanAchievementLog.description'), icon: Award, color: 'yellow' },
    { keys: ['clan_requirements_log'], label: t('clanLogs.clanRequirementsLog.label'), description: t('clanLogs.clanRequirementsLog.description'), icon: FileCheck, color: 'blue' },
    { keys: ['clan_description_log'], label: t('clanLogs.clanDescriptionLog.label'), description: t('clanLogs.clanDescriptionLog.description'), icon: MessageCircle, color: 'gray' },
  ];

  const WAR_LOGS: LogTypeDefinition[] = [
    { keys: ['war_log'], label: t('warLogs.warLog.label'), description: t('warLogs.warLog.description'), icon: Swords, color: 'red', exampleLink: 'https://discord.com/channels/923764211845312533/1128186867825774672' },
    { keys: ['war_panel'], label: t('warLogs.warPanel.label'), description: t('warLogs.warPanel.description'), icon: ScrollText, color: 'orange' },
    { keys: ['cwl_lineup_change_log'], label: t('warLogs.cwlLineupChangeLog.label'), description: t('warLogs.cwlLineupChangeLog.description'), icon: Users, color: 'blue' },
  ];

  const CAPITAL_LOGS: LogTypeDefinition[] = [
    { keys: ['capital_donations'], label: t('capitalLogs.capitalDonations.label'), description: t('capitalLogs.capitalDonations.description'), icon: Castle, color: 'yellow' },
    { keys: ['capital_attacks'], label: t('capitalLogs.capitalAttacks.label'), description: t('capitalLogs.capitalAttacks.description'), icon: Swords, color: 'orange' },
    { keys: ['raid_panel'], label: t('capitalLogs.raidPanel.label'), description: t('capitalLogs.raidPanel.description'), icon: Map, color: 'purple' },
    { keys: ['capital_weekly_summary'], label: t('capitalLogs.capitalWeeklySummary.label'), description: t('capitalLogs.capitalWeeklySummary.description'), icon: BarChart, color: 'blue' },
  ];

  const PLAYER_LOGS: LogTypeDefinition[] = [
    { keys: ['role_change'], label: t('playerLogs.roleChange.label'), description: t('playerLogs.roleChange.description'), icon: UserCog, color: 'blue', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['troop_upgrade'], label: t('playerLogs.troopUpgrade.label'), description: t('playerLogs.troopUpgrade.description'), icon: TrendingUp, color: 'green', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['super_troop_boost_log'], label: t('playerLogs.superTroopBoostLog.label'), description: t('playerLogs.superTroopBoostLog.description'), icon: Zap, color: 'yellow', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['th_upgrade'], label: t('playerLogs.thUpgrade.label'), description: t('playerLogs.thUpgrade.description'), icon: Castle, color: 'orange', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['league_change'], label: t('playerLogs.leagueChange.label'), description: t('playerLogs.leagueChange.description'), icon: Target, color: 'purple', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['spell_upgrade'], label: t('playerLogs.spellUpgrade.label'), description: t('playerLogs.spellUpgrade.description'), icon: Star, color: 'blue', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['hero_upgrade'], label: t('playerLogs.heroUpgrade.label'), description: t('playerLogs.heroUpgrade.description'), icon: Shield, color: 'red', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['hero_equipment_upgrade'], label: t('playerLogs.heroEquipmentUpgrade.label'), description: t('playerLogs.heroEquipmentUpgrade.description'), icon: Shield, color: 'orange', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['name_change'], label: t('playerLogs.nameChange.label'), description: t('playerLogs.nameChange.description'), icon: Users, color: 'gray', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['legend_log_attacks'], label: t('playerLogs.legendLogAttacks.label'), description: t('playerLogs.legendLogAttacks.description'), icon: Trophy, color: 'yellow' },
    { keys: ['legend_log_defenses'], label: t('playerLogs.legendLogDefenses.label'), description: t('playerLogs.legendLogDefenses.description'), icon: Trophy, color: 'blue' },
  ];
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

        // Use cache to prevent duplicate requests
        const [channelsData, clanLogsData] = await Promise.all([
          apiCache.get(`channels-${guildId}`, async () => {
            const res = await fetch(`/api/v2/server/${guildId}/channels`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch channels');
            return res.json();
          }),
          apiCache.get(`clan-logs-${guildId}`, async () => {
            const res = await fetch(`/api/v2/server/${guildId}/clan-logs`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch clan logs');
            return res.json();
          })
        ]);

        setChannels(channelsData);
        setClanLogs(clanLogsData);

        if (clanLogsData.length > 0 && !selectedClan) {
          setSelectedClan(clanLogsData[0].tag);
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
  }, [guildId]); // Removed selectedClan dependency - no need to refetch all data when clan changes

  const loadThreadsIfNeeded = async () => {
    if (threadsLoaded) return;

    try {
      const token = localStorage.getItem('access_token');

      // Use cache for threads
      const threadsData = await apiCache.get(`threads-${guildId}`, async () => {
        const res = await fetch(`/api/v2/server/${guildId}/threads`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch threads');
        return res.json();
      });

      setThreads(threadsData);
      setThreadsLoaded(true);
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    }
  };

  const handleChannelChange = async (logKeys: string[], channelId: string) => {
    if (!selectedClan) return;

    try {
      setSaving(logKeys[0]);
      const token = localStorage.getItem('access_token');

      // Use DELETE endpoint if "disabled" was selected
      if (channelId === "disabled") {
        const response = await fetch(
          `/api/v2/server/${guildId}/clan/${encodeURIComponent(selectedClan)}/logs?log_types=${logKeys.join(',')}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to delete clan log configuration');
        }

        // Refresh clan logs
        const clanLogsRes = await fetch(`/api/v2/server/${guildId}/clan-logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (clanLogsRes.ok) {
          const data = await clanLogsRes.json();
          setClanLogs(data);
        }

        setSaving(null);
        return;
      }

      // Use PUT endpoint to update channel
      const requestBody = {
        channel_id: channelId,
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

      // Invalidate cache and refresh clan logs
      apiCache.invalidate(`clan-logs-${guildId}`);

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

      // Invalidate cache and refresh clan logs
      apiCache.invalidate(`clan-logs-${guildId}`);

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

  const countLogsWithIssues = () => {
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
      // Log is enabled (has webhook) but channel doesn't exist
      if (!config || typeof config !== 'object' || !config.webhook) return false;
      const channelId = config.channel;
      const channelExists = channelId && channels.some(ch => ch.id === channelId);
      return !channelExists;
    }).length;
  };


  // Separate component for LogCard to use hooks properly
  const LogCard = ({ logDef, statusLoading = false }: { logDef: LogTypeDefinition; statusLoading?: boolean }) => {
    const Icon = logDef.icon;
    const currentClan = getCurrentClan();
    const isStatusLoading = statusLoading || !currentClan;
    const isEnabled = isLogEnabled(logDef.keys);
    const selectedChannel = getSelectedChannelForLogs(logDef.keys);
    const selectedThread = getSelectedThreadForLogs(logDef.keys);
    const colors = getLogColorClasses(logDef.color);
    const [showEnableForm, setShowEnableForm] = useState(false);
    const [pendingChannel, setPendingChannel] = useState<string | null>(null);
    const isSaving = saving === logDef.keys[0];

    // Check if the selected channel exists in the available channels list
    // If log is enabled but no channel, it's also an issue
    const channelExists = selectedChannel && channels.some(ch => ch.id === selectedChannel);
    const selectedChannelData = selectedChannel ? channels.find(ch => ch.id === selectedChannel) : null;

    // Filter threads for the selected channel
    const channelThreads = selectedChannel
      ? threads.filter(t => t.parent_channel_id === selectedChannel)
      : [];

    return (
      <Card key={logDef.keys[0]} className="bg-card border-border hover:border-border/80 transition-colors min-h-[220px]">
        <CardHeader className="min-h-[96px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colors.bg}`}>
                <Icon className={`h-4 w-4 ${colors.text}`} />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">{logDef.label}</CardTitle>
                <CardDescription className="text-xs">
                  {logDef.description}
                  {logDef.exampleLink && (
                    <>
                      {' '}(
                      <a 
                        href={logDef.exampleLink.replace('https://discord.com/channels/', 'discord://discord.com/channels/')} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 underline"
                      >
                        {t('logCard.example')}
                      </a>
                      )
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isStatusLoading && isEnabled && !channelExists && !isSaving && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/30">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  <span className="text-xs text-orange-600 font-medium">{t('logCard.issue')}</span>
                </div>
              )}
              {isStatusLoading ? (
                <>
                  <Skeleton className="h-6 w-11 animate-pulse rounded-full" />
                  <Skeleton className="h-4 w-12 animate-pulse" />
                </>
              ) : (
                <>
                  <Switch
                    checked={Boolean(isEnabled) || showEnableForm}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setShowEnableForm(true);
                      } else {
                        if (showEnableForm && !isEnabled) {
                          setShowEnableForm(false);
                        } else {
                          handleChannelChange(logDef.keys, 'disabled');
                        }
                      }
                    }}
                    disabled={isSaving}
                    className={
                      showEnableForm && !isEnabled
                        ? 'data-[state=checked]:bg-blue-500'
                        : isEnabled && !channelExists
                        ? 'data-[state=checked]:bg-orange-500'
                        : 'data-[state=checked]:bg-green-500'
                    }
                  />
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <span className={`text-xs font-medium ${
                      !isEnabled && !showEnableForm ? 'text-muted-foreground' :
                      showEnableForm && !isEnabled ? 'text-blue-600' :
                      !channelExists ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {!isEnabled && !showEnableForm ? t('logCard.off') :
                       showEnableForm && !isEnabled ? t('logCard.configuring') :
                       t('logCard.on')}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 min-h-[92px]">
          {isStatusLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20 animate-pulse" />
              <Skeleton className="h-10 w-full animate-pulse" />
              <Skeleton className="h-4 w-28 animate-pulse" />
            </div>
          ) : !isEnabled && !showEnableForm && !isSaving ? (
            /* DISABLED STATE: Empty state */
            <div className="text-center py-6 text-muted-foreground text-sm">
              {t('logCard.enableToConfig')}
            </div>
          ) : (!isEnabled && showEnableForm) || (isSaving && !isEnabled) ? (
            /* CONFIGURING STATE: Show channel selector */
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('logCard.channel')}</Label>
              <ChannelCombobox
                channels={channels}
                value={pendingChannel || "disabled"}
                onValueChange={async (value) => {
                  setPendingChannel(value);
                  await handleChannelChange(logDef.keys, value);
                  setPendingChannel(null);
                  setShowEnableForm(false);
                }}
                placeholder={t('logCard.channelPlaceholder')}
                disabled={isSaving}
                showDisabled={false}
              />
            </div>
          ) : (
            /* ACTIVE/ISSUE STATE: Show channel selector */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('logCard.channel')}</Label>
                <ChannelCombobox
                  channels={channels}
                  value={pendingChannel || (channelExists ? selectedChannel : "")}
                  onValueChange={async (value) => {
                    setPendingChannel(value);
                    await handleChannelChange(logDef.keys, value);
                    setPendingChannel(null);
                    if (value !== "disabled") loadThreadsIfNeeded();
                  }}
                  placeholder={t('logCard.channelPlaceholder')}
                  disabled={isSaving}
                  className={!channelExists && isEnabled ? 'border-orange-500/50' : ''}
                  showDisabled={false}
                />
                {!channelExists && isEnabled && !isSaving && (
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('logCard.channelDeleted')}
                  </p>
                )}
              </div>

              {selectedChannel && channelThreads.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{t('logCard.thread')}</Label>
                  <Select
                    value={selectedThread || "none"}
                    onValueChange={(value) => handleThreadChange(logDef.keys, value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder={t('logCard.threadPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('logCard.noThread')}</SelectItem>
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
          )}
        </CardContent>
      </Card>
    );
  };

  const currentClan = getCurrentClan();


  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 w-fit">
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('description')}
            </p>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-card border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.activeLogs')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[96px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                {loading ? (
                  <Skeleton className="h-9 w-12 animate-pulse" />
                ) : (
                  <div className="h-9 flex items-center text-3xl font-bold text-blue-500">{countActiveLogs()}</div>
                )}
                <Activity className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('stats.activeLogsDesc')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.logChannels')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[96px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                {loading ? (
                  <Skeleton className="h-9 w-12 animate-pulse" />
                ) : (
                  <div className="h-9 flex items-center text-3xl font-bold text-green-500">{channels.length}</div>
                )}
                <Hash className="h-8 w-8 text-green-500/50" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('stats.logChannelsDesc')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.trackedClans')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[96px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                {loading ? (
                  <Skeleton className="h-9 w-12 animate-pulse" />
                ) : (
                  <div className="h-9 flex items-center text-3xl font-bold text-yellow-500">{clanLogs.length}</div>
                )}
                <Users className="h-8 w-8 text-yellow-500/50" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('stats.trackedClansDesc')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-orange-500/30 bg-orange-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.issues')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[96px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                {loading ? (
                  <Skeleton className="h-9 w-12 animate-pulse" />
                ) : (
                  <div className="h-9 flex items-center text-3xl font-bold text-orange-500">{countLogsWithIssues()}</div>
                )}
                <AlertCircle className="h-8 w-8 text-orange-500/50" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('stats.issuesDesc')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Clan Selector */}
        {(loading || clanLogs.length > 0) && (
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <Label className="text-sm text-muted-foreground">{t('clanSelector.label')}</Label>
            {loading ? (
              <Skeleton className="h-10 w-full md:w-[300px] animate-pulse" />
            ) : (
              <Select value={selectedClan} onValueChange={setSelectedClan}>
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue placeholder={t('clanSelector.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {clanLogs.map((clan) => (
                    <SelectItem key={clan.tag} value={clan.tag}>
                      {clan.name} ({clan.tag})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <Tabs defaultValue="clan" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-[800px] bg-secondary h-auto p-1">
            <TabsTrigger value="clan" className="data-[state=active]:bg-background">
              <Users className="mr-2 h-4 w-4" />
              {t('tabs.clan')}
            </TabsTrigger>
            <TabsTrigger value="war" className="data-[state=active]:bg-background">
              <Swords className="mr-2 h-4 w-4" />
              {t('tabs.war')}
            </TabsTrigger>
            <TabsTrigger value="capital" className="data-[state=active]:bg-background">
              <Castle className="mr-2 h-4 w-4" />
              {t('tabs.capital')}
            </TabsTrigger>
            <TabsTrigger value="player" className="data-[state=active]:bg-background">
              <TrendingUp className="mr-2 h-4 w-4" />
              {t('tabs.player')}
            </TabsTrigger>
          </TabsList>

          {/* CLAN LOGS TAB */}
          <TabsContent value="clan" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {CLAN_LOGS.map(logDef => <LogCard key={logDef.keys[0]} logDef={logDef} statusLoading={loading} />)}
            </div>
          </TabsContent>

          {/* WAR LOGS TAB */}
          <TabsContent value="war" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {WAR_LOGS.map(logDef => <LogCard key={logDef.keys[0]} logDef={logDef} statusLoading={loading} />)}
            </div>
          </TabsContent>

          {/* CAPITAL LOGS TAB */}
          <TabsContent value="capital" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {CAPITAL_LOGS.map(logDef => <LogCard key={logDef.keys[0]} logDef={logDef} statusLoading={loading} />)}
            </div>
          </TabsContent>

          {/* PLAYER LOGS TAB */}
          <TabsContent value="player" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {PLAYER_LOGS.map(logDef => <LogCard key={logDef.keys[0]} logDef={logDef} statusLoading={loading} />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
