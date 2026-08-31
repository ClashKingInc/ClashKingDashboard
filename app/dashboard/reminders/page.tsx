"use client";

import { useGuildId } from "@/lib/dashboard-route";
import { getAccessToken } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/fetch";


import Image from "next/image";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clanBadgeUrl } from "@/lib/clash-asset-urls";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";
import { clashKingAssets } from "@/lib/theme";
import {
  destinationNeedsThread,
  isDestinationValid,
  normalizeDestinationChannels,
  normalizeDestinationThreads,
  type DiscordDestinationChannel,
  type DiscordDestinationThread,
} from "@/lib/discord-destinations";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { DiscordOpenPopover } from "@/components/ui/discord-open-popover";
import { ClanProfilePopover } from "@/components/ui/clan-profile-popover";
import { ClanCombobox } from "@/components/ui/clan-combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Loader2,
  UserX,
  Edit2,
  Copy,
  ChevronDown,
  Ellipsis,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getStandaloneImageUrl, getStandaloneTenorUrl } from "./reminder-utils";

// API types based on ClashKingAPI reminders endpoints
type ReminderType = "War" | "Clan Capital" | "Clan Games" | "Inactivity";
interface ReminderConfig {
  id: string;
  type: ReminderType;
  clan_tag?: string;
  channel_id?: string;
  thread_id?: string | null;
  time: string;
  custom_text?: string;
  townhall_filter?: number[];
  roles?: string[];
  war_types?: string[];
  point_threshold?: number;
  attack_threshold?: number;
  roster_id?: string;
  ping_type?: string;
}

interface ServerRemindersResponse {
  war_reminders: ReminderConfig[];
  capital_reminders: ReminderConfig[];
  clan_games_reminders: ReminderConfig[];
  inactivity_reminders: ReminderConfig[];
}

interface CreateReminderRequest {
  type: string;
  clan_tag?: string;
  channel_id: string;
  thread_id: string | null;
  time: string;
  custom_text?: string;
  townhall_filter?: number[];
  roles?: string[];
  war_types?: string[];
  point_threshold?: number;
  attack_threshold?: number;
  roster_id?: string;
  ping_type?: string;
}

interface Clan {
  tag: string;
  name: string;
  badge_url?: string | null;
  clan_badge_url?: string | null;
  badge?: string | null;
}

type Channel = DiscordDestinationChannel;
type Thread = DiscordDestinationThread;

const POINT_THRESHOLD_MIN = 0;
const POINT_THRESHOLD_MAX = 10000;
const ATTACK_THRESHOLD_MIN = 1;
const ATTACK_THRESHOLD_MAX = 5;

const TAB_TO_REMINDER_KEY: Record<string, keyof ServerRemindersResponse> = {
  war: "war_reminders",
  capital: "capital_reminders",
  games: "clan_games_reminders",
  inactivity: "inactivity_reminders",
};

const REMINDER_TYPE_TO_TAB: Record<ReminderType, string> = {
  War: "war",
  "Clan Capital": "capital",
  "Clan Games": "games",
  Inactivity: "inactivity",
};

const TYPE_TIME_LIMIT: Record<string, number> = {
  War: 48,
  "Clan Games": 336,
  "Clan Capital": 168,
};

function formatChannelLabel(channel: Channel | undefined): string | null {
  if (!channel) return null;
  if (channel.parent_name) {
    return `${channel.parent_name} / #${channel.name}`;
  }

  return `#${channel.name}`;
}

function getTimeLimit(type: string | undefined): number {
  return TYPE_TIME_LIMIT[type ?? ""] ?? 24;
}

function getClanBadgeUrl(clanTag: string | undefined): string | null {
  if (!clanTag) return null;
  return clanBadgeUrl(clanTag);
}

export default function RemindersPage() { // NOSONAR — React page component: complexity is aggregate state/handler management, not a single logic unit
  const guildId = useGuildId();
  const locale = useLocale();
  const { toast } = useToast();
  const t = useTranslations("RemindersPage");
  const tCommon = useTranslations("Common");
  const queryClient = useQueryClient();
  const guildQuery = useQuery({
    ...dashboardQueryOptions.guild(guildId),
    enabled: Boolean(guildId),
  });
  const guildIcon = guildQuery.data?.icon?.startsWith("https") ? guildQuery.data.icon : null;
  const guildFallback = (guildQuery.data?.name ?? "Server")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  const reminderTypes = [
    { value: "War", label: t('types.war') },
    { value: "Clan Capital", label: t('types.capital') },
    { value: "Clan Games", label: t('types.clanGames') },
    { value: "Inactivity", label: t('types.inactivity') },
  ];

  const [reminders, setReminders] = useState<ServerRemindersResponse>({
    war_reminders: [],
    capital_reminders: [],
    clan_games_reminders: [],
    inactivity_reminders: [],
  });
  const [clans, setClans] = useState<Clan[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedClan, setSelectedClan] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("war");
  const newReminderRef = useRef<HTMLDivElement>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderConfig | null>(null);
  const [dialogReminder, setDialogReminder] = useState<Partial<ReminderConfig>>({});
  const [pointThresholdTouched, setPointThresholdTouched] = useState(false);
  const [attackThresholdTouched, setAttackThresholdTouched] = useState(false);
  const [cloningReminder, setCloningReminder] = useState<ReminderConfig | null>(null);
  const [cloneClanTag, setCloneClanTag] = useState("");

  // Fetch clans and reminders from API
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const accessToken = getAccessToken() ?? "";

        const clansPromise = queryClient
          .fetchQuery(dashboardQueryOptions.clans(guildId))
          .catch((clanError) => {
            // Keep reminders usable even if clan metadata is temporarily unavailable.
            console.warn("Failed to fetch clans for reminders page:", clanError);
            return [] as Clan[];
          });

        // Shared metadata queries deduplicate these requests across dashboard routes.
        const [clansRes, channelsRes, threadsRes, remindersRes] = await Promise.all([
          clansPromise,
          queryClient.fetchQuery(dashboardQueryOptions.channels(guildId)),
          queryClient.fetchQuery(dashboardQueryOptions.threads(guildId)),
          queryClient.fetchQuery({
            queryKey: dashboardQueryKeys.route("reminders", guildId),
            queryFn: async ({ signal }) => {
              const response = await apiFetch(`/v2/server/${guildId}/reminders`, {
                signal,
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              });
              if (!response.ok) throw new Error(`Failed to fetch reminders: ${response.statusText}`);
              return response.json() as Promise<ServerRemindersResponse>;
            },
          }),
        ]);

        // Parse clans
        setClans(clansRes || []);

        // Parse channels
        setChannels(normalizeDestinationChannels(channelsRes));
        setThreads(normalizeDestinationThreads(threadsRes));

        // Parse reminders
        const remindersData = remindersRes;
        setReminders({
          war_reminders: remindersData.war_reminders || [],
          capital_reminders: remindersData.capital_reminders || [],
          clan_games_reminders: remindersData.clan_games_reminders || [],
          inactivity_reminders: remindersData.inactivity_reminders || [],
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : t('toast.errorLoadingReminders'));
        toast({
          title: t('toast.errorTitle'),
          description: t('toast.errorLoadingReminders'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchReminders();
    }
  }, [guildId, locale, queryClient, t, toast]);

  // Get reminders for current tab
  const getCurrentReminders = (): ReminderConfig[] => {
    let currentReminders: ReminderConfig[] = [];
    switch (activeTab) {
      case "war":
        currentReminders = reminders.war_reminders;
        break;
      case "capital":
        currentReminders = reminders.capital_reminders;
        break;
      case "games":
        currentReminders = reminders.clan_games_reminders;
        break;
      case "inactivity":
        currentReminders = reminders.inactivity_reminders;
        break;
    }

    // Filter by selected clan if needed
    if (selectedClan && selectedClan !== "all") {
      currentReminders = currentReminders.filter(r => r.clan_tag === selectedClan);
    }

    // Sort by time
    const sorted = [...currentReminders].sort((a, b) => {
      const hoursA = Number.parseFloat(extractHours(a.time));
      const hoursB = Number.parseFloat(extractHours(b.time));

      // For inactivity: ascending order (soonest first)
      // For others: descending order (furthest first)
      if (activeTab === "inactivity") {
        return hoursA - hoursB;
      } else {
        return hoursB - hoursA;
      }
    });

    return sorted;
  };

  const getEmptyStateTitle = (tab: string): string => {
    if (tab === "war") return t('empty.noWarReminders');
    if (tab === "capital") return t('empty.noCapitalReminders');
    if (tab === "games") return t('empty.noClanGamesReminders');
    return t('empty.noInactivityReminders');
  };

  // Add a new reminder
  const addReminder = () => {
    const typeMap: { [key: string]: "War" | "Clan Capital" | "Clan Games" | "Inactivity" } = {
      war: "War",
      capital: "Clan Capital",
      games: "Clan Games",
      inactivity: "Inactivity",
    };

    const newReminder: Partial<ReminderConfig> = {
      type: typeMap[activeTab],
      channel_id: "",
      thread_id: null,
      time: "",
      custom_text: "",
      clan_tag: selectedClan === "all" ? clans[0]?.tag || "" : selectedClan,
      war_types: activeTab === "war" ? ["Random", "Friendly", "CWL"] : undefined,
      townhall_filter: [],
      roles: [],
      point_threshold: activeTab === "games" ? 4000 : undefined,
      attack_threshold: activeTab === "capital" ? 1 : undefined,
    };

    setDialogReminder(newReminder);
    setEditingReminder(null);
    setPointThresholdTouched(false);
    setAttackThresholdTouched(false);
    setIsDialogOpen(true);
  };

  // Edit an existing reminder
  const editReminder = (reminder: ReminderConfig) => {
    setEditingReminder(reminder);

    // Extract the number from "X hr" format for display in input
    let displayTime = reminder.time;
    const timeMatch = /^(\d+(?:\.\d+)?)\s+hr$/.exec(reminder.time ?? '');
    if (timeMatch) {
      displayTime = timeMatch[1];
    }

    setDialogReminder({ ...reminder, time: displayTime });
    setPointThresholdTouched(reminder.point_threshold !== undefined);
    setAttackThresholdTouched(reminder.attack_threshold !== undefined);
    setIsDialogOpen(true);
  };

  const openCloneDialog = (reminder: ReminderConfig) => {
    const firstDifferentClan = clans.find((clan) => clan.tag !== reminder.clan_tag);
    setCloningReminder(reminder);
    setCloneClanTag(firstDifferentClan?.tag ?? "");
  };

  const closeCloneDialog = () => {
    if (saving) return;
    setCloningReminder(null);
    setCloneClanTag("");
  };

  const cloneReminder = async () => {
    if (!cloningReminder || !cloneClanTag || cloneClanTag === cloningReminder.clan_tag) return;

    try {
      setSaving(true);
      const accessToken = getAccessToken();
      const createRequest: CreateReminderRequest = {
        type: cloningReminder.type,
        clan_tag: cloneClanTag,
        channel_id: cloningReminder.channel_id || "",
        thread_id: cloningReminder.thread_id || null,
        time: cloningReminder.time,
        custom_text: cloningReminder.custom_text,
        townhall_filter: cloningReminder.townhall_filter,
        roles: cloningReminder.roles,
        war_types: cloningReminder.war_types,
        point_threshold: cloningReminder.point_threshold,
        attack_threshold: cloningReminder.attack_threshold,
        roster_id: cloningReminder.roster_id,
        ping_type: cloningReminder.ping_type,
      };

      const response = await apiFetch(`/v2/server/${guildId}/reminders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createRequest),
      });
      if (!response.ok) throw new Error(`Failed to clone reminder: ${response.statusText}`);

      const refreshedResponse = await apiFetch(`/v2/server/${guildId}/reminders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (refreshedResponse.ok) {
        const data: ServerRemindersResponse = await refreshedResponse.json();
        queryClient.setQueryData(dashboardQueryKeys.route("reminders", guildId), data);
        setReminders({
          war_reminders: data.war_reminders || [],
          capital_reminders: data.capital_reminders || [],
          clan_games_reminders: data.clan_games_reminders || [],
          inactivity_reminders: data.inactivity_reminders || [],
        });
      }

      toast({
        title: t('toast.successTitle'),
        description: t('toast.reminderCloned'),
      });
      setCloningReminder(null);
      setCloneClanTag("");
    } catch (err) {
      console.error("Error cloning reminder:", err);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.failedToClone'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Update dialog reminder field
  const updateDialogField = (field: keyof ReminderConfig, value: any) => {
    setDialogReminder(prev => {
      const updated: Partial<ReminderConfig> = { ...prev, [field]: value };

      if (field === "type") {
        if (value === "Clan Games" && updated.point_threshold === undefined && !pointThresholdTouched) {
          updated.point_threshold = 4000;
        }
        if (value === "Clan Capital" && updated.attack_threshold === undefined && !attackThresholdTouched) {
          updated.attack_threshold = 1;
        }
      }

      return updated;
    });
  };

  // Extract hours number from "X hr" format
  const extractHours = (timeString: string): string => {
    const match = /^(\d+(?:\.\d+)?)\s+hr$/.exec(timeString ?? ''); // NOSONAR — anchored regex, backtracking is bounded by ^ and $
    return match ? match[1] : timeString;
  };

  const getMaxHours = (type: string): number => {
    switch (type) {
      case "War": return 48;
      case "Clan Games": return 336;
      case "Clan Capital": return 168;
      default: return 0;
    }
  };

  const isTimeValid = (time: string, type: string): boolean => {
    if (!time) return false;
    const hours = Number.parseFloat(time);
    if (Number.isNaN(hours) || hours <= 0) return false;
    const max = getMaxHours(type);
    if (max === 0) return true; // Inactivity
    return hours <= max;
  };

  const isPointsValid = (points: number | undefined): boolean => {
    if (points === undefined || points === null) return false;
    return points >= POINT_THRESHOLD_MIN && points <= POINT_THRESHOLD_MAX;
  };

  const isAttacksValid = (attacks: number | undefined): boolean => {
    if (attacks === undefined || attacks === null) return false;
    return attacks >= ATTACK_THRESHOLD_MIN && attacks <= ATTACK_THRESHOLD_MAX;
  };

  // Validate time based on reminder type
  const validateTime = (timeString: string, reminderType: string): boolean => {
    if (!timeString) return false;

    // Parse as decimal number (hours)
    const hours = Number.parseFloat(timeString);
    if (Number.isNaN(hours) || hours <= 0) return false;

    // Define max hours based on type
    let maxHours: number;
    switch (reminderType) {
      case "War":
        maxHours = 48; // 2 days
        break;
      case "Clan Games":
        maxHours = 336; // 2 weeks (14 days)
        break;
      case "Clan Capital":
        maxHours = 168; // 7 days
        break;
      case "Inactivity":
        return true; // No limit
      default:
        maxHours = 48;
    }

    return hours <= maxHours;
  };

  // Delete a reminder
  const deleteReminder = async (index: number) => {
    const currentReminders = getCurrentReminders();
    const reminder = currentReminders[index];

    // If reminder has a real ID (not temporary), delete it from the API
    if (!reminder.id.startsWith('temp-')) {
      try {
        setSaving(true);
        const accessToken = getAccessToken();
        const response = await apiFetch(`/v2/server/${guildId}/reminders/${reminder.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete reminder');
        }

        toast({
          title: t('toast.successTitle'),
          description: t('toast.reminderDeleted'),
        });
      } catch (err) {
        console.error("Error deleting reminder:", err);
        toast({
          title: t('toast.errorTitle'),
          description: t('toast.failedToDelete'),
          variant: "destructive",
        });
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    // Remove from local state
    const updatedReminders = { ...reminders };
    const key = TAB_TO_REMINDER_KEY[activeTab] ?? "war_reminders";
    updatedReminders[key] = updatedReminders[key].filter(r => r.id !== reminder.id);
    setReminders(updatedReminders);
    queryClient.setQueryData(dashboardQueryKeys.route("reminders", guildId), updatedReminders);
  };

  // Save a single reminder from dialog
  const handleSaveReminder = async () => { // NOSONAR — complexity comes from multi-type reminder validation, not a single logic unit
    try {
      // Validate time based on reminder type
      if (!validateTime(dialogReminder.time || "", dialogReminder.type || "")) {
        toast({
          title: t('toast.errorTitle'),
          description: t('toast.timeExceedsLimit', {
            limit: getTimeLimit(dialogReminder.type),
            type: dialogReminder.type || "reminder"
          }),
          variant: "destructive",
        });
        return;
      }

      if (!isDestinationValid(
        dialogReminder.channel_id,
        dialogReminder.thread_id ?? undefined,
        channels,
        threads,
      )) {
        toast({
          title: t('toast.errorTitle'),
          description: destinationNeedsThread(dialogReminder.channel_id, channels)
            ? t('toast.forumPostRequired')
            : t('toast.invalidDestination'),
          variant: "destructive",
        });
        return;
      }

      // Validate clan games point threshold
      if (dialogReminder.type === "Clan Games") {
        const points = dialogReminder.point_threshold;
        if (
            points === undefined ||
            points === null ||
            points < POINT_THRESHOLD_MIN ||
            points > POINT_THRESHOLD_MAX
        ) {
          toast({
            title: t('toast.errorTitle'),
            description: t('toast.pointThresholdInvalid', {
              min: POINT_THRESHOLD_MIN,
              max: POINT_THRESHOLD_MAX,
            }),
            variant: "destructive",
          });
          return;
        }
      }

      if (dialogReminder.type === "Clan Capital") {
        const attacks = dialogReminder.attack_threshold;
        if (
            attacks === undefined ||
            attacks === null ||
            attacks < ATTACK_THRESHOLD_MIN ||
            attacks > ATTACK_THRESHOLD_MAX
        ) {
          toast({
            title: t('toast.errorTitle'),
            description: t('toast.attackThresholdInvalid', {
              min: ATTACK_THRESHOLD_MIN,
              max: ATTACK_THRESHOLD_MAX,
            }),
            variant: "destructive",
          });
          return;
        }
      }

      setSaving(true);
      const accessToken = getAccessToken();
      // Add " hr" suffix to time before sending to API
      const timeWithUnit = `${dialogReminder.time} hr`;

      const isNew = !editingReminder;

      if (isNew) {
        // Create new reminder
        const createRequest: CreateReminderRequest = {
          type: dialogReminder.type!,
          clan_tag: dialogReminder.clan_tag,
          channel_id: dialogReminder.channel_id || "",
          thread_id: dialogReminder.thread_id || null,
          time: timeWithUnit,
          custom_text: dialogReminder.custom_text,
          townhall_filter: dialogReminder.townhall_filter,
          roles: dialogReminder.roles,
          war_types: dialogReminder.war_types,
          point_threshold: dialogReminder.point_threshold,
          attack_threshold: dialogReminder.attack_threshold,
          roster_id: dialogReminder.roster_id,
          ping_type: dialogReminder.ping_type,
        };

        const response = await apiFetch(`/v2/server/${guildId}/reminders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createRequest),
        });

        if (!response.ok) {
          throw new Error(`Failed to create reminder: ${response.statusText}`);
        }

        toast({
          title: t('toast.successTitle'),
          description: t('toast.reminderAdded'),
        });
      } else {
        // Update existing reminder
        const updateRequest = {
          type: dialogReminder.type, // Include type for validation
          channel_id: dialogReminder.channel_id,
          thread_id: dialogReminder.thread_id || null,
          time: timeWithUnit,
          custom_text: dialogReminder.custom_text,
          townhall_filter: dialogReminder.townhall_filter,
          roles: dialogReminder.roles,
          war_types: dialogReminder.war_types,
          point_threshold: dialogReminder.point_threshold,
          attack_threshold: dialogReminder.attack_threshold,
          ping_type: dialogReminder.ping_type,
        };

        const response = await apiFetch(`/v2/server/${guildId}/reminders/${editingReminder.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateRequest),
        });

        if (!response.ok) {
          throw new Error(`Failed to update reminder: ${response.statusText}`);
        }

        toast({
          title: t('toast.successTitle'),
          description: t('toast.reminderUpdated'),
        });
      }

      // Refresh reminders from API
      const response = await apiFetch(`/v2/server/${guildId}/reminders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: ServerRemindersResponse = await response.json();
        queryClient.setQueryData(dashboardQueryKeys.route("reminders", guildId), data);
        setReminders({
          war_reminders: data.war_reminders || [],
          capital_reminders: data.capital_reminders || [],
          clan_games_reminders: data.clan_games_reminders || [],
          inactivity_reminders: data.inactivity_reminders || [],
        });
      }

      // Close dialog
      setIsDialogOpen(false);
      setDialogReminder({});
      setEditingReminder(null);
    } catch (err) {
      console.error("Error saving reminder:", err);
      toast({
        title: t('toast.errorTitle'),
        description: err instanceof Error ? err.message : t('toast.failedToSave'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-[20px] bg-destructive/10 p-6 shadow-sm shadow-black/5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h1 className="font-semibold text-destructive">{t('toast.errorTitle')}</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => globalThis.window.location.reload()} className="mt-5 w-full">
            {t('actions.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const currentReminders = getCurrentReminders();
  const getVisibleCount = (items: ReminderConfig[]) => (
    selectedClan === "all" ? items.length : items.filter((reminder) => reminder.clan_tag === selectedClan).length
  );
  const warReminderCount = getVisibleCount(reminders.war_reminders);
  const capitalReminderCount = getVisibleCount(reminders.capital_reminders);
  const gamesReminderCount = getVisibleCount(reminders.clan_games_reminders);
  const inactivityReminderCount = getVisibleCount(reminders.inactivity_reminders);
  const dialogChannelThreads = threads.filter(
    (thread) => thread.parent_channel_id === dialogReminder.channel_id,
  );
  const dialogNeedsThread = destinationNeedsThread(dialogReminder.channel_id, channels);
  const dialogDestinationValid = isDestinationValid(
    dialogReminder.channel_id,
    dialogReminder.thread_id ?? undefined,
    channels,
    threads,
  );
  const allReminders = [
    ...reminders.war_reminders,
    ...reminders.capital_reminders,
    ...reminders.clan_games_reminders,
    ...reminders.inactivity_reminders,
  ];
  const remindersWithIssues = allReminders.filter((reminder) => !isDestinationValid(
    reminder.channel_id,
    reminder.thread_id ?? undefined,
    channels,
    threads,
  ));
  const tabDefinitions: Array<{
    value: string;
    label: string;
    count: number;
    artwork: ReactNode;
  }> = [
    {
      value: "war",
      label: t('tabs.war'),
      count: warReminderCount,
      artwork: <Image src={clashKingAssets.icons.dc.war} alt="" width={22} height={22} unoptimized />,
    },
    {
      value: "capital",
      label: t('tabs.capital'),
      count: capitalReminderCount,
      artwork: <Image src={clashKingAssets.resources.capitalGold} alt="" width={22} height={22} unoptimized />,
    },
    {
      value: "games",
      label: t('tabs.clanGames'),
      count: gamesReminderCount,
      artwork: <Image src={clashKingAssets.icons.hv.clanGames} alt="" width={22} height={22} unoptimized />,
    },
    {
      value: "inactivity",
      label: t('tabs.inactivity'),
      count: inactivityReminderCount,
      artwork: <UserX />,
    },
  ];

  return (
    <div className="min-h-[calc(100vh+1px)] bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('description')}</p>
        </header>

        {!loading && remindersWithIssues.length > 0 && (
          <Collapsible>
            <section className="rounded-[20px] bg-orange-500/10 p-4 shadow-sm shadow-black/5 md:px-5" aria-labelledby="reminder-issues-title">
              <CollapsibleTrigger asChild>
                <button type="button" className="group flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35">
                  <AlertCircle className="h-5 w-5 shrink-0 text-orange-600" />
                  <h2 id="reminder-issues-title" className="min-w-0 flex-1 font-semibold text-foreground">
                    {t('issues.title', { count: remindersWithIssues.length })}
                  </h2>
                  <span className="text-xs font-medium text-muted-foreground group-data-[state=open]:hidden">{t('issues.showDetails')}</span>
                  <span className="hidden text-xs font-medium text-muted-foreground group-data-[state=open]:inline">{t('issues.hideDetails')}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pl-8 pt-3">
                  <p className="text-sm text-muted-foreground">{t('issues.description')}</p>
                  <div className="mt-4 space-y-2">
                    {remindersWithIssues.map((reminder) => {
                      const clan = clans.find((item) => item.tag === reminder.clan_tag);
                      const channelExists = channels.some((channel) => channel.id === reminder.channel_id);
                      const typeLabel = reminderTypes.find((type) => type.value === reminder.type)?.label ?? reminder.type;
                      return (
                        <div key={reminder.id} className="flex flex-col gap-2 rounded-2xl bg-background/65 px-3 py-2.5 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{typeLabel}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {clan?.name ?? reminder.clan_tag ?? t('card.notSet')}
                              {" · "}
                              {channelExists ? t('issues.threadMissing') : t('issues.channelMissing', { channelId: reminder.channel_id ?? "—" })}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted"
                            onClick={() => {
                              setActiveTab(REMINDER_TYPE_TO_TAB[reminder.type]);
                              if (reminder.clan_tag) setSelectedClan(reminder.clan_tag);
                              editReminder(reminder);
                            }}
                          >
                            {t('issues.review')}
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

        <section className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('section.title')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('section.description')}</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:items-end">
            {(loading || clans.length > 0) && (
              <div className="w-full sm:w-[300px]">
                {loading ? (
                  <Skeleton className="h-12 w-full rounded-xl" />
                ) : (
                  <>
                    <Label htmlFor="reminders-clan" className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('clanSelector.label')}</Label>
                    <ClanCombobox
                      id="reminders-clan"
                      clans={clans}
                      value={selectedClan}
                      onValueChange={setSelectedClan}
                      placeholder={t('clanSelector.placeholder')}
                      specialOptions={[{
                        value: "all",
                        label: t('clanSelector.allClans'),
                        imageUrl: guildIcon,
                        fallback: guildFallback,
                      }]}
                      className="border-0 bg-muted/55 shadow-sm shadow-black/5 focus-visible:ring-ring/35"
                    />
                  </>
                )}
              </div>
            )}
            <Button onClick={addReminder} className="h-12 w-full gap-2 sm:w-auto sm:shrink-0">
              <Plus className="h-4 w-4" />
              {t('actions.addReminder')}
            </Button>
          </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <DashboardTabsList className="grid-cols-2 lg:grid-cols-4">
              {tabDefinitions.map((tab) => (
                <DashboardTabTrigger
                  key={tab.value}
                  value={tab.value}
                  artwork={tab.artwork}
                  count={loading ? <Skeleton className="h-2.5 w-2.5 rounded-full" /> : tab.count}
                >
                  {tab.label}
                </DashboardTabTrigger>
              ))}
            </DashboardTabsList>

            {["war", "capital", "games", "inactivity"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex min-h-44 items-start gap-4 rounded-[22px] bg-card p-4 shadow-sm shadow-black/5">
                        <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-7 w-28 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : currentReminders.length === 0 ? ( // NOSONAR — JSX nested ternary for multi-branch display state
                  <div className="rounded-[20px] bg-muted/45 px-5 py-10 text-center shadow-sm shadow-black/5">
                    <h3 className="text-lg font-semibold text-foreground">{getEmptyStateTitle(tab)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('empty.getStarted')}</p>
                    <Button onClick={addReminder} className="mt-5 gap-2">
                      <Plus className="h-4 w-4" />
                      {t('actions.addReminder')}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {currentReminders.map((reminder, index) => {
                          const isNew = reminder.id.startsWith('temp-');
                          const typeInfo = reminderTypes.find(t => t.value === reminder.type);
                          const selectedChannel = channels.find(c => c.id === reminder.channel_id);
                          const selectedThread = threads.find(
                            (thread) => thread.id === reminder.thread_id
                              && thread.parent_channel_id === reminder.channel_id,
                          );
                          const parentLabel = formatChannelLabel(selectedChannel);
                          const channelLabel = selectedThread && parentLabel
                            ? `${parentLabel} / ${selectedThread.name}`
                            : parentLabel;
                          const clan = clans.find(c => c.tag === reminder.clan_tag);
                          const clanName = clan?.name;
                          const clanBadgeUrl = getClanBadgeUrl(reminder.clan_tag);
                          const customMessageImageUrl = getStandaloneImageUrl(reminder.custom_text);
                          const customMessageTenorUrl = getStandaloneTenorUrl(reminder.custom_text);

                          let channelValueNode: ReactNode;
                          if (channelLabel && reminder.channel_id) {
                            channelValueNode = (
                              <DiscordOpenPopover
                                title={channelLabel}
                                description={t('card.channel')}
                                url={`https://discord.com/channels/${guildId}/${reminder.thread_id || reminder.channel_id}`}
                                buttonLabel={tCommon('openChannelInDiscord')}
                                trigger={(
                                  <button
                                    type="button"
                                    className="max-w-full truncate text-left text-sm font-medium text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
                                  >
                                    {channelLabel}
                                  </button>
                                )}
                              />
                            );
                          } else if (reminder.channel_id) {
                            channelValueNode = <span className="text-sm font-medium text-orange-500">{reminder.channel_id}</span>;
                          } else {
                            channelValueNode = <span className="text-sm font-medium text-muted-foreground">{t('card.notSet')}</span>;
                          }

                          return (
                            <article
                              key={reminder.id}
                              className={`relative scroll-mt-24 rounded-[22px] bg-card p-4 shadow-sm shadow-black/5 md:p-5 ${isNew ? 'ring-2 ring-primary' : ''}`}
                              ref={isNew ? newReminderRef : null}
                            >
                              <div className="absolute right-3 top-3">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={t('actions.more')} disabled={saving}>
                                      <Ellipsis className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                    <DropdownMenuItem className="gap-2 rounded-lg" onSelect={() => openCloneDialog(reminder)}>
                                      <Copy className="h-4 w-4" />
                                      {t('actions.clone')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 rounded-lg" onSelect={() => editReminder(reminder)}>
                                      <Edit2 className="h-4 w-4" />
                                      {t('actions.edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => deleteReminder(index)}>
                                      <Trash2 className="h-4 w-4" />
                                      {t('actions.delete')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="flex h-full flex-col gap-4">
                                <div className="flex min-w-0 flex-1 items-start gap-3.5 pr-7">
                                  {reminder.clan_tag && clanBadgeUrl ? (
                                    <ClanProfilePopover
                                      clanName={clanName || reminder.clan_tag}
                                      clanTag={reminder.clan_tag}
                                      clanBadgeUrl={clanBadgeUrl}
                                      showTagInTrigger={false}
                                      triggerClassName="shrink-0 cursor-pointer rounded-2xl transition-transform hover:scale-[1.03]"
                                    >
                                      <Image
                                        src={clanBadgeUrl}
                                        alt={clanName ? `${clanName} clan badge` : `${reminder.clan_tag} clan badge`}
                                        width={56}
                                        height={56}
                                        unoptimized
                                        className="h-14 w-14 object-contain"
                                      />
                                    </ClanProfilePopover>
                                  ) : (
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted/55 text-sm text-muted-foreground">—</div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="font-semibold text-foreground">{typeInfo?.label || reminder.type}</h3>
                                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                        {extractHours(reminder.time)} {t('card.hoursRemaining')}
                                      </span>
                                      {isNew && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{t('card.new')}</span>}
                                    </div>
                                    <p className="mt-1 truncate text-sm text-muted-foreground">
                                      {clanName ? `${clanName} · ${reminder.clan_tag}` : reminder.clan_tag ?? t('card.notSet')}
                                    </p>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-muted/65 px-2.5 py-1 text-xs text-muted-foreground">{channelValueNode}</span>
                                      {reminder.type === "War" && reminder.war_types?.map((warType) => (
                                        <span key={warType} className="rounded-full bg-muted/65 px-2.5 py-1 text-xs text-muted-foreground">
                                          {warType === "Random" ? t('card.random') : warType === "Friendly" ? t('card.friendly') : t('card.cwl') /* NOSONAR — JSX nested ternary for multi-branch display state */}
                                        </span>
                                      ))}
                                      {reminder.type === "Clan Games" && reminder.point_threshold !== undefined && (
                                        <span className="rounded-full bg-muted/65 px-2.5 py-1 text-xs text-muted-foreground">
                                          {t('card.pointsValue', { count: reminder.point_threshold })}
                                        </span>
                                      )}
                                      {reminder.type === "Clan Capital" && reminder.attack_threshold !== undefined && (
                                        <span className="rounded-full bg-muted/65 px-2.5 py-1 text-xs text-muted-foreground">
                                          {t('card.attacksValue', { count: reminder.attack_threshold })}
                                        </span>
                                      )}
                                    </div>
                                    {customMessageImageUrl ? (
                                      <div className="mt-3 overflow-hidden rounded-2xl bg-muted/45">
                                        <Image
                                          src={customMessageImageUrl}
                                          alt={t('card.customImageAlt')}
                                          width={640}
                                          height={360}
                                          unoptimized
                                          className="max-h-48 h-auto w-full object-contain"
                                        />
                                      </div>
                                    ) : customMessageTenorUrl ? (
                                      <div className="mt-3 overflow-hidden rounded-2xl bg-muted/45">
                                        <Image
                                          src={`/api/tenor-media?url=${encodeURIComponent(customMessageTenorUrl)}`}
                                          alt={t('card.customGifTitle')}
                                          width={640}
                                          height={360}
                                          unoptimized
                                          className="max-h-48 h-auto w-full object-contain"
                                        />
                                      </div>
                                    ) : reminder.custom_text ? (
                                      <p className="mt-3 rounded-2xl bg-muted/45 px-3 py-2 text-sm text-foreground">{reminder.custom_text}</p>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </section>

          <Dialog open={Boolean(cloningReminder)} onOpenChange={(open) => { if (!open) closeCloneDialog(); }}>
            <DialogContent variant="form" className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>{t('clone.title')}</DialogTitle>
                <DialogDescription>{t('clone.description')}</DialogDescription>
              </DialogHeader>
              {cloningReminder && (
                <div className="space-y-5 py-2">
                  <div className="rounded-2xl bg-muted/45 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {reminderTypes.find((type) => type.value === cloningReminder.type)?.label ?? cloningReminder.type}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {extractHours(cloningReminder.time)} {t('card.hoursRemaining')} · {formatChannelLabel(channels.find((channel) => channel.id === cloningReminder.channel_id)) ?? cloningReminder.channel_id ?? t('card.notSet')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clone-clan">{t('clone.targetClan')}</Label>
                    <ClanCombobox
                      id="clone-clan"
                      clans={clans.filter((clan) => clan.tag !== cloningReminder.clan_tag)}
                      value={cloneClanTag}
                      onValueChange={setCloneClanTag}
                      placeholder={t('clone.selectClan')}
                      className="border-0 bg-muted/55 shadow-sm shadow-black/5 focus-visible:ring-ring/35"
                    />
                    {clans.every((clan) => clan.tag === cloningReminder.clan_tag) && (
                      <p className="text-xs text-muted-foreground">{t('clone.noOtherClans')}</p>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="secondary" className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted" onClick={closeCloneDialog} disabled={saving}>
                  {t('dialog.cancel')}
                </Button>
                <Button type="button" onClick={cloneReminder} disabled={saving || !cloneClanTag}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                  {saving ? t('clone.cloning') : t('clone.action')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add/Edit Reminder Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent variant="form" className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingReminder ? t('dialog.editTitle') : t('dialog.addTitle')}
                </DialogTitle>
                <DialogDescription>
                  {editingReminder ? t('dialog.editDescription') : t('dialog.addDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Type Selector */}
                <div className="space-y-2">
                  <Label htmlFor="dialog-type">{t('dialog.type')}  <span className="text-destructive">*</span></Label>
                  <Select
                      value={dialogReminder.type || ""}
                      onValueChange={(value) => updateDialogField("type", value as "War" | "Clan Capital" | "Clan Games" | "Inactivity")}
                      disabled={!!editingReminder}
                  >
                    <SelectTrigger id="dialog-type">
                      <SelectValue placeholder={t('dialog.selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {reminderTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dialog-time">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {dialogReminder.type === "Inactivity" ? t('card.timeInactive') : t('card.timeBefore')}
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                          id="dialog-time"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={
                            dialogReminder.type === "Inactivity"
                                ? t('card.timeInactivePlaceholder')
                                : t('card.timeBeforePlaceholder')
                          }
                          value={dialogReminder.time || ""}
                          onChange={(e) => updateDialogField("time", e.target.value)}
                          className="w-3/4"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {t('card.timeUnit')}
                    </span>
                    </div>
                    {dialogReminder.time && !isTimeValid(dialogReminder.time, dialogReminder.type || "") && (
                        <p className="text-xs text-destructive mt-1">
                          {t('toast.timeExceedsLimit', {
                            min: 0,
                            max: getMaxHours(dialogReminder.type || "") || 9999
                          })}
                        </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dialog-channel">{t('card.channel')} <span className="text-destructive">*</span></Label>
                    <ChannelCombobox
                        channels={channels}
                        value={dialogReminder.channel_id || ""}
                        onValueChange={(value) => {
                          setDialogReminder((previous) => ({
                            ...previous,
                            channel_id: value,
                            thread_id: null,
                          }));
                        }}
                        placeholder={t('card.channelPlaceholder')}
                        showDisabled={false}
                    />
                  </div>

                  {dialogReminder.channel_id && (dialogNeedsThread || dialogChannelThreads.length > 0) && (
                    <div className="space-y-2">
                      <Label htmlFor="dialog-thread">
                        {dialogNeedsThread ? t('card.forumPost') : t('card.threadOptional')}
                        {dialogNeedsThread && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Select
                        value={dialogReminder.thread_id || "none"}
                        onValueChange={(value) => updateDialogField(
                          "thread_id",
                          value === "none" ? null : value,
                        )}
                      >
                        <SelectTrigger id="dialog-thread">
                          <SelectValue placeholder={
                            dialogNeedsThread ? t('card.forumPostPlaceholder') : t('card.threadPlaceholder')
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {!dialogNeedsThread && <SelectItem value="none">{t('card.noThread')}</SelectItem>}
                          {dialogChannelThreads.map((thread) => (
                            <SelectItem key={thread.id} value={thread.id}>
                              {thread.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {dialogNeedsThread && !dialogReminder.thread_id && (
                        <p className="text-xs text-destructive">
                          {t('card.forumPostRequired')}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="dialog-clan">{t('card.clan')}  <span className="text-destructive">*</span></Label>
                    <ClanCombobox
                      id="dialog-clan"
                      clans={clans}
                      value={dialogReminder.clan_tag || ""}
                      onValueChange={(value) => updateDialogField("clan_tag", value)}
                      placeholder={t('card.clanPlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dialog-message">{t('card.customMessage')}</Label>
                  <Input
                      id="dialog-message"
                      placeholder={
                        dialogReminder.type === "Clan Games"
                            ? t('card.customMessagePlaceholderClanGames')
                            : dialogReminder.type === "Inactivity" // NOSONAR — JSX nested ternary for multi-branch display state
                                ? t('card.customMessagePlaceholderInactivity')
                                : t('card.customMessagePlaceholder')
                      }
                      value={dialogReminder.custom_text || ""}
                      onChange={(e) => updateDialogField("custom_text", e.target.value)}
                  />
                </div>

                {/* Type-specific fields */}
                {dialogReminder.type === "War" && (
                    <div className="space-y-2">
                      <Label>{t('card.warTypes')} <span className="text-destructive">*</span></Label>
                      <div className="flex gap-2 flex-wrap">
                        {["Random", "Friendly", "CWL"].map((type) => (
                            <Badge
                                key={type}
                                variant={dialogReminder.war_types?.includes(type) ? "default" : "outline"}
                                className={`cursor-pointer transition-all ${
                                    dialogReminder.war_types?.includes(type)
                                        ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                                        : "hover:bg-muted hover:border-primary"
                                }`}
                                onClick={() => {
                                  const current = dialogReminder.war_types || [];
                                  const updated = current.includes(type)
                                      ? current.filter((t) => t !== type)
                                      : [...current, type];
                                  updateDialogField("war_types", updated);
                                }}
                            >
                              {type === "Random" ? t('card.random') : type === "Friendly" ? t('card.friendly') : t('card.cwl') /* NOSONAR — JSX nested ternary for multi-branch display state */}
                            </Badge>
                        ))}
                      </div>
                    </div>
                )}

                {dialogReminder.type === "Clan Games" && (
                    <div className="space-y-2">
                      <Label htmlFor="dialog-points">{t('card.pointThreshold')} <span className="text-destructive">*</span></Label>
                      <Input
                          id="dialog-points"
                          type="number"
                          min="0"
                          max="10000"
                          placeholder=""
                          value={dialogReminder.point_threshold ?? ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : Number.parseInt(e.target.value);
                            setPointThresholdTouched(true);
                            updateDialogField("point_threshold", value);
                          }}
                      />
                      {dialogReminder.point_threshold !== undefined && !isPointsValid(dialogReminder.point_threshold) ? (
                          <p className="text-xs text-destructive mt-1">
                            {t('toast.pointThresholdInvalid', {
                              min: POINT_THRESHOLD_MIN,
                              max: POINT_THRESHOLD_MAX,
                            })}
                          </p>
                      ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('card.pointThresholdHelp', {
                              threshold: dialogReminder.point_threshold ?? "_"
                            })}
                          </p>
                      )}
                    </div>
                )}

                {dialogReminder.type === "Clan Capital" && (
                    <div className="space-y-2">
                      <Label htmlFor="dialog-attacks">{t('card.attackThreshold')} <span className="text-destructive">*</span></Label>
                      <Input
                          id="dialog-attacks"
                          type="number"
                          min="1"
                          max="5"
                          placeholder=""
                          value={dialogReminder.attack_threshold ?? ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : Number.parseInt(e.target.value);
                            setAttackThresholdTouched(true);
                            updateDialogField("attack_threshold", value);
                          }}
                      />
                      {dialogReminder.attack_threshold !== undefined && !isAttacksValid(dialogReminder.attack_threshold) ? (
                          <p className="text-xs text-destructive mt-1">
                            {t('toast.attackThresholdInvalid', {
                              min: ATTACK_THRESHOLD_MIN,
                              max: ATTACK_THRESHOLD_MAX,
                            })}
                          </p>
                      ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('card.attackThresholdHelp', {
                              threshold: dialogReminder.attack_threshold ?? "_"
                            })}
                          </p>
                      )}
                    </div>
                )}
              </div>
              <DialogFooter>
                <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setDialogReminder({});
                      setEditingReminder(null);
                    }}
                    disabled={saving}
                >
                  {t('dialog.cancel')}
                </Button>
                <Button
                    onClick={handleSaveReminder}
                    disabled={
                      saving || 
                      !dialogReminder.time || 
                      !dialogDestinationValid ||
                      !isTimeValid(dialogReminder.time, dialogReminder.type || "") ||
                      (dialogReminder.type === "War" && (!dialogReminder.war_types || dialogReminder.war_types.length === 0)) ||
                      (dialogReminder.type === "Clan Games" && !isPointsValid(dialogReminder.point_threshold)) ||
                      (dialogReminder.type === "Clan Capital" && !isAttacksValid(dialogReminder.attack_threshold))
                    }
                    className="bg-primary hover:bg-primary/90"
                >
                  {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('dialog.saving')}
                      </>
                  ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingReminder ? t('dialog.saveChanges') : t('dialog.addReminder')}
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
