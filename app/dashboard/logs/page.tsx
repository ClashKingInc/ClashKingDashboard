"use client";

import { useGuildId } from "@/lib/dashboard-route";
import { getAccessToken } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/fetch";


import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { apiCache } from "@/lib/api-cache";
import { dashboardCacheKeys } from "@/lib/dashboard-cache";
import {
  destinationNeedsThread,
  isDestinationValid,
  normalizeDestinationChannels,
  normalizeDestinationThreads,
  type DiscordDestinationChannel,
  type DiscordDestinationThread,
} from "@/lib/discord-destinations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { ClanCombobox } from "@/components/ui/clan-combobox";
import {
  FileText,
  Users,
  Gift,
  Swords,
  Castle,
  TrendingUp,
  Trophy,
  Activity,
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

type Channel = DiscordDestinationChannel;
type Thread = DiscordDestinationThread;

interface ClanSummary {
  tag: string;
  name: string;
}

interface ServerLog {
  clan_tag?: string;
  type: string;
  webhook_id: string;
  channel_id?: string;
  thread_id?: string;
  disabled: boolean;
}

interface ServerLogsResponse {
  logs: ServerLog[];
  count: number;
}

interface LogTypeDefinition {
  keys: string[];
  label: string;
  description: string;
  icon: any;
  color: string;
  scope?: "clan" | "server";
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
  const guildId = useGuildId();
  const t = useTranslations("LogsPage");
  const CLAN_LOGS: LogTypeDefinition[] = [
    { keys: ['join_log'], label: t('clanLogs.joinLog.label'), description: t('clanLogs.joinLog.description'), icon: Users, color: 'green', exampleLink: 'https://discord.com/channels/923764211845312533/1128182552121839648' },
    { keys: ['leave_log'], label: t('clanLogs.leaveLog.label'), description: t('clanLogs.leaveLog.description'), icon: Users, color: 'red', exampleLink: 'https://discord.com/channels/923764211845312533/1128182846218055722' },
    { keys: ['donation_log'], label: t('clanLogs.donationLog.label'), description: t('clanLogs.donationLog.description'), icon: Gift, color: 'purple' },
    { keys: ['clan_achievement_log'], label: t('clanLogs.clanAchievementLog.label'), description: t('clanLogs.clanAchievementLog.description'), icon: Award, color: 'yellow' },
    { keys: ['clan_requirements_log'], label: t('clanLogs.clanRequirementsLog.label'), description: t('clanLogs.clanRequirementsLog.description'), icon: FileCheck, color: 'blue' },
    { keys: ['clan_description_log'], label: t('clanLogs.clanDescriptionLog.label'), description: t('clanLogs.clanDescriptionLog.description'), icon: MessageCircle, color: 'gray' },
    { keys: ['ban_alert'], label: t('clanLogs.banAlert.label'), description: t('clanLogs.banAlert.description'), icon: AlertCircle, color: 'red' },
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
    { keys: ['super_troop_boost'], label: t('playerLogs.superTroopBoostLog.label'), description: t('playerLogs.superTroopBoostLog.description'), icon: Zap, color: 'yellow', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['th_upgrade'], label: t('playerLogs.thUpgrade.label'), description: t('playerLogs.thUpgrade.description'), icon: Castle, color: 'orange', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['league_change'], label: t('playerLogs.leagueChange.label'), description: t('playerLogs.leagueChange.description'), icon: Target, color: 'purple', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['spell_upgrade'], label: t('playerLogs.spellUpgrade.label'), description: t('playerLogs.spellUpgrade.description'), icon: Star, color: 'blue', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['hero_upgrade'], label: t('playerLogs.heroUpgrade.label'), description: t('playerLogs.heroUpgrade.description'), icon: Shield, color: 'red', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['hero_equipment_upgrade'], label: t('playerLogs.heroEquipmentUpgrade.label'), description: t('playerLogs.heroEquipmentUpgrade.description'), icon: Shield, color: 'orange', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['name_change'], label: t('playerLogs.nameChange.label'), description: t('playerLogs.nameChange.description'), icon: Users, color: 'gray', exampleLink: 'https://discord.com/channels/923764211845312533/1128185014773874770' },
    { keys: ['legend_log_attacks'], label: t('playerLogs.legendLogAttacks.label'), description: t('playerLogs.legendLogAttacks.description'), icon: Trophy, color: 'yellow' },
    { keys: ['legend_log_defenses'], label: t('playerLogs.legendLogDefenses.label'), description: t('playerLogs.legendLogDefenses.description'), icon: Trophy, color: 'blue' },
  ];
  const SERVER_LOGS: LogTypeDefinition[] = [
    { keys: ['reddit_feed'], label: t('serverLogs.redditFeed.label'), description: t('serverLogs.redditFeed.description'), icon: ScrollText, color: 'orange', scope: 'server' },
  ];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [clans, setClans] = useState<ClanSummary[]>([]);
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const [selectedClan, setSelectedClan] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !guildId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getAccessToken();

        // Use cache to prevent duplicate requests
        const [channelsData, threadsData, clansData, logsData] = await Promise.all([
          apiCache.get(dashboardCacheKeys.channels(guildId), async () => {
            const res = await apiFetch(`/v2/server/${guildId}/channels`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch channels');
            return res.json();
          }),
          apiCache.get(`threads-${guildId}`, async () => {
            const res = await apiFetch(`/v2/server/${guildId}/threads`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch threads');
            return res.json();
          }).catch((error) => {
            console.error("Failed to fetch threads:", error);
            return [];
          }),
          apiCache.get(`server-clans-${guildId}`, async () => {
            const res = await apiFetch(`/v2/server/${guildId}/clans`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch clans');
            return res.json();
          }),
          apiCache.get(`server-logs-${guildId}`, async () => {
            const res = await apiFetch(`/v2/server/${guildId}/logs`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch logs');
            return res.json();
          })
        ]);

        setChannels(normalizeDestinationChannels(channelsData));
        setThreads(normalizeDestinationThreads(threadsData));
        setClans(clansData);
        setServerLogs((logsData as ServerLogsResponse).logs ?? []);

        if (clansData.length > 0) {
          setSelectedClan((current) => current || clansData[0].tag);
        }
      } catch (error) {
        console.error("Failed to fetch logs data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId, mounted]);

  const handleDestinationChange = async (
    logKeys: string[],
    channelId: string,
    threadId: string | null,
    serverScoped = false,
  ) => {
    if (!serverScoped && !selectedClan) return;
    if (getSelectedLog(logKeys, serverScoped)?.disabled) return;

    try {
      setSaving(logKeys[0]);
      const token = getAccessToken();

      const requestBody = {
        ...(!serverScoped ? { clan_tag: selectedClan } : {}),
        channel_id: channelId,
        thread_id: threadId,
        log_types: logKeys
      };

      const response = await apiFetch(`/v2/server/${guildId}/logs`, {
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

      apiCache.invalidate(`server-logs-${guildId}`);

      const logsRes = await apiFetch(`/v2/server/${guildId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (logsRes.ok) {
        const data = await logsRes.json() as ServerLogsResponse;
        setServerLogs(data.logs ?? []);
      }
    } catch (error) {
      console.error("Failed to update clan logs:", error);
    } finally {
      setSaving(null);
    }
  };

  const handleDisabledChange = async (logKeys: string[], disabled: boolean, serverScoped = false) => {
    if (!serverScoped && !selectedClan) return;

    try {
      setSaving(logKeys[0]);
      const token = getAccessToken();
      const response = await apiFetch(`/v2/server/${guildId}/logs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...(!serverScoped ? { clan_tag: selectedClan } : {}),
          log_types: logKeys,
          disabled
        })
      });

      if (!response.ok) {
        throw new Error('Failed to change clan log state');
      }

      apiCache.invalidate(`server-logs-${guildId}`);
      const logsRes = await apiFetch(`/v2/server/${guildId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (logsRes.ok) {
        const data = await logsRes.json() as ServerLogsResponse;
        setServerLogs(data.logs ?? []);
      }
    } catch (error) {
      console.error("Failed to change clan log state:", error);
    } finally {
      setSaving(null);
    }
  };

  const getCurrentClan = () => {
    return clans.find(c => c.tag === selectedClan);
  };

  const getSelectedLog = (logKeys: string[], serverScoped = false) => {
    return serverLogs.find(log => {
      const scopeMatches = serverScoped ? !log.clan_tag : log.clan_tag === selectedClan;
      return scopeMatches && logKeys.includes(log.type);
    });
  };

  const getSelectedChannelForLogs = (logKeys: string[], serverScoped = false) => {
    return getSelectedLog(logKeys, serverScoped)?.channel_id ?? "";
  };

  const getSelectedThreadForLogs = (logKeys: string[], serverScoped = false) => {
    return getSelectedLog(logKeys, serverScoped)?.thread_id ?? "";
  };

  const isLogConfigured = (logKeys: string[], serverScoped = false) => {
    return Boolean(getSelectedLog(logKeys, serverScoped)?.webhook_id);
  };

  const isLogEnabled = (logKeys: string[], serverScoped = false) => {
    const log = getSelectedLog(logKeys, serverScoped);
    return Boolean(log?.webhook_id) && !log?.disabled;
  };

  const countActiveLogs = () => {
    return serverLogs.filter(log => log.webhook_id && !log.disabled).length;
  };

  const countLogsWithIssues = () => {
    return serverLogs.filter(log => {
      if (!log.webhook_id || log.disabled) return false;
      return !isDestinationValid(log.channel_id, log.thread_id, channels, threads);
    }).length;
  };

  const countActiveLogsByDefinitions = (logDefinitions: LogTypeDefinition[]) => {
    return logDefinitions.filter(definition => isLogEnabled(definition.keys, definition.scope === "server")).length;
  };


  // Separate component for LogCard to use hooks properly
  const LogCard = ({ logDef, statusLoading = false }: { logDef: LogTypeDefinition; statusLoading?: boolean }) => { // NOSONAR — inline sub-component uses parent closures; complexity is structural JSX, not logic
    const Icon = logDef.icon;
    const currentClan = getCurrentClan();
    const serverScoped = logDef.scope === "server";
    const isStatusLoading = statusLoading || (!serverScoped && !currentClan);
    const isConfigured = isLogConfigured(logDef.keys, serverScoped);
    const isEnabled = isLogEnabled(logDef.keys, serverScoped);
    const selectedChannel = getSelectedChannelForLogs(logDef.keys, serverScoped);
    const selectedThread = getSelectedThreadForLogs(logDef.keys, serverScoped);
    const colors = getLogColorClasses(logDef.color);
    const [showEnableForm, setShowEnableForm] = useState(false);
    const [pendingChannel, setPendingChannel] = useState(selectedChannel);
    const [pendingThread, setPendingThread] = useState(selectedThread);
    const isSaving = saving === logDef.keys[0];

    const channelExists = selectedChannel && channels.some(ch => ch.id === selectedChannel);
    const destinationValid = isDestinationValid(selectedChannel, selectedThread, channels, threads);
    const draftChannel = pendingChannel || selectedChannel;
    const draftThread = pendingThread;
    const draftNeedsThread = destinationNeedsThread(draftChannel, channels);
    const channelThreads = draftChannel
      ? threads.filter(t => t.parent_channel_id === draftChannel)
      : [];
    const draftValid = isDestinationValid(
      draftChannel,
      draftThread || undefined,
      channels,
      threads,
    );
    const draftThreadMismatch = Boolean(draftThread) && !threads.some(
      (thread) => thread.id === draftThread && thread.parent_channel_id === draftChannel,
    );

    const saveDestination = async () => {
      if (!draftChannel || !draftValid) return;
      await handleDestinationChange(
        logDef.keys,
        draftChannel,
        draftThread || null,
        serverScoped,
      );
      setShowEnableForm(false);
    };

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
                      {' ('}
                      <a
                        href={logDef.exampleLink.replace('https://discord.com/channels/', 'discord://discord.com/channels/')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 underline"
                      >
                        {t('logCard.example')}
                      </a>
                      {')'}
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isStatusLoading && isEnabled && !destinationValid && !isSaving && (
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
                    aria-label={logDef.label}
                    checked={Boolean(isEnabled) || showEnableForm}
                    onCheckedChange={(checked) => {
                      if (checked && isConfigured) {
                        handleDisabledChange(logDef.keys, false, serverScoped);
                      } else if (checked) {
                        setShowEnableForm(true);
                      } else if (showEnableForm && !isConfigured) {
                        setShowEnableForm(false);
                      } else if (isConfigured) {
                        handleDisabledChange(logDef.keys, true, serverScoped);
                      }
                    }}
                    disabled={isSaving}
                    className={
                      showEnableForm && !isConfigured
                        ? 'data-[state=checked]:bg-blue-500'
                        : isEnabled && !destinationValid // NOSONAR — JSX nested ternary for multi-branch display state
                        ? 'data-[state=checked]:bg-orange-500'
                        : 'data-[state=checked]:bg-green-500'
                    }
                  />
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <span className={`text-xs font-medium ${
                      !isEnabled && !showEnableForm ? 'text-muted-foreground' : // NOSONAR — multi-branch state indicator, negations are intentional
                      showEnableForm && !isConfigured ? 'text-blue-600' : // NOSONAR — JSX nested ternary for multi-branch display state
                      destinationValid ? 'text-green-600' : 'text-orange-600' // NOSONAR — JSX nested ternary for multi-branch display state
                    }`}>
                      {!isEnabled && !showEnableForm ? t('logCard.off') :
                       showEnableForm && !isConfigured ? t('logCard.configuring') : // NOSONAR — JSX nested ternary for multi-branch display state
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
          ) : !isConfigured && !showEnableForm && !isSaving ? ( // NOSONAR — JSX nested ternary for multi-branch display state
            /* DISABLED STATE: Empty state */
            <div className="text-center py-6 text-muted-foreground text-sm">
              {t('logCard.enableToConfig')}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('logCard.channel')}</Label>
                <ChannelCombobox
                  channels={channels}
                  value={draftChannel}
                  onValueChange={(value) => {
                    setPendingChannel(value);
                    setPendingThread("");
                  }}
                  placeholder={t('logCard.channelPlaceholder')}
                  disabled={isSaving || (isConfigured && !isEnabled)}
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

              {draftChannel && (draftNeedsThread || channelThreads.length > 0) && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {draftNeedsThread ? t('logCard.forumPost') : t('logCard.thread')}
                  </Label>
                  <Select
                    value={draftThread || "none"}
                    onValueChange={(value) => setPendingThread(value === "none" ? "" : value)}
                    disabled={isSaving || (isConfigured && !isEnabled)}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder={
                        draftNeedsThread ? t('logCard.forumPostPlaceholder') : t('logCard.threadPlaceholder')
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {!draftNeedsThread && <SelectItem value="none">{t('logCard.noThread')}</SelectItem>}
                      {!draftNeedsThread && <Separator className="my-2" />}
                      {channelThreads.map((thread) => (
                        <SelectItem key={thread.id} value={thread.id}>
                          🧵 {thread.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {draftNeedsThread && !draftThread && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {t('logCard.forumPostRequired')}
                    </p>
                  )}
                  {draftThreadMismatch && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {t('logCard.invalidThread')}
                    </p>
                  )}
                </div>
              )}
              <Button
                type="button"
                size="sm"
                onClick={saveDestination}
                disabled={isSaving || !draftValid || (isConfigured && !isEnabled)}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('logCard.saveDestination')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 w-fit">
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('title')}</h1>
              <p className="text-muted-foreground mt-1">{t('description')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card border-border/50">
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-24 animate-pulse" />
                </CardHeader>
                <CardContent className="h-[96px] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-12 animate-pulse" />
                    <Skeleton className="h-8 w-8 animate-pulse rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-28 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2 min-h-[58px]">
            <Label className="text-sm text-muted-foreground">{t('clanSelector.label')}</Label>
            <div className="w-full md:w-[300px] h-10">
              <Skeleton className="h-10 w-full rounded-md border border-border animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("description")}
            </p>
          </div>
        </div>
        {/* Statistics Overview */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4 mb-8">
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
                  <div className="h-9 flex items-center text-3xl font-bold text-yellow-500">{clans.length}</div>
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
        {(loading || clans.length > 0) && (
          <div className="flex flex-col md:flex-row md:items-center gap-2 min-h-[58px]">
            <Label className="text-sm text-muted-foreground">{t('clanSelector.label')}</Label>
            {loading ? (
              <div className="w-full md:w-[300px] h-10">
                <Skeleton className="h-10 w-full rounded-md border border-border animate-pulse" />
              </div>
            ) : (
              <ClanCombobox
                clans={clans}
                value={selectedClan}
                onValueChange={setSelectedClan}
                placeholder={t('clanSelector.placeholder')}
                className="md:w-[300px]"
              />
            )}
          </div>
        )}

        <Tabs defaultValue="clan" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-lg border border-border bg-muted p-1 sm:grid-cols-2 lg:grid-cols-5 sm:gap-0">
            <TabsTrigger value="clan" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
              <Users className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              <span className="truncate">{t('tabs.clan')}</span>
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-blue-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : countActiveLogsByDefinitions(CLAN_LOGS)}
              </span>
            </TabsTrigger>
            <TabsTrigger value="war" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
              <Swords className="h-3.5 w-3.5 shrink-0 text-red-500" />
              <span className="truncate">{t('tabs.war')}</span>
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-red-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : countActiveLogsByDefinitions(WAR_LOGS)}
              </span>
            </TabsTrigger>
            <TabsTrigger value="capital" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
              <Castle className="h-3.5 w-3.5 shrink-0 text-purple-500" />
              <span className="truncate">{t('tabs.capital')}</span>
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-purple-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : countActiveLogsByDefinitions(CAPITAL_LOGS)}
              </span>
            </TabsTrigger>
            <TabsTrigger value="player" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-orange-500" />
              <span className="truncate">{t('tabs.player')}</span>
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-orange-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : countActiveLogsByDefinitions(PLAYER_LOGS)}
              </span>
            </TabsTrigger>
            <TabsTrigger value="server" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
              <ScrollText className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="truncate">{t('tabs.server')}</span>
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-amber-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : countActiveLogsByDefinitions(SERVER_LOGS)}
              </span>
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

          <TabsContent value="server" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {SERVER_LOGS.map(logDef => <LogCard key={logDef.keys[0]} logDef={logDef} statusLoading={loading} />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
