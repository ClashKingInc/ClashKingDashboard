"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth/logout";
import { useTranslations } from "next-intl";
import { apiCache } from "@/lib/api-cache";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { DiscordOpenPopover } from "@/components/ui/discord-open-popover";
import { ClanProfilePopover } from "@/components/ui/clan-profile-popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  Target,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Loader2,
  Castle,
  UserX,
  Activity,
  Edit2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// API types based on ClashKingAPI reminders endpoints
type ReminderType = "War" | "Clan Capital" | "Clan Games" | "Inactivity";
interface ReminderConfig {
  id: string;
  type: ReminderType;
  clan_tag?: string;
  channel_id?: string;
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

interface Channel {
  id: string;
  name: string;
  type: string;
  parent_name?: string;
}

function normalizeChannelsPayload(payload: unknown): Channel[] {
  if (Array.isArray(payload)) return payload as Channel[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as { data?: unknown; items?: unknown };
  if (Array.isArray(obj.data)) return obj.data as Channel[];
  if (Array.isArray(obj.items)) return obj.items as Channel[];

  return [];
}

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

export default function RemindersPage() { // NOSONAR — React page component: complexity is aggregate state/handler management, not a single logic unit
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params.guildId as string;
  const t = useTranslations("RemindersPage");
  const tCommon = useTranslations("Common");
  const reminderTypes = [
    { value: "War", label: t('types.war'), icon: Target, color: "text-red-500", tabIcon: Target },
    { value: "Clan Capital", label: t('types.capital'), icon: Castle, color: "text-purple-500", tabIcon: Castle },
    { value: "Clan Games", label: t('types.clanGames'), icon: Calendar, color: "text-green-500", tabIcon: Calendar },
    { value: "Inactivity", label: t('types.inactivity'), icon: UserX, color: "text-orange-500", tabIcon: UserX },
  ];

  const [reminders, setReminders] = useState<ServerRemindersResponse>({
    war_reminders: [],
    capital_reminders: [],
    clan_games_reminders: [],
    inactivity_reminders: [],
  });
  const [clans, setClans] = useState<Clan[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedClan, setSelectedClan] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("war");
  const newReminderRef = useRef<HTMLDivElement>(null);
  const channelsCacheKey = `reminders-channels-${guildId}`;
  const clansCacheKey = `reminders-clans-${guildId}`;

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderConfig | null>(null);
  const [dialogReminder, setDialogReminder] = useState<Partial<ReminderConfig>>({});
  const [pointThresholdTouched, setPointThresholdTouched] = useState(false);
  const [attackThresholdTouched, setAttackThresholdTouched] = useState(false);

  // Fetch clans and reminders from API
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push(`/${params.locale}/login`);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          throw new Error("API URL is not configured");
        }

        const clansPromise = apiCache
          .get(clansCacheKey, async () => {
            const response = await apiClient.servers.getServerClans(guildId);
            if (response.error) {
              throw new Error(response.error || 'Failed to fetch clans');
            }
            return response.data ?? [];
          })
          .catch((clanError) => {
            // Keep reminders usable even if clan metadata is temporarily unavailable.
            console.warn("Failed to fetch clans for reminders page:", clanError);
            return [] as Clan[];
          });

        // Fetch clans, channels, and reminders in parallel
        const [clansRes, channelsRes, remindersRes] = await Promise.all([
          clansPromise,
          apiCache.get(channelsCacheKey, async () => {
            const res = await fetch(`/api/v2/server/${guildId}/channels`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            if (!res.ok) throw new Error('Failed to fetch channels');
            return res.json();
          }),
          fetch(`${apiUrl}/v2/server/${guildId}/reminders`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }),
        ]);

        if (!remindersRes.ok) {
          if (remindersRes.status === 401) {
            logout();
            router.push(`/${params.locale}/login`);
            return;
          }
          throw new Error(`Failed to fetch reminders: ${remindersRes.statusText}`);
        }

        // Parse clans
        setClans(clansRes || []);

        // Parse channels
        setChannels(normalizeChannelsPayload(channelsRes));

        // Parse reminders
        const remindersData: ServerRemindersResponse = await remindersRes.json();
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
  }, [channelsCacheKey, clansCacheKey, guildId, router, toast]);

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
        const accessToken = localStorage.getItem("access_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        const response = await fetch(`${apiUrl}/v2/server/${guildId}/reminders/${reminder.id}`, {
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
      const accessToken = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error("API URL is not configured");
      }

      // Add " hr" suffix to time before sending to API
      const timeWithUnit = `${dialogReminder.time} hr`;

      const isNew = !editingReminder;

      if (isNew) {
        // Create new reminder
        const createRequest: CreateReminderRequest = {
          type: dialogReminder.type!,
          clan_tag: dialogReminder.clan_tag,
          channel_id: dialogReminder.channel_id || "",
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

        const response = await fetch(`${apiUrl}/v2/server/${guildId}/reminders`, {
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
          time: timeWithUnit,
          custom_text: dialogReminder.custom_text,
          townhall_filter: dialogReminder.townhall_filter,
          roles: dialogReminder.roles,
          war_types: dialogReminder.war_types,
          point_threshold: dialogReminder.point_threshold,
          attack_threshold: dialogReminder.attack_threshold,
          ping_type: dialogReminder.ping_type,
        };

        const response = await fetch(`${apiUrl}/v2/server/${guildId}/reminders/${editingReminder.id}`, {
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
      const response = await fetch(`${apiUrl}/v2/server/${guildId}/reminders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: ServerRemindersResponse = await response.json();
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
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">{t('toast.errorTitle')}</CardTitle>
              </div>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                  onClick={() => globalThis.window.location.reload()}
                  className="w-full"
              >
                {t('actions.retry')}
              </Button>
            </CardContent>
          </Card>
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

  return (
      <div className="min-h-[calc(100vh+1px)] bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
                  <p className="text-muted-foreground mt-1">
                    {t('description')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 mb-8">
            <Card className="bg-card border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.totalReminders')}</CardTitle>
              </CardHeader>
              <CardContent className="h-[84px] flex flex-col justify-between">
                <div className="flex h-10 items-center justify-between">
                  {loading ? (
                    <Skeleton className="h-8 w-16 animate-pulse" />
                  ) : (
                    <div className="flex h-8 items-center text-3xl font-bold text-blue-500">
                      {reminders.war_reminders.length +
                          reminders.capital_reminders.length +
                          reminders.clan_games_reminders.length +
                          reminders.inactivity_reminders.length}
                    </div>
                  )}
                  <Activity className="h-8 w-8 shrink-0 text-blue-500/50" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('stats.totalRemindersDesc')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.warReminders')}</CardTitle>
              </CardHeader>
              <CardContent className="h-[84px] flex flex-col justify-between">
                <div className="flex h-10 items-center justify-between">
                  {loading ? (
                    <Skeleton className="h-8 w-12 animate-pulse" />
                  ) : (
                    <div className="flex h-8 items-center text-3xl font-bold text-green-500">{reminders.war_reminders.length}</div>
                  )}
                  <Target className="h-8 w-8 shrink-0 text-green-500/50" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('stats.warRemindersDesc')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-purple-500/30 bg-purple-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.capitalReminders')}</CardTitle>
              </CardHeader>
              <CardContent className="h-[84px] flex flex-col justify-between">
                <div className="flex h-10 items-center justify-between">
                  {loading ? (
                    <Skeleton className="h-8 w-12 animate-pulse" />
                  ) : (
                    <div className="flex h-8 items-center text-3xl font-bold text-purple-500">{reminders.capital_reminders.length}</div>
                  )}
                  <Castle className="h-8 w-8 shrink-0 text-purple-500/50" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('stats.capitalRemindersDesc')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-yellow-500/30 bg-yellow-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.otherReminders')}</CardTitle>
              </CardHeader>
              <CardContent className="h-[84px] flex flex-col justify-between">
                <div className="flex h-10 items-center justify-between">
                  {loading ? (
                    <Skeleton className="h-8 w-12 animate-pulse" />
                  ) : (
                    <div className="flex h-8 items-center text-3xl font-bold text-yellow-500">
                      {reminders.clan_games_reminders.length + reminders.inactivity_reminders.length}
                    </div>
                  )}
                  <Bell className="h-8 w-8 shrink-0 text-yellow-500/50" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('stats.otherRemindersDesc')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Clan Selector and Add Button */}
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {(loading || clans.length > 0) && (
              <div className="flex w-full items-center gap-2 md:w-auto">
                {loading ? (
                  <>
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-9 w-full md:w-[250px]" />
                  </>
                ) : (
                  <>
                    <Label className="whitespace-nowrap text-sm text-muted-foreground">{t('clanSelector.label')}</Label>
                    <Select value={selectedClan} onValueChange={setSelectedClan}>
                      <SelectTrigger className="w-full md:w-[250px]">
                        <SelectValue placeholder={t('clanSelector.placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('clanSelector.allClans')}</SelectItem>
                        {clans.map((clan) => (
                          <SelectItem key={clan.tag} value={clan.tag}>
                            {clan.name} ({clan.tag})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            )}
            <Button onClick={addReminder} className="w-full gap-2 md:w-auto md:shrink-0">
              <Plus className="h-4 w-4" />
              {t('actions.addReminder')}
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-lg border border-border bg-muted p-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-0">
              <TabsTrigger value="war" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
                <Target className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t('tabs.war')}</span>
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-red-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                  {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : warReminderCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="capital" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
                <Castle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t('tabs.capital')}</span>
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-purple-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                  {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : capitalReminderCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="games" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t('tabs.clanGames')}</span>
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-green-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                  {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : gamesReminderCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="inactivity" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
                <UserX className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t('tabs.inactivity')}</span>
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-orange-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                  {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : inactivityReminderCount}
                </span>
              </TabsTrigger>
            </TabsList>

            {["war", "capital", "games", "inactivity"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {/* Reminders List */}
                  {loading ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[1, 2].map((i) => (
                            <Card key={i} className="bg-card border-border">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Skeleton className="h-12 w-12 rounded-lg animate-pulse" />
                                    <div className="space-y-2">
                                      <Skeleton className="h-5 w-32 animate-pulse" />
                                      <Skeleton className="h-4 w-24 animate-pulse" />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Skeleton className="h-8 w-8 animate-pulse" />
                                    <Skeleton className="h-8 w-8 animate-pulse" />
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-1">
                                    <Skeleton className="h-4 w-16 animate-pulse" />
                                    <Skeleton className="h-5 w-28 animate-pulse" />
                                  </div>
                                  <div className="space-y-1">
                                    <Skeleton className="h-4 w-12 animate-pulse" />
                                    <Skeleton className="h-5 w-32 animate-pulse" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                        ))}
                      </div>
                  ) : currentReminders.length === 0 ? ( // NOSONAR — JSX nested ternary for multi-branch display state
                      <Card className="bg-card border-border">
                        <CardContent className="py-12 text-center">
                          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {getEmptyStateTitle(tab)}
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            {t('empty.getStarted')}
                          </p>
                          <Button onClick={addReminder} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('actions.addReminder')}
                          </Button>
                        </CardContent>
                      </Card>
                  ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {currentReminders.map((reminder, index) => {
                          const isNew = reminder.id.startsWith('temp-');
                          const typeInfo = reminderTypes.find(t => t.value === reminder.type);
                          const TypeIcon = typeInfo?.icon || Bell;
                          const selectedChannel = channels.find(c => c.id === reminder.channel_id);
                          const channelLabel = formatChannelLabel(selectedChannel);
                          const clan = clans.find(c => c.tag === reminder.clan_tag);
                          const clanName = clan?.name;

                          let channelValueNode: ReactNode;
                          if (channelLabel && reminder.channel_id) {
                            channelValueNode = (
                              <DiscordOpenPopover
                                title={channelLabel}
                                description={t('card.channel')}
                                url={`https://discord.com/channels/${guildId}/${reminder.channel_id}`}
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
                              <Card
                                  key={reminder.id}
                                  className={`bg-card border-border ${isNew ? 'ring-2 ring-primary animate-pulse' : ''}`}
                                  ref={isNew ? newReminderRef : null}
                              >
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg bg-secondary ${typeInfo?.color}`}>
                                        <TypeIcon className="h-5 w-5" />
                                      </div>
                                      <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                          {typeInfo?.label || reminder.type}
                                          {isNew && (
                                              <Badge className="bg-primary text-primary-foreground">{t('card.new')}</Badge>
                                          )}
                                        </CardTitle>
                                        <CardDescription>
                                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                                            {extractHours(reminder.time)}{t('card.hoursRemaining')}
                                          </Badge>
                                        </CardDescription>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => editReminder(reminder)}
                                          disabled={saving}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => deleteReminder(index)}
                                          disabled={saving}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1">
                                      <Label className="block text-sm text-muted-foreground">{t('card.channel')}</Label>
                                      <div className="pt-0.5">
                                        {channelValueNode}
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="block text-sm text-muted-foreground">{t('card.clan')}</Label>
                                      <div className="pt-0.5">
                                        {reminder.clan_tag ? (
                                          <ClanProfilePopover
                                            clanName={clanName || reminder.clan_tag}
                                            clanTag={reminder.clan_tag}
                                            clanBadgeUrl={
                                              clan?.badge_url
                                              ?? clan?.clan_badge_url
                                              ?? clan?.badge
                                              ?? null
                                            }
                                            showTagInTrigger={false}
                                            triggerClassName="text-left cursor-pointer transition-opacity hover:opacity-80"
                                          >
                                            <span className="text-sm font-medium text-foreground underline-offset-2 hover:underline">
                                              {clanName ? `${clanName} (${reminder.clan_tag})` : reminder.clan_tag}
                                            </span>
                                          </ClanProfilePopover>
                                        ) : (
                                          <span className="text-sm font-medium text-muted-foreground">{t('card.notSet')}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {reminder.custom_text && (
                                      <div className="space-y-1">
                                        <Label className="text-sm text-muted-foreground">{t('card.customMessage')}</Label>
                                        <p className="text-sm font-medium">{reminder.custom_text}</p>
                                      </div>
                                  )}

                                  {/* Type-specific fields */}
                                  {reminder.type === "War" && reminder.war_types && reminder.war_types.length > 0 && (
                                      <div className="space-y-1">
                                        <Label className="text-sm text-muted-foreground">{t('card.warTypes')}</Label>
                                        <div className="flex gap-2 flex-wrap">
                                          {reminder.war_types.map((type) => (
                                              <Badge key={type} variant="secondary">
                                                {type === "Random" ? t('card.random') : type === "Friendly" ? t('card.friendly') : t('card.cwl') /* NOSONAR — JSX nested ternary for multi-branch display state */}
                                              </Badge>
                                          ))}
                                        </div>
                                      </div>
                                  )}

                                  {reminder.type === "Clan Games" && reminder.point_threshold && (
                                      <div className="space-y-1">
                                        <Label className="text-sm text-muted-foreground">{t('card.pointThreshold')} <span className="text-destructive">*</span></Label>
                                        <p className="text-sm font-medium">{reminder.point_threshold}</p>
                                      </div>
                                  )}

                                  {reminder.type === "Clan Capital" && reminder.attack_threshold && (
                                      <div className="space-y-1">
                                        <Label className="text-sm text-muted-foreground">{t('card.attackThreshold')} <span className="text-destructive">*</span></Label>
                                        <p className="text-sm font-medium">{reminder.attack_threshold}</p>
                                      </div>
                                  )}
                                </CardContent>
                              </Card>
                          );
                        })}
                      </div>
                  )}
                </TabsContent>
            ))}
          </Tabs>

          {/* Add/Edit Reminder Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                        onValueChange={(value) => updateDialogField("channel_id", value)}
                        placeholder={t('card.channelPlaceholder')}
                        showDisabled={false}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dialog-clan">{t('card.clan')}  <span className="text-destructive">*</span></Label>
                    <Select
                        value={dialogReminder.clan_tag || ""}
                        onValueChange={(value) => updateDialogField("clan_tag", value)}
                    >
                      <SelectTrigger id="dialog-clan">
                        <SelectValue placeholder={t('card.clanPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {clans.map((clan) => (
                            <SelectItem key={clan.tag} value={clan.tag}>
                              {clan.name} ({clan.tag})
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      !dialogReminder.channel_id || 
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
