"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleCombobox } from "@/components/ui/role-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import { DiscordOpenPopover } from "@/components/ui/discord-open-popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertCircle, CalendarRange, CheckCircle2, Copy, Ellipsis, ExternalLink, Eye, Loader2, Pencil, Plus, RefreshCw, Sword, Trash2, Trophy, User, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import {
  normalizeChannelsPayload,
  normalizeDiscordRolesPayload,
} from "@/lib/dashboard-cache";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";
import { isGiveawaysResponse, type Giveaway } from "@/lib/api/types/server";
import { useGiveawayEntries } from "./useGiveawayEntries";

type Channel = { id: string; name: string; parent_name?: string };
type Role = { id: string; name: string; color?: number };
type Booster = { id: string; value: number; roles: string[] };
type FormState = {
  prize: string; channelId: string; startTime: string; startNow: boolean; endTime: string; winners: string;
  mentions: string[]; textAbove: string; textEmbed: string; textEnd: string; profileRequired: boolean;
  accountRequired: boolean; rolesMode: "allow" | "deny" | "none"; roles: string[]; imageFile: File | null;
  imagePreview: string | null; removeImage: boolean; boosters: Booster[];
};

const ENDED_LIMIT = 20;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const GIVEAWAY_FORM_TAB_CLASS = "mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-8 sm:px-7";

const buildEmptyState = (t: (key: string) => string): FormState => ({
  prize: "", channelId: "", startTime: "", startNow: false, endTime: "", winners: "1", mentions: [],
  textAbove: "", textEmbed: t("form.textEmbedDefault"), textEnd: t("form.textEndDefault"), profileRequired: false, accountRequired: false,
  rolesMode: "none", roles: [], imageFile: null, imagePreview: null, removeImage: false, boosters: [],
});

const statusVariant = (status: Giveaway["status"]): "default" | "secondary" | "outline" => {
  if (status === "ongoing") return "default";
  if (status === "scheduled") return "secondary";
  return "outline";
};
const boostChoices = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];

interface GiveawaysClientProps {
  guildId: string;
}

type TranslationValues = Record<string, string | number | Date>;
type TranslationFn = (key: string, values?: TranslationValues) => string;

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="leading-6 [&:not(:first-child)]:mt-2">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
  a: ({ href, children }) => <a href={href} className="text-sky-300 underline" target="_blank" rel="noreferrer">{children}</a>,
  code: ({ children }) => <code className="rounded bg-white/10 px-1 py-0.5 text-[0.9em]">{children}</code>,
};

function renderMarkdown(value: string, fallback?: string) {
  return <ReactMarkdown components={MARKDOWN_COMPONENTS}>{(value || fallback || "").replaceAll("\n", "  \n")}</ReactMarkdown>;
}

function toInputDate(iso: string) {
  if (iso) {
    return new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  return "";
}

export function giveawayToFormState(
  giveaway: Giveaway,
  duplicate = false,
  createBoosterId: () => string = () => crypto.randomUUID(),
): FormState {
  return {
    prize: giveaway.prize,
    channelId: giveaway.channelId || "",
    startTime: duplicate ? "" : toInputDate(giveaway.start),
    startNow: false,
    endTime: duplicate ? "" : toInputDate(giveaway.end),
    winners: String(giveaway.winners),
    mentions: giveaway.mentions || [],
    textAbove: giveaway.textAboveEmbed || "",
    textEmbed: giveaway.textInEmbed || "",
    textEnd: giveaway.textOnEnd || "",
    profileRequired: giveaway.profilePictureRequired,
    accountRequired: giveaway.cocAccountRequired,
    rolesMode: giveaway.rolesMode || "none",
    roles: giveaway.roles || [],
    imageFile: null,
    imagePreview: giveaway.imageUrl ?? null,
    removeImage: false,
    boosters: (giveaway.boosters || []).map((booster) => ({
      ...booster,
      id: createBoosterId(),
    })),
  };
}

function fmt(value: string) {
  if (value) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  return "-";
}

export function sortGiveawaysByRelevance(items: Giveaway[]): Giveaway[] {
  const statusRank: Record<Giveaway["status"], number> = { ongoing: 0, scheduled: 1, ended: 2 };
  return [...items].sort((left, right) => {
    const rankDifference = statusRank[left.status] - statusRank[right.status];
    if (rankDifference !== 0) return rankDifference;
    const leftTime = new Date(left.status === "scheduled" ? left.start : left.end).getTime();
    const rightTime = new Date(right.status === "scheduled" ? right.start : right.end).getTime();
    return left.status === "ended" ? rightTime - leftTime : leftTime - rightTime;
  });
}

function getPreviewStatus(effectiveStart: Date | null, effectiveEnd: Date | null): Giveaway["status"] {
  if (effectiveStart === null) return "scheduled";
  const now = Date.now();
  if (effectiveEnd && effectiveEnd.getTime() <= now) return "ended";
  if (effectiveStart.getTime() <= now) return "ongoing";
  return "scheduled";
}

function getEffectiveStart(startNow: boolean, startTime: string): Date | null {
  if (startNow) return new Date();
  if (startTime.length > 0) return new Date(startTime);
  return null;
}

function validateForm(form: FormState, t: TranslationFn) {
  if (form.prize.trim().length === 0) throw new Error(t("validation.prizeRequired"));
  if (form.channelId.length === 0) throw new Error(t("validation.channelRequired"));
  if (!form.startNow && form.startTime.length === 0) throw new Error(t("validation.startTimeRequired"));
  if (form.endTime.length === 0) throw new Error(t("validation.endTimeRequired"));
  if (!form.startNow && form.startTime && new Date(form.endTime).getTime() <= new Date(form.startTime).getTime()) {
    throw new Error(t("validation.endAfterStart"));
  }
}

function buildGiveawayBody(form: FormState) {
  const body = new FormData();
  body.append("prize", form.prize.trim());
  if (form.startNow) {
    body.append("now", "true");
  } else {
    body.append("start_time", new Date(form.startTime).toISOString());
  }
  body.append("end_time", new Date(form.endTime).toISOString());
  body.append("winners", form.winners || "1");
  body.append("channel_id", form.channelId);
  body.append("mentions_json", JSON.stringify(form.mentions));
  body.append("roles_json", JSON.stringify(form.rolesMode === "none" ? [] : form.roles));
  body.append("boosters_json", JSON.stringify(form.boosters.filter((b) => b.roles.length > 0).map((b) => ({ value: b.value, roles: b.roles }))));
  body.append("roles_mode", form.rolesMode);
  body.append("text_above_embed", form.textAbove);
  body.append("text_in_embed", form.textEmbed);
  body.append("text_on_end", form.textEnd);
  if (form.profileRequired) body.append("profile_picture_required", "true");
  if (form.accountRequired) body.append("coc_account_required", "true");
  if (form.removeImage) body.append("remove_image", "true");
  if (form.imageFile) body.append("image", form.imageFile);
  return body;
}

function fmtRelative(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const past = diff < 0;
  if (abs < 60_000) return past ? "Just now" : "Starting now";
  if (abs < 3_600_000) { const m = Math.floor(abs / 60_000); return past ? `${m}m ago` : `in ${m}m`; }
  if (abs < 86_400_000) { const h = Math.floor(abs / 3_600_000); return past ? `${h}h ago` : `in ${h}h`; }
  const d = Math.floor(abs / 86_400_000);
  return past ? `${d}d ago` : `in ${d}d`;
}

interface GiveawaysListProps {
  items: Giveaway[];
  shownEnded: number;
  tableLoading: boolean;
  guildId: string;
  t: TranslationFn;
  tCommon: TranslationFn;
  channelName: (id: string | null) => string | null;
  onOpenEdit: (giveaway: Giveaway, initialTab?: "general" | "winners") => void;
  onDuplicate: (giveaway: Giveaway) => void;
  onDelete: (id: string) => void;
  onOpenReroll: (giveaway: Giveaway) => void;
  onOpenEntries: (giveaway: Giveaway) => void;
  onShowMore: () => void;
}

interface GiveawaysMainContentProps {
  loading: boolean;
  t: TranslationFn;
  tCommon: TranslationFn;
  items: Giveaway[];
  shownEnded: number;
  tableLoading: boolean;
  guildId: string;
  channelName: (id: string | null) => string | null;
  onOpenEdit: (giveaway: Giveaway, initialTab?: "general" | "winners") => void;
  onDuplicate: (giveaway: Giveaway) => void;
  onDelete: (id: string) => void;
  onOpenReroll: (giveaway: Giveaway) => void;
  onOpenEntries: (giveaway: Giveaway) => void;
  onShowMore: () => void;
}

function GiveawaysMainContent({
  loading,
  t,
  tCommon,
  items,
  shownEnded,
  tableLoading,
  guildId,
  channelName,
  onOpenEdit,
  onDuplicate,
  onDelete,
  onOpenReroll,
  onOpenEntries,
  onShowMore,
}: Readonly<GiveawaysMainContentProps>) {
  if (loading) {
    return (
      <div className="space-y-3">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 rounded-[24px]" />)}</div>
    );
  }

  return (
    <GiveawaysList
      items={items}
      shownEnded={shownEnded}
      tableLoading={tableLoading}
      guildId={guildId}
      t={t}
      tCommon={tCommon}
      channelName={channelName}
      onOpenEdit={onOpenEdit}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onOpenReroll={onOpenReroll}
      onOpenEntries={onOpenEntries}
      onShowMore={onShowMore}
    />
  );
}

function GiveawaysList({
  items,
  shownEnded,
  tableLoading,
  guildId,
  t,
  tCommon,
  channelName,
  onOpenEdit,
  onDuplicate,
  onDelete,
  onOpenReroll,
  onOpenEntries,
  onShowMore,
}: Readonly<GiveawaysListProps>) {
  let endedSeen = 0;
  const displayItems = items.filter((item) => item.status !== "ended" || ++endedSeen <= shownEnded);
  const endedCount = items.filter((item) => item.status === "ended").length;
  const shownEndedCount = Math.min(shownEnded, endedCount);
  const hasMore = endedCount > shownEnded;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[24px] bg-muted/45 px-6 py-12 text-center">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-muted"><CalendarRange className="h-5 w-5 text-muted-foreground" /></div>
        <div>
          <p className="text-sm font-medium text-foreground">{t("emptyTab.title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("empty")}</p>
        </div>
      </div>
    );
  }

  const activeWinnersLabel = (g: Giveaway) => {
    const active = g.winnersList.filter((w) => w.status === "winner");
    if (active.length === 0) return null;
    const shown = active.slice(0, 1);
    const overflow = active.length - shown.length;
    return (
      <div className="flex w-full min-w-0 flex-nowrap items-center gap-1">
        {shown.map((w) => (
          <DiscordUserDisplay
            key={w.userId}
            userId={w.userId}
            username={w.username}
            avatarUrl={w.avatarUrl}
            isOnServer={w.inServer}
            size="sm"
            className="min-w-0 max-w-[7rem] flex-1 rounded-full bg-green-500/10 py-0.5 pl-0.5 pr-2 ring-1 ring-green-500/20 [&>span]:min-w-0"
          />
        ))}
        {overflow > 0 && (
          <button
            type="button"
            onClick={() => onOpenEdit(g, "winners")}
            className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            +{overflow}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", tableLoading && "pointer-events-none opacity-50 transition-opacity")}>
      <div className="space-y-3">
            {displayItems.map((g) => {
              const ch = channelName(g.channelId ?? null);
              const isEnded = g.status === "ended";
              const isOngoing = g.status === "ongoing";
              return (
                <article key={g.id} className="grid gap-3 rounded-[24px] bg-card px-4 py-4 shadow-sm shadow-black/5 transition-shadow hover:shadow-md hover:shadow-black/5 md:px-5 xl:grid-cols-[minmax(14rem,1.1fr)_auto_minmax(8rem,.55fr)_minmax(8rem,.55fr)_minmax(9rem,.65fr)_auto] xl:items-center xl:gap-4">
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 xl:contents">
                    <div className="min-w-0">
                        <span className="min-w-0 break-words text-base font-semibold leading-snug text-foreground">{g.prize}</span>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{t("table.winners", { count: g.winners })}</span>
                          {isOngoing && g.updated && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="shrink-0 cursor-default border-amber-500/50 bg-amber-500/10 text-[10px] text-amber-400">
                                    {t("table.pendingUpdate")}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>{t("table.pendingUpdateHelp")}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {g.profilePictureRequired && (
                            <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><User className="h-3 w-3" /></TooltipTrigger><TooltipContent>{t("preview.profileRequired")}</TooltipContent></Tooltip></TooltipProvider>
                          )}
                          {g.cocAccountRequired && (
                            <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><Sword className="h-3 w-3" /></TooltipTrigger><TooltipContent>{t("preview.accountRequired")}</TooltipContent></Tooltip></TooltipProvider>
                          )}
                          {g.boosters.length > 0 && (
                            <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><CheckCircle2 className="h-3 w-3" /></TooltipTrigger><TooltipContent>{t("table.boosters", { count: g.boosters.length })}</TooltipContent></Tooltip></TooltipProvider>
                          )}
                        </div>
                    </div>
                    <Badge className={cn("shrink-0 border-0 px-2.5 py-1 shadow-none xl:self-center", isOngoing && "bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/12 dark:text-emerald-300", g.status === "scheduled" && "bg-amber-500/12 text-amber-700 hover:bg-amber-500/12 dark:text-amber-300", isEnded && "bg-muted text-muted-foreground hover:bg-muted")}>{t(`status.${g.status}`)}</Badge>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-muted/45 px-3 py-2.5 xl:contents">
                  <div className="min-w-0 text-sm text-muted-foreground">
                    {ch ? (
                      <DiscordOpenPopover
                        title={ch}
                        description={t("table.channel")}
                        url={`https://discord.com/channels/${guildId}/${g.channelId}`}
                        buttonLabel={tCommon("openChannelInDiscord")}
                        trigger={(
                          <button
                            type="button"
                            className="max-w-[13rem] truncate text-left text-sm text-muted-foreground transition-colors hover:text-foreground xl:max-w-[240px]"
                          >
                            {ch}
                          </button>
                        )}
                      />
                    ) : (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 text-destructive/60"><AlertCircle className="h-3.5 w-3.5" />{t("table.noChannel")}</span>
                          </TooltipTrigger>
                          <TooltipContent>{t("table.noChannelHelp")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className={cn("min-w-0", isEnded && "hidden xl:block")}>
                    {isEnded ? (activeWinnersLabel(g) ?? <span className="text-xs text-muted-foreground">—</span>) : (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onOpenEntries(g)}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums hover:text-foreground transition-colors"
                            >
                              <Users className="h-3.5 w-3.5 shrink-0" />{g.entries.length}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t("table.viewEntries")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="whitespace-nowrap">{isOngoing && <div><div className="text-sm font-medium text-emerald-600 dark:text-emerald-300">{fmtRelative(g.end)}</div><div className="text-xs text-muted-foreground">{fmt(g.end)}</div></div>}{g.status === "scheduled" && <div><div className="text-sm text-foreground">{fmtRelative(g.start)}</div><div className="text-xs text-muted-foreground">{fmt(g.start)}</div></div>}{isEnded && <div><div className="text-sm text-muted-foreground">{fmt(g.end)}</div><div className="text-xs text-muted-foreground/60">{fmtRelative(g.end)}</div></div>}</div>
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-border/50 pt-3 xl:justify-end xl:border-0 xl:pt-0">
                      <Button variant="secondary" size="sm" className="min-w-0 flex-1 border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted xl:flex-none" onClick={() => onOpenEdit(g)}>
                        {isEnded ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        {isEnded ? t("table.viewGiveaway") : t("table.editGiveaway")}
                      </Button>
                      {g.messageId && g.channelId && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("table.viewInDiscord")} onClick={() => window.open(`https://discord.com/channels/${guildId}/${g.channelId}/${g.messageId}`, "_blank", "noreferrer")}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("table.viewInDiscord")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <DropdownMenu>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("table.moreActions")}>
                                  <Ellipsis className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>{t("table.moreActions")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem className="gap-2 rounded-lg" onSelect={() => onDuplicate(g)}>
                            <Copy className="h-4 w-4" />{t("table.duplicate")}
                          </DropdownMenuItem>
                          {isEnded && g.winnersList.some((w) => w.status === "winner") && (
                            <DropdownMenuItem className="gap-2 rounded-lg text-amber-700 focus:text-amber-700 dark:text-amber-300 dark:focus:text-amber-300" onSelect={() => onOpenReroll(g)}>
                              <RefreshCw className="h-4 w-4" />{t("table.reroll")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 rounded-lg text-destructive focus:text-destructive" onSelect={() => onDelete(g.id)}>
                            <Trash2 className="h-4 w-4" />{tCommon("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                </article>
              );
            })}
      </div>
      {endedCount > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>{t("table.showingEnded", { shown: shownEndedCount, total: endedCount })}</span>
          {hasMore && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onShowMore}>
              {t("table.showMore", { count: Math.min(ENDED_LIMIT, endedCount - shownEnded) })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function GiveawayWinnerList({ giveaway, t }: Readonly<{ giveaway: Giveaway; t: TranslationFn }>) {
  const sections = [
    { status: "winner" as const, label: t("winners.current") },
    { status: "rerolled" as const, label: t("winners.rerolled") },
  ];

  if (giveaway.winnersList.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("winners.none")}</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <p className="shrink-0 text-sm text-muted-foreground">{t("winners.description")}</p>
      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        <div className="space-y-5">
          {sections.map(({ status, label }) => {
            const winners = giveaway.winnersList.filter((winner) => winner.status === status);
            if (winners.length === 0) return null;
            return (
              <section key={status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">{label}</h3>
                  <Badge variant="secondary" className="tabular-nums">{winners.length}</Badge>
                </div>
                <div className="space-y-2">
                  {winners.map((winner) => (
                    <div key={`${status}-${winner.userId}`} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 px-3 py-3">
                      <DiscordUserDisplay
                        userId={winner.userId}
                        username={winner.username}
                        avatarUrl={winner.avatarUrl}
                        isOnServer={winner.inServer}
                        size="md"
                        className="min-w-0"
                      />
                      <p className="min-w-0 truncate text-[11px] text-muted-foreground" title={winner.userId}>{winner.userId}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function GiveawaysClient({ // NOSONAR — complexity comes from aggregate giveaway form state management, not a single logic unit
  guildId,
}: Readonly<GiveawaysClientProps>) { // NOSONAR
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useTranslations("GiveawaysPage");
  const tCommon = useTranslations("Common");

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState("general");
  const [shownEnded, setShownEnded] = useState(ENDED_LIMIT);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formModified, setFormModified] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"giveaway" | "end">("giveaway");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGiveaway, setEditingGiveaway] = useState<Giveaway | null>(null);
  const [editingEntryCount, setEditingEntryCount] = useState<number>(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rerollDialogOpen, setRerollDialogOpen] = useState(false);
  const [rerollTarget, setRerollTarget] = useState<Giveaway | null>(null);
  const [rerollSelected, setRerollSelected] = useState<string[]>([]);
  const [rerolling, setRerolling] = useState(false);
  const [giveaways, setGiveaways] = useState<{ ongoing: Giveaway[]; upcoming: Giveaway[]; ended: Giveaway[]; total: number }>({ ongoing: [], upcoming: [], ended: [], total: 0 });
  const {
    dialogOpen: entriesDialogOpen,
    target: entriesTarget, data: entriesData, loading: entriesLoading,
    openDialog: openEntriesDialog, closeDialog: closeEntries,
  } = useGiveawayEntries(
    guildId,
    (gid, giveawayId) => apiClient.servers.getGiveawayEntries(gid, giveawayId),
    (message) => toast({ title: t("toast.errorTitle"), description: message, variant: "destructive" }),
  );
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<FormState>(buildEmptyState(t));
  const updateForm = (updater: (prev: FormState) => FormState) => {
    setFormModified(true);
    setForm(updater);
  };

  const load = async (isRefresh = false) => {
    if (isRefresh) setTableLoading(true);
    else setLoading(true);
    try {
      if (isRefresh) {
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("giveaways", guildId), exact: true });
      }

      const gRes = await queryClient.fetchQuery({
        queryKey: dashboardQueryKeys.route("giveaways", guildId),
        queryFn: () => apiClient.servers.getGiveaways(guildId),
      });
      if (gRes.status === 401 || gRes.status === 403) {
        throw new Error(gRes.error || t("toast.loadError"));
      }
      if (gRes.error || !isGiveawaysResponse(gRes.data)) {
        throw new Error(gRes.error || t("toast.loadError"));
      }
      setGiveaways(gRes.data);
    } catch (error) {
      toast({ title: t("toast.errorTitle"), description: error instanceof Error ? error.message : t("toast.loadError"), variant: "destructive" });
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const loadDiscordMetadata = async () => {
    const [channelsResult, rolesResult] = await Promise.allSettled([
      queryClient.fetchQuery(dashboardQueryOptions.channels(guildId)),
      queryClient.fetchQuery(dashboardQueryOptions.roles(guildId)),
    ]);
    if (channelsResult.status === "fulfilled") setChannels(normalizeChannelsPayload(channelsResult.value));
    if (rolesResult.status === "fulfilled") setRoles(normalizeDiscordRolesPayload(rolesResult.value));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); void loadDiscordMetadata(); }, [guildId]);

  const channelName = (id: string | null) => id ? (`#${channels.find((c) => c.id === id)?.name || id}`) : null;

  const reset = () => {
    setDialogOpen(false); setEditingId(null); setEditingGiveaway(null); setEditingEntryCount(0);
    setForm(buildEmptyState(t)); setFormModified(false); setActiveFormTab("general");
  };

  const openDialog = () => setDialogOpen(true);
  const closeDialog = () => {
    if (formModified) {
      setDiscardConfirmOpen(true);
      return;
    }
    reset();
  };

  const openCreate = () => {
    setForm(buildEmptyState(t)); setFormModified(false);
    setActiveFormTab("general"); setEditingId(null); setEditingGiveaway(null); setEditingEntryCount(0);
    setDialogOpen(true);
  };

  const selectedChannel = channels.find((c) => c.id === form.channelId);
  const effectiveStart = getEffectiveStart(form.startNow, form.startTime);
  const effectiveEnd = form.endTime ? new Date(form.endTime) : null;
  const previewStatus: Giveaway["status"] = getPreviewStatus(effectiveStart, effectiveEnd);
  const mentionLabels = form.mentions.map((id) => `@${roles.find((role) => role.id === id)?.name || id}`);
  const roleRestrictionLabels = form.roles.map((id) => `@${roles.find((role) => role.id === id)?.name || id}`);
  const previewParticipantCount = editingEntryCount;
  const discordTimestamp = effectiveEnd ? fmt(effectiveEnd.toISOString()) : "-";
  const winnerCount = Number(form.winners || 1);
  const winnersCount = Number(form.winners);
  const hasRequiredFields =
    form.prize.trim().length > 0 &&
    !!form.channelId &&
    (form.startNow || !!form.startTime) &&
    !!form.endTime &&
    Number.isFinite(winnersCount) &&
    winnersCount >= 1;

  const totalEntries = [...giveaways.ongoing, ...giveaways.upcoming, ...giveaways.ended]
    .reduce((sum, g) => sum + g.entries.length, 0);
  const sortedGiveaways = sortGiveawaysByRelevance([
    ...giveaways.ongoing,
    ...giveaways.upcoming,
    ...giveaways.ended,
  ]);

  const openEdit = (g: Giveaway, initialTab: "general" | "winners" = "general") => {
    setEditingId(g.id); setEditingGiveaway(g); setEditingEntryCount(g.entries.length);
    setForm(giveawayToFormState(g));
    setFormModified(false); setActiveFormTab(initialTab); setDialogOpen(true);
  };

  const duplicate = (g: Giveaway) => {
    setEditingId(null); setEditingGiveaway(null); setEditingEntryCount(0);
    setForm(giveawayToFormState(g, true));
    setFormModified(true); setActiveFormTab("general"); setDialogOpen(true);
  };

  const roleBadges = (ids: string[], onRemove: (id: string) => void) => (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => <Badge key={id} variant="secondary" className="gap-1">{`@${roles.find((r) => r.id === id)?.name || id}`}<button type="button" onClick={() => onRemove(id)}><X className="h-3 w-3" /></button></Badge>)}
    </div>
  );

  const requirementBadges = [
    form.profileRequired ? t("preview.profileRequired") : null,
    form.accountRequired ? t("preview.accountRequired") : null,
    form.rolesMode === "allow" ? t("preview.rolesAllow") : null,
    form.rolesMode === "deny" ? t("preview.rolesDeny") : null,
  ].filter(Boolean) as string[];

  const openPreview = (mode: "giveaway" | "end") => { setPreviewMode(mode); setPreviewOpen(true); };

  const addBooster = () => updateForm((s) => ({ ...s, boosters: [...s.boosters, { id: crypto.randomUUID(), value: 1.25, roles: [] }] }));
  const updateBooster = (index: number, next: Booster) => updateForm((s) => ({ ...s, boosters: s.boosters.map((b, i) => i === index ? next : b) }));
  const removeBooster = (index: number) => updateForm((s) => ({ ...s, boosters: s.boosters.filter((_, i) => i !== index) }));
  const openRerollDialog = (giveaway: Giveaway) => {
    setRerollTarget(giveaway);
    setRerollSelected([]);
    setRerollDialogOpen(true);
  };

  const toggleRerollSelection = (userId: string, checked: boolean) => {
    setRerollSelected((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)));
  };

  const submit = async () => {
    try {
      validateForm(form, t);
      setSaving(true);
      const body = buildGiveawayBody(form);
      const res = editingId
        ? await apiClient.servers.updateGiveaway(guildId, editingId, body)
        : await apiClient.servers.createGiveaway(guildId, body);
      if (res.error) throw new Error(res.error);
      toast({ title: t("toast.successTitle"), description: editingId ? t("toast.updated") : t("toast.created") });
      reset(); await load(true);
    } catch (error) {
      toast({ title: t("toast.errorTitle"), description: error instanceof Error ? error.message : t("toast.saveError"), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      const res = await apiClient.servers.deleteGiveaway(guildId, deleteConfirmId);
      if (res.error) throw new Error(res.error);
      toast({ title: t("toast.successTitle"), description: t("toast.deleted") });
      await load(true);
    } catch (error) {
      toast({ title: t("toast.errorTitle"), description: error instanceof Error ? error.message : t("toast.deleteError"), variant: "destructive" });
    } finally { setDeleting(false); setDeleteConfirmId(null); }
  };

  const handleReroll = async () => {
    if (!rerollTarget || rerollSelected.length === 0) return;
    setRerolling(true);
    try {
      const res = await apiClient.servers.rerollGiveaway(guildId, rerollTarget.id, rerollSelected);
      if (res.error) throw new Error(res.error);
      toast({ title: t("toast.successTitle"), description: t("toast.rerolled") });
      setRerollDialogOpen(false); setRerollTarget(null); setRerollSelected([]);
      await load(true);
    } catch (error) {
      toast({ title: t("toast.errorTitle"), description: error instanceof Error ? error.message : t("toast.rerollError"), variant: "destructive" });
    } finally { setRerolling(false); }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted/65 px-3 py-1.5 text-sm text-muted-foreground shadow-sm shadow-black/5">
              <Users className="h-4 w-4" /><span>{t("stats.totalEntries")}</span><span className="font-semibold tabular-nums text-foreground">{totalEntries.toLocaleString()}</span>
            </div>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{t("create")}</Button>
          </div>
        </div>
        
        <GiveawaysMainContent
          loading={loading}
          t={t}
          tCommon={tCommon}
          items={sortedGiveaways}
          shownEnded={shownEnded}
          tableLoading={tableLoading}
          guildId={guildId}
          channelName={channelName}
          onOpenEdit={openEdit}
          onDuplicate={duplicate}
          onDelete={setDeleteConfirmId}
          onOpenReroll={openRerollDialog}
          onOpenEntries={openEntriesDialog}
          onShowMore={() => setShownEnded((n) => n + ENDED_LIMIT)}
        />

        {/* Create / Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (open) {
              openDialog();
              return;
            }
            closeDialog();
          }}
        >
          <DialogContent
            variant="workspace"
            className="flex min-h-0 flex-col gap-0 overflow-hidden bg-background shadow-2xl shadow-black/30 sm:max-w-3xl"
          >
            <DialogHeader className="shrink-0 px-5 pb-4 pr-16 pt-5 text-left sm:px-7 sm:pb-5 sm:pr-16 sm:pt-7">
              <DialogTitle>{editingId ? t("dialog.editTitle") : t("dialog.createTitle")}</DialogTitle>
              <DialogDescription className="max-w-2xl leading-relaxed">{t("dialog.description")}</DialogDescription>
            </DialogHeader>

            <Tabs
              value={activeFormTab}
              onValueChange={setActiveFormTab}
              className="flex min-h-0 flex-1 flex-col"
            >
              <DashboardTabsList className="mx-5 w-[calc(100%-2.5rem)] shrink-0 sm:mx-7 sm:w-[calc(100%-3.5rem)]">
                <DashboardTabTrigger value="general">{t("formTabs.general")}</DashboardTabTrigger>
                <DashboardTabTrigger value="messages">{t("formTabs.messages")}</DashboardTabTrigger>
                <DashboardTabTrigger value="restrictions">{t("formTabs.restrictions")}</DashboardTabTrigger>
                <DashboardTabTrigger value="advanced">{t("formTabs.advanced")}</DashboardTabTrigger>
                {editingGiveaway && <DashboardTabTrigger value="winners">{t("formTabs.winners")}</DashboardTabTrigger>}
              </DashboardTabsList>

              <TabsContent value="general" className={cn(GIVEAWAY_FORM_TAB_CLASS, "space-y-5")}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("form.prize")}<span className="ml-1 text-destructive">*</span></Label>
                    <Input className="border-0 bg-muted/55 shadow-sm shadow-black/5" value={form.prize} onChange={(e) => updateForm((s) => ({ ...s, prize: e.target.value }))} placeholder={t("form.prizePlaceholder")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("form.channel")}<span className="ml-1 text-destructive">*</span></Label>
                    <ChannelCombobox className="border-0 bg-muted/55 shadow-sm shadow-black/5 hover:bg-muted" channels={channels} value={form.channelId} onValueChange={(value) => updateForm((s) => ({ ...s, channelId: value }))} placeholder={t("form.channelPlaceholder")} showDisabled={false} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("form.startTime")}<span className="ml-1 text-destructive">*</span></Label>
                    <div className="flex items-center gap-2">
                      <Checkbox id="startNow" checked={form.startNow} onCheckedChange={(checked) => updateForm((s) => ({ ...s, startNow: checked === true, startTime: checked === true ? "" : s.startTime }))} />
                      <Label htmlFor="startNow" className="cursor-pointer font-normal">{t("form.startNow")}</Label>
                    </div>
                    {!form.startNow && <Input className="mt-2 min-w-0 max-w-full border-0 bg-muted/55 shadow-sm shadow-black/5" type="datetime-local" value={form.startTime} onChange={(e) => updateForm((s) => ({ ...s, startTime: e.target.value }))} />}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("form.endTime")}<span className="ml-1 text-destructive">*</span></Label>
                    <Input className="min-w-0 max-w-full border-0 bg-muted/55 shadow-sm shadow-black/5" type="datetime-local" value={form.endTime} onChange={(e) => updateForm((s) => ({ ...s, endTime: e.target.value }))} />
                  </div>
                </div>
                <div className="md:w-1/2 md:pr-2">
                  <div className="space-y-2">
                    <Label>{t("form.winners")}<span className="ml-1 text-destructive">*</span></Label>
                    <Input className="border-0 bg-muted/55 shadow-sm shadow-black/5" type="number" min="1" max="100" value={form.winners} onChange={(e) => updateForm((s) => ({ ...s, winners: e.target.value }))} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="messages" className={cn(GIVEAWAY_FORM_TAB_CLASS, "space-y-4")}>
                <div className="space-y-2">
                  <Label>{t("form.textAboveEmbed")}</Label>
                  <Textarea rows={4} className="border-0 bg-muted/55 shadow-sm shadow-black/5" value={form.textAbove} onChange={(e) => updateForm((s) => ({ ...s, textAbove: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("form.textInEmbed")}</Label>
                  <Textarea rows={4} className="border-0 bg-muted/55 shadow-sm shadow-black/5" value={form.textEmbed} onChange={(e) => updateForm((s) => ({ ...s, textEmbed: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("form.textOnEnd")}</Label>
                  <Textarea rows={3} className="border-0 bg-muted/55 shadow-sm shadow-black/5" value={form.textEnd} onChange={(e) => updateForm((s) => ({ ...s, textEnd: e.target.value }))} />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" variant="secondary" size="sm" className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted" onClick={() => openPreview("giveaway")}>
                    <Eye className="mr-2 h-4 w-4" />{t("form.previewGiveaway")}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted" onClick={() => openPreview("end")}>
                    <Trophy className="mr-2 h-4 w-4" />{t("form.previewEnd")}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="restrictions" className={cn(GIVEAWAY_FORM_TAB_CLASS, "space-y-5")}>
                <div className="space-y-2">
                  <Label>{t("form.mentions")}</Label>
                  <RoleCombobox className="border-0 bg-muted/55 shadow-sm shadow-black/5 hover:bg-muted" roles={roles} mode="add" excludeRoleIds={form.mentions} onAdd={(id) => updateForm((s) => ({ ...s, mentions: [...s.mentions, id] }))} />
                  {form.mentions.length > 0 && roleBadges(form.mentions, (id) => updateForm((s) => ({ ...s, mentions: s.mentions.filter((x) => x !== id) })))}
                </div>
                <div className="space-y-2 rounded-[20px] bg-muted/35 p-4">
                  <Label>{t("form.rolesMode")}</Label>
                  <Select value={form.rolesMode} onValueChange={(value: "allow" | "deny" | "none") => updateForm((s) => ({ ...s, rolesMode: value }))}>
                    <SelectTrigger className="border-0 bg-card shadow-sm shadow-black/5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("form.rolesModeOptions.none")}</SelectItem>
                      <SelectItem value="allow">{t("form.rolesModeOptions.allow")}</SelectItem>
                      <SelectItem value="deny">{t("form.rolesModeOptions.deny")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t(`form.rolesModeHelp.${form.rolesMode}`)}</p>
                </div>
                {form.rolesMode !== "none" && (
                  <div className="space-y-2">
                    <Label>{t("form.roleRequirements")}</Label>
                    <RoleCombobox className="border-0 bg-muted/55 shadow-sm shadow-black/5 hover:bg-muted" roles={roles} mode="add" excludeRoleIds={form.roles} onAdd={(id) => updateForm((s) => ({ ...s, roles: [...s.roles, id] }))} />
                    {form.roles.length > 0 && roleBadges(form.roles, (id) => updateForm((s) => ({ ...s, roles: s.roles.filter((x) => x !== id) })))}
                  </div>
                )}
                <div className="space-y-3 rounded-[20px] bg-muted/35 p-4">
                  <Label>{t("form.requirements")}</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox id="profileRequired" checked={form.profileRequired} onCheckedChange={(checked) => updateForm((s) => ({ ...s, profileRequired: checked === true }))} />
                    <Label htmlFor="profileRequired" className="cursor-pointer font-normal">{t("form.profilePictureRequired")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="accountRequired" checked={form.accountRequired} onCheckedChange={(checked) => updateForm((s) => ({ ...s, accountRequired: checked === true }))} />
                    <Label htmlFor="accountRequired" className="cursor-pointer font-normal">{t("form.cocAccountRequired")}</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className={cn(GIVEAWAY_FORM_TAB_CLASS, "space-y-4")}>
                <div className="space-y-3 rounded-[20px] bg-muted/35 p-4">
                  <Label>{t("form.image")}</Label>
                  <Input className="border-0 bg-card shadow-sm shadow-black/5" type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > MAX_IMAGE_BYTES) {
                      toast({ title: t("toast.errorTitle"), description: t("validation.imageTooLarge"), variant: "destructive" });
                      e.target.value = ""; return;
                    }
                    updateForm((s) => ({ ...s, imageFile: file, imagePreview: file ? URL.createObjectURL(file) : s.imagePreview, removeImage: false }));
                  }} />
                  {form.imageFile && <p className="text-xs text-muted-foreground">{(form.imageFile.size / 1024 / 1024).toFixed(2)} MB</p>}
                  <div className="flex items-center gap-2">
                    <Checkbox id="removeImage" checked={form.removeImage} onCheckedChange={(checked) => updateForm((s) => ({ ...s, removeImage: checked === true, imageFile: checked === true ? null : s.imageFile, imagePreview: checked === true ? null : s.imagePreview }))} />
                    <Label htmlFor="removeImage" className="cursor-pointer font-normal">{t("form.removeImage")}</Label>
                  </div>
                  {form.imagePreview && !form.removeImage && <Image src={form.imagePreview} alt={t("form.imagePreviewAlt")} width={640} height={240} unoptimized className="max-h-40 w-full rounded-xl object-cover" />}
                </div>

                <div className="space-y-3 rounded-[20px] bg-muted/35 p-4">
                  <div className="flex items-center justify-between">
                    <Label>{t("form.boosters")}</Label>
                    <Button type="button" variant="secondary" size="sm" className="border-0 bg-card shadow-sm shadow-black/5 hover:bg-muted" onClick={addBooster}>
                      <Plus className="mr-2 h-4 w-4" />{t("form.addBooster")}
                    </Button>
                  </div>
                  {form.boosters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("form.noBoosters")}</p>
                  ) : (
                    <div className="space-y-4">
                      {form.boosters.map((booster, index) => (
                        <div key={booster.id} className="rounded-2xl bg-card p-4 shadow-sm shadow-black/5">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="text-sm font-medium">{t("form.boosterLabel", { index: index + 1 })}</div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeBooster(index)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                            <div className="space-y-2">
                              <Label>{t("form.boostValue")}</Label>
                              <Select value={String(booster.value)} onValueChange={(value) => updateBooster(index, { ...booster, value: Number(value) })}>
                              <SelectTrigger className="border-0 bg-muted/55 shadow-sm shadow-black/5"><SelectValue /></SelectTrigger>
                                <SelectContent>{boostChoices.map((choice) => <SelectItem key={choice} value={String(choice)}>{`x${choice}`}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{t("form.boostRoles")}</Label>
                              <RoleCombobox className="border-0 bg-muted/55 shadow-sm shadow-black/5 hover:bg-muted" roles={roles} mode="add" excludeRoleIds={booster.roles} onAdd={(id) => updateBooster(index, { ...booster, roles: [...booster.roles, id] })} />
                              {booster.roles.length > 0 && roleBadges(booster.roles, (id) => updateBooster(index, { ...booster, roles: booster.roles.filter((x) => x !== id) }))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              {editingGiveaway && (
                <TabsContent value="winners" className={cn(GIVEAWAY_FORM_TAB_CLASS, "overflow-hidden")}>
                  <GiveawayWinnerList giveaway={editingGiveaway} t={t} />
                </TabsContent>
              )}
            </Tabs>

            <DialogFooter className="shrink-0 flex-row gap-2 border-t border-border/50 bg-background px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-4 sm:space-x-0 [&>*]:w-auto">
              <Button variant="secondary" className="min-w-0 flex-1 border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted sm:flex-none" onClick={closeDialog} disabled={saving}>{tCommon("cancel")}</Button>
              <Button className="min-w-0 flex-1 sm:flex-none" onClick={submit} disabled={saving || !hasRequiredFields}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? t("dialog.saveChanges") : t("dialog.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("confirmDelete")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{tCommon("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tCommon("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Discard confirmation */}
        <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("discardTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("discardDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setDiscardConfirmOpen(false); reset(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("discardConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reroll dialog */}
        <Dialog open={rerollDialogOpen} onOpenChange={(open) => { if (!open) { setRerollDialogOpen(false); setRerollTarget(null); setRerollSelected([]); } }}>
          <DialogContent variant="form" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("reroll.title")}</DialogTitle>
              <DialogDescription>{t("reroll.description")}</DialogDescription>
            </DialogHeader>
            {rerollTarget && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("reroll.selectWinners")}</p>
                <div className="space-y-2">
                  {rerollTarget.winnersList.filter((w) => w.status === "winner").map((w) => ( // NOSONAR — JSX nesting from inline dialog structure, standard React pattern
                    <div key={w.userId} className="flex items-center gap-2">
                      <Checkbox
                        id={`reroll-${w.userId}`}
                        checked={rerollSelected.includes(w.userId)}
                        onCheckedChange={(checked) => toggleRerollSelection(w.userId, checked === true)}
                      />
                      <Label htmlFor={`reroll-${w.userId}`} className="cursor-pointer text-sm">{w.username ? `@${w.username}` : w.userId}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRerollDialogOpen(false); setRerollTarget(null); setRerollSelected([]); }} disabled={rerolling}>{tCommon("cancel")}</Button>
              <Button onClick={handleReroll} disabled={rerolling || rerollSelected.length === 0}>
                {rerolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("reroll.confirm", { count: rerollSelected.length })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Entries Dialog */}
        <Dialog open={entriesDialogOpen} onOpenChange={(open) => { if (!open) closeEntries(); }}>
          <DialogContent variant="form" className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{entriesTarget?.prize}</DialogTitle>
              <DialogDescription>{t("entries.description")}</DialogDescription>
            </DialogHeader>
            {entriesLoading && (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full animate-pulse" />)}
              </div>
            )}
            {!entriesLoading && entriesData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{entriesData.totalEntries}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t("entries.totalEntries")}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{entriesData.uniqueUsers}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t("entries.uniqueUsers")}</div>
                  </div>
                </div>
                {entriesData.entrants.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t("entries.noEntrants")}</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <tr className="text-left text-xs font-medium text-muted-foreground">
                          <th className="px-3 py-2">{t("entries.userId")}</th>
                          <th className="px-3 py-2 text-center">{t("entries.entryCount")}</th>
                          <th className="px-3 py-2 text-right">{t("entries.winChance")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entriesData.entrants.map((e, i) => (
                          <tr key={e.userId} className={cn("border-t border-border/60", i % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{e.userId}</td>
                            <td className="px-3 py-2 text-center tabular-nums">{e.entries}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-primary">{e.winChance.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeEntries}>{tCommon("close")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent variant="form" className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{previewMode === "giveaway" ? t("preview.giveawayTitle") : t("preview.endTitle")}</DialogTitle>
              <DialogDescription>{previewMode === "giveaway" ? t("preview.giveawayDescription") : t("preview.endDescription")}</DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl border border-border bg-card p-5">
              {previewMode === "giveaway" ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(previewStatus)}>{t(`status.${previewStatus}`)}</Badge>
                    <span className="text-sm text-muted-foreground">{selectedChannel ? `#${selectedChannel.name}` : t("preview.noChannel")}</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#313338] p-5">
                    <div className="text-xs font-medium text-slate-400">{t("preview.discordPreview")}</div>
                    {mentionLabels.length > 0 && <div className="mt-4 flex flex-wrap gap-2 text-sm text-sky-300">{mentionLabels.map((m) => <span key={m}>{m}</span>)}</div>}
                    {form.textAbove && <div className="mt-4 prose prose-invert max-w-none text-sm text-slate-200">{renderMarkdown(form.textAbove)}</div>}
                    <div className="mt-4 rounded-xl border-l-4 border-l-[#5865f2] border border-white/10 bg-[#2b2d31] p-4 text-slate-100">
                      <div className="text-[15px] font-semibold">{`🎉 ${form.prize || t("preview.noPrize")} - ${winnerCount} ${t("preview.winnerWord", { count: winnerCount })} 🎉`}</div>
                      <div className="mt-3 prose prose-invert max-w-none text-sm text-slate-200">{renderMarkdown(form.textEmbed, t("preview.noEmbedText"))}</div>
                      {form.imagePreview && !form.removeImage && <Image src={form.imagePreview} alt={t("form.imagePreviewAlt")} width={900} height={360} unoptimized className="mt-4 max-h-72 w-full rounded-lg border border-white/10 object-cover" />}
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><span>{t("preview.endsFooter")}</span><span>{discordTimestamp}</span></div>
                    </div>
                    <div className="mt-3"><div className="rounded-md bg-[#5865f2] px-3 py-2 text-sm font-medium text-white inline-block">{`🎟️ ${t("preview.participate")} (${previewParticipantCount})`}</div></div>
                  </div>
                  {requirementBadges.length > 0 && <div className="flex flex-wrap gap-2">{requirementBadges.map((b) => <Badge key={b} variant="secondary">{b}</Badge>)}</div>}
                  {roleRestrictionLabels.length > 0 && <div className="flex flex-wrap gap-2">{roleRestrictionLabels.map((r) => <Badge key={r} variant="outline">{r}</Badge>)}</div>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[#313338] p-5">
                    <div className="text-xs font-medium text-slate-400">{t("preview.discordPreview")}</div>
                    <div className="mt-4 text-sm text-sky-300">@Winner</div>
                    <div className="mt-4 prose prose-invert max-w-none text-sm text-slate-200">{renderMarkdown(form.textEnd, t("preview.noEndText"))}</div>
                    <div className="mt-4 rounded-xl border-l-4 border-l-[#ed4245] border border-white/10 bg-[#2b2d31] p-4 text-slate-100">
                      <div className="text-[15px] font-semibold">{`🎉 ${form.prize || t("preview.noPrize")} - ${winnerCount} ${t("preview.winnerWord", { count: winnerCount })} 🎉`}</div>
                      <div className="mt-3 prose prose-invert max-w-none text-sm text-slate-200">{renderMarkdown(`**${t("preview.totalParticipants", { count: previewParticipantCount })}**`)}</div>
                      {form.imagePreview && !form.removeImage && <Image src={form.imagePreview} alt={t("form.imagePreviewAlt")} width={900} height={360} unoptimized className="mt-4 max-h-72 w-full rounded-lg border border-white/10 object-cover" />}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setPreviewOpen(false)}>{tCommon("close")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

    </div>
  );
}
