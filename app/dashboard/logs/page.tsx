"use client";
import { WarEventSettings } from "../clans/war-event-settings";

import { useGuildId } from "@/lib/dashboard-route";
import { dashboardEndpoints, type EndpointResponse } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";

import Image from "@/components/app-image";
import { townHallImageUrl } from "@/lib/theme";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import { useQueryClient } from "@tanstack/react-query";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";
import {
  destinationNeedsThread,
  isDestinationValid,
  normalizeDestinationChannels,
  normalizeDestinationThreads,
  type DiscordDestinationChannel,
  type DiscordDestinationThread,
} from "@/lib/discord-destinations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleCombobox } from "@/components/ui/role-combobox";
import type { DiscordRole } from "@/lib/api/types/roles";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { ClanCombobox } from "@/components/ui/clan-combobox";
import { JoinPanelSettings } from "@/components/dashboard/join-panel-settings";
import {
  Check,
  Users,
  Swords,
  Castle,
  TrendingUp,
  Trophy,
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
  ChevronDown,
  Clock3,
  ExternalLink,
  LayoutTemplate,
  RefreshCw,
} from "lucide-react";
import { clashKingAssets } from "@/lib/theme";

type Channel = DiscordDestinationChannel;
type Thread = DiscordDestinationThread;

interface ClanSummary {
  tag: string;
  name: string;
}

type ServerLog = EndpointResponse<typeof dashboardEndpoints.serverLogs>["logs"][number];

interface LogTypeDefinition {
  keys: string[];
  label: string;
  description: string;
  icon: any;
  color: string;
  scope?: "clan" | "server";
  exampleLink?: string;
}

type ClanLogTab = "clan" | "war" | "capital" | "player" | "countdowns";
type LogScope = "clan" | "server";
type ServerTab = "logs" | "countdowns" | "join-panel";
const SERVER_SCOPE_VALUE = "__server__";

interface ServerIdentity {
  name: string;
  icon: string | null;
}

type CountdownStatus = EndpointResponse<typeof dashboardEndpoints.serverCountdowns>["countdowns"][number];

const WAR_LOG_TYPES = new Set(["war_log", "war_panel", "cwl_lineup_change_log"]);
const CAPITAL_LOG_TYPES = new Set(["capital_donations", "capital_attacks", "raid_panel", "capital_weekly_summary"]);
const PLAYER_LOG_TYPES = new Set([
  "role_change", "troop_upgrade", "super_troop_boost", "th_upgrade", "league_change",
  "spell_upgrade", "hero_upgrade", "hero_equipment_upgrade", "name_change",
  "legend_log_attacks", "legend_log_defenses",
]);

function clanTabForLogType(logType: string): ClanLogTab {
  if (WAR_LOG_TYPES.has(logType)) return "war";
  if (CAPITAL_LOG_TYPES.has(logType)) return "capital";
  if (PLAYER_LOG_TYPES.has(logType)) return "player";
  return "clan";
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

function CountdownsPanel({ serverId, clanTag }: Readonly<{ serverId: string; clanTag?: string }>) {
  const t = useTranslations("LogsPage.countdowns");
  const [items, setItems] = useState<CountdownStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCountdowns = async () => {
    setLoading(true);
    setError(null);
    try {
      const body = clanTag
        ? await executeSharedEndpoint(dashboardEndpoints.clanCountdowns, {
            path: { serverId, clanTag },
            query: {},
            body: {},
          })
        : await executeSharedEndpoint(dashboardEndpoints.serverCountdowns, {
            path: { serverId },
            query: {},
            body: {},
          });
      setItems([...body.countdowns]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCountdowns();
    // Reload whenever the selected clan or server changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, clanTag]);

  const toggleCountdown = async (item: CountdownStatus, enabled: boolean) => {
    setPendingType(item.type);
    setError(null);
    try {
      if (enabled) {
        const body = await executeSharedEndpoint(dashboardEndpoints.enableCountdown, {
          path: { serverId },
          query: {},
          body: {
            countdown_type: item.type,
            ...(clanTag ? { clan_tag: clanTag } : {}),
          },
        });
        setItems((current) => current.map((countdown) => countdown.type === item.type
          ? { ...countdown, enabled: true, channel_id: body.channel_id }
          : countdown));
      } else {
        await executeSharedEndpoint(dashboardEndpoints.disableCountdown, {
          path: { serverId },
          query: {},
          body: {
          countdown_type: item.type,
          ...(clanTag ? { clan_tag: clanTag } : {}),
          },
        });
        setItems((current) => current.map((countdown) => countdown.type === item.type
          ? { ...countdown, enabled: false, channel_id: undefined }
          : countdown));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("updateError"));
    } finally {
      setPendingType(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((item) => <Skeleton key={item} className="h-20 w-full rounded-[20px]" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="rounded-[20px] bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-4 rounded-[20px] bg-card px-4 py-4 shadow-sm shadow-black/5 sm:px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-foreground">{t(`types.${item.type}.label`)}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{t(`types.${item.type}.description`)}</p>
          </div>
          {pendingType === item.type ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={item.enabled}
              onCheckedChange={(checked) => void toggleCountdown(item, checked)}
              aria-label={t("toggle", { name: t(`types.${item.type}.label`) })}
            />
          )}
        </div>
      ))}
      {items.length === 0 && (
        <div className="rounded-[20px] bg-muted/45 px-5 py-8 text-center text-sm text-muted-foreground">{t("empty")}</div>
      )}
    </div>
  );
}

export default function LogsPage() {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const t = useTranslations("LogsPage");
  const common = useTranslations("Common");
  const CLAN_LOGS: LogTypeDefinition[] = [
    { keys: ['donation_log'], label: t('clanLogs.donationLog.label'), description: t('clanLogs.donationLog.description'), icon: TrendingUp, color: 'green' },
    { keys: ['join_log'], label: t('clanLogs.joinLog.label'), description: t('clanLogs.joinLog.description'), icon: Users, color: 'green', exampleLink: 'https://discord.com/channels/923764211845312533/1128182552121839648' },
    { keys: ['leave_log'], label: t('clanLogs.leaveLog.label'), description: t('clanLogs.leaveLog.description'), icon: Users, color: 'red', exampleLink: 'https://discord.com/channels/923764211845312533/1128182846218055722' },
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
    { keys: ['clash_maintenance'], label: t('serverLogs.maintenance.label'), description: t('serverLogs.maintenance.description'), icon: ScrollText, color: 'orange', scope: 'server' },
    { keys: ['reddit_user_feed'], label: t('serverLogs.redditUserFeed.label'), description: t('serverLogs.redditUserFeed.description'), icon: ScrollText, color: 'orange', scope: 'server' },
    { keys: ['reddit_feed'], label: t('serverLogs.redditFeed.label'), description: t('serverLogs.redditFeed.description'), icon: ScrollText, color: 'orange', scope: 'server' },
  ];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dataError,setDataError]=useState<string|null>(null);
  const [saveErrors,setSaveErrors]=useState<Record<string,string>>({});
  const [reload,setReload]=useState(0);
  type LogDraft={saved?:boolean;channel:string;thread:string;show:boolean;redditRole:string;redditAccounts:string;redditMin:string;redditComments:boolean};
  const [logDrafts,setLogDrafts]=useState<Record<string,LogDraft>>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [clans, setClans] = useState<ClanSummary[]>([]);
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const [selectedClan, setSelectedClan] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [activeScope, setActiveScope] = useState<LogScope>("clan");
  const [activeClanTab, setActiveClanTab] = useState<ClanLogTab>("clan");
  const [activeServerTab, setActiveServerTab] = useState<ServerTab>("logs");
  const [serverIdentity, setServerIdentity] = useState<ServerIdentity>({ name: t("source.serverFallback"), icon: null });
  const focusedFromUrl = useRef(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(globalThis.location.search);
    if (params.get("scope") === "server") setActiveScope("server");
    const requestedServerTab = params.get("tab");
    if (requestedServerTab === "logs" || requestedServerTab === "countdowns" || requestedServerTab === "join-panel") {
      setActiveServerTab(requestedServerTab);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !guildId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setDataError(null);
        const threadsPromise = queryClient.fetchQuery(dashboardQueryOptions.threads(guildId)).catch((error) => {
          console.error("Failed to fetch threads:", error);
          return [];
        });
        const [channelsData, clansData, logsData, guildData, rolesData] = await Promise.all([
          queryClient.fetchQuery({...dashboardQueryOptions.channels(guildId),staleTime:0}),
          queryClient.fetchQuery(dashboardQueryOptions.clans(guildId)),
          queryClient.fetchQuery({
            queryKey: dashboardQueryKeys.route("logs", guildId),
            staleTime: 30_000,
            queryFn: async () => {
            return executeSharedEndpoint(dashboardEndpoints.serverLogs, {
              path: { serverId: guildId },
              query: {},
              body: {},
            });
            },
          }),
          queryClient.fetchQuery(dashboardQueryOptions.guild(guildId)).catch(() => null),
          queryClient.fetchQuery(dashboardQueryOptions.roles(guildId)).catch(() => ({ roles: [] })),
        ]);

        setChannels(normalizeDestinationChannels(channelsData));
        setRoles([...rolesData.roles]);
        setClans(clansData);
        setServerLogs([...logsData.logs]);
        if (guildData) setServerIdentity({ name: guildData.name, icon: guildData.icon });

        if (clansData.length > 0) {
          setSelectedClan((current) => current || clansData[0].tag);
        }
        void threadsPromise.then((threadsData) => setThreads(normalizeDestinationThreads(threadsData)));
      } catch (error) {
        setDataError(error instanceof Error?error.message:common("loadError"));
        console.error("Failed to fetch logs data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId, mounted, queryClient, reload, common]);

  const focusLog = (log: ServerLog) => {
    const serverScoped = !log.clan_tag;
    setActiveScope(serverScoped ? "server" : "clan");
    if (log.clan_tag) {
      setSelectedClan(log.clan_tag);
      setActiveClanTab(clanTabForLogType(log.type));
    }
    globalThis.setTimeout(() => {
      const card = document.getElementById(`log-${log.type}`);
      card?.focus({ preventScroll: true });
      card?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }, 0);
  };

  useEffect(() => {
    if (loading || focusedFromUrl.current || globalThis.window === undefined) return;
    const focusedLog = new URLSearchParams(globalThis.location.search).get("focus");
    if (!focusedLog) return;
    const log = serverLogs.find((item) => item.type === focusedLog);
    if (!log) return;
    focusedFromUrl.current = true;
    const serverScoped = !log.clan_tag;
    setActiveScope(serverScoped ? "server" : "clan");
    if (log.clan_tag) {
      setSelectedClan(log.clan_tag);
      setActiveClanTab(clanTabForLogType(log.type));
    }
    const timeoutId = globalThis.setTimeout(() => {
      const card = document.getElementById(`log-${log.type}`);
      card?.focus({ preventScroll: true });
      card?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }, 0);
    return () => globalThis.clearTimeout(timeoutId);
  }, [loading, serverLogs]);

  const handleDestinationChange = async (
    logKeys: string[],
    channelId: string,
    threadId: string | null,
    serverScoped = false,
    redditOptions?: { reddit_role_id: string | null; reddit_accounts?: string[]; reddit_min_townhall?: number|null; reddit_include_comments?: boolean },
  ) => {
    if (!serverScoped && !selectedClan) return;
    if (getSelectedLog(logKeys, serverScoped)?.disabled) return;
    const errorKey=`${guildId}:${serverScoped?"server":selectedClan}:${logKeys[0]}`;

    try {
      setSaveErrors(current=>({...current,[errorKey]:""}));
      setSaving(logKeys[0]);
      const requestBody = {
        ...(!serverScoped ? { clan_tag: selectedClan } : {}),
        channel_id: channelId,
        thread_id: threadId,
        log_types: logKeys,
        ...redditOptions,
      };

      setDataError(null);
      const saved=await executeSharedEndpoint(dashboardEndpoints.saveServerLogs, {
        path: { serverId: guildId },
        query: {},
        body: requestBody,
      });

      // The mutation returns its authoritative destination. A second read can
      // fail independently and must not make a successful save look undone.
      const updatedLogs=saved.logs??[];
      if(!logKeys.every(type=>updatedLogs.some(log=>log.type===type&&log.channel_id===channelId&&(log.thread_id??null)===threadId))) {
        throw new Error(common("error"));
      }
      setServerLogs(current=>[...current.filter(log=>!updatedLogs.some(next=>next.type===log.type&&(next.clan_tag??null)===(log.clan_tag??null))),...updatedLogs]);
      await queryClient.invalidateQueries({queryKey:dashboardQueryKeys.route("logs",guildId)});
      return true;
    } catch (error) {
      const message=error instanceof Error?error.message:common("error");
      setDataError(message);
      setSaveErrors(current=>({...current,[errorKey]:message}));
      console.error("Failed to update clan logs:", error);
      return false;
    } finally {
      setSaving(null);
    }
  };

  const handleDisabledChange = async (logKeys: string[], disabled: boolean, serverScoped = false) => {
    if (!serverScoped && !selectedClan) return;
    const errorKey = `${guildId}:${serverScoped ? "server" : selectedClan}:${logKeys[0]}`;

    try {
      setSaveErrors(current => ({ ...current, [errorKey]: "" }));
      setSaving(logKeys[0]);
      const result = await executeSharedEndpoint(dashboardEndpoints.updateServerLogsState, {
        path: { serverId: guildId },
        query: {},
        body: {
          ...(!serverScoped ? { clan_tag: selectedClan } : {}),
          log_types: logKeys,
          disabled
        },
      });

      const updated = result.logs ?? [];
      if (!logKeys.every(type => updated.some(log => log.type === type && log.disabled === disabled))) {
        throw new Error(common("error"));
      }
      // Apply the confirmed write directly. A second read can be stale or fail
      // independently. Keep channel_id when the state-only response omits it.
      const applyState = (logs: ServerLog[]) => logs.map(log => {
        const next = updated.find(item => item.type === log.type && (item.clan_tag ?? null) === (log.clan_tag ?? null));
        return next ? { ...log, ...next } : log;
      });
      setServerLogs(applyState);
      queryClient.setQueryData<EndpointResponse<typeof dashboardEndpoints.serverLogs>>(
        dashboardQueryKeys.route("logs", guildId),
        current => current ? { ...current, logs: applyState([...current.logs]) } : current,
      );
    } catch (error) {
      setSaveErrors(current => ({ ...current, [errorKey]: error instanceof Error ? error.message : common("error") }));
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

  const logsWithIssues = serverLogs.filter(log => {
      if (!log.webhook_id || log.disabled) return false;
      return !isDestinationValid(log.channel_id, log.thread_id ?? undefined, channels, threads);
    });

  const getDefinitionForLog = (logType: string) => {
    return [...CLAN_LOGS, ...WAR_LOGS, ...CAPITAL_LOGS, ...PLAYER_LOGS, ...SERVER_LOGS]
      .find((definition) => definition.keys.includes(logType));
  };


  // Render stable elements from parent-owned drafts. Defining a component here
  // remounted the form whenever channels/threads or saving state changed.
  const renderLogCard = ({ logDef, statusLoading = false }: { logDef: LogTypeDefinition; statusLoading?: boolean }) => {
    const Icon = logDef.icon;
    const currentClan = getCurrentClan();
    const serverScoped = logDef.scope === "server";
    const isStatusLoading = statusLoading || (!serverScoped && !currentClan);
    const isConfigured = isLogConfigured(logDef.keys, serverScoped);
    const isEnabled = isLogEnabled(logDef.keys, serverScoped);
    const selectedLog = getSelectedLog(logDef.keys, serverScoped);
    const selectedChannel = getSelectedChannelForLogs(logDef.keys, serverScoped);
    const selectedThread = getSelectedThreadForLogs(logDef.keys, serverScoped);
    const colors = getLogColorClasses(logDef.color);
    const isUserReddit = logDef.keys[0] === "reddit_user_feed";
    const isReddit = isUserReddit || logDef.keys[0] === "reddit_feed";
    const draftKey=`${guildId}:${serverScoped?"server":selectedClan}:${logDef.keys[0]}`;
    const defaults:LogDraft={channel:selectedChannel,thread:selectedThread,show:false,redditRole:selectedLog?.reddit_role_id??"",redditAccounts:(selectedLog?.reddit_accounts??[]).join(", "),redditMin:String(selectedLog?.reddit_min_townhall??"any"),redditComments:selectedLog?.reddit_include_comments??false};
    const draft=logDrafts[draftKey]??defaults;
    const updateDraft=(changes:Partial<LogDraft>)=>setLogDrafts(current=>({...current,[draftKey]:{...defaults,...current[draftKey],saved:false,...changes}}));
    const showEnableForm=draft.show,setShowEnableForm=(show:boolean)=>updateDraft({show});
    const pendingChannel=draft.channel,setPendingChannel=(channel:string)=>updateDraft({channel});
    const pendingThread=draft.thread,setPendingThread=(thread:string)=>updateDraft({thread});
    const redditRole=draft.redditRole,setRedditRole=(redditRole:string)=>updateDraft({redditRole});
    const redditAccounts=draft.redditAccounts,setRedditAccounts=(redditAccounts:string)=>updateDraft({redditAccounts});
    const redditMin=draft.redditMin, redditComments=draft.redditComments;
    const parsedAccounts = redditAccounts.split(",").map(value => value.trim().replace(/^u\//iu, "")).filter(Boolean);
    const accountsValid = !isUserReddit || (parsedAccounts.length >= 1 && parsedAccounts.length <= 2 && parsedAccounts.every(value => /^[a-z0-9_-]{1,30}$/iu.test(value)) && new Set(parsedAccounts.map(value=>value.toLowerCase())).size === parsedAccounts.length);
    const redditChanged = isReddit && (redditRole !== (selectedLog?.reddit_role_id ?? "") || JSON.stringify(parsedAccounts) !== JSON.stringify(selectedLog?.reddit_accounts ?? []) || redditMin !== String(selectedLog?.reddit_min_townhall??"any") || redditComments !== (selectedLog?.reddit_include_comments??false));
    const isSaving = saving === logDef.keys[0];

    const channelExists = selectedChannel && channels.some(ch => ch.id === selectedChannel);
    const destinationValid = isDestinationValid(selectedChannel, selectedThread, channels, threads);
    const draftChannel = pendingChannel || selectedChannel;
    const draftThread = pendingThread;
    const destinationChanged = !isConfigured || draftChannel !== selectedChannel || draftThread !== selectedThread || redditChanged;
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
      const saved=await handleDestinationChange(
        logDef.keys,
        draftChannel,
        draftThread || null,
        serverScoped,
        isReddit ? { reddit_role_id: redditRole || null, ...(isUserReddit ? {reddit_accounts:parsedAccounts,reddit_include_comments:redditComments} : {reddit_min_townhall:redditMin==="any"?null:Number(redditMin)}) } : undefined,
      );
      if(saved)updateDraft({show:false,saved:true});
    };

    return (
      <div
        id={`log-${logDef.keys[0]}`}
        key={logDef.keys[0]}
        tabIndex={-1}
        className="min-h-[220px] scroll-mt-24 rounded-[24px] bg-card p-5 shadow-sm shadow-black/5 outline-none transition-shadow focus:ring-2 focus:ring-primary/50 md:p-6"
      >
        <div className="min-h-[72px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colors.bg}`}>
                <Icon className={`h-4 w-4 ${colors.text}`} />
              </div>
              <div>
                <h3 className="text-base font-semibold leading-tight text-foreground">{logDef.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
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
                </p>
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
        </div>
        <div className="mt-4 min-h-[92px] space-y-3">
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
                  className={!channelExists && isEnabled
                    ? 'border-0 bg-orange-500/10 shadow-sm shadow-black/5 ring-1 ring-orange-500/35'
                    : 'border-0 bg-muted/55 shadow-sm shadow-black/5'}
                  showDisabled={false}
                />
                {!channelExists && isEnabled && !isSaving && !dataError && (
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {common("noChannelFound")}
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
                    <SelectTrigger className="border-0 bg-muted/55 shadow-sm shadow-black/5 focus:ring-ring/35">
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
                    <a
                      href={`https://discord.com/channels/${guildId}/${draftThread}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-1.5 text-xs text-destructive hover:underline"
                    >
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{t('logCard.invalidThread')}</span>
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                    </a>
                  )}
                </div>
              )}
              {isReddit && <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t("redditOptions.role")}</Label>
                  <RoleCombobox roles={roles} value={redditRole || "disabled"} onValueChange={value => setRedditRole(value === "disabled" ? "" : value)} disabled={isSaving || (isConfigured && !isEnabled)} />
                </div>
                {isUserReddit ? <><div className="space-y-1.5">
                  <Label htmlFor="reddit-authors">{t("redditOptions.authors")}</Label>
                  <Input id="reddit-authors" value={redditAccounts} onChange={event => setRedditAccounts(event.target.value)} disabled={isSaving || (isConfigured && !isEnabled)} aria-invalid={!accountsValid} placeholder="u/ClashKing, u/Recruiter" />
                  <p className="text-xs text-muted-foreground">{t("redditOptions.userHelp")}</p>
                </div><div className="flex items-center justify-between gap-3"><Label htmlFor="reddit-comments">{t("redditOptions.includeComments")}</Label><Switch id="reddit-comments" checked={redditComments} onCheckedChange={value=>updateDraft({redditComments:value})} disabled={isSaving || (isConfigured && !isEnabled)} /></div></> : <div className="space-y-1.5"><Label>{t("redditOptions.minimumTownHall")}</Label><Select value={redditMin} onValueChange={value=>updateDraft({redditMin:value})} disabled={isSaving || (isConfigured && !isEnabled)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">{t("redditOptions.anyTownHall")}</SelectItem>{Array.from({length:12},(_,i)=>18-i).map(level=><SelectItem key={level} value={String(level)}><span className="flex items-center gap-2"><Image src={townHallImageUrl(level)} alt="" width={24} height={24} className="size-6 object-contain" />TH{level}+</span></SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{t("redditOptions.minimumHelp")}</p></div>}
              </div>}
              <div className="flex h-9 items-center gap-2">{destinationChanged ? <Button
                type="button"
                size="sm"
                onClick={saveDestination}
                disabled={isSaving || !draftValid || (isReddit && !accountsValid) || (isConfigured && !isEnabled)}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('logCard.saveDestination')}
              </Button> : draft.saved ? <span role="status" className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" />Saved</span> : null}</div>
              {saveErrors[draftKey]&&<p role="alert" className="text-sm text-destructive">{saveErrors[draftKey]}</p>}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!mounted) return null;

  const clanLogTabs: Array<{
    value: ClanLogTab;
    label: string;
    definitions?: LogTypeDefinition[];
    artwork: ReactNode;
  }> = [
    { value: "clan", label: t("tabs.clan"), definitions: CLAN_LOGS, artwork: <Users /> },
    { value: "war", label: t("tabs.war"), definitions: WAR_LOGS, artwork: <Image src={clashKingAssets.icons.dc.war} alt="" width={22} height={22} unoptimized /> },
    { value: "capital", label: t("tabs.capital"), definitions: CAPITAL_LOGS, artwork: <Image src={clashKingAssets.resources.capitalGold} alt="" width={22} height={22} unoptimized /> },
    { value: "player", label: t("tabs.player"), definitions: PLAYER_LOGS, artwork: <Image src={clashKingAssets.icons.hv.xp} alt="" width={22} height={22} unoptimized /> },
    { value: "countdowns", label: t("tabs.countdowns"), artwork: <Clock3 /> },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex items-start justify-between gap-3">
          <div><h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("description")}</p></div>
          <Button type="button" variant="secondary" size="icon" disabled={loading} onClick={()=>setReload(value=>value+1)} aria-label={common("refresh")}><RefreshCw className="size-4" /></Button>
        </header>
        {dataError&&<div role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{dataError}</div>}

        {!loading && logsWithIssues.length > 0 && (
          <Collapsible>
            <section className="rounded-[20px] bg-orange-500/10 p-4 shadow-sm shadow-black/5 md:px-5" aria-labelledby="log-issues-title">
              <CollapsibleTrigger asChild>
                <button type="button" className="group flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35">
                  <AlertCircle className="h-5 w-5 shrink-0 text-orange-600" />
                  <h2 id="log-issues-title" className="min-w-0 flex-1 font-semibold text-foreground">
                    {t("issues.title", { count: logsWithIssues.length })}
                  </h2>
                  <span className="text-xs font-medium text-muted-foreground group-data-[state=open]:hidden">{t("issues.showDetails")}</span>
                  <span className="hidden text-xs font-medium text-muted-foreground group-data-[state=open]:inline">{t("issues.hideDetails")}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pl-8 pt-3">
                  <p className="text-sm text-muted-foreground">{t("issues.description")}</p>
                  <div className="mt-4 space-y-2">
                    {logsWithIssues.map((log) => {
                      const definition = getDefinitionForLog(log.type);
                      const clan = clans.find((item) => item.tag === log.clan_tag);
                      const channelExists = channels.some((channel) => channel.id === log.channel_id);
                      return (
                        <div key={`${log.clan_tag ?? "server"}-${log.type}`} className="flex flex-col gap-2 rounded-2xl bg-background/65 px-3 py-2.5 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{definition?.label ?? log.type}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {log.clan_tag ? `${clan?.name ?? log.clan_tag} · ${log.clan_tag}` : t("issues.serverScope")}
                              {" · "}
                              {channelExists ? t("issues.threadMissing") : t("issues.channelMissing", { channelId: log.channel_id ?? "—" })}
                            </p>
                          </div>
                          <Button type="button" size="sm" variant="secondary" className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted" onClick={() => focusLog(log)}>
                            {t("issues.review")}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>
        )}

        <section className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            {loading ? (
              <Skeleton className="h-12 w-full rounded-xl md:w-[340px]" />
            ) : (
              <div className="w-full md:w-[340px]">
                <Label htmlFor="logs-source" className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("source.label")}</Label>
                <ClanCombobox
                  id="logs-source"
                  clans={clans}
                  value={activeScope === "server" ? SERVER_SCOPE_VALUE : selectedClan}
                  onValueChange={(value) => {
                    if (value === SERVER_SCOPE_VALUE) {
                      setActiveScope("server");
                    } else {
                      setSelectedClan(value);
                      setActiveScope("clan");
                    }
                  }}
                  placeholder={t("source.placeholder")}
                  searchPlaceholder={t("source.searchPlaceholder")}
                  specialOptions={[{
                    value: SERVER_SCOPE_VALUE,
                    label: serverIdentity.name,
                    description: t("source.serverDescription"),
                    imageUrl: serverIdentity.icon,
                    fallback: serverIdentity.name.slice(0, 2).toUpperCase(),
                  }]}
                  className="border-0 bg-muted/55 shadow-sm shadow-black/5 focus-visible:ring-ring/35"
                />
              </div>
            )}
          </div>

          {activeScope === "clan" ? (
            <section className="space-y-5">
              {!loading && clans.length === 0 ? (
                <div className="rounded-[20px] bg-muted/45 px-5 py-8 text-center text-sm text-muted-foreground">
                  {t("emptyClans")}
                </div>
              ) : (
                <Tabs value={activeClanTab} onValueChange={(value) => setActiveClanTab(value as ClanLogTab)} className="space-y-5">
                  <DashboardTabsList className="grid-cols-2 lg:grid-cols-5">
                    {clanLogTabs.map((tab) => (
                      <DashboardTabTrigger key={tab.value} value={tab.value} artwork={tab.artwork}>{tab.label}</DashboardTabTrigger>
                    ))}
                  </DashboardTabsList>
                  {clanLogTabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value} className="mt-0">
                      {tab.value === "countdowns" ? (
                        selectedClan && <div className="space-y-3"><WarEventSettings key={`war:${guildId}:${selectedClan}`} serverId={guildId} clanTag={selectedClan} /><CountdownsPanel serverId={guildId} clanTag={selectedClan} /></div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          {tab.definitions?.map((logDef) => renderLogCard({logDef,statusLoading:loading}))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </section>
          ) : (
            <section className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("scope.serverTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("scope.serverDescription")}</p>
              </div>
              <Tabs value={activeServerTab} onValueChange={(value) => setActiveServerTab(value as ServerTab)} className="space-y-5">
                <DashboardTabsList className="grid-cols-3">
                  <DashboardTabTrigger value="logs" artwork={<ScrollText />}>{t("serverTabs.logs")}</DashboardTabTrigger>
                  <DashboardTabTrigger value="countdowns" artwork={<Clock3 />}>{t("serverTabs.countdowns")}</DashboardTabTrigger>
                  <DashboardTabTrigger value="join-panel" artwork={<LayoutTemplate />}>{t("serverTabs.joinPanel")}</DashboardTabTrigger>
                </DashboardTabsList>
                <TabsContent value="logs" className="mt-0">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {SERVER_LOGS.map((logDef) => renderLogCard({logDef,statusLoading:loading}))}
                  </div>
                </TabsContent>
                <TabsContent value="countdowns" className="mt-0">
                  <CountdownsPanel serverId={guildId} />
                </TabsContent>
                <TabsContent value="join-panel" className="mt-0">
                  <JoinPanelSettings embedded />
                </TabsContent>
              </Tabs>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}
