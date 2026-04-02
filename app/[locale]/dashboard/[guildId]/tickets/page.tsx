"use client";

import { type ComponentType, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import type {
  ApproveMessage,
  OpenTicket,
  THRequirement,
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
  type: number;
  parent_name?: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color?: number;
}

const getTicketDiscordUrl = (ticket: OpenTicket) =>
  `https://discord.com/channels/${ticket.server}/${ticket.channel}`;

const getTranscriptUrl = (ticket: OpenTicket) =>
  `https://cdn.clashking.xyz/transcript-channel-${ticket.channel}.html`;

function TicketAccountsCell({ ticket }: { ticket: OpenTicket }) {
  const accounts = ticket.linked_accounts ?? [];

  if (accounts.length === 0) {
    return <span className="font-mono text-xs text-muted-foreground">{ticket.apply_account ?? "—"}</span>;
  }

  return (
    <div className="space-y-1">
      {accounts.slice(0, 2).map((account) => (
        <div key={account.player_tag} className="text-xs leading-tight">
          <span className="font-medium text-foreground">
            {account.player_name ?? account.player_tag}
          </span>
          <span className="ml-2 font-mono text-muted-foreground">
            {account.player_tag}
          </span>
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

function TicketManageDialog({
  open,
  onOpenChange,
  ticket,
  guildId,
  clans,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: OpenTicket | null;
  guildId: string;
  clans: ServerClanListItem[];
  onSaved: () => Promise<void>;
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
      <DialogContent className="sm:max-w-2xl">
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
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("table.panel")}</p>
              <p className="mt-1 font-medium">{ticket.panel}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("table.user")}</p>
              <p className="mt-1 font-mono text-xs">{ticket.user}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("table.account")}</p>
              <p className="mt-1 font-mono text-xs">{ticket.apply_account ?? "—"}</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
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

          <div className="rounded-xl border bg-card p-4">
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
  guildId: string;
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

  const fetchTickets = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const [response, clansResponse] = await Promise.all([
        apiClient.tickets.getOpenTickets(guildId),
        apiClient.servers.getServerClans(guildId),
      ]);
      if (response.error) throw new Error(response.error);
      if (clansResponse.error) throw new Error(clansResponse.error);
      setAllTickets(response.data?.items ?? []);
      setClans(clansResponse.data ?? []);
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

  const counts: Record<StatusFilter, number> = {
    all: allTickets.length,
    open: allTickets.filter((t) => t.status === "open").length,
    sleep: allTickets.filter((t) => t.status === "sleep").length,
    closed: allTickets.filter((t) => t.status === "closed" || t.status === "delete").length,
  };

  const displayed =
    statusFilter === "all"
      ? allTickets
      : statusFilter === "closed"
        ? allTickets.filter((t) => t.status === "closed" || t.status === "delete")
        : allTickets.filter((t) => t.status === statusFilter);

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : displayed.length === 0 ? (
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
                  <TableHead className="w-14">{t("table.number")}</TableHead>
                  <TableHead>{t("table.panel")}</TableHead>
                  <TableHead>{tCommon("status")}</TableHead>
                  <TableHead>{t("table.user")}</TableHead>
                  <TableHead>{t("table.clan")}</TableHead>
                  <TableHead>{t("table.account")}</TableHead>
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
                    <TableCell className="font-mono text-xs text-muted-foreground">{ticket.set_clan ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{ticket.apply_account ?? "—"}</TableCell>
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
                        ) : !ticket.channel_exists && ticket.status !== "delete" ? (
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

function ChannelTab({
  panel, categories, textChannels, guildId, availableEmbeds,
}: {
  panel: TicketPanel;
  categories: DiscordChannel[];
  textChannels: DiscordChannel[];
  guildId: string;
  availableEmbeds: string[];
}) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    open_category: panel.open_category ?? "disabled",
    sleep_category: panel.sleep_category ?? "disabled",
    closed_category: panel.closed_category ?? "disabled",
    status_change_log: panel.status_change_log ?? "disabled",
    ticket_button_click_log: panel.ticket_button_click_log ?? "disabled",
    ticket_close_log: panel.ticket_close_log ?? "disabled",
    embed_name: panel.embed_name ?? "disabled",
  });

  const toNullable = (v: string) => (v === "disabled" ? null : v);
  const set = (key: keyof typeof form) => (val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: UpdateTicketPanelRequest = {
        open_category: toNullable(form.open_category),
        sleep_category: toNullable(form.sleep_category),
        closed_category: toNullable(form.closed_category),
        status_change_log: toNullable(form.status_change_log),
        ticket_button_click_log: toNullable(form.ticket_button_click_log),
        ticket_close_log: toNullable(form.ticket_close_log),
        embed_name: toNullable(form.embed_name),
      };
      const res = await apiClient.tickets.updatePanel(guildId, panel.name, payload);
      if (res.error) throw new Error(res.error);
      toast({ title: tCommon("success"), description: t("savedSuccess", { panel: panel.name }) });
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const catChannels = categories.map((c) => ({ id: c.id, name: c.name }));
  const txtChannels = textChannels.map((c) => ({ id: c.id, name: c.name, parent_name: c.parent_name }));
  const embedOptions = Array.from(new Set([...(panel.embed_name ? [panel.embed_name] : []), ...availableEmbeds])).sort();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
        <Label className="text-sm">{t("panelEmbed")}</Label>
        <p className="text-xs text-muted-foreground">{t("panelEmbedHint")}</p>
        <Select value={form.embed_name} onValueChange={set("embed_name")}>
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
      </div>
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("categories")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["open_category", "sleep_category", "closed_category"] as const).map((key) => (
            <div key={key} className="space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-3">
              <Label className="text-sm">{t(key)}</Label>
              <ChannelCombobox channels={catChannels} value={form[key]} onValueChange={set(key)} placeholder={t("selectCategory")} />
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
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tCommon("save")}
        </Button>
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

function ButtonCard({
  customId, label, style, settings, panelName, guildId, roles, availableEmbeds,
}: {
  customId: string;
  label: string;
  style: number;
  settings: TicketButtonSettings;
  panelName: string;
  guildId: string;
  roles: DiscordRole[];
  availableEmbeds: string[];
}) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<UpdateButtonSettingsRequest>({
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
    townhall_requirements: { ...(settings.townhall_requirements ?? {}) },
    new_message: settings.new_message,
  });
  const [clanTagInput, setClanTagInput] = useState("");
  const embedOptions = Array.from(new Set([...(settings.new_message ? [settings.new_message] : []), ...availableEmbeds])).sort();

  const setField = <K extends keyof UpdateButtonSettingsRequest>(key: K, val: UpdateButtonSettingsRequest[K]) =>
    setForm((p) => ({ ...p, [key]: val }));
  const setQuestion = (i: number, val: string) =>
    setForm((p) => { const q = [...p.questions]; q[i] = val; return { ...p, questions: q }; });
  const addRole = (type: "mod_role" | "no_ping_mod_role" | "roles_to_add" | "roles_to_remove") => (id: string) =>
    setForm((p) => ({ ...p, [type]: [...p[type], id] }));
  const removeRole = (type: "mod_role" | "no_ping_mod_role" | "roles_to_add" | "roles_to_remove", id: string) =>
    setForm((p) => ({ ...p, [type]: p[type].filter((r) => r !== id) }));

  const addClanTag = () => {
    const tag = clanTagInput.trim().toUpperCase().replace(/^#?/, "#");
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
    setIsSaving(true);
    try {
      const res = await apiClient.tickets.updateButtonSettings(guildId, panelName, customId, {
        ...form,
        questions: form.questions.filter(Boolean),
      });
      if (res.error) throw new Error(res.error);
      toast({ title: tCommon("success"), description: t("buttonSaved", { label }) });
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const roleOptions = roles.filter((r) => r.name !== "@everyone");

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <button className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition-colors hover:bg-muted/20" onClick={() => setExpanded((v) => !v)}>
        <span className={`h-3 w-3 rounded-sm shrink-0 ${BUTTON_STYLE_COLOR[style] ?? "bg-muted"}`} />
        <span className="min-w-0 flex-1 font-medium">{label}</span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {settings.account_apply && <Badge variant="secondary">{t("badge.accountApply")}</Badge>}
          {settings.private_thread && <Badge variant="secondary">{t("badge.privateThread")}</Badge>}
          {settings.th_min > 0 && <Badge variant="secondary">TH{settings.th_min}+</Badge>}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="space-y-6 border-t border-border/60 bg-muted/10 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(["mod_role", "no_ping_mod_role"] as const).map((type) => (
              <div key={type} className="space-y-2 rounded-xl border border-border/60 bg-card p-4">
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
              <div key={type} className="space-y-2 rounded-xl border border-border/60 bg-card p-4">
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

          <div className="space-y-2 rounded-xl border border-border/60 bg-card p-4">
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

          <div className="space-y-2 rounded-xl border border-border/60 bg-card p-4">
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

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-2 rounded-xl border border-border/60 bg-card p-4">
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

            <div className="space-y-2 rounded-xl border border-border/60 bg-card p-4">
              <Label className="text-sm font-medium">{t("questions")}</Label>
              <p className="text-xs text-muted-foreground">{t("questionsHint")}</p>
              <div className="space-y-2">
                {form.questions.map((q, i) => (
                  <Input key={i} value={q} onChange={(e) => setQuestion(i, e.target.value)} placeholder={`${t("question")} ${i + 1}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["private_thread", "privateThread", "privateThreadHint"],
              ["account_apply", "accountApply", "accountApplyHint"],
              ["player_info", "playerInfo", "playerInfoHint"],
            ] as const).map(([field, labelKey, hintKey]) => (
              <div key={field} className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3">
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

          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("thMin")}</Label>
                <Input type="number" min={0} max={17} value={form.th_min} onChange={(e) => setField("th_min", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("numApply")}</Label>
                <Input type="number" min={1} max={25} value={form.num_apply} onChange={(e) => setField("num_apply", Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">{t("numApplyHint")}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("naming")}</Label>
                <Input value={form.naming} onChange={(e) => setField("naming", e.target.value)} placeholder="{ticket_count}-{user}" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("namingVariables")}</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessagesTab({ panel, guildId }: { panel: TicketPanel; guildId: string }) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [messages, setMessages] = useState<ApproveMessage[]>(panel.approve_messages ?? []);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const valid = messages.filter((m) => m.name.trim());
    if (valid.length !== messages.length) {
      toast({ title: tCommon("error"), description: t("messageNameRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiClient.tickets.updateApproveMessages(guildId, panel.name, { messages: valid } as UpdateApproveMessagesRequest);
      if (res.error) throw new Error(res.error);
      setMessages(valid);
      toast({ title: tCommon("success"), description: t("messagesSaved") });
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{t("approveMessages")}</p>
          <p className="text-xs text-muted-foreground">{t("approveMessagesHint")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setMessages((p) => [...p, { name: "", message: "" }])} disabled={messages.length >= 25}>
          <Plus className="mr-1.5 h-4 w-4" />{t("addMessage")}
        </Button>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-muted-foreground gap-2">
          <MessageSquare className="h-8 w-8 opacity-40" />
          <p className="text-sm">{t("noMessages")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input className="h-8 flex-1 font-medium" value={msg.name}
                  onChange={(e) => setMessages((p) => p.map((m, idx) => idx === i ? { ...m, name: e.target.value } : m))}
                  placeholder={t("messageName")} />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setMessages((p) => p.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea value={msg.message}
                onChange={(e) => setMessages((p) => p.map((m, idx) => idx === i ? { ...m, message: e.target.value } : m))}
                placeholder={t("messageContent")} rows={3} />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tCommon("save")}
        </Button>
      </div>
    </div>
  );
}

function PanelCard({
  panel, categories, textChannels, roles, guildId, availableEmbeds,
}: {
  panel: TicketPanel;
  categories: DiscordChannel[];
  textChannels: DiscordChannel[];
  roles: DiscordRole[];
  guildId: string;
  availableEmbeds: string[];
}) {
  const t = useTranslations("TicketsSettingsPage");
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-border/60">
      <CardHeader className="cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <CardTitle className="text-base">{panel.name}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{panel.components.length} {t("buttons")}</Badge>
              <Badge variant="secondary">{panel.approve_messages.length} {t("messages")}</Badge>
              {panel.embed_name ? <Badge variant="outline">{panel.embed_name}</Badge> : null}
            </div>
            <CardDescription>{t("panelHint")}</CardDescription>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <Tabs defaultValue="channels">
            <TabsList className="mb-4">
              <TabsTrigger value="channels">{t("tabChannels")}</TabsTrigger>
              <TabsTrigger value="buttons">{t("tabButtons")}</TabsTrigger>
              <TabsTrigger value="messages">{t("tabMessages")}</TabsTrigger>
            </TabsList>
            <TabsContent value="channels" className="mt-0">
              <ChannelTab panel={panel} categories={categories} textChannels={textChannels} guildId={guildId} availableEmbeds={availableEmbeds} />
            </TabsContent>
            <TabsContent value="buttons" className="mt-0">
              {panel.components.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <Ticket className="h-8 w-8 opacity-40" />
                  <p className="text-sm">{t("noButtons")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {panel.components.map((btn) => (
                    <ButtonCard key={btn.custom_id} customId={btn.custom_id} label={btn.label} style={btn.style}
                      settings={panel.button_settings[btn.custom_id] ?? {
                        questions: [], mod_role: [], no_ping_mod_role: [],
                        private_thread: false, th_min: 0, num_apply: 25,
                        naming: "{ticket_count}-{user}", account_apply: false, player_info: false,
                        apply_clans: [], roles_to_add: [], roles_to_remove: [], townhall_requirements: {}, new_message: null,
                      }}
                      panelName={panel.name} guildId={guildId} roles={roles} availableEmbeds={availableEmbeds} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="messages" className="mt-0">
              <MessagesTab panel={panel} guildId={guildId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

function ConfigTab({ guildId }: { guildId: string }) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();

  const [panels, setPanels] = useState<TicketPanel[]>([]);
  const [availableEmbeds, setAvailableEmbeds] = useState<string[]>([]);
  const [categories, setCategories] = useState<DiscordChannel[]>([]);
  const [textChannels, setTextChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [panelsRes, channelsRes, rolesRes] = await Promise.all([
          apiClient.tickets.getPanels(guildId),
          apiClient.servers.getChannels(guildId),
          apiClient.servers.getDiscordRoles(guildId),
        ]);
        if (panelsRes.error) throw new Error(panelsRes.error);
        if (channelsRes.error) throw new Error(channelsRes.error);
        if (rolesRes.error) throw new Error(rolesRes.error);

        setPanels(panelsRes.data?.items ?? []);
        setAvailableEmbeds(panelsRes.data?.available_embeds ?? []);
        const all: DiscordChannel[] = channelsRes.data ?? [];
        setCategories(all.filter((c) => c.type === 4));
        setTextChannels(all.filter((c) => c.type === 0 || c.type === 11));
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (panels.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <Settings className="h-10 w-10 opacity-40" />
          <p>{t("noPanels")}</p>
          <p className="text-xs">{t("noPanelsHint")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {panels.map((panel) => (
        <PanelCard key={panel.name} panel={panel} categories={categories} textChannels={textChannels} roles={roles} guildId={guildId} availableEmbeds={availableEmbeds} />
      ))}
    </div>
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
