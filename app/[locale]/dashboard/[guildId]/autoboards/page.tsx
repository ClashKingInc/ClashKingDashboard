"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, RefreshCw, Calendar, Trash2, Clock, Info, LayoutDashboard, AlertCircle, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscordOpenPopover } from "@/components/ui/discord-open-popover";
import { apiCache } from "@/lib/api-cache";
import { dashboardCacheKeys, normalizeChannelsPayload } from "@/lib/dashboard-cache";

// Type definitions
interface Channel {
  id: string;
  name: string;
  type: string;
  parent_name?: string;
}

interface AutoBoardConfig {
  id: string;
  type: string;
  board_type: string;
  button_id: string;
  webhook_id: string;
  thread_id: string | null;
  channel_id: string | null;
  days: string[] | null;
  locale: string;
  created_at: string | null;
}

interface ServerAutoBoardsResponse {
  autoboards: AutoBoardConfig[];
  total: number;
  post_count: number;
  refresh_count: number;
  limit: number;
}

// Board type keys - labels will come from translations
const BOARD_TYPE_KEYS = {
  // Clan Boards
  clandetailed: "clandetailed",
  clanbasic: "clanbasic",
  clanmini: "clanmini",
  clancompo: "clancompo",
  clandonos: "clandonos",
  clanactivity: "clanactivity",
  clancapoverview: "clancapoverview",
  clancapdonos: "clancapdonos",
  clancapraids: "clancapraids",
  clanwarlog: "clanwarlog",
  clancwlperf: "clancwlperf",
  clangames: "clangames",

  // Family Boards
  familyoverview: "familyoverview",
  familycompo: "familycompo",
  familydonos: "familydonos",
  familygames: "familygames",
  familyactivity: "familyactivity",

  // Legend Boards
  legendclan: "legendclan",
  legendday: "legendday",
  legendseason: "legendseason",

  // Other
  discordlinks: "discordlinks",
};

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "endofseason"];

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  nl: "nl-NL",
};

type BoardFilter = "all" | "post" | "refresh";

export default function AutoBoardsPage() { // NOSONAR — complexity comes from aggregate autoboard state management, not a single logic unit
  const params = useParams();
  const guildId = params?.guildId as string;
  const t = useTranslations("AutoboardsPage");
  const tCommon = useTranslations("Common");

  // Helper functions for translations
  const getBoardTypeLabel = (key: string) => t(`boardTypes.${key}` as any);
  const getDayLabel = (key: string) => t(`days.${key}` as any);

  const BOARD_TYPES: Record<string, string> = Object.keys(BOARD_TYPE_KEYS).reduce((acc, key) => {
    acc[key] = getBoardTypeLabel(key);
    return acc;
  }, {} as Record<string, string>);

  const DAYS = DAY_KEYS.map(key => ({ value: key, label: getDayLabel(key) }));

  // Calculate local time for 5:00 AM UTC
  const localResetTime = (() => {
    const date = new Date();
    date.setUTCHours(5, 0, 0, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })();

  const [loading, setLoading] = useState(true);
  const [autoboardsData, setAutoboardsData] = useState<ServerAutoBoardsResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);

  // New autoboard form state
  const [newType, setNewType] = useState<"post" | "refresh">("post");
  const [newBoardType, setNewBoardType] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Edit autoboard state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAutoboard, setEditingAutoboard] = useState<AutoBoardConfig | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editType, setEditType] = useState<"post" | "refresh">("post");
  const [editBoardType, setEditBoardType] = useState("");
  const [editChannel, setEditChannel] = useState("");
  const [editDays, setEditDays] = useState<string[]>([]);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");

  const autoboardsCacheKey = `autoboards-${guildId}`;
  const channelsCacheKey = dashboardCacheKeys.channels(guildId);

  const fetchAutoboards = useCallback(async (
    accessToken: string,
    forceRefresh = false
  ): Promise<ServerAutoBoardsResponse> => {
    if (forceRefresh) {
      apiCache.invalidate(autoboardsCacheKey);
    }

    return apiCache.get(autoboardsCacheKey, async () => {
      const response = await fetch(`/api/v2/server/${guildId}/autoboards`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch autoboards: ${response.status}`);
      }

      return response.json();
    });
  }, [autoboardsCacheKey, guildId]);

  const fetchChannels = useCallback(async (
    accessToken: string,
    forceRefresh = false
  ): Promise<Channel[]> => {
    if (forceRefresh) {
      apiCache.invalidate(channelsCacheKey);
    }

    return apiCache.get(channelsCacheKey, async () => {
      const response = await fetch(`/api/v2/server/${guildId}/channels`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.status}`);
      }

      return response.json();
    });
  }, [channelsCacheKey, guildId]);

  const refreshAutoboards = useCallback(async (accessToken: string) => {
    const freshAutoboards = await fetchAutoboards(accessToken, true);
    setAutoboardsData(freshAutoboards);
  }, [fetchAutoboards]);

  // Fetch autoboards and channels
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          setAutoboardsData(null);
          setChannels([]);
          return;
        }

        const [autoboardsResult, channelsResult] = await Promise.allSettled([
          fetchAutoboards(accessToken),
          fetchChannels(accessToken),
        ]);

        if (autoboardsResult.status === "fulfilled") {
          setAutoboardsData(autoboardsResult.value);
        }

        if (channelsResult.status === "fulfilled") {
          const channelsData = normalizeChannelsPayload(channelsResult.value);
          // Filter to only text channels
          const textChannels = channelsData.filter(ch => ch.type === "text" || ch.type === "0");
          setChannels(textChannels);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
  }, [guildId, fetchAutoboards, fetchChannels]);

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleEditDayToggle = (day: string) => {
    setEditDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const openEditDialog = (autoboard: AutoBoardConfig) => {
    setEditingAutoboard(autoboard);
    setEditType(autoboard.type as "post" | "refresh");
    setEditBoardType(autoboard.board_type);
    setEditChannel(autoboard.channel_id || "");
    setEditDays(autoboard.days || []);
    setEditDialogOpen(true);
  };

  const handleCreateAutoBoard = async () => {
    if (!newBoardType) {
      alert(t('alerts.selectBoardType'));
      return;
    }

    if (!selectedChannel) {
      alert(t('alerts.selectChannel'));
      return;
    }

    if (newType === 'post' && selectedDays.length === 0) {
      alert(t('alerts.selectDays'));
      return;
    }

    setCreating(true);
    try {
      const locale = params?.locale as string;
      const apiLocale = LOCALE_MAP[locale] ?? "en-US";

      const autoboardData = {
        type: newType,
        board_type: newBoardType,
        button_id: `${newBoardType}:${guildId}:page=0`,
        webhook_id: "0", // Will be created by backend
        channel_id: selectedChannel,
        days: newType === 'post' ? selectedDays : null,
        locale: apiLocale
      };

      const response = await fetch(`/api/v2/server/${guildId}/autoboards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(autoboardData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || t('alerts.createFailed'));
      }

      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        await refreshAutoboards(accessToken);
      }

      setCreateDialogOpen(false);
      setNewBoardType("");
      setSelectedChannel("");
      setSelectedDays([]);
      setNewType("post");
    } catch (error) {
      console.error('Error creating autoboard:', error);
      alert(error instanceof Error ? error.message : t('alerts.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateAutoBoard = async () => {
    if (!editingAutoboard) return;

    if (!editBoardType) {
      alert(t('alerts.selectBoardType'));
      return;
    }

    if (!editChannel) {
      alert(t('alerts.selectChannel'));
      return;
    }

    if (editType === 'post' && editDays.length === 0) {
      alert(t('alerts.selectDays'));
      return;
    }

    setUpdating(true);
    try {
      const updateData = {
        type: editType,
        board_type: editBoardType,
        channel_id: editChannel,
        days: editType === 'post' ? editDays : null,
      };

      const response = await fetch(`/api/v2/server/${guildId}/autoboards/${editingAutoboard.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || t('alerts.updateFailed'));
      }

      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        await refreshAutoboards(accessToken);
      }

      setEditDialogOpen(false);
      setEditingAutoboard(null);
      setEditBoardType("");
      setEditChannel("");
      setEditDays([]);
      setEditType("post");
    } catch (error) {
      console.error('Error updating autoboard:', error);
      alert(error instanceof Error ? error.message : t('alerts.updateFailed'));
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAutoBoard = async (autoboardId: string) => {
    setDeleting(autoboardId);
    try {
      const response = await fetch(`/api/v2/server/${guildId}/autoboards/${autoboardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(t('alerts.deleteFailed'));
      }

      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        await refreshAutoboards(accessToken);
      }
    } catch (error) {
      console.error('Error deleting autoboard:', error);
      alert(t('alerts.deleteFailed'));
    } finally {
      setDeleting(null);
    }
  };

  const confirmDeleteAutoBoard = async () => {
    if (!deleteConfirmId) return;
    await handleDeleteAutoBoard(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const getBoardTypeName = (boardType: string): string => {
    return BOARD_TYPES[boardType as keyof typeof BOARD_TYPES] || boardType; // NOSONAR — non-null assertion guards against null safely in context
  };

  const channelById = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels],
  );

  const getChannelState = useCallback((channelId: string | null): { label: string | null; isDeleted: boolean } => {
    if (!channelId) return { label: null, isDeleted: false };

    const channel = channelById.get(channelId);
    if (!channel) {
      return { label: null, isDeleted: true };
    }

    return {
      label: channel.parent_name ? `${channel.parent_name} / #${channel.name}` : `#${channel.name}`,
      isDeleted: false,
    };
  }, [channelById]);

  const totalBoards = autoboardsData?.total ?? 0;
  const postBoards = autoboardsData?.post_count ?? 0;
  const refreshBoards = autoboardsData?.refresh_count ?? 0;
  const allAutoboards = useMemo(() => autoboardsData?.autoboards ?? [], [autoboardsData]);

  const filteredAutoboards = useMemo(() => {
    if (boardFilter === "post") {
      return allAutoboards.filter((autoboard) => autoboard.type === "post");
    }

    if (boardFilter === "refresh") {
      return allAutoboards.filter((autoboard) => autoboard.type === "refresh");
    }

    return allAutoboards;
  }, [allAutoboards, boardFilter]);

  const renderAutoboardsListContent = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-lg">
              <Skeleton className="h-14 w-14 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (allAutoboards.length === 0) {
      return (
        <div className="text-center py-12">
          <LayoutDashboard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t('noAutoboards')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('noAutoboardsDesc')}
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('createAutoboard')}
          </Button>
        </div>
      );
    }

    if (filteredAutoboards.length === 0) {
      return (
        <div className="text-center py-12">
          <LayoutDashboard className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {t('noAutoboardsForFilter')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('noAutoboardsForFilterDesc')}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredAutoboards.map((autoboard) => {
          const channelState = getChannelState(autoboard.channel_id);
          const channelLabel = channelState.label;

          return (
            <div
              key={autoboard.id}
              className="flex flex-col gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-4 flex-1 w-full">
                <div className={`p-3 rounded-lg ${autoboard.type === 'post' ? 'bg-green-500/10 border border-green-500/30' : 'bg-purple-500/10 border border-purple-500/30'}`}>
                  {autoboard.type === 'post' ? (
                    <Calendar className="h-5 w-5 text-green-500" />
                  ) : (
                    <RefreshCw className="h-5 w-5 text-purple-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {getBoardTypeName(autoboard.board_type)}
                    </h3>
                    <Badge
                      variant={autoboard.type === 'post' ? 'default' : 'secondary'}
                      className={autoboard.type === 'post' ? 'cursor-default bg-green-600 text-white hover:bg-green-600 hover:text-white' : 'cursor-default bg-purple-600 text-white hover:bg-purple-600 hover:text-white'}
                    >
                      {autoboard.type === 'post' ? t('autoPost') : t('autoRefresh')}
                    </Badge>
                  </div>
                  {autoboard.type === 'post' && autoboard.days && autoboard.days.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t('postsOn')} {autoboard.days.map(d => getDayLabel(d)).join(', ')}
                    </p>
                  )}
                  {autoboard.type === 'refresh' && (
                    <p className="text-sm text-muted-foreground">
                      {t('updatesEvery')}
                    </p>
                  )}
                  {channelLabel && autoboard.channel_id && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span>{t('channel')}:</span>
                      <DiscordOpenPopover
                        title={channelLabel}
                        description={t('channel')}
                        url={`https://discord.com/channels/${guildId}/${autoboard.channel_id}`}
                        buttonLabel={tCommon('openChannelInDiscord')}
                        trigger={(
                          <button
                            type="button"
                            className="max-w-[260px] truncate text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {channelLabel}
                          </button>
                        )}
                      />
                    </div>
                  )}
                  {!channelLabel && channelState.isDeleted && autoboard.channel_id && (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-muted-foreground">{t('channel')}:</span>
                      <span className="font-medium text-orange-500">{t('channelDeleted')}</span>
                    </div>
                  )}
                  {autoboard.created_at && (
                    <p className="text-xs text-muted-foreground">
                      {t('created')} {new Date(autoboard.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="order-first flex items-center gap-2 self-start md:order-none md:self-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEditDialog(autoboard)}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  {t('edit')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirmId(autoboard.id)}
                  disabled={deleting === autoboard.id}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  {deleting === autoboard.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('remove')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <LayoutDashboard className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('title')}</h1>
                <p className="text-muted-foreground mt-1">
                  {t('description')}
                </p>
              </div>
            </div>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">{t('createDialogTitle')}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t('createDialogDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="autoboard-type" className="text-foreground">
                  {t('automationType')}
                  <span className="ml-1 text-destructive">*</span>
                </Label>
                <Select value={newType} onValueChange={(val) => setNewType(val as "post" | "refresh")}>
                  <SelectTrigger className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="post">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t('autoPostDesc')}
                      </div>
                    </SelectItem>
                    <SelectItem value="refresh">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        {t('autoRefreshDesc')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel" className="text-foreground">
                  {t('channel')}
                  <span className="ml-1 text-destructive">*</span>
                </Label>
                <ChannelCombobox
                  channels={channels}
                  value={selectedChannel}
                  onValueChange={setSelectedChannel}
                  placeholder={t('selectChannel')}
                  showDisabled={false}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  {t('channelDesc')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="board-type" className="text-foreground">
                  {t('boardType')}
                  <span className="ml-1 text-destructive">*</span>
                </Label>
                <Select value={newBoardType} onValueChange={setNewBoardType}>
                  <SelectTrigger className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground">
                    <SelectValue placeholder={t('selectBoardType')} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-[300px]">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('boardTypes.clanBoards')}</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => key.startsWith('clan'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">{t('boardTypes.familyBoards')}</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => key.startsWith('family'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">{t('boardTypes.legendBoards')}</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => key.startsWith('legend'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">{t('boardTypes.other')}</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => !key.startsWith('clan') && !key.startsWith('family') && !key.startsWith('legend'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {newType === 'post' && (
                <div className="space-y-2">
                  <Label className="text-foreground">
                    {t('postDays')}
                    <span className="ml-1 text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3 p-4 border border-border rounded-lg bg-background">
                    {DAYS.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={day.value}
                          checked={selectedDays.includes(day.value)}
                          onCheckedChange={() => handleDayToggle(day.value)}
                        />
                        <label
                          htmlFor={day.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer"
                        >
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('postDaysDesc', { time: localResetTime })}
                  </p>
                </div>
              )}

              {newType === 'refresh' && (
                <div className="p-4 border border-border rounded-lg bg-background/50">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{t('autoRefreshInfo')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('autoRefreshInfoDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
                className="border-border"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleCreateAutoBoard}
                disabled={creating || !newBoardType || !selectedChannel || (newType === 'post' && selectedDays.length === 0)}
                className="bg-primary hover:bg-primary/90"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  t('create')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit AutoBoard Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">{t('editDialogTitle')}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t('editDialogDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-autoboard-type" className="text-foreground">{t('automationType')}</Label>
                <Select value={editType} onValueChange={(val) => setEditType(val as "post" | "refresh")}>
                  <SelectTrigger className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="post">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t('autoPostDesc')}
                      </div>
                    </SelectItem>
                    <SelectItem value="refresh">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        {t('autoRefreshDesc')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-channel" className="text-foreground">{t('channel')}</Label>
                <ChannelCombobox
                  channels={channels}
                  value={editChannel}
                  onValueChange={setEditChannel}
                  placeholder={t('selectChannel')}
                  showDisabled={false}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  {t('channelDesc')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-board-type" className="text-foreground">{t('boardType')}</Label>
                <Select value={editBoardType} onValueChange={setEditBoardType}>
                  <SelectTrigger className="bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground">
                    <SelectValue placeholder={t('selectBoardType')} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-[300px]">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('boardTypes.clanBoards')}</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => key.startsWith('clan'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">{t('boardTypes.familyBoards')}</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => key.startsWith('family'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">{t('boardTypes.legendBoards')}</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => key.startsWith('legend'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">{t('boardTypes.other')}</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => !key.startsWith('clan') && !key.startsWith('family') && !key.startsWith('legend'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {editType === 'post' && (
                <div className="space-y-2">
                  <Label className="text-foreground">{t('postDays')}</Label>
                  <div className="grid grid-cols-2 gap-3 p-4 border border-border rounded-lg bg-background">
                    {DAYS.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${day.value}`}
                          checked={editDays.includes(day.value)}
                          onCheckedChange={() => handleEditDayToggle(day.value)}
                        />
                        <label
                          htmlFor={`edit-${day.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer"
                        >
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('postDaysDesc', { time: localResetTime })}
                  </p>
                </div>
              )}

              {editType === 'refresh' && (
                <div className="p-4 border border-border rounded-lg bg-background/50">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{t('autoRefreshInfo')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('autoRefreshInfoDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updating}
                className="border-border"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleUpdateAutoBoard}
                disabled={updating || !editBoardType || !editChannel || (editType === 'post' && editDays.length === 0)}
                className="bg-primary hover:bg-primary/90"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('updating')}
                  </>
                ) : (
                  t('update')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-500/30 bg-blue-500/5">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-400">{t('howItWorks')}</AlertTitle>
        <AlertDescription className="text-blue-300">
          <ReactMarkdown
            components={{
              p: ({ children }) => <span>{children}</span>, // NOSONAR — framework-required inline render prop (next-intl rich / ReactMarkdown)
              strong: ({ children }) => <strong className="font-semibold text-blue-300">{children}</strong>, // NOSONAR — framework-required inline render prop (next-intl rich / ReactMarkdown)
            }}
          >
            {t('howItWorksDesc')}
          </ReactMarkdown>
        </AlertDescription>
      </Alert>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="bg-card border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalAutoboards')}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[84px] flex flex-col justify-between">
            <div className="relative h-10">
              <div className="flex h-8 w-[84px] items-center">
                {loading ? (
                  <Skeleton className="h-8 w-[76px] animate-pulse" />
                ) : (
                  <div className="text-3xl font-bold leading-none tabular-nums text-blue-500">{totalBoards}</div>
                )}
              </div>
              <div className="absolute right-0 top-1 flex h-8 w-8 items-center justify-center">
                <LayoutDashboard className="h-8 w-8 text-blue-500/50" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-3 w-32 mt-2 animate-pulse" />
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                {autoboardsData?.limit ? `${totalBoards} / ${autoboardsData.limit} ${t('used')}` : tCommon("loading")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('autoPost')}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[84px] flex flex-col justify-between">
            <div className="relative h-10">
              <div className="flex h-8 w-[72px] items-center">
                {loading ? (
                  <Skeleton className="h-8 w-[64px] animate-pulse" />
                ) : (
                  <div className="text-3xl font-bold leading-none tabular-nums text-green-500">{postBoards}</div>
                )}
              </div>
              <div className="absolute right-0 top-1 flex h-8 w-8 items-center justify-center">
                <Calendar className="h-8 w-8 text-green-500/50" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('scheduledBoards')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-purple-500/30 bg-purple-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('autoRefresh')}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[84px] flex flex-col justify-between">
            <div className="relative h-10">
              <div className="flex h-8 w-[72px] items-center">
                {loading ? (
                  <Skeleton className="h-8 w-[64px] animate-pulse" />
                ) : (
                  <div className="text-3xl font-bold leading-none tabular-nums text-purple-500">{refreshBoards}</div>
                )}
              </div>
              <div className="absolute right-0 top-1 flex h-8 w-8 items-center justify-center">
                <RefreshCw className="h-8 w-8 text-purple-500/50" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('continuousUpdates')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('availableSlots')}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[84px] flex flex-col justify-between">
            <div className="relative h-10">
              <div className="flex h-8 w-[72px] items-center">
                {loading ? (
                  <Skeleton className="h-8 w-[64px] animate-pulse" />
                ) : (
                  <div className="text-3xl font-bold leading-none tabular-nums text-yellow-500">
                    {autoboardsData ? autoboardsData.limit - totalBoards : 0}
                  </div>
                )}
              </div>
              <div className="absolute right-0 top-1 flex h-8 w-8 items-center justify-center">
                <Clock className="h-8 w-8 text-yellow-500/50" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('remainingCapacity')}</p>
          </CardContent>
        </Card>
      </div>

      {/* AutoBoards List */}
      <Card className="bg-card border-border">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-foreground">{t('activeAutoboards')}</CardTitle>
            <Button
              size="sm"
              className="w-full bg-primary hover:bg-primary/90 sm:w-auto"
              disabled={autoboardsData ? autoboardsData.total >= autoboardsData.limit : false}
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('createAutoboard')}
            </Button>
          </div>
          <Tabs value={boardFilter} onValueChange={(value) => setBoardFilter(value as BoardFilter)}>
            <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-lg border border-border bg-muted p-1 sm:grid-cols-3 sm:gap-0">
              <TabsTrigger
                value="all"
                className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
              >
                <LayoutDashboard className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="truncate">{t('totalAutoboards')}</span>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-blue-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                  {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : totalBoards}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="post"
                className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0 text-green-500" />
                <span className="truncate">{t('autoPost')}</span>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-green-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                  {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : postBoards}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="refresh"
                className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                <span className="truncate">{t('autoRefresh')}</span>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-purple-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                  {loading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : refreshBoards}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {renderAutoboardsListContent()}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteConfirmId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('alerts.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('alerts.deleteConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deleting)}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAutoBoard}
              disabled={Boolean(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Best Practices */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="text-yellow-400">{t('tips')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-yellow-300">
          <p>
            <strong>{t('tipsContent.type.title')}</strong> {t('tipsContent.type.desc')}
          </p>
          <p>
            <strong>{t('tipsContent.limits.title')}</strong> {t('tipsContent.limits.desc')}
          </p>
          <p>
            <strong>{t('tipsContent.schedule.title')}</strong> {t('tipsContent.schedule.desc', { time: localResetTime })}
          </p>
          <p>
            <strong>{t('tipsContent.duplicates.title')}</strong> {t('tipsContent.duplicates.desc')}
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
