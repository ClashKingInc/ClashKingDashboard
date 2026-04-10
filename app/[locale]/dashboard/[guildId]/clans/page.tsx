"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { logout } from "@/lib/auth/logout";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { RoleCombobox } from "@/components/ui/role-combobox";
import { InfoPopover } from "@/components/ui/info-popover";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Settings,
  Plus,
  Users,
  Trash2,
  Hash,
  Shield,
  Loader2,
  AlertCircle,
  Save,
  ChevronDown,
  ChevronRight,
  Eye
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiCache } from "@/lib/api-cache";
import { dashboardCacheKeys, normalizeDiscordRolesPayload } from "@/lib/dashboard-cache";

// Types based on ClashKingAPI models
interface MemberCountWarning {
  channel?: string | number | null; // NOSONAR — inline union is fine for a single field
  above?: number | null;
  below?: number | null;
  role?: string | number | null;
}

interface LogButtonSettings {
  profile_button?: boolean | null;
  strike_button?: boolean | null;
  ban_button?: boolean | null;
}

interface ClanLogSettings {
  join_log?: LogButtonSettings | null;
  leave_log?: LogButtonSettings | null;
}

interface ClanSettings {
  generalRole?: string | number | null;
  leaderRole?: string | number | null;
  clanChannel?: string | number | null;
  category?: string | null;
  abbreviation?: string | null;
  greeting?: string | null;
  auto_greet_option?: string | null;
  leadership_eval?: boolean | null;
  warCountdown?: string | number | null;
  warTimerCountdown?: string | number | null;
  ban_alert_channel?: string | number | null;
  member_count_warning?: MemberCountWarning | null;
  logs?: ClanLogSettings | null;
}

interface Clan {
  tag: string;
  clan_tag?: string;
  name: string;
  clan_name?: string;
  badge_url?: string | null;
  clan_badge_url?: string | null;
  level?: number | null;
  clanLevel?: number | null;
  member_count?: number | null;
  members?: number | null;
  settings?: ClanSettings;
}

interface Channel {
  id: string;
  name: string;
  parent_name?: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
}

function normalizeClansPayload(payload: unknown): Clan[] {
  if (Array.isArray(payload)) return payload as Clan[];
  if (payload && typeof payload === "object") {
    const maybeCollection = payload as { items?: unknown; clans?: unknown; data?: unknown };
    if (Array.isArray(maybeCollection.items)) return maybeCollection.items as Clan[];
    if (Array.isArray(maybeCollection.clans)) return maybeCollection.clans as Clan[];
    if (Array.isArray(maybeCollection.data)) return maybeCollection.data as Clan[];
  }
  return [];
}

export default function ClansPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params.guildId as string;
  const t = useTranslations("ClansPage");
  const tCommon = useTranslations("Common");

  const GREETING_PLACEHOLDERS = [
    { key: "{user_mention}", desc: t("greeting.placeholders.user_mention"), example: "@ClashKing" },
    { key: "{user_display_name}", desc: t("greeting.placeholders.user_display_name"), example: "ClashKing" },
    { key: "{clan_name}", desc: t("greeting.placeholders.clan_name"), example: "Clash King Family" },
    { key: "{clan_link}", desc: t("greeting.placeholders.clan_link"), example: "https://link.clashofclans.com/en?action=OpenClanProfile&tag=%232PP" },
    { key: "{clan_leader_name}", desc: t("greeting.placeholders.clan_leader_name"), example: "Chief King" },
    { key: "{clan_leader_mention}", desc: t("greeting.placeholders.clan_leader_mention"), example: "@ChiefKing" },
    { key: "{player_name}", desc: t("greeting.placeholders.player_name"), example: "Player One" },
    { key: "{player_link}", desc: t("greeting.placeholders.player_link"), example: "https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=%232PP" },
    { key: "{player_townhall}", desc: t("greeting.placeholders.player_townhall"), example: "16" },
    { key: "{player_townhall_emoji}", desc: t("greeting.placeholders.player_townhall_emoji"), example: "🏰" },
    { key: "{player_league}", desc: t("greeting.placeholders.player_league"), example: "Legend League" },
    { key: "{player_league_emoji}", desc: t("greeting.placeholders.player_league_emoji"), example: "🏆" },
    { key: "{player_trophies}", desc: t("greeting.placeholders.player_trophies"), example: "5200" },
  ];

  const generateGreetingPreview = (text: string, clanName?: string) => {
    let preview = text;
    GREETING_PLACEHOLDERS.forEach((p) => {
      let example = p.example;
      if (p.key === "{clan_name}" && clanName) {
        example = clanName;
      }
            preview = preview.replaceAll(new RegExp(p.key.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), "g"), example);
    });
    return preview;
  };

  const [clans, setClans] = useState<Clan[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clanToDelete, setClanToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClanTag, setNewClanTag] = useState("");
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [clanSettings, setClanSettings] = useState<ClanSettings>({});
  const [isGreetingPlaceholdersOpen, setIsGreetingPlaceholdersOpen] = useState(false);

  // Countdown states
  const [countdownStatus, setCountdownStatus] = useState<{
    war_score: string | null;
    war_timer: string | null;
  }>({ war_score: null, war_timer: null });
  const [countdownLoading, setCountdownLoading] = useState<string | null>(null);

  const clansCacheKey = `clans-${guildId}`;
  const channelsCacheKey = dashboardCacheKeys.channels(guildId);
  const rolesCacheKey = dashboardCacheKeys.discordRoles(guildId);

  const fetchClans = async (accessToken: string, forceRefresh = false): Promise<Clan[]> => {
    if (forceRefresh) {
      apiCache.invalidate(clansCacheKey);
    }

    return apiCache.get(clansCacheKey, async () => {
      const response = await fetch(`/api/v2/server/${guildId}/clans`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        const error = new Error(`Failed to fetch clans: ${response.status}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const payload = await response.json();
      return normalizeClansPayload(payload);
    });
  };

  const refreshClans = async (accessToken: string) => {
    const clansData = await fetchClans(accessToken, true);
    setClans(clansData);
  };

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push(`/${params.locale}/login`);
          return;
        }

        const clansData = await fetchClans(accessToken);
        setClans(clansData);

        const [channelsResult, rolesResult] = await Promise.allSettled([
          apiCache.get(channelsCacheKey, async () => {
            const response = await fetch(`/api/v2/server/${guildId}/channels`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error("Failed to fetch channels");
            return response.json();
          }),
          apiCache.get(rolesCacheKey, async () => {
            const response = await fetch(`/api/v2/server/${guildId}/discord-roles`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error("Failed to fetch roles");
            return response.json();
          })
        ]);

        if (channelsResult.status === "fulfilled") {
          setChannels(channelsResult.value || []);
        }

        if (rolesResult.status === "fulfilled") {
          setDiscordRoles(normalizeDiscordRolesPayload(rolesResult.value));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        if (err instanceof Error && (err as Error & { status?: number }).status === 401) {
          logout();
          router.push(`/${params.locale}/login`);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load clans");
        toast({
          title: tCommon("error"),
          description: t("toast.errorLoadingClans"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  // Add clan
  const handleAddClan = async () => {
    if (!newClanTag.trim()) {
      toast({
        title: tCommon("error"),
        description: t("toast.errorEmptyClanTag"),
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const accessToken = localStorage.getItem("access_token");

      const response = await fetch(`/api/v2/server/${guildId}/clans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tag: newClanTag }),
      });

      if (!response.ok) {
        const error = await response.json();
        const detail = error.detail || '';
        if (detail.toLowerCase().includes("not found in clash of clans")) {
          toast({
            title: tCommon("error"),
            description: t("toast.errorClanNotFound"),
            variant: "destructive",
          });
          return;
        }
        throw new Error(detail || 'Failed to add clan');
      }

      toast({
        title: tCommon("success"),
        description: t("toast.clanAdded"),
      });

      await refreshClans(accessToken || "");

      setNewClanTag("");
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error("Error adding clan:", err);
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : t("toast.errorAddingClan"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete clan
  const handleDeleteClan = async (clanTag: string) => {
    try {
      setSaving(true);
      const accessToken = localStorage.getItem("access_token");
      const encodedTag = encodeURIComponent(clanTag);

      const response = await fetch(`/api/v2/server/${guildId}/clan/${encodedTag}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete clan');
      }

      toast({
        title: tCommon("success"),
        description: t("toast.clanRemoved"),
      });

      await refreshClans(accessToken || "");
    } catch (err) {
      console.error("Error deleting clan:", err);
      toast({
        title: tCommon("error"),
        description: t("toast.errorRemovingClan"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Open settings dialog
  const handleOpenSettings = async (clan: Clan) => {
    setSelectedClan(clan);
    setClanSettings(clan.settings || {});

    // Load countdown status from clan settings
    setCountdownStatus({
      war_score: clan.settings?.warCountdown ? String(clan.settings.warCountdown) : null,
      war_timer: clan.settings?.warTimerCountdown ? String(clan.settings.warTimerCountdown) : null,
    });

    setIsSettingsDialogOpen(true);
  };

  // Toggle countdown (enable/disable)
  const handleToggleCountdown = async (countdownType: 'war_score' | 'war_timer', enabled: boolean) => {
    if (!selectedClan) return;

    const clanTag = selectedClan.tag || selectedClan.clan_tag || '';
    setCountdownLoading(countdownType);

    try {
      const accessToken = localStorage.getItem("access_token");

      const response = await fetch(`/api/v2/server/${guildId}/countdowns`, {
        method: enabled ? 'POST' : 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countdown_type: countdownType,
          clan_tag: clanTag,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Failed to ${enabled ? 'enable' : 'disable'} countdown`);
      }

      const data = await response.json();

      // Update local state
      setCountdownStatus(prev => ({
        ...prev,
        [countdownType]: enabled ? data.channel_id : null,
      }));

      toast({
        title: tCommon("success"),
        description: enabled ? t("toast.countdownEnabled") : t("toast.countdownDisabled"),
      });
    } catch (err) {
      console.error("Error toggling countdown:", err);
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : t("toast.errorTogglingCountdown"),
        variant: "destructive",
      });
    } finally {
      setCountdownLoading(null);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!selectedClan) return;

    try {
      setSaving(true);
      const accessToken = localStorage.getItem("access_token");
      const encodedTag = encodeURIComponent(selectedClan.tag || selectedClan.clan_tag || '');

      const response = await fetch(
        `/api/v2/server/${guildId}/clan/${encodedTag}/settings`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clanSettings),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      toast({
        title: tCommon("success"),
        description: t("toast.settingsSaved"),
      });

      await refreshClans(accessToken || "");

      setIsSettingsDialogOpen(false);
      setSelectedClan(null);
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({
        title: tCommon("error"),
        description: t("toast.errorSavingSettings"),
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
              <CardTitle className="text-destructive">{tCommon("error")}</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => globalThis.window.location.reload()} className="w-full">
              {tCommon("retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalMembers = clans.reduce((sum, clan) => sum + (clan.member_count || clan.members || 0), 0);
  const configuredClans = clans.filter(c =>
    c.settings?.clanChannel || c.settings?.generalRole
  ).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-muted-foreground mt-1">
                {t("description")}
              </p>
            </div>
          </div>

          {/* Add Clan Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                <Plus className="h-4 w-4" />
                {t("addClan")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("addNewClan")}</DialogTitle>
                <DialogDescription>
                  {t("addClanDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="clan-tag">{t("clanTag")}</Label>
                  <Input
                    id="clan-tag"
                    placeholder="#ABCD1234"
                    value={newClanTag}
                    onChange={(e) => setNewClanTag(e.target.value)}
                    className="bg-background border-border"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddClan()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleAddClan}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("addClan")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-card border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalClans")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {loading ? (
                  <Skeleton className="h-9 w-12 animate-pulse" />
                ) : (
                  <div className="text-3xl font-bold text-blue-500">{clans.length}</div>
                )}
                <Shield className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("registeredClans")}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("configured")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {loading ? (
                  <Skeleton className="h-9 w-12 animate-pulse" />
                ) : (
                  <div className="text-3xl font-bold text-green-500">{configuredClans}</div>
                )}
                <Settings className="h-8 w-8 text-green-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("withSettingsConfigured")}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalMembers")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {loading ? (
                  <Skeleton className="h-9 w-16 animate-pulse" />
                ) : (
                  <div className="text-3xl font-bold text-purple-500">{totalMembers}</div>
                )}
                <Users className="h-8 w-8 text-purple-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("acrossAllClans")}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("channels")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {loading ? (
                  <Skeleton className="h-9 w-12 animate-pulse" />
                ) : (
                  <div className="text-3xl font-bold text-yellow-500">{channels.length}</div>
                )}
                <Hash className="h-8 w-8 text-yellow-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("availableChannels")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Clans Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-border hover:border-primary/50 transition-all duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-14 w-14 rounded-full animate-pulse" />
                      <div>
                        <Skeleton className="h-5 w-32 animate-pulse mb-2" />
                        <Skeleton className="h-4 w-24 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                      <Skeleton className="h-3 w-10 animate-pulse mb-2" />
                      <Skeleton className="h-6 w-12 animate-pulse" />
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                      <Skeleton className="h-3 w-14 animate-pulse mb-2" />
                      <Skeleton className="h-6 w-16 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <Skeleton className="h-4 w-12 animate-pulse" />
                    <Skeleton className="h-6 w-28 rounded-full animate-pulse" />
                  </div>
                  <Separator className="bg-border" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1 animate-pulse" />
                    <Skeleton className="h-10 w-10 animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : clans.length === 0 ? ( // NOSONAR — JSX nested ternary for multi-branch display state
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{t("noClansYet")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("getStartedAdding")}
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("addFirstClan")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {clans.map((clan) => {
              const isConfigured = !!(clan.settings?.clanChannel || clan.settings?.generalRole);

              return (
                <Card key={clan.tag} className="bg-card border-border hover:border-primary/50 transition-all duration-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14 border-2 border-border">
                          <AvatarImage src={clan.badge_url || clan.clan_badge_url || ''} alt={clan.name || clan.clan_name || 'Clan'} />
                          <AvatarFallback className="bg-secondary text-foreground">
                            {(clan.name || clan.clan_name || 'C').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg font-bold text-foreground">
                            {clan.name || clan.clan_name || 'Unknown'}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground font-mono text-xs">
                            {clan.tag || clan.clan_tag}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Clan Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">{t("level")}</div>
                        <div className="text-lg font-bold text-foreground">{clan.level || clan.clanLevel || t("notAvailable")}</div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">{t("members")}</div>
                        <div className="text-lg font-bold text-foreground flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {clan.member_count || clan.members || 0}/50
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">{t("status")}</span>
                      <Badge
                        variant={isConfigured ? "default" : "secondary"}
                        className={isConfigured ? "bg-green-600 hover:bg-green-700" : "bg-secondary"}
                      >
                        {isConfigured ? t("configuredBadge") : t("setupRequired")}
                      </Badge>
                    </div>

                    <Separator className="bg-border" />

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-border hover:border-primary hover:bg-primary/10"
                        onClick={() => handleOpenSettings(clan)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {t("configure")}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-border hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setClanToDelete(clan.tag || clan.clan_tag || '')}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Settings Dialog */}
        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
          <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("configureClan", { 
                  name: selectedClan?.name || selectedClan?.clan_name || 'Unknown', 
                  tag: selectedClan?.tag || selectedClan?.clan_tag || 'Unknown' 
                })}
              </DialogTitle>
              <DialogDescription>
                {t("customizeIntegration")}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
                <TabsTrigger value="advanced">{t("tabs.advanced")}</TabsTrigger>
                <TabsTrigger value="war">{t("tabs.war")}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>{t("memberRole")}</Label>
                      <InfoPopover content={t("fieldHelp.memberRole")} label={t("fieldHelp.infoButtonLabel")} />
                    </div>
                    <RoleCombobox
                      roles={discordRoles}
                      value={clanSettings?.generalRole?.toString() || 'disabled'}
                      onValueChange={(value) => setClanSettings({...clanSettings, generalRole: value === 'disabled' ? null : value})}
                      placeholder={t("selectRole")}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>{t("leaderRole")}</Label>
                      <InfoPopover content={t("fieldHelp.leaderRole")} label={t("fieldHelp.infoButtonLabel")} />
                    </div>
                    <RoleCombobox
                      roles={discordRoles}
                      value={clanSettings?.leaderRole?.toString() || 'disabled'}
                      onValueChange={(value) => setClanSettings({...clanSettings, leaderRole: value === 'disabled' ? null : value})}
                      placeholder={t("selectRole")}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>{t("clanChannel")}</Label>
                      <InfoPopover content={t("fieldHelp.clanChannel")} label={t("fieldHelp.infoButtonLabel")} />
                    </div>
                    <ChannelCombobox
                      channels={channels}
                      value={clanSettings.clanChannel?.toString() || 'none'}
                      onValueChange={(value) => setClanSettings({...clanSettings, clanChannel: value === 'none' || value === 'disabled' ? null : value})}
                      placeholder={t("selectChannel")}
                      showDisabled={false}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>{t("banAlertChannel")}</Label>
                      <InfoPopover
                        content={t.rich("fieldHelp.banAlertChannel", {
                          bansLink: (chunks) => ( // NOSONAR — framework-required inline render prop (next-intl rich / ReactMarkdown)
                            <Link href={`/dashboard/${guildId}/bans`} className="font-medium underline underline-offset-2">
                              {chunks}
                            </Link>
                          ),
                        })}
                        label={t("fieldHelp.infoButtonLabel")}
                      />
                    </div>
                    <ChannelCombobox
                      channels={channels}
                      value={clanSettings.ban_alert_channel?.toString() || 'none'}
                      onValueChange={(value) => setClanSettings({...clanSettings, ban_alert_channel: value === 'none' || value === 'disabled' ? null : value})}
                      placeholder={t("selectChannel")}
                      showDisabled={false}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>{t("category")}</Label>
                      <InfoPopover content={t("fieldHelp.category")} label={t("fieldHelp.infoButtonLabel")} />
                    </div>
                    <Input
                      placeholder={t("categoryPlaceholder")}
                      value={clanSettings?.category || ''}
                      onChange={(e) => setClanSettings({...clanSettings, category: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>{t("clanAbbreviation")}</Label>
                      <InfoPopover
                        content={t.rich("fieldHelp.clanAbbreviation", {
                          familySettingsLink: (chunks) => ( // NOSONAR — framework-required inline render prop (next-intl rich / ReactMarkdown)
                            <Link href={`/dashboard/${guildId}/family-settings`} className="font-medium underline underline-offset-2">
                              {chunks}
                            </Link>
                          ),
                        })}
                        label={t("fieldHelp.infoButtonLabel")}
                      />
                    </div>
                    <Input
                      placeholder={t("abbreviationPlaceholder")}
                      value={clanSettings?.abbreviation || ''}
                      onChange={(e) => setClanSettings({...clanSettings, abbreviation: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="space-y-0.5">
                      <Label>{t("leadershipEval")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("leadershipEvalDescription")}
                      </p>
                    </div>
                    <Switch
                      checked={clanSettings?.leadership_eval || false}
                      onCheckedChange={(checked) => setClanSettings({...clanSettings, leadership_eval: checked})}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="greeting-input">{t("greetingMessage")}</Label>
                    <Input
                      id="greeting-input"
                      placeholder={t("greetingPlaceholder")}
                      value={clanSettings?.greeting || ''}
                      onChange={(e) => setClanSettings({...clanSettings, greeting: e.target.value})}
                      className="bg-background border-border"
                    />

                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-primary" />
                        <p className="text-xs font-medium text-primary">{t("greeting.preview")}</p>
                      </div>
                      <p className="text-sm font-mono bg-background/50 border border-border rounded px-3 py-2 break-words">
                        {generateGreetingPreview(
                          clanSettings?.greeting || t("greetingPlaceholder"),
                          selectedClan?.name || selectedClan?.clan_name
                        )}
                      </p>
                    </div>

                    <Collapsible
                      open={isGreetingPlaceholdersOpen}
                      onOpenChange={setIsGreetingPlaceholdersOpen}
                      className="w-full space-y-2"
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex items-center gap-2 p-0 h-auto text-xs text-primary hover:bg-transparent">
                          {isGreetingPlaceholdersOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          {t("greeting.availablePlaceholders")}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2">
                        <div className="bg-secondary/30 rounded-md p-3 border border-border">
                          <p className="text-xs text-muted-foreground mb-2">{t("greeting.description")}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            {GREETING_PLACEHOLDERS.map((p) => (
                              <div key={p.key} className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-mono cursor-pointer hover:bg-primary/20 whitespace-nowrap"
                                  onClick={() => {
                                    const input = document.getElementById("greeting-input") as HTMLInputElement;
                                    if (input) {
                                      const start = input.selectionStart || 0;
                                      const end = input.selectionEnd || 0;
                                      const currentGreeting = clanSettings?.greeting || '';
                                      const newValue =
                                        currentGreeting.substring(0, start) +
                                        p.key +
                                        currentGreeting.substring(end);
                                      setClanSettings({ ...clanSettings, greeting: newValue });
                                      setTimeout(() => {
                                        input.focus();
                                        input.setSelectionRange(start + p.key.length, start + p.key.length);
                                      }, 0);
                                    }
                                  }}
                                >
                                  {p.key}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground leading-tight">{p.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("autoGreetOption")}</Label>
                    <Select
                      value={clanSettings?.auto_greet_option || 'Never'}
                      onValueChange={(value) => setClanSettings({...clanSettings, auto_greet_option: value})}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="Never">{t("autoGreetOptions.never")}</SelectItem>
                        <SelectItem value="Always">{t("autoGreetOptions.always")}</SelectItem>
                        <SelectItem value="On Join">{t("autoGreetOptions.onJoin")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="war" className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="space-y-0.5">
                      <Label>{t("warScoreCountdown")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("warScoreCountdownDescription")}
                      </p>
                    </div>
                    <Switch
                      checked={!!countdownStatus.war_score}
                      onCheckedChange={(checked) => handleToggleCountdown('war_score', checked)}
                      disabled={countdownLoading === 'war_score'}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="space-y-0.5">
                      <Label>{t("warTimerCountdown")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("warTimerCountdownDescription")}
                      </p>
                    </div>
                    <Switch
                      checked={!!countdownStatus.war_timer}
                      onCheckedChange={(checked) => handleToggleCountdown('war_timer', checked)}
                      disabled={countdownLoading === 'war_timer'}
                    />
                  </div>

                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {t("saveChanges")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={!!clanToDelete} onOpenChange={open => !open && setClanToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{tCommon("confirm")}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("deleteConfirm", { tag: clanToDelete ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { handleDeleteClan(clanToDelete!); setClanToDelete(null); }} // NOSONAR — non-null assertion guards against null safely in context
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
