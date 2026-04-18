"use client";

import { type ComponentType, type Dispatch, type ReactNode, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  ShieldOff,
  Ticket,
  Trash2,
  X,
} from "lucide-react";

import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { RoleCombobox } from "@/components/ui/role-combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import { ClanProfilePopover } from "@/components/ui/clan-profile-popover";
import { PlayerProfilePopover } from "@/components/ui/player-profile-popover";
import { DiscordEmbedPreview, extractEmbeds, type DiscordEmbed } from "@/components/dashboard/discord-embed-preview";
import { normalizeChannelsPayload } from "@/lib/dashboard-cache";
import { cn } from "@/lib/utils";
import type {
  ApproveMessage,
  OpenTicket,
  ServerEmbed,
  THRequirement,
  TicketButton,
  TicketButtonSettings,
  TicketPanel,
  UpdateApproveMessagesRequest,
  UpdateButtonSettingsRequest,
  UpdateOpenTicketClanRequest,
  UpdateOpenTicketStatusRequest,
  UpdateTicketPanelRequest,
} from "@/lib/api/types/tickets";
import type { ServerClanListItem } from "@/lib/api/types/server";

// ─── Shared types ────────────────────────────────────────────────────────────

interface DiscordChannel {
  id: string;
  name: string;
  type: number | string;
  parent_name?: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color?: number;
}

const getTicketsPanelsCacheKey = (guildId: string) => `ticket-panels-${guildId}`;
const getTicketsEmbedsCacheKey = (guildId: string) => `ticket-embeds-${guildId}`;
const getServerChannelsCacheKey = (guildId: string) => `server-channels-${guildId}`;
const getServerRolesCacheKey = (guildId: string) => `server-roles-${guildId}`;
const MAX_APPROVE_MESSAGE_NAME_LENGTH = 100;
const MAX_APPROVE_MESSAGE_CONTENT_LENGTH = 2000;

const stripTrailingSlashes = (value: string): string => {
  let normalized = value;
  while (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

const getChannelTypeToken = (channel: DiscordChannel): string => {
  const rawType = (channel as { channel_type?: string | number; channelType?: string | number }).channel_type
    ?? (channel as { channelType?: string | number }).channelType
    ?? channel.type;
  return String(rawType).toLowerCase();
};

const isCategoryChannel = (channel: DiscordChannel): boolean => {
  const token = getChannelTypeToken(channel);
  return token === "4" || token.includes("category");
};

const isTextLikeChannel = (channel: DiscordChannel): boolean => {
  const token = getChannelTypeToken(channel);
  return token === "0" || token === "11" || token === "5" || token.includes("text") || token.includes("news");
};

const normalizeTicketChannels = (payload: unknown): DiscordChannel[] => {
  const normalized = normalizeChannelsPayload(payload) as DiscordChannel[];
  if (normalized.length > 0) {
    return normalized;
  }

  if (payload && typeof payload === "object") {
    const obj = payload as { items?: unknown; results?: unknown };
    if (Array.isArray(obj.items)) return obj.items as DiscordChannel[];
    if (Array.isArray(obj.results)) return obj.results as DiscordChannel[];
  }

  return [];
};

const normalizeTicketEmbeds = (payload: unknown): ServerEmbed[] => {
  if (Array.isArray(payload)) {
    return payload as ServerEmbed[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const obj = payload as { items?: unknown; data?: { items?: unknown } };
  if (Array.isArray(obj.items)) return obj.items as ServerEmbed[];
  if (obj.data && Array.isArray(obj.data.items)) return obj.data.items as ServerEmbed[];

  return [];
};

const toEmbedDataRecord = (data: unknown): Record<string, unknown> | null => {
  if (!data) return null;

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  return typeof data === "object" ? (data as Record<string, unknown>) : null;
};

const getAutoSaveStatusText = (
  isSaving: boolean,
  didAutoSave: boolean,
  t: (key: string) => string,
): string => {
  if (isSaving) return t("autoSaveSaving");
  if (didAutoSave) return t("autoSaveSaved");
  return "";
};

const getTicketDiscordUrl = (ticket: OpenTicket) =>
  `https://discord.com/channels/${ticket.server}/${ticket.channel}`;

const TRANSCRIPT_BASE_URL = stripTrailingSlashes(process.env.NEXT_PUBLIC_TRANSCRIPT_BASE_URL ?? "https://cdn.clashk.ing");

const getTranscriptUrl = (ticket: OpenTicket) =>
  `${TRANSCRIPT_BASE_URL}/transcript-${ticket.channel}.html`;

const DEFAULT_PREVIEW_ACCENT = "#3ba55d";

const normalizeOptionalText = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const pickFirstNonEmptyText = (...values: Array<string | null | undefined>): string | null => {
  for (const value of values) {
    const normalized = normalizeOptionalText(value);
    if (normalized) return normalized;
  }
  return null;
};

function TicketAccountsCell({
  ticket,
  fallbackAccountName,
}: {
  readonly ticket: OpenTicket;
  readonly fallbackAccountName?: string | null;
}) {
  const accounts = ticket.linked_accounts ?? [];

  if (accounts.length === 0) {
    if (!ticket.apply_account) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }

    const normalizedTag = normalizePlayerTag(ticket.apply_account);
    const playerName = fallbackAccountName ?? normalizedTag;

    return (
      <PlayerProfilePopover
        playerName={playerName}
        playerTag={normalizedTag}
        showTagInTrigger={false}
        triggerClassName="text-left hover:opacity-80 transition-opacity"
      >
        <span className="text-xs font-medium text-foreground underline-offset-2 hover:underline">
          {playerName}
        </span>
      </PlayerProfilePopover>
    );
  }

  return (
    <div className="space-y-1">
      {accounts.slice(0, 2).map((account) => (
        <div key={account.player_tag} className="text-xs leading-tight">
          <PlayerProfilePopover
            playerName={account.player_name ?? account.player_tag}
            playerTag={account.player_tag}
            townhallLevel={account.town_hall}
            showTagInTrigger={false}
            triggerClassName="text-left hover:opacity-80 transition-opacity"
          >
            <span className="font-medium text-foreground underline-offset-2 hover:underline">
              {account.player_name ?? account.player_tag}
            </span>
          </PlayerProfilePopover>
          {account.town_hall ? (
            <Badge variant="outline" className="ml-2 h-5 px-1.5 text-[10px]">
              TH{account.town_hall}
            </Badge>
          ) : null}
        </div>
      ))}
      {accounts.length > 2 ? (
        <p className="text-[11px] text-muted-foreground">+{accounts.length - 2}</p>
      ) : null}
    </div>
  );
}

const normalizePlayerTag = (value: string): string => {
  const trimmed = value.trim();
  const withoutPrefix = trimmed.replace(/^#/, "");
  return `#${withoutPrefix.toUpperCase()}`;
};

function TicketManageDialog({
  open,
  onOpenChange,
  ticket,
  guildId,
  clans,
  onSaved,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly ticket: OpenTicket | null;
  readonly guildId: string;
  readonly clans: ServerClanListItem[];
  readonly onSaved: () => Promise<void>;
}) {
  const t = useTranslations("TicketsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [status, setStatus] = useState<UpdateOpenTicketStatusRequest["status"]>("open");
  const [setClan, setSetClan] = useState<string>("disabled");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingClan, setIsSavingClan] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    setStatus(ticket.status);
    setSetClan(ticket.set_clan ?? "disabled");
  }, [ticket]);

  if (!ticket) return null;

  const handleStatusSave = async () => {
    setIsSavingStatus(true);
    try {
      const res = await apiClient.tickets.updateOpenTicketStatus(guildId, ticket.channel, { status });
      if (res.error) throw new Error(res.error);
      await onSaved();
      toast({ title: tCommon("success"), description: t("manage.statusSaved") });
      if (status === "delete") onOpenChange(false);
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : tCommon("loadError"),
        variant: "destructive",
      });
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleClanSave = async () => {
    setIsSavingClan(true);
    try {
      const payload: UpdateOpenTicketClanRequest = { set_clan: setClan === "disabled" ? null : setClan };
      const res = await apiClient.tickets.updateOpenTicketClan(guildId, ticket.channel, payload);
      if (res.error) throw new Error(res.error);
      await onSaved();
      toast({ title: tCommon("success"), description: t("manage.clanSaved") });
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : tCommon("loadError"),
        variant: "destructive",
      });
    } finally {
      setIsSavingClan(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await apiClient.tickets.deleteOpenTicket(guildId, ticket.channel);
      if (res.error) throw new Error(res.error);
      await onSaved();
      onOpenChange(false);
      toast({ title: tCommon("success"), description: t("manage.deleted") });
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : tCommon("loadError"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("manage.title", { number: ticket.number })}</DialogTitle>
          <DialogDescription>{t("manage.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">#{ticket.number}</Badge>
            <Badge variant="outline" className={STATUS_BADGE_CLASS[ticket.status] ?? ""}>
              {t(`status.${ticket.status}`)}
            </Badge>
            <Badge variant="secondary">{ticket.panel}</Badge>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("table.panel")}</p>
              <p className="mt-1 font-medium">{ticket.panel}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("table.user")}</p>
              <div className="mt-1">
                <DiscordUserDisplay
                  userId={ticket.user}
                  username={ticket.discord_display_name ?? ticket.discord_username}
                  avatarUrl={ticket.discord_avatar_url}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("table.account")}</p>
              <div className="mt-1">
                <TicketAccountsCell ticket={ticket} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3">
              <Label className="text-sm font-medium">{t("manage.statusLabel")}</Label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={status} onValueChange={(value) => setStatus(value as UpdateOpenTicketStatusRequest["status"])}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t("status.open")}</SelectItem>
                  <SelectItem value="sleep">{t("status.sleep")}</SelectItem>
                  <SelectItem value="closed">{t("status.closed")}</SelectItem>
                  <div className="my-1 border-t border-border" />
                  <SelectItem value="delete" className="text-destructive focus:text-destructive">
                    {t("manage.statusDelete")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleStatusSave} disabled={isSavingStatus}>
                {isSavingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("manage.saveStatus")}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3">
              <Label className="text-sm font-medium">{t("manage.clanLabel")}</Label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={setClan} onValueChange={setSetClan}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t("manage.selectClan")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">{t("manage.noClan")}</SelectItem>
                  {clans.map((clan) => (
                    <SelectItem key={clan.tag} value={clan.tag}>{clan.name} ({clan.tag})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleClanSave} disabled={isSavingClan}>
                {isSavingClan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("manage.saveClan")}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t("manage.deleteTicket")}</p>
                <p className="text-xs text-muted-foreground">{t("manage.deleteHint")}</p>
              </div>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("manage.deleteTicket")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tickets tab ─────────────────────────────────────────────────────────────

type StatusFilter = "all" | "open" | "sleep" | "closed";
type TicketSortKey = "number" | "panel" | "status" | "user" | "clan" | "account";
type SortDirection = "asc" | "desc";

const STATUS_BADGE_CLASS: Record<string, string> = {
  open: "border-green-500/40 bg-green-500/10 text-green-500",
  sleep: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  closed: "border-red-500/40 bg-red-500/10 text-red-400",
  delete: "border-red-900/40 bg-red-900/10 text-red-400",
};

type StatCardConfig = {
  key: StatusFilter;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  borderClass: string;
  bgClass: string;
  textClass: string;
  iconClass: string;
  ringClass: string;
};

const STAT_CARD_CONFIGS: StatCardConfig[] = [
  {
    key: "all",
    labelKey: "filter.all",
    icon: Ticket,
    borderClass: "border-primary/30",
    bgClass: "bg-primary/5",
    textClass: "text-primary",
    iconClass: "text-primary/40",
    ringClass: "ring-primary/50",
  },
  {
    key: "open",
    labelKey: "status.open",
    icon: CheckCircle2,
    borderClass: "border-green-500/30",
    bgClass: "bg-green-500/5",
    textClass: "text-green-500",
    iconClass: "text-green-500/40",
    ringClass: "ring-green-500/50",
  },
  {
    key: "sleep",
    labelKey: "status.sleep",
    icon: Clock3,
    borderClass: "border-amber-500/30",
    bgClass: "bg-amber-500/5",
    textClass: "text-amber-500",
    iconClass: "text-amber-500/40",
    ringClass: "ring-amber-500/50",
  },
  {
    key: "closed",
    labelKey: "status.closed",
    icon: ShieldOff,
    borderClass: "border-red-500/30",
    bgClass: "bg-red-500/5",
    textClass: "text-red-500",
    iconClass: "text-red-500/40",
    ringClass: "ring-red-500/50",
  },
];

function TicketsTab({
  guildId,
}: {
  readonly guildId: string;
}) {
  const t = useTranslations("TicketsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();

  const [allTickets, setAllTickets] = useState<OpenTicket[]>([]);
  const [clans, setClans] = useState<ServerClanListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<OpenTicket | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [sortKey, setSortKey] = useState<TicketSortKey>("number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [accountNameByTag, setAccountNameByTag] = useState<Record<string, string | null>>({});

  const ticketsCacheKey = `open-tickets-${guildId}`;
  const clansCacheKey = `clans-${guildId}`;
  const ticketStatusQueries: UpdateOpenTicketStatusRequest["status"][] = ["open", "sleep", "closed", "delete"];

  const fetchTicketsData = async (forceRefresh = false) => {
    if (forceRefresh) {
      apiCache.invalidate(ticketsCacheKey);
      apiCache.invalidate(clansCacheKey);
    }

    return apiCache.get(ticketsCacheKey, async () => {
      const [response, statusResponses, clansResponse] = await Promise.all([
        apiClient.tickets.getOpenTickets(guildId),
        Promise.allSettled(ticketStatusQueries.map((status) => apiClient.tickets.getOpenTickets(guildId, status))),
        apiCache.get(clansCacheKey, () => apiClient.servers.getServerClans(guildId)),
      ]);

      if (clansResponse.error) throw new Error(clansResponse.error);

      const ticketsByChannel = new Map<string, OpenTicket>();
      const mergeTicket = (existing: OpenTicket, incoming: OpenTicket): OpenTicket => {
        const existingLinkedCount = existing.linked_accounts?.length ?? 0;
        const incomingLinkedCount = incoming.linked_accounts?.length ?? 0;
        let mergedLinkedAccounts = incoming.linked_accounts ?? existing.linked_accounts;
        if (incomingLinkedCount > 0) {
          mergedLinkedAccounts = incoming.linked_accounts;
        } else if (existingLinkedCount > 0) {
          mergedLinkedAccounts = existing.linked_accounts;
        }

        return {
          ...existing,
          ...incoming,
          discord_username: pickFirstNonEmptyText(incoming.discord_username, existing.discord_username),
          discord_display_name: pickFirstNonEmptyText(incoming.discord_display_name, existing.discord_display_name),
          discord_avatar_url: pickFirstNonEmptyText(incoming.discord_avatar_url, existing.discord_avatar_url),
          apply_account: pickFirstNonEmptyText(incoming.apply_account, existing.apply_account),
          linked_accounts: mergedLinkedAccounts,
        };
      };

      const addTickets = (items: OpenTicket[]) => {
        for (const ticket of items) {
          const existing = ticketsByChannel.get(ticket.channel);
          ticketsByChannel.set(ticket.channel, existing ? mergeTicket(existing, ticket) : ticket);
        }
      };

      if (!response.error) {
        addTickets(response.data?.items ?? []);
      }

      const hasSuccessfulFallbackQuery = statusResponses.some(
        (statusResponse) => statusResponse.status === "fulfilled" && !statusResponse.value.error
      );

      for (const statusResponse of statusResponses) {
        if (statusResponse.status !== "fulfilled" || statusResponse.value.error) continue;
        addTickets(statusResponse.value.data?.items ?? []);
      }

      if (ticketsByChannel.size === 0 && response.error && !hasSuccessfulFallbackQuery) {
        throw new Error(response.error);
      }

      const userIdentityById = new Map<string, {
        readonly username: string | null;
        readonly displayName: string | null;
        readonly avatarUrl: string | null;
      }>();

      for (const ticket of ticketsByChannel.values()) {
        const userId = normalizeOptionalText(ticket.user);
        if (!userId) continue;

        const existingIdentity = userIdentityById.get(userId);
        userIdentityById.set(userId, {
          username: pickFirstNonEmptyText(existingIdentity?.username, ticket.discord_username),
          displayName: pickFirstNonEmptyText(existingIdentity?.displayName, ticket.discord_display_name),
          avatarUrl: pickFirstNonEmptyText(existingIdentity?.avatarUrl, ticket.discord_avatar_url),
        });
      }

      const mergedTickets = Array.from(ticketsByChannel.values()).map((ticket) => {
        const userId = normalizeOptionalText(ticket.user);
        if (!userId) return ticket;

        const identity = userIdentityById.get(userId);
        if (!identity) return ticket;

        return {
          ...ticket,
          discord_username: pickFirstNonEmptyText(ticket.discord_username, identity.username),
          discord_display_name: pickFirstNonEmptyText(ticket.discord_display_name, identity.displayName),
          discord_avatar_url: pickFirstNonEmptyText(ticket.discord_avatar_url, identity.avatarUrl),
        };
      });

      return {
        tickets: mergedTickets,
        clans: clansResponse.data ?? [],
      };
    });
  };

  const fetchTickets = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await fetchTicketsData(isRefresh);
      setAllTickets(data.tickets);
      setClans(data.clans);
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : tCommon("loadError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCleanup = async (ticket: OpenTicket) => {
    try {
      const res = await apiClient.tickets.deleteOpenTicket(guildId, ticket.channel);
      if (res.error) throw new Error(res.error);
      if (selectedTicket?.channel === ticket.channel) {
        setManageOpen(false);
        setSelectedTicket(null);
      }
      await fetchTickets(true);
      toast({ title: tCommon("success"), description: t("manage.deleted") });
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : tCommon("loadError"),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  useEffect(() => {
    setAccountNameByTag((prev) => {
      const next = { ...prev };
      let hasChanges = false;
      for (const ticket of allTickets) {
        for (const account of ticket.linked_accounts ?? []) {
          if (!account.player_name) continue;
          const normalizedTag = normalizePlayerTag(account.player_tag);
          if (next[normalizedTag] === account.player_name) continue;
          next[normalizedTag] = account.player_name;
          hasChanges = true;
        }
      }
      return hasChanges ? next : prev;
    });
  }, [allTickets]);

  const counts: Record<StatusFilter, number> = {
    all: allTickets.length,
    open: allTickets.filter((t) => t.status === "open").length,
    sleep: allTickets.filter((t) => t.status === "sleep").length,
    closed: allTickets.filter((t) => t.status === "closed" || t.status === "delete").length,
  };
  const clanByTag = useMemo(() => new Map(clans.map((clan) => [clan.tag, clan])), [clans]);

  const displayed = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? allTickets
        : statusFilter === "closed" // NOSONAR — JSX nested ternary for multi-branch display state
          ? allTickets.filter((t) => t.status === "closed" || t.status === "delete")
          : allTickets.filter((t) => t.status === statusFilter);

    const statusOrder: Record<OpenTicket["status"], number> = {
      open: 0,
      sleep: 1,
      closed: 2,
      delete: 3,
    };

    const getPrimaryAccountName = (ticket: OpenTicket): string => {
      const firstLinkedAccount = ticket.linked_accounts?.[0];
      if (firstLinkedAccount?.player_name) return firstLinkedAccount.player_name;
      if (firstLinkedAccount?.player_tag) return firstLinkedAccount.player_tag;
      if (!ticket.apply_account) return "";
      const normalizedTag = normalizePlayerTag(ticket.apply_account);
      return accountNameByTag[normalizedTag] ?? normalizedTag;
    };

    return [...filtered].sort((a, b) => {
      let compare = 0;

      switch (sortKey) {
        case "number":
          compare = a.number - b.number;
          break;
        case "panel":
          compare = a.panel.localeCompare(b.panel, undefined, { sensitivity: "base" });
          break;
        case "status":
          compare = statusOrder[a.status] - statusOrder[b.status];
          break;
        case "user": {
          const userA = a.discord_display_name ?? a.discord_username ?? a.user;
          const userB = b.discord_display_name ?? b.discord_username ?? b.user;
          compare = userA.localeCompare(userB, undefined, { sensitivity: "base" });
          break;
        }
        case "clan": {
          const clanA = clanByTag.get(a.set_clan ?? "")?.name ?? a.set_clan ?? "";
          const clanB = clanByTag.get(b.set_clan ?? "")?.name ?? b.set_clan ?? "";
          compare = clanA.localeCompare(clanB, undefined, { sensitivity: "base" });
          break;
        }
        case "account":
          compare = getPrimaryAccountName(a).localeCompare(getPrimaryAccountName(b), undefined, { sensitivity: "base" });
          break;
      }

      return sortDirection === "asc" ? compare : -compare;
    });
  }, [accountNameByTag, allTickets, clanByTag, sortDirection, sortKey, statusFilter]);

  const handleSort = (key: TicketSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortIndicator = (key: TicketSortKey) => {
    if (sortKey !== key) {
      return <ChevronDown className="h-3.5 w-3.5 opacity-30" />;
    }

    return sortDirection === "asc"
      ? <ChevronUp className="h-3.5 w-3.5" />
      : <ChevronDown className="h-3.5 w-3.5" />;
  };

  return (
    <div className="space-y-6">
      <TicketManageDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        ticket={selectedTicket}
        guildId={guildId}
        clans={clans}
        onSaved={() => fetchTickets(true)}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARD_CONFIGS.map(({ key, labelKey, icon: Icon, borderClass, bgClass, textClass, iconClass, ringClass }) => (
          <button key={key} onClick={() => setStatusFilter(key)} className="text-left focus:outline-none">
            <Card className={cn(
              borderClass, bgClass, "transition-all",
              statusFilter === key && `ring-2 ring-offset-2 ring-offset-background ${ringClass}`,
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t(labelKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {isLoading
                    ? <Skeleton className="h-9 w-16 animate-pulse" />
                    : <div className={cn("text-3xl font-bold", textClass)}>{counts[key]}</div>
                  }
                  <Icon className={cn("h-8 w-8", iconClass)} />
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{t("tabTickets")}</CardTitle>
            <CardDescription>
              {t("showing", { count: displayed.length, total: allTickets.length })}
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => fetchTickets(true)} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" /> // NOSONAR — index is the only stable key for these items (skeleton/static list)
              ))}
            </div>
          ) : displayed.length === 0 ? ( // NOSONAR — JSX nested ternary for multi-branch display state
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
              <Ticket className="h-8 w-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("noTickets")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("noTicketsHint")}</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium text-left"
                      onClick={() => handleSort("number")}
                    >
                      {t("table.number")}
                      {renderSortIndicator("number")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium text-left"
                      onClick={() => handleSort("panel")}
                    >
                      {t("table.panel")}
                      {renderSortIndicator("panel")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium text-left"
                      onClick={() => handleSort("status")}
                    >
                      {tCommon("status")}
                      {renderSortIndicator("status")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium text-left"
                      onClick={() => handleSort("user")}
                    >
                      {t("table.user")}
                      {renderSortIndicator("user")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium text-left"
                      onClick={() => handleSort("clan")}
                    >
                      {t("table.clan")}
                      {renderSortIndicator("clan")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium text-left"
                      onClick={() => handleSort("account")}
                    >
                      {t("table.account")}
                      {renderSortIndicator("account")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((ticket) => (
                  <TableRow key={ticket.channel}>
                    <TableCell className="font-mono font-semibold text-primary">
                      #{ticket.number}
                    </TableCell>
                    <TableCell className="font-medium">{ticket.panel}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={STATUS_BADGE_CLASS[ticket.status] ?? ""}>
                          {t(`status.${ticket.status}`)}
                        </Badge>
                        {!ticket.channel_exists && ticket.status !== "delete" && (
                          <span title={t("missingChannel")} className="text-amber-500">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DiscordUserDisplay
                        userId={ticket.user}
                        username={ticket.discord_display_name ?? ticket.discord_username}
                        avatarUrl={ticket.discord_avatar_url}
                      />
                    </TableCell>
                    <TableCell>
                      {ticket.set_clan ? (
                        <ClanProfilePopover
                          clanName={clanByTag.get(ticket.set_clan)?.name ?? ticket.set_clan}
                          clanTag={ticket.set_clan}
                          clanBadgeUrl={
                            clanByTag.get(ticket.set_clan)?.badge_url
                            ?? clanByTag.get(ticket.set_clan)?.clan_badge_url
                            ?? clanByTag.get(ticket.set_clan)?.badge
                            ?? null
                          }
                          showTagInTrigger={false}
                          triggerClassName="text-left cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <span className="text-xs font-medium text-foreground">
                            {clanByTag.get(ticket.set_clan)?.name ?? ticket.set_clan}
                          </span>
                        </ClanProfilePopover>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TicketAccountsCell
                        ticket={ticket}
                        fallbackAccountName={
                          ticket.apply_account
                            ? accountNameByTag[normalizePlayerTag(ticket.apply_account)]
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {ticket.channel_exists ? (
                          <Button asChild variant="ghost" size="icon">
                            <a
                              href={getTicketDiscordUrl(ticket)}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={t("openInDiscord")}
                              title={t("openInDiscord")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : !ticket.channel_exists && ticket.status !== "delete" ? ( // NOSONAR — JSX nested ternary for multi-branch display state
                          <Button variant="ghost" size="sm" onClick={() => handleCleanup(ticket)}>
                            {t("cleanup")}
                          </Button>
                        ) : null}
                        {ticket.status === "delete" && (
                          <Button asChild variant="ghost" size="icon">
                            <a
                              href={getTranscriptUrl(ticket)}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={t("transcript")}
                              title={t("transcript")}
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {ticket.status !== "delete" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setManageOpen(true);
                            }}
                          >
                            {t("manage.open")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Configuration tab ───────────────────────────────────────────────────────

function TicketPanelTab({
  panel, guildId, availableEmbeds, embeds, previewButtons, onOpenButtonsTab,
}: {
  readonly panel: TicketPanel;
  readonly guildId: string;
  readonly availableEmbeds: string[];
  readonly embeds: ServerEmbed[];
  readonly previewButtons: TicketButton[];
  readonly onOpenButtonsTab: () => void;
}) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [didAutoSave, setDidAutoSave] = useState(false);
  const [embedName, setEmbedName] = useState(panel.embed_name ?? "disabled");
  const skipNextAutosave = useRef(true);
  const hasPendingUserChange = useRef(false);
  const embedOptions = Array.from(new Set([...(panel.embed_name ? [panel.embed_name] : []), ...availableEmbeds])).sort((a, b) => a.localeCompare(b));
  const selectedEmbed = embeds.find((embed) => embed.name === (embedName === "disabled" ? null : embedName));
  const selectedEmbedData = toEmbedDataRecord(selectedEmbed?.data);
  const embedPreviews = selectedEmbedData ? extractEmbeds(selectedEmbedData) : [];
  const autoSaveStatusText = getAutoSaveStatusText(isSaving, didAutoSave, t);
  const embedsInfoTemplate = t("panelEmbedInfoLine1", { dashboardLabel: tCommon("dashboard") });
  const buttonsInfoTemplate = t("panelEmbedInfoLine2");

  const renderTemplateWithPlaceholder = (template: string, slot: ReactNode) => {
    const parts = template.split("%s");
    if (parts.length < 2) {
      return <>{template} {slot}</>;
    }
    return (
      <>
        {parts[0]}
        {slot}
        {parts.slice(1).join("%s")}
      </>
    );
  };

  const getEmbedPreviewKey = (embed: DiscordEmbed): string => {
    return JSON.stringify({
      title: embed.title ?? "",
      description: embed.description ?? "",
      url: embed.url ?? "",
      color: embed.color ?? "",
      author: embed.author?.name ?? "",
      footer: embed.footer?.text ?? "",
      image: embed.image?.url ?? "",
      thumbnail: embed.thumbnail?.url ?? "",
      fields: embed.fields?.map((field) => `${field.name}:${field.value}:${field.inline ? "1" : "0"}`) ?? [],
    });
  };

  const getPreviewButtonClass = (style: number): string => {
    switch (style) {
      case 1:
        return "bg-[#5865f2] hover:bg-[#4752c4] text-white";
      case 3:
        return "bg-[#3ba55d] hover:bg-[#2d7d46] text-white";
      case 4:
        return "bg-[#ed4245] hover:bg-[#c03537] text-white";
      default:
        return "bg-[#4e5058] hover:bg-[#6d6f78] text-white";
    }
  };

  useEffect(() => {
    setEmbedName(panel.embed_name ?? "disabled");
    setDidAutoSave(false);
    skipNextAutosave.current = true;
    hasPendingUserChange.current = false;
  }, [panel.name, panel.embed_name]);

  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!hasPendingUserChange.current) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const payload: UpdateTicketPanelRequest = {
          embed_name: embedName === "disabled" ? null : embedName,
        };
        const res = await apiClient.tickets.updatePanel(guildId, panel.name, payload);
        if (res.error) throw new Error(res.error);
        apiCache.invalidate(getTicketsPanelsCacheKey(guildId));
        setDidAutoSave(true);
        hasPendingUserChange.current = false;
      } catch (err) {
        toast({ title: t("autoSaveErrorTitle"), description: err instanceof Error ? err.message : t("autoSaveErrorDescription"), variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [embedName, guildId, panel.name, t, toast]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
          <Label className="text-sm">{t("panelEmbed")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("panelEmbedHint")} {autoSaveStatusText}
          </p>
          <Select value={embedName} onValueChange={(value) => {
            hasPendingUserChange.current = true;
            setDidAutoSave(false);
            setEmbedName(value);
          }}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectEmbed")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="disabled">{t("defaultEmbed")}</SelectItem>
              {embedOptions.map((embed) => (
                <SelectItem key={embed} value={embed}>{embed}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Alert className="mt-3 border-blue-500/30 bg-blue-500/5 text-xs">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-300">
              <p>
              {renderTemplateWithPlaceholder(
                embedsInfoTemplate,
                <Link href="../embeds" className="font-medium text-blue-400 underline underline-offset-2 hover:text-blue-300">
                  {t("embeds")}
                </Link>,
              )}
              </p>
              <p className="mt-1.5">
              {renderTemplateWithPlaceholder(
                buttonsInfoTemplate,
                <button
                  type="button"
                  onClick={onOpenButtonsTab}
                  className="font-medium text-blue-400 underline underline-offset-2 hover:text-blue-300"
                >
                  {t("tabButtons")}
                </button>,
              )}
              </p>
            </AlertDescription>
          </Alert>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
          <Label className="text-sm">{t("panelEmbedPreview")}</Label>
          {embedPreviews.length > 0 ? (
            <div className="space-y-2">
              {(() => {
                const duplicateCounts = new Map<string, number>();
                return embedPreviews.map((embed) => {
                  const baseKey = getEmbedPreviewKey(embed);
                  const occurrence = duplicateCounts.get(baseKey) ?? 0;
                  duplicateCounts.set(baseKey, occurrence + 1);
                  return (
                    <DiscordEmbedPreview
                      key={`${selectedEmbed?.name ?? "ticket-panel-embed"}-${baseKey}-${occurrence}`}
                      embed={embed}
                    />
                  );
                });
              })()}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
              {t("panelEmbedPreviewEmpty")}
            </div>
          )}

          {previewButtons.length > 0 ? (
            <div className="pt-2 flex flex-wrap gap-2">
              {previewButtons.map((button) => (
                <span
                  key={button.custom_id}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors",
                    getPreviewButtonClass(button.style),
                  )}
                >
                  <span>{button.label}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PanelSettingsTab({
  panel, categories, textChannels, guildId,
}: {
  readonly panel: TicketPanel;
  readonly categories: DiscordChannel[];
  readonly textChannels: DiscordChannel[];
  readonly guildId: string;
}) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [didAutoSave, setDidAutoSave] = useState(false);
  const skipNextAutosave = useRef(true);
  const hasPendingUserChange = useRef(false);
  const [form, setForm] = useState({
    open_category: panel.open_category ?? "disabled",
    sleep_category: panel.sleep_category ?? "disabled",
    closed_category: panel.closed_category ?? "disabled",
    status_change_log: panel.status_change_log ?? "disabled",
    ticket_button_click_log: panel.ticket_button_click_log ?? "disabled",
    ticket_close_log: panel.ticket_close_log ?? "disabled",
  });

  const toNullable = (v: string) => (v === "disabled" ? null : v);
  const set = (key: keyof typeof form) => (val: string) => {
    hasPendingUserChange.current = true;
    setDidAutoSave(false);
    setForm((p) => ({ ...p, [key]: val }));
  };
  const autoSaveStatusText = getAutoSaveStatusText(isSaving, didAutoSave, t);

  useEffect(() => {
    setForm({
      open_category: panel.open_category ?? "disabled",
      sleep_category: panel.sleep_category ?? "disabled",
      closed_category: panel.closed_category ?? "disabled",
      status_change_log: panel.status_change_log ?? "disabled",
      ticket_button_click_log: panel.ticket_button_click_log ?? "disabled",
      ticket_close_log: panel.ticket_close_log ?? "disabled",
    });
    setDidAutoSave(false);
    skipNextAutosave.current = true;
    hasPendingUserChange.current = false;
  }, [
    panel.name,
    panel.open_category,
    panel.sleep_category,
    panel.closed_category,
    panel.status_change_log,
    panel.ticket_button_click_log,
    panel.ticket_close_log,
  ]);

  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!hasPendingUserChange.current) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const payload: UpdateTicketPanelRequest = {
          open_category: toNullable(form.open_category),
          sleep_category: toNullable(form.sleep_category),
          closed_category: toNullable(form.closed_category),
          status_change_log: toNullable(form.status_change_log),
          ticket_button_click_log: toNullable(form.ticket_button_click_log),
          ticket_close_log: toNullable(form.ticket_close_log),
        };
        const res = await apiClient.tickets.updatePanel(guildId, panel.name, payload);
        if (res.error) throw new Error(res.error);
        apiCache.invalidate(getTicketsPanelsCacheKey(guildId));
        setDidAutoSave(true);
        hasPendingUserChange.current = false;
      } catch (err) {
        toast({ title: t("autoSaveErrorTitle"), description: err instanceof Error ? err.message : t("autoSaveErrorDescription"), variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form, guildId, panel.name, t, toast]);

  const catChannels = categories.map((c) => ({ id: c.id, name: c.name }));
  const txtChannels = textChannels.map((c) => ({ id: c.id, name: c.name, parent_name: c.parent_name }));

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        {autoSaveStatusText}
      </p>
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("categories")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["open_category", "sleep_category", "closed_category"] as const).map((key) => (
            <div key={key} className="space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-3">
              <Label className="text-sm">{t(key)}</Label>
              <ChannelCombobox
                channels={catChannels}
                value={form[key]}
                onValueChange={set(key)}
                placeholder={t("selectCategory")}
                searchPlaceholder={tCommon("searchCategories")}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("logChannels")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["status_change_log", "ticket_button_click_log", "ticket_close_log"] as const).map((key) => (
            <div key={key} className="space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-3">
              <Label className="text-sm">{t(key)}</Label>
              <ChannelCombobox channels={txtChannels} value={form[key]} onValueChange={set(key)} placeholder={t("selectChannel")} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const BUTTON_STYLE_COLOR: Record<number, string> = {
  1: "bg-[#5865F2]",
  2: "bg-[#4f545c]",
  3: "bg-[#57F287]",
  4: "bg-[#ED4245]",
};

const createDefaultButtonSettings = (): TicketButtonSettings => ({
  questions: [],
  mod_role: [],
  no_ping_mod_role: [],
  private_thread: false,
  th_min: 0,
  num_apply: 25,
  naming: "{ticket_count}-{user}",
  account_apply: false,
  player_info: false,
  apply_clans: [],
  roles_to_add: [],
  roles_to_remove: [],
  townhall_requirements: {},
  new_message: null,
});

const createSettingsForm = (settings: TicketButtonSettings): UpdateButtonSettingsRequest => ({
  questions: [...settings.questions, "", "", "", "", ""].slice(0, 5),
  mod_role: [...settings.mod_role],
  no_ping_mod_role: [...settings.no_ping_mod_role],
  private_thread: settings.private_thread,
  th_min: settings.th_min,
  num_apply: settings.num_apply,
  naming: settings.naming || "{ticket_count}-{user}",
  account_apply: settings.account_apply,
  player_info: settings.player_info,
  apply_clans: [...(settings.apply_clans ?? [])],
  roles_to_add: [...(settings.roles_to_add ?? [])],
  roles_to_remove: [...(settings.roles_to_remove ?? [])],
  townhall_requirements: { ...settings.townhall_requirements },
  new_message: settings.new_message,
});

const createButtonSettingsFromForm = (form: UpdateButtonSettingsRequest): TicketButtonSettings => ({
  ...createDefaultButtonSettings(),
  questions: form.questions.filter((question) => question.trim().length > 0),
  mod_role: [...form.mod_role],
  no_ping_mod_role: [...form.no_ping_mod_role],
  private_thread: form.private_thread,
  th_min: form.th_min,
  num_apply: form.num_apply,
  naming: form.naming,
  account_apply: form.account_apply,
  player_info: form.player_info,
  apply_clans: [...form.apply_clans],
  roles_to_add: [...form.roles_to_add],
  roles_to_remove: [...form.roles_to_remove],
  townhall_requirements: { ...form.townhall_requirements },
  new_message: form.new_message,
});

function ButtonCard({
  customId, label, style, settings, panelName, guildId, roles, availableEmbeds, embeds, onDeleted, onAppearanceUpdated,
}: {
  readonly customId: string;
  readonly label: string;
  readonly style: number;
  readonly settings: TicketButtonSettings;
  readonly panelName: string;
  readonly guildId: string;
  readonly roles: DiscordRole[];
  readonly availableEmbeds: string[];
  readonly embeds: ServerEmbed[];
  readonly onDeleted: () => void;
  readonly onAppearanceUpdated: (label: string, style: number) => void;
}) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editStyle, setEditStyle] = useState(style);
  const [settingsSection, setSettingsSection] = useState<"general" | "requirements" | "embeds">("general");
  const [latestSettings, setLatestSettings] = useState<TicketButtonSettings>(settings);

  const handleDeleteButton = async () => {
    setIsDeleting(true);
    try {
      const res = await apiClient.tickets.deleteButton(guildId, panelName, customId);
      if (res.error) throw new Error(res.error);
      toast({ title: tCommon("success"), description: t("buttonDeleted") });
      onDeleted();
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  const [form, setForm] = useState<UpdateButtonSettingsRequest>(() => createSettingsForm(settings));
  const [clanTagInput, setClanTagInput] = useState("");

  useEffect(() => {
    if (settingsOpen) return;
    setLatestSettings(settings);
  }, [settings, settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    setSettingsSection("general");
    setEditLabel(label);
    setEditStyle(style);
    setForm(createSettingsForm(latestSettings));
    setClanTagInput("");
  }, [settingsOpen, label, style, latestSettings]);
  const embedOptions = Array.from(new Set([...(settings.new_message ? [settings.new_message] : []), ...availableEmbeds])).sort((a, b) => a.localeCompare(b));
  const selectedButtonEmbed = embeds.find((embed) => embed.name === (form.new_message ?? ""));
  const selectedButtonEmbedData = toEmbedDataRecord(selectedButtonEmbed?.data);
  const buttonEmbedPreviews = selectedButtonEmbedData ? extractEmbeds(selectedButtonEmbedData) : [];

  const setField = <K extends keyof UpdateButtonSettingsRequest>(key: K, val: UpdateButtonSettingsRequest[K]) =>
    setForm((p) => ({ ...p, [key]: val }));
  const setQuestion = (i: number, val: string) =>
    setForm((p) => { const q = [...p.questions]; q[i] = val; return { ...p, questions: q }; });
  const addRole = (type: "mod_role" | "no_ping_mod_role" | "roles_to_add" | "roles_to_remove") => (id: string) =>
    setForm((p) => ({ ...p, [type]: [...p[type], id] }));
  const removeRole = (type: "mod_role" | "no_ping_mod_role" | "roles_to_add" | "roles_to_remove", id: string) =>
    setForm((p) => ({ ...p, [type]: p[type].filter((r) => r !== id) }));

  const addClanTag = () => {
    const normalizedTag = clanTagInput.trim().toUpperCase();
    const tag = normalizedTag.startsWith("#") ? normalizedTag : `#${normalizedTag}`;
    if (!tag || tag === "#" || form.apply_clans.includes(tag)) { setClanTagInput(""); return; }
    setForm((p) => ({ ...p, apply_clans: [...p.apply_clans, tag] }));
    setClanTagInput("");
  };
  const removeClanTag = (tag: string) =>
    setForm((p) => ({ ...p, apply_clans: p.apply_clans.filter((c) => c !== tag) }));

  const addTHRow = () => {
    const th = String(
      [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].find((n) => !form.townhall_requirements[String(n)]) ?? 17
    );
    setForm((p) => ({
      ...p,
      townhall_requirements: {
        ...p.townhall_requirements,
        [th]: { TH: Number(th), BK: 0, AQ: 0, GW: 0, RC: 0, WARST: 0 },
      },
    }));
  };
  const removeTHRow = (th: string) =>
    setForm((p) => {
      const next = { ...p.townhall_requirements };
      delete next[th];
      return { ...p, townhall_requirements: next };
    });
  const setTHField = (th: string, field: keyof THRequirement, val: number) =>
    setForm((p) => ({
      ...p,
      townhall_requirements: {
        ...p.townhall_requirements,
        [th]: { ...p.townhall_requirements[th], [field]: val },
      },
    }));

  const handleSave = async () => {
    if (!editLabel.trim()) return;
    setIsSaving(true);
    let appearanceUpdated = false;
    const didChangeAppearance = editLabel !== label || editStyle !== style;
    try {
      if (didChangeAppearance) {
        const appearanceRes = await apiClient.tickets.updateButtonAppearance(guildId, panelName, customId, {
          label: editLabel,
          style: editStyle,
        });
        if (appearanceRes.error) throw new Error(appearanceRes.error);
        appearanceUpdated = true;
      }

      const settingsRes = await apiClient.tickets.updateButtonSettings(guildId, panelName, customId, {
        ...form,
        questions: form.questions.filter(Boolean),
      });
      if (settingsRes.error) throw new Error(settingsRes.error);
      setLatestSettings(createButtonSettingsFromForm(form));

      if (didChangeAppearance) {
        onAppearanceUpdated(editLabel, editStyle);
      }
      toast({ title: tCommon("success"), description: t("buttonSaved", { label: editLabel }) });
      setSettingsOpen(false);
    } catch (err) {
      if (appearanceUpdated) {
        const rollbackRes = await apiClient.tickets.updateButtonAppearance(guildId, panelName, customId, {
          label,
          style,
        });
        if (!rollbackRes.error) {
          onAppearanceUpdated(label, style);
        }
      }
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const roleOptions = roles.filter((r) => r.name !== "@everyone");
  const namingPlaceholders = [
    "{ticket_count}",
    "{user}",
    "{account_name}",
    "{account_th}",
    "{ticket_status}",
    "{emoji_status}",
  ] as const;

  const STYLE_COLORS: Record<number, string> = { 1: "bg-[#5865F2]", 2: "bg-[#4f545c]", 3: "bg-[#57F287]", 4: "bg-[#ED4245]" };

  return (
    <>
      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("editButtonTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{t("editButtonDescription")}</DialogDescription>
          </DialogHeader>
          <Tabs
            value={settingsSection}
            onValueChange={(value) => setSettingsSection(value as "general" | "requirements" | "embeds")}
            className="mt-2 flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            <TabsList className="grid h-auto w-full grid-cols-1 gap-1 border border-border bg-background p-1 sm:grid-cols-3 sm:gap-0 sm:p-0">
              <TabsTrigger value="general" className="h-auto px-3 py-2 text-center text-sm leading-snug data-[state=active]:bg-muted">
                General
              </TabsTrigger>
              <TabsTrigger value="requirements" className="h-auto px-3 py-2 text-center text-sm leading-snug data-[state=active]:bg-muted">
                Requirements
              </TabsTrigger>
              <TabsTrigger value="embeds" className="h-auto px-3 py-2 text-center text-sm leading-snug data-[state=active]:bg-muted">
                Embeds and Questions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4 h-[52vh] overflow-y-auto pr-1 space-y-4">
              <div className="space-y-4 rounded-xl border border-border bg-background p-4">
                <div className="space-y-1.5">
                  <Label>{t("buttonLabel")}</Label>
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder={t("buttonLabelPlaceholder")} maxLength={80} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("buttonStyle")}</Label>
                  <div className="flex gap-2">
                    {([1, 2, 3, 4] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setEditStyle(s)}
                        className={cn("h-7 w-7 rounded", STYLE_COLORS[s], editStyle === s ? "ring-2 ring-offset-2 ring-offset-background ring-white/80" : "opacity-60 hover:opacity-100")} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(["mod_role", "no_ping_mod_role"] as const).map((type) => (
                  <div key={type} className="space-y-2 rounded-xl border border-border bg-background p-4">
                    <Label className="text-sm font-medium">{t(type === "mod_role" ? "modRoles" : "noPingRoles")}</Label>
                    <p className="text-xs text-muted-foreground">{t(type === "mod_role" ? "modRolesHint" : "noPingRolesHint")}</p>
                    <div className="flex flex-wrap gap-2 min-h-[28px]">
                      {form[type].map((id) => {
                        const role = roleOptions.find((r) => r.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1">
                            @{role?.name ?? id}
                            <button onClick={() => removeRole(type, id)}><X className="h-3 w-3" /></button>
                          </Badge>
                        );
                      })}
                    </div>
                    <RoleCombobox roles={roleOptions} mode="add" excludeRoleIds={form[type]} onAdd={addRole(type)} />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(["roles_to_add", "roles_to_remove"] as const).map((type) => (
                  <div key={type} className="space-y-2 rounded-xl border border-border bg-background p-4">
                    <Label className="text-sm font-medium">{t(type === "roles_to_add" ? "rolesToAdd" : "rolesToRemove")}</Label>
                    <p className="text-xs text-muted-foreground">{t(type === "roles_to_add" ? "rolesToAddHint" : "rolesToRemoveHint")}</p>
                    <div className="flex flex-wrap gap-2 min-h-[28px]">
                      {form[type].map((id) => {
                        const role = roleOptions.find((r) => r.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1">
                            @{role?.name ?? id}
                            <button onClick={() => removeRole(type, id)}><X className="h-3 w-3" /></button>
                          </Badge>
                        );
                      })}
                    </div>
                    <RoleCombobox roles={roleOptions} mode="add" excludeRoleIds={form[type]} onAdd={addRole(type)} />
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["private_thread", "privateThread", "privateThreadHint"],
                  ["player_info", "playerInfo", "playerInfoHint"],
                ] as const).map(([field, labelKey, hintKey]) => (
                  <div key={field} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                    <div>
                      <p className="text-sm font-medium">{t(labelKey)}</p>
                      <p className="text-xs text-muted-foreground">{t(hintKey)}</p>
                    </div>
                    <Switch
                      checked={form[field] as boolean}
                      onCheckedChange={(v) => setField(field, v)}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ticket-naming-convention" className="text-sm font-medium">{t("naming")}</Label>
                  <Input
                    id="ticket-naming-convention"
                    value={form.naming}
                    onChange={(e) => setField("naming", e.target.value)}
                    placeholder="{ticket_count}-{user}"
                    className="font-mono text-sm"
                  />
                </div>
                <p className="mt-3 text-xs font-medium text-muted-foreground">{t("namingPlaceholders")}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {namingPlaceholders.map((placeholder) => (
                    <Badge
                      key={placeholder}
                      variant="secondary"
                      className="cursor-pointer font-mono text-xs hover:bg-primary/20"
                      onClick={() => {
                        const input = document.getElementById("ticket-naming-convention") as HTMLInputElement | null;
                        if (!input) return;
                        const start = input.selectionStart ?? form.naming.length;
                        const end = input.selectionEnd ?? form.naming.length;
                        const nextValue =
                          form.naming.substring(0, start)
                          + placeholder
                          + form.naming.substring(end);
                        setField("naming", nextValue);
                        setTimeout(() => {
                          input.focus();
                          const cursor = start + placeholder.length;
                          input.setSelectionRange(cursor, cursor);
                        }, 0);
                      }}
                    >
                      {placeholder}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="requirements" className="mt-4 h-[52vh] overflow-y-auto pr-1 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 rounded-xl border border-border bg-background p-4 sm:col-span-3">
                  <Label className="text-sm font-medium">{t("applyClans")}</Label>
                  <p className="text-xs text-muted-foreground">{t("applyClansHint")}</p>
                  <div className="flex flex-wrap gap-2 min-h-[28px]">
                    {form.apply_clans.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1 font-mono">
                        {tag}
                        <button onClick={() => removeClanTag(tag)}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={clanTagInput}
                      onChange={(e) => setClanTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addClanTag(); } }}
                      placeholder={t("clanTagPlaceholder")}
                      className="font-mono"
                    />
                    <Button variant="outline" size="sm" onClick={addClanTag} type="button">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 rounded-xl border border-border bg-background p-4">
                  <Label className="text-sm font-medium">{t("thMin")}</Label>
                  <Input type="number" min={0} max={17} value={form.th_min} onChange={(e) => setField("th_min", Number(e.target.value))} />
                </div>
                <div className="space-y-1.5 rounded-xl border border-border bg-background p-4">
                  <Label className="text-sm font-medium">{t("numApply")}</Label>
                  <Input type="number" min={1} max={25} value={form.num_apply} onChange={(e) => setField("num_apply", Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">{t("numApplyHint")}</p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                  <div>
                    <p className="text-sm font-medium">{t("accountApply")}</p>
                    <p className="text-xs text-muted-foreground">{t("accountApplyHint")}</p>
                  </div>
                  <Switch
                    checked={form.account_apply}
                    onCheckedChange={(v) => setField("account_apply", v)}
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">{t("thRequirements")}</Label>
                    <p className="text-xs text-muted-foreground">{t("thRequirementsHint")}</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">{t("thHeroLegend")}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addTHRow} type="button"
                    disabled={Object.keys(form.townhall_requirements).length >= 15}>
                    <Plus className="mr-1.5 h-4 w-4" />{t("addThLevel")}
                  </Button>
                </div>
                {Object.keys(form.townhall_requirements).length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">{t("thLevel")}</th>
                          {(["BK", "AQ", "GW", "RC", "WARST"] as const).map((h) => (
                            <th key={h} className="px-3 py-2 text-center font-medium text-xs text-muted-foreground">{h}</th>
                          ))}
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(form.townhall_requirements)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([th, reqs]) => (
                            <tr key={th} className="border-b border-border last:border-0">
                              <td className="px-3 py-2 font-semibold">TH{th}</td>
                              {(["BK", "AQ", "GW", "RC", "WARST"] as const).map((hero) => (
                                <td key={hero} className="px-2 py-1.5">
                                  <Input
                                    type="number" min={0} max={100}
                                    value={reqs[hero] ?? 0}
                                    onChange={(e) => setTHField(th, hero, Number(e.target.value))}
                                    className="h-8 w-16 text-center px-1"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-1.5">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeTHRow(th)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="embeds" className="mt-4 h-[52vh] overflow-y-auto pr-1 space-y-4">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="grid gap-4 lg:grid-cols-2 items-start">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t("ticketOpenEmbed")}</Label>
                      <p className="text-xs text-muted-foreground">{t("ticketOpenEmbedHint")}</p>
                      <Select
                        value={form.new_message ?? "disabled"}
                        onValueChange={(value) => setField("new_message", value === "disabled" ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectEmbed")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disabled">{t("noCustomMessage")}</SelectItem>
                          {embedOptions.map((embed) => (
                            <SelectItem key={embed} value={embed}>{embed}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="space-y-2">
                    {(() => {
                      if (form.new_message === null) {
                        return (
                          <div className="rounded-md border-l-4 bg-[#2b2d31]/70 p-3 text-sm leading-relaxed text-slate-100 whitespace-pre-line" style={{ borderLeftColor: DEFAULT_PREVIEW_ACCENT }}>
                            {"This ticket will be handled shortly!\nPlease be patient."}
                          </div>
                        );
                      }
                      if (buttonEmbedPreviews.length > 0) {
                        return (
                          <div className="space-y-2">
                            {buttonEmbedPreviews.map((embed, i) => (
                              <DiscordEmbedPreview
                                key={`${selectedButtonEmbed?.name ?? "button-embed"}-${i}`}
                                embed={embed}
                              />
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                          {t("panelEmbedPreviewEmpty")}
                        </div>
                      );
                    })()}
                  </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-border bg-background p-4">
                  <Label className="text-sm font-medium">{t("questions")}</Label>
                  <p className="text-xs text-muted-foreground">{t("questionsHint")}</p>
                  <div className="space-y-2">
                    {form.questions.map((q, i) => (
                      <Input key={i} value={q} onChange={(e) => setQuestion(i, e.target.value)} placeholder={`${t("question")} ${i + 1}`} /> // NOSONAR — index is the only stable key for these items (skeleton/static list)
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="pt-3 mt-2 border-t border-border/70">
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleSave} disabled={isSaving || !editLabel.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("confirmDeleteButton", { label })}</DialogTitle>
            <DialogDescription>{t("confirmDeleteButtonHint")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)}>{tCommon("cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteButton} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="flex w-full flex-wrap items-center gap-3 p-4">
          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-3">
          <span className={`h-3 w-3 rounded-sm shrink-0 ${BUTTON_STYLE_COLOR[style] ?? "bg-muted"}`} />
          <span className="min-w-0 flex-1 font-medium">{label}</span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {settings.account_apply && <Badge variant="secondary">{t("badge.accountApply")}</Badge>}
            {settings.private_thread && <Badge variant="secondary">{t("badge.privateThread")}</Badge>}
            {settings.th_min > 0 && <Badge variant="secondary">TH{settings.th_min}+</Badge>}
          </div>
        </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => { setEditLabel(label); setEditStyle(style); setSettingsOpen(true); }}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function MessagesTab({ panel, guildId }: { readonly panel: TicketPanel; readonly guildId: string }) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  type EditableApproveMessage = ApproveMessage & { localId: string };
  const localIdCounterRef = useRef(0);
  const makeLocalId = () => (
    globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${(localIdCounterRef.current++).toString(36)}`
  );
  const [messages, setMessages] = useState<EditableApproveMessage[]>(
    (panel.approve_messages ?? []).map((message) => ({ ...message, localId: makeLocalId() })),
  );
  const [draftMessages, setDraftMessages] = useState<EditableApproveMessage[]>(
    (panel.approve_messages ?? []).map((message) => ({ ...message, localId: makeLocalId() })),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [expandedPreviewIds, setExpandedPreviewIds] = useState<Set<string>>(new Set());
  const [expandedEditorIds, setExpandedEditorIds] = useState<Set<string>>(new Set());
  const cloneMessages = useCallback(
    (items: EditableApproveMessage[]): EditableApproveMessage[] => items.map((item) => ({ ...item })),
    [],
  );

  useEffect(() => {
    const nextMessages = (panel.approve_messages ?? []).map((message) => ({ ...message, localId: makeLocalId() }));
    setMessages(nextMessages);
    setDraftMessages(cloneMessages(nextMessages));
    setExpandedPreviewIds(new Set());
    setExpandedEditorIds(new Set());
  }, [panel.approve_messages, cloneMessages]);

  const toggleExpanded = (setter: Dispatch<SetStateAction<Set<string>>>, localId: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId);
      else next.add(localId);
      return next;
    });
  };

  const updateMessageField = (index: number, field: "name" | "message", value: string) => {
    const limitedValue = field === "name"
      ? value.slice(0, MAX_APPROVE_MESSAGE_NAME_LENGTH)
      : value.slice(0, MAX_APPROVE_MESSAGE_CONTENT_LENGTH);
    setDraftMessages((prev) => prev.map((msg, idx) => (idx === index ? { ...msg, [field]: limitedValue } : msg)));
  };

  const addMessage = () => {
    if (draftMessages.length >= 25) return;
    const localId = makeLocalId();
    setDraftMessages((prev) => [...prev, { name: "", message: "", localId }]);
    setExpandedEditorIds((prev) => {
      const next = new Set(prev);
      next.add(localId);
      return next;
    });
  };

  const removeMessage = (index: number) => {
    const localId = draftMessages[index]?.localId;
    setDraftMessages((prev) => prev.filter((_, idx) => idx !== index));
    if (!localId) return;
    setExpandedPreviewIds((prev) => {
      const next = new Set(prev);
      next.delete(localId);
      return next;
    });
    setExpandedEditorIds((prev) => {
      const next = new Set(prev);
      next.delete(localId);
      return next;
    });
  };

  const moveMessage = (index: number, direction: "up" | "down") => {
    setDraftMessages((prev) => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleSave = async () => {
    const valid = draftMessages.filter((m) => m.name.trim());
    if (valid.length !== draftMessages.length) {
      toast({ title: tCommon("error"), description: t("messageNameRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payloadMessages = valid.map(({ name, message }) => ({ name, message }));
      const res = await apiClient.tickets.updateApproveMessages(guildId, panel.name, { messages: payloadMessages } as UpdateApproveMessagesRequest);
      if (res.error) throw new Error(res.error);
      setMessages(valid);
      setDraftMessages(cloneMessages(valid));
      setExpandedPreviewIds(new Set());
      setExpandedEditorIds(new Set());
      setEditOpen(false);
      toast({ title: tCommon("success"), description: t("messagesSaved") });
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open);
        if (open) {
          setDraftMessages(cloneMessages(messages));
          setExpandedEditorIds(new Set());
          return;
        }
        setDraftMessages(cloneMessages(messages));
        setExpandedEditorIds(new Set());
      }}>
        <DialogContent className="bg-card border-border sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("editMessagesTitle")}</DialogTitle>
            <DialogDescription>{t("editMessagesDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{t("messagesMaxHint")}</p>
              <Button variant="outline" size="sm" onClick={addMessage} disabled={draftMessages.length >= 25}>
                <Plus className="mr-1.5 h-4 w-4" />{t("addMessage")}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              {draftMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-muted-foreground gap-2">
                  <MessageSquare className="h-8 w-8 opacity-40" />
                  <p className="text-sm">{t("noMessages")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {draftMessages.map((msg, i) => {
                    const isExpanded = expandedEditorIds.has(msg.localId);
                    return (
                      <div key={msg.localId} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex flex-1 items-center gap-2 text-left"
                            onClick={() => toggleExpanded(setExpandedEditorIds, msg.localId)}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            <span className="text-sm font-medium text-muted-foreground truncate">{msg.name.trim() || `${t("messageName")} ${i + 1}`}</span>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMessage(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => moveMessage(i, "up")}
                            disabled={i === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => moveMessage(i, "down")}
                            disabled={i === draftMessages.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>

                        {isExpanded ? (
                          <div className="mt-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-muted-foreground">{t("messageName")}</p>
                              <p className="text-xs text-muted-foreground">({msg.name.length}/{MAX_APPROVE_MESSAGE_NAME_LENGTH})</p>
                            </div>
                            <Input
                              className="h-9 bg-background border-border font-medium"
                              value={msg.name}
                              onChange={(e) => updateMessageField(i, "name", e.target.value)}
                              placeholder={t("messageName")}
                              maxLength={MAX_APPROVE_MESSAGE_NAME_LENGTH}
                            />
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-muted-foreground">{t("contentLabel")}</p>
                              <p className="text-xs text-muted-foreground">({msg.message.length}/{MAX_APPROVE_MESSAGE_CONTENT_LENGTH})</p>
                            </div>
                            <Textarea
                              className="bg-background border-border"
                              value={msg.message}
                              onChange={(e) => updateMessageField(i, "message", e.target.value)}
                              placeholder={t("messageContent")}
                              rows={4}
                              maxLength={MAX_APPROVE_MESSAGE_CONTENT_LENGTH}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 mt-2 border-t border-border/70">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t("approveMessages")}</p>
            <p className="text-xs text-muted-foreground">{t("approveMessagesHint")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            {t("editMessagesButton")}
          </Button>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-muted-foreground gap-2">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-sm">{t("noMessages")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, i) => {
              const isExpanded = expandedPreviewIds.has(msg.localId);
              return (
                <div key={msg.localId} className="rounded-lg border border-border p-3">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 text-left"
                    onClick={() => toggleExpanded(setExpandedPreviewIds, msg.localId)}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <span className="flex-1 truncate text-sm font-medium text-muted-foreground">{msg.name.trim() || `${t("messageName")} ${i + 1}`}</span>
                  </button>
                  {isExpanded ? (
                    <div className="mt-2">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{t("contentLabel")}</p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{msg.message || t("messageContent")}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function PanelCard({
  panel, categories, textChannels, roles, guildId, availableEmbeds, embeds, onDeleted,
}: {
  readonly panel: TicketPanel;
  readonly categories: DiscordChannel[];
  readonly textChannels: DiscordChannel[];
  readonly roles: DiscordRole[];
  readonly guildId: string;
  readonly availableEmbeds: string[];
  readonly embeds: ServerEmbed[];
  readonly onDeleted: () => void;
}) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [components, setComponents] = useState(panel.components);
  const [confirmDeletePanelOpen, setConfirmDeletePanelOpen] = useState(false);
  const [isDeletingPanel, setIsDeletingPanel] = useState(false);
  const [addButtonOpen, setAddButtonOpen] = useState(false);
  const [newButtonLabel, setNewButtonLabel] = useState("");
  const [newButtonStyle, setNewButtonStyle] = useState(2);
  const [isAddingButton, setIsAddingButton] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState("ticket-panel");

  const STYLE_COLORS: Record<number, string> = { 1: "bg-[#5865F2]", 2: "bg-[#4f545c]", 3: "bg-[#57F287]", 4: "bg-[#ED4245]" };

  const handleDeletePanel = async () => {
    setIsDeletingPanel(true);
    try {
      const res = await apiClient.tickets.deletePanel(guildId, panel.name);
      if (res.error) throw new Error(res.error);
      apiCache.invalidate(getTicketsPanelsCacheKey(guildId));
      toast({ title: tCommon("success"), description: t("panelDeleted") });
      onDeleted();
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsDeletingPanel(false);
      setConfirmDeletePanelOpen(false);
    }
  };

  const handleAddButton = async () => {
    if (!newButtonLabel.trim()) return;
    setIsAddingButton(true);
    try {
      const res = await apiClient.tickets.createButton(guildId, panel.name, {
        label: newButtonLabel,
        style: newButtonStyle,
        emoji: { name: "📩" },
      });
      if (res.error) throw new Error(res.error);
      toast({ title: tCommon("success"), description: t("buttonAdded") });
      // Reload panel data by fetching fresh panels
      apiCache.invalidate(getTicketsPanelsCacheKey(guildId));
      const panelsRes = await apiCache.get(getTicketsPanelsCacheKey(guildId), () => apiClient.tickets.getPanels(guildId));
      const fresh = panelsRes.data?.items.find(p => p.name === panel.name);
      if (fresh) setComponents(fresh.components);
      setAddButtonOpen(false);
      setNewButtonLabel("");
      setNewButtonStyle(2);
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsAddingButton(false);
    }
  };

  return (
    <>
      {/* Confirm delete panel dialog */}
      <Dialog open={confirmDeletePanelOpen} onOpenChange={setConfirmDeletePanelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("confirmDeletePanel", { name: panel.name })}</DialogTitle>
            <DialogDescription>{t("confirmDeletePanelHint")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeletePanelOpen(false)}>{tCommon("cancel")}</Button>
            <Button variant="destructive" onClick={handleDeletePanel} disabled={isDeletingPanel}>
              {isDeletingPanel && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add button dialog */}
      <Dialog open={addButtonOpen} onOpenChange={setAddButtonOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("addButtonTitle")}</DialogTitle>
            <DialogDescription>{t("addButtonDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("buttonLabel")}</Label>
              <Input value={newButtonLabel} onChange={(e) => setNewButtonLabel(e.target.value)} placeholder={t("buttonLabelPlaceholder")} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("buttonStyle")}</Label>
              <div className="flex gap-2">
                {([1, 2, 3, 4] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setNewButtonStyle(s)}
                    className={cn("h-7 w-7 rounded", STYLE_COLORS[s], newButtonStyle === s ? "ring-2 ring-offset-2 ring-offset-background ring-white/80" : "opacity-60 hover:opacity-100")} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddButtonOpen(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleAddButton} disabled={isAddingButton || !newButtonLabel.trim()}>
              {isAddingButton && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("addButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border/60">
        <CardHeader className="select-none">
          <div className="flex items-start justify-between gap-3">
            <button className="flex-1 text-left" onClick={() => setExpanded((v) => !v)}>
              <div className="space-y-2">
                <CardTitle className="text-base">{panel.name}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{components.length} {t("buttons")}</Badge>
                  <Badge variant="secondary">{panel.approve_messages.length} {t("messages")}</Badge>
                  {panel.embed_name ? <Badge variant="outline">{panel.embed_name}</Badge> : null}
                </div>
                <CardDescription>{t("panelHint")}</CardDescription>
              </div>
            </button>
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); setConfirmDeletePanelOpen(true); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <button onClick={() => setExpanded((v) => !v)} className="text-muted-foreground hover:text-foreground p-1">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-4">
            <Tabs value={activeConfigTab} onValueChange={setActiveConfigTab}>
              <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4 sm:gap-0 sm:p-0">
                <TabsTrigger value="ticket-panel" className="h-auto px-3 py-2 text-sm">{t("tabChannels")}</TabsTrigger>
                <TabsTrigger value="buttons" className="h-auto px-3 py-2 text-sm">{t("tabButtons")}</TabsTrigger>
                <TabsTrigger value="messages" className="h-auto px-3 py-2 text-sm">{t("tabMessages")}</TabsTrigger>
                <TabsTrigger value="settings" className="h-auto px-3 py-2 text-sm">{t("tabSettings")}</TabsTrigger>
              </TabsList>
              <TabsContent value="ticket-panel" className="mt-0" forceMount>
                <TicketPanelTab
                  panel={panel}
                  guildId={guildId}
                  availableEmbeds={availableEmbeds}
                  embeds={embeds}
                  previewButtons={components}
                  onOpenButtonsTab={() => setActiveConfigTab("buttons")}
                />
              </TabsContent>
              <TabsContent value="buttons" className="mt-0" forceMount>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{components.length}/5 {t("buttons")}</p>
                    <Button variant="outline" size="sm" onClick={() => setAddButtonOpen(true)} disabled={components.length >= 5}>
                      <Plus className="mr-1.5 h-4 w-4" />{t("addButton")}
                    </Button>
                  </div>
                  {components.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                      <Ticket className="h-8 w-8 opacity-40" />
                      <p className="text-sm">{t("noButtons")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {components.map((btn) => (
                        <ButtonCard key={btn.custom_id} customId={btn.custom_id} label={btn.label} style={btn.style}
                          settings={panel.button_settings[btn.custom_id] ?? createDefaultButtonSettings()}
                          panelName={panel.name} guildId={guildId} roles={roles} availableEmbeds={availableEmbeds} embeds={embeds}
                          onDeleted={() => setComponents((prev) => prev.filter(c => c.custom_id !== btn.custom_id))} // NOSONAR — structural JSX complexity from framework nesting
                          onAppearanceUpdated={(newLabel, newStyle) => setComponents((prev) => prev.map(c => c.custom_id === btn.custom_id ? { ...c, label: newLabel, style: newStyle } : c))} // NOSONAR — JSX inline handler nesting is structural, not logic complexity
                        />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="messages" className="mt-0" forceMount>
                <MessagesTab panel={panel} guildId={guildId} />
              </TabsContent>
              <TabsContent value="settings" className="mt-0" forceMount>
                <PanelSettingsTab panel={panel} categories={categories} textChannels={textChannels} guildId={guildId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </>
  );
}

function ConfigTab({ guildId }: { readonly guildId: string }) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();

  const [panels, setPanels] = useState<TicketPanel[]>([]);
  const [embeds, setEmbeds] = useState<ServerEmbed[]>([]);
  const [availableEmbeds, setAvailableEmbeds] = useState<string[]>([]);
  const [categories, setCategories] = useState<DiscordChannel[]>([]);
  const [textChannels, setTextChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [isCreatingPanel, setIsCreatingPanel] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [panelsRes, embedsRes, channelsRes, rolesRes] = await Promise.all([
          apiCache.get(getTicketsPanelsCacheKey(guildId), () => apiClient.tickets.getPanels(guildId)),
          apiCache.get(getTicketsEmbedsCacheKey(guildId), () => apiClient.tickets.getEmbeds(guildId)),
          apiCache.get(getServerChannelsCacheKey(guildId), () => apiClient.servers.getChannels(guildId)),
          apiCache.get(getServerRolesCacheKey(guildId), () => apiClient.servers.getDiscordRoles(guildId)),
        ]);
        if (panelsRes.error) throw new Error(panelsRes.error);
        if (embedsRes.error) throw new Error(embedsRes.error);
        if (channelsRes.error) throw new Error(channelsRes.error);
        if (rolesRes.error) throw new Error(rolesRes.error);

        setPanels(panelsRes.data?.items ?? []);
        setAvailableEmbeds(panelsRes.data?.available_embeds ?? []);
        setEmbeds(normalizeTicketEmbeds(embedsRes.data));
        let all = normalizeTicketChannels(channelsRes.data);

        // Retry uncached once if we ended up with an empty list (stale/invalid cache payload).
        if (all.length === 0) {
          apiCache.invalidate(getServerChannelsCacheKey(guildId));
          const uncachedChannelsRes = await apiClient.servers.getChannels(guildId);
          if (!uncachedChannelsRes.error) {
            all = normalizeTicketChannels(uncachedChannelsRes.data);
          }
        }

        const categoryChannels = all.filter(isCategoryChannel);
        const logChannels = all.filter(isTextLikeChannel);

        setCategories(categoryChannels);
        setTextChannels(logChannels);
        setRoles(rolesRes.data?.roles ?? []);
      } catch (err) {
        toast({
          title: tCommon("error"),
          description: err instanceof Error ? err.message : tCommon("loadError"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  const handleCreatePanel = async () => {
    if (!newPanelName.trim()) return;
    setIsCreatingPanel(true);
    try {
      const res = await apiClient.tickets.createPanel(guildId, { name: newPanelName.trim() });
      if (res.error) throw new Error(res.error);
      toast({ title: tCommon("success"), description: t("panelCreated", { name: newPanelName.trim() }) });
      // Fetch fresh panel list
      apiCache.invalidate(getTicketsPanelsCacheKey(guildId));
      const panelsRes = await apiCache.get(getTicketsPanelsCacheKey(guildId), () => apiClient.tickets.getPanels(guildId));
      setPanels(panelsRes.data?.items ?? []);
      setAvailableEmbeds(panelsRes.data?.available_embeds ?? []);
      setCreatePanelOpen(false);
      setNewPanelName("");
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsCreatingPanel(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {["a", "b"].map(id => <Skeleton key={id} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <>
      {/* Create panel dialog */}
      <Dialog open={createPanelOpen} onOpenChange={setCreatePanelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("createPanelTitle")}</DialogTitle>
            <DialogDescription>{t("createPanelDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>{t("panelNameLabel")}</Label>
            <Input
              value={newPanelName}
              onChange={(e) => setNewPanelName(e.target.value)}
              placeholder={t("panelNamePlaceholder")}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreatePanel(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreatePanelOpen(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleCreatePanel} disabled={isCreatingPanel || !newPanelName.trim()}>
              {isCreatingPanel && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setCreatePanelOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />{t("createPanel")}
          </Button>
        </div>

        {panels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Settings className="h-10 w-10 opacity-40" />
              <p>{t("noPanels")}</p>
              <p className="text-xs">{t("noPanelsHint")}</p>
            </CardContent>
          </Card>
        ) : (
          panels.map((panel) => (
            <PanelCard key={panel.name} panel={panel} categories={categories} textChannels={textChannels} roles={roles} guildId={guildId} availableEmbeds={availableEmbeds} embeds={embeds}
              onDeleted={() => setPanels((prev) => prev.filter(p => p.name !== panel.name))} // NOSONAR — JSX inline handler nesting is structural, not logic complexity
            />
          ))
        )}
      </div>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const t = useTranslations("TicketsPage");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
            <Ticket className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>

        <Tabs defaultValue="tickets">
          <TabsList>
            <TabsTrigger value="tickets">{t("tabTickets")}</TabsTrigger>
            <TabsTrigger value="configuration">{t("tabConfiguration")}</TabsTrigger>
          </TabsList>
          <TabsContent value="tickets" className="mt-6">
            <TicketsTab guildId={guildId} />
          </TabsContent>
          <TabsContent value="configuration" className="mt-6">
            <ConfigTab guildId={guildId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
