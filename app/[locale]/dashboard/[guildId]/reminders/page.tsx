"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Target,
  Users,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Loader2,
  Castle,
  UserX,
  Shield,
  Activity,
  Hash
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// API types based on ClashKingAPI reminders endpoints
interface ReminderConfig {
  id: string;
  type: "War" | "Clan Capital" | "Clan Games" | "Inactivity";
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
}

export default function RemindersPage() {
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
  const [selectedClan, setSelectedClan] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("war");
  const newReminderRef = useRef<HTMLDivElement>(null);

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

        // Fetch clans and reminders in parallel
        const [clansRes, remindersRes] = await Promise.all([
          fetch(`/api/v2/server/${guildId}/clans-basic`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
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
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            router.push(`/${params.locale}/login`);
            return;
          }
          throw new Error(`Failed to fetch reminders: ${remindersRes.statusText}`);
        }

        // Parse clans
        if (clansRes.ok) {
          const clansData = await clansRes.json();
          setClans(clansData || []);
        }

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
  }, [guildId, router, toast]);

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
      return currentReminders.filter(r => r.clan_tag === selectedClan);
    }
    return currentReminders;
  };

  // Add a new reminder
  const addReminder = () => {
    const typeMap: { [key: string]: "War" | "Clan Capital" | "Clan Games" | "Inactivity" } = {
      war: "War",
      capital: "Clan Capital",
      games: "Clan Games",
      inactivity: "Inactivity",
    };

    const newReminder: ReminderConfig = {
      id: `temp-${Date.now()}`,
      type: typeMap[activeTab],
      channel_id: "",
      time: "6h",
      custom_text: "",
      clan_tag: selectedClan !== "all" ? selectedClan : clans[0]?.tag || "",
      war_types: activeTab === "war" ? ["Random", "Friendly", "CWL"] : undefined,
      townhall_filter: [],
      roles: [],
      point_threshold: activeTab === "games" ? 4000 : undefined,
      attack_threshold: activeTab === "capital" ? 1 : undefined,
    };

    const updatedReminders = { ...reminders };
    const key = `${activeTab === "war" ? "war" : activeTab === "capital" ? "capital" : activeTab === "games" ? "clan_games" : "inactivity"}_reminders` as keyof ServerRemindersResponse;
    updatedReminders[key] = [...updatedReminders[key], newReminder];

    setReminders(updatedReminders);

    // Scroll to new reminder after a brief delay
    setTimeout(() => {
      newReminderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    toast({
      title: t('toast.reminderAdded'),
      description: t('toast.reminderAddedDesc', { type: typeMap[activeTab] }),
    });
  };

  // Update a reminder
  const updateReminder = (index: number, field: keyof ReminderConfig, value: any) => {
    const updatedReminders = { ...reminders };
    const key = `${activeTab === "war" ? "war" : activeTab === "capital" ? "capital" : activeTab === "games" ? "clan_games" : "inactivity"}_reminders` as keyof ServerRemindersResponse;
    const remindersList = [...updatedReminders[key]];

    // Get the actual index in the full list (not filtered)
    const currentReminders = getCurrentReminders();
    const reminder = currentReminders[index];
    const actualIndex = updatedReminders[key].findIndex(r => r.id === reminder.id);

    if (actualIndex !== -1) {
      remindersList[actualIndex] = {
        ...remindersList[actualIndex],
        [field]: value,
      };
      updatedReminders[key] = remindersList;
      setReminders(updatedReminders);
    }
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
    const key = `${activeTab === "war" ? "war" : activeTab === "capital" ? "capital" : activeTab === "games" ? "clan_games" : "inactivity"}_reminders` as keyof ServerRemindersResponse;
    updatedReminders[key] = updatedReminders[key].filter(r => r.id !== reminder.id);
    setReminders(updatedReminders);
  };

  // Save a single reminder
  const saveReminder = async (reminder: ReminderConfig) => {
    const accessToken = localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      throw new Error("API URL is not configured");
    }

    const isNew = reminder.id.startsWith('temp-');

    if (isNew) {
      // Create new reminder
      const createRequest: CreateReminderRequest = {
        type: reminder.type,
        clan_tag: reminder.clan_tag,
        channel_id: reminder.channel_id || "",
        time: reminder.time,
        custom_text: reminder.custom_text,
        townhall_filter: reminder.townhall_filter,
        roles: reminder.roles,
        war_types: reminder.war_types,
        point_threshold: reminder.point_threshold,
        attack_threshold: reminder.attack_threshold,
        roster_id: reminder.roster_id,
        ping_type: reminder.ping_type,
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

      return await response.json();
    } else {
      // Update existing reminder
      const updateRequest = {
        channel_id: reminder.channel_id,
        time: reminder.time,
        custom_text: reminder.custom_text,
        townhall_filter: reminder.townhall_filter,
        roles: reminder.roles,
        war_types: reminder.war_types,
        point_threshold: reminder.point_threshold,
        attack_threshold: reminder.attack_threshold,
        ping_type: reminder.ping_type,
      };

      const response = await fetch(`${apiUrl}/v2/server/${guildId}/reminders/${reminder.id}`, {
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

      return await response.json();
    }
  };

  // Save all reminders
  const saveAllReminders = async () => {
    try {
      setSaving(true);

      const allReminders = [
        ...reminders.war_reminders,
        ...reminders.capital_reminders,
        ...reminders.clan_games_reminders,
        ...reminders.inactivity_reminders,
      ];

      // Save each reminder
      for (const reminder of allReminders) {
        await saveReminder(reminder);
      }

      toast({
        title: t('toast.successTitle'),
        description: t('toast.allRemindersSaved'),
      });

      // Refresh reminders from API
      const accessToken = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
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
    } catch (err) {
      console.error("Error saving reminders:", err);
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
              onClick={() => window.location.reload()}
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
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
          <div className="flex gap-2">
            <Button
              onClick={saveAllReminders}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('actions.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t('actions.saveChanges')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-card border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.totalReminders')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-12 animate-pulse" />
                    <Skeleton className="h-8 w-8 animate-pulse" />
                  </div>
                  <Skeleton className="h-3 w-32 mt-2 animate-pulse" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-blue-500">
                      {reminders.war_reminders.length +
                       reminders.capital_reminders.length +
                       reminders.clan_games_reminders.length +
                       reminders.inactivity_reminders.length}
                    </div>
                    <Activity className="h-8 w-8 text-blue-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('stats.totalRemindersDesc')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.warReminders')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-12 animate-pulse" />
                    <Skeleton className="h-8 w-8 animate-pulse" />
                  </div>
                  <Skeleton className="h-3 w-32 mt-2 animate-pulse" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-red-500">{reminders.war_reminders.length}</div>
                    <Target className="h-8 w-8 text-red-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('stats.warRemindersDesc')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.capitalReminders')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-12 animate-pulse" />
                    <Skeleton className="h-8 w-8 animate-pulse" />
                  </div>
                  <Skeleton className="h-3 w-32 mt-2 animate-pulse" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-purple-500">{reminders.capital_reminders.length}</div>
                    <Castle className="h-8 w-8 text-purple-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('stats.capitalRemindersDesc')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.otherReminders')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-12 animate-pulse" />
                    <Skeleton className="h-8 w-8 animate-pulse" />
                  </div>
                  <Skeleton className="h-3 w-32 mt-2 animate-pulse" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-green-500">
                      {reminders.clan_games_reminders.length + reminders.inactivity_reminders.length}
                    </div>
                    <Bell className="h-8 w-8 text-green-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('stats.otherRemindersDesc')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Clan Selector and Add Button */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <Button onClick={addReminder} className="gap-2 w-full md:w-auto">
            <Plus className="h-4 w-4" />
            {activeTab === "war" ? t('actions.addWarReminder') : activeTab === "capital" ? t('actions.addCapitalReminder') : activeTab === "games" ? t('actions.addClanGamesReminder') : t('actions.addInactivityReminder')}
          </Button>
          {clans.length > 0 && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">{t('clanSelector.label')}</Label>
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
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[800px] h-auto">
            <TabsTrigger value="war" className="gap-2">
              <Target className="h-4 w-4" />
              {t('tabs.war')}
              {reminders.war_reminders.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-red-500/20 text-red-500">
                  {selectedClan !== "all"
                    ? reminders.war_reminders.filter(r => r.clan_tag === selectedClan).length
                    : reminders.war_reminders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="capital" className="gap-2">
              <Castle className="h-4 w-4" />
              {t('tabs.capital')}
              {reminders.capital_reminders.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-purple-500/20 text-purple-500">
                  {selectedClan !== "all"
                    ? reminders.capital_reminders.filter(r => r.clan_tag === selectedClan).length
                    : reminders.capital_reminders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2">
              <Calendar className="h-4 w-4" />
              {t('tabs.clanGames')}
              {reminders.clan_games_reminders.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-green-500/20 text-green-500">
                  {selectedClan !== "all"
                    ? reminders.clan_games_reminders.filter(r => r.clan_tag === selectedClan).length
                    : reminders.clan_games_reminders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inactivity" className="gap-2">
              <UserX className="h-4 w-4" />
              {t('tabs.inactivity')}
              {reminders.inactivity_reminders.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-orange-500/20 text-orange-500">
                  {selectedClan !== "all"
                    ? reminders.inactivity_reminders.filter(r => r.clan_tag === selectedClan).length
                    : reminders.inactivity_reminders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {["war", "capital", "games", "inactivity"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="bg-card border-border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-lg animate-pulse" />
                            <div>
                              <Skeleton className="h-6 w-32 animate-pulse mb-2" />
                              <Skeleton className="h-5 w-24 animate-pulse" />
                            </div>
                          </div>
                          <Skeleton className="h-8 w-8 rounded animate-pulse" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24 animate-pulse" />
                            <Skeleton className="h-10 w-full animate-pulse" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24 animate-pulse" />
                            <Skeleton className="h-10 w-full animate-pulse" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-20 animate-pulse" />
                            <Skeleton className="h-10 w-full animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32 animate-pulse" />
                          <Skeleton className="h-10 w-full animate-pulse" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-28 animate-pulse" />
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-20 animate-pulse" />
                            <Skeleton className="h-6 w-20 animate-pulse" />
                            <Skeleton className="h-6 w-16 animate-pulse" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : currentReminders.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {tab === "war" ? t('empty.noWarReminders') : tab === "capital" ? t('empty.noCapitalReminders') : tab === "games" ? t('empty.noClanGamesReminders') : t('empty.noInactivityReminders')}
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
                currentReminders.map((reminder, index) => {
                const isNew = reminder.id.startsWith('temp-');
                const typeInfo = reminderTypes.find(t => t.value === reminder.type);
                const TypeIcon = typeInfo?.icon || Bell;

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
                                {reminder.time} {t('card.before')}
                              </Badge>
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteReminder(index)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`time-${index}`}>
                            <Clock className="h-4 w-4 inline mr-1" />
                            {t('card.timeBefore')}
                          </Label>
                          <Input
                            id={`time-${index}`}
                            placeholder={t('card.timeBeforePlaceholder')}
                            value={reminder.time}
                            onChange={(e) => updateReminder(index, "time", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`channel-${index}`}>{t('card.channelId')}</Label>
                          <Input
                            id={`channel-${index}`}
                            placeholder={t('card.channelIdPlaceholder')}
                            value={reminder.channel_id || ""}
                            onChange={(e) => updateReminder(index, "channel_id", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`clan-${index}`}>{t('card.clan')}</Label>
                          <Select
                            value={reminder.clan_tag || ""}
                            onValueChange={(value) => updateReminder(index, "clan_tag", value)}
                          >
                            <SelectTrigger id={`clan-${index}`}>
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
                        <Label htmlFor={`message-${index}`}>{t('card.customMessage')}</Label>
                        <Input
                          id={`message-${index}`}
                          placeholder={t('card.customMessagePlaceholder')}
                          value={reminder.custom_text || ""}
                          onChange={(e) => updateReminder(index, "custom_text", e.target.value)}
                        />
                      </div>

                      {/* Type-specific fields */}
                      {reminder.type === "War" && (
                        <div className="space-y-2">
                          <Label>{t('card.warTypes')}</Label>
                          <div className="flex gap-2 flex-wrap">
                            {["Random", "Friendly", "CWL"].map((type) => (
                              <Badge
                                key={type}
                                variant={reminder.war_types?.includes(type) ? "default" : "outline"}
                                className="cursor-pointer hover:bg-primary/80"
                                onClick={() => {
                                  const current = reminder.war_types || [];
                                  const updated = current.includes(type)
                                    ? current.filter((t) => t !== type)
                                    : [...current, type];
                                  updateReminder(index, "war_types", updated);
                                }}
                              >
                                {type === "Random" ? t('card.random') : type === "Friendly" ? t('card.friendly') : t('card.cwl')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {reminder.type === "Clan Games" && (
                        <div className="space-y-2">
                          <Label htmlFor={`points-${index}`}>{t('card.pointThreshold')}</Label>
                          <Input
                            id={`points-${index}`}
                            type="number"
                            placeholder={t('card.pointThresholdPlaceholder')}
                            value={reminder.point_threshold || 4000}
                            onChange={(e) => updateReminder(index, "point_threshold", parseInt(e.target.value) || 4000)}
                          />
                        </div>
                      )}

                      {reminder.type === "Clan Capital" && (
                        <div className="space-y-2">
                          <Label htmlFor={`attacks-${index}`}>{t('card.attackThreshold')}</Label>
                          <Input
                            id={`attacks-${index}`}
                            type="number"
                            placeholder={t('card.attackThresholdPlaceholder')}
                            value={reminder.attack_threshold || 1}
                            onChange={(e) => updateReminder(index, "attack_threshold", parseInt(e.target.value) || 1)}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}