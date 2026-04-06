"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleCombobox } from "@/components/ui/role-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertCircle, CalendarRange, CheckCircle2, Clock3, Copy, ExternalLink, Eye, Gift, Loader2, Pencil, Plus, RefreshCw, ShieldCheck, Sword, Trash2, Trophy, User, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import type { Giveaway } from "@/lib/api/types/server";

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

const buildEmptyState = (t: (key: string) => string): FormState => ({
  prize: "", channelId: "", startTime: "", startNow: false, endTime: "", winners: "1", mentions: [],
  textAbove: "", textEmbed: t("form.textEmbedDefault"), textEnd: t("form.textEndDefault"), profileRequired: false, accountRequired: false,
  rolesMode: "none", roles: [], imageFile: null, imagePreview: null, removeImage: false, boosters: [],
});

const toInputDate = (iso: string) => !iso ? "" : new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fmt = (value: string) => !value ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const STATUS_VARIANT: Record<string, string> = { ongoing: "default", scheduled: "secondary" };
const statusVariant = (status: Giveaway["status"]) => STATUS_VARIANT[status] ?? "outline";
const boostChoices = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];

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

export default function GiveawaysPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params.guildId as string;
  const locale = params.locale as string;
  const t = useTranslations("GiveawaysPage");
  const tCommon = useTranslations("Common");

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("ongoing");
  const [activeFormTab, setActiveFormTab] = useState("general");
  const [shownEnded, setShownEnded] = useState(ENDED_LIMIT);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formModified, setFormModified] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"giveaway" | "end">("giveaway");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEntryCount, setEditingEntryCount] = useState<number>(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rerollDialogOpen, setRerollDialogOpen] = useState(false);
  const [rerollTarget, setRerollTarget] = useState<Giveaway | null>(null);
  const [rerollSelected, setRerollSelected] = useState<string[]>([]);
  const [rerolling, setRerolling] = useState(false);
  const [giveaways, setGiveaways] = useState<{ ongoing: Giveaway[]; upcoming: Giveaway[]; ended: Giveaway[]; total: number }>({ ongoing: [], upcoming: [], ended: [], total: 0 });
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
      const [gRes, cRes, rRes] = await Promise.all([
        apiClient.servers.getGiveaways(guildId),
        apiClient.servers.getChannels(guildId),
        apiClient.servers.getDiscordRoles(guildId),
      ]);
      if (gRes.status === 401 || gRes.status === 403) { router.push(`/${locale}/login`); return; }
      if (gRes.error || !gRes.data) throw new Error(gRes.error || t("toast.loadError"));
      setGiveaways({ ongoing: gRes.data.ongoing || [], upcoming: gRes.data.upcoming || [], ended: gRes.data.ended || [], total: gRes.data.total || 0 });
      setChannels(Array.isArray(cRes.data) ? cRes.data : []);
      setRoles(Array.isArray(rRes.data?.roles) ? rRes.data.roles : []);
    } catch (error) {
      toast({ title: t("toast.errorTitle"), description: error instanceof Error ? error.message : t("toast.loadError"), variant: "destructive" });
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (guildId) void load(); }, [guildId]);

  const channelName = (id: string | null) => id ? (`#${channels.find((c) => c.id === id)?.name || id}`) : null;

  const reset = () => {
    setDialogOpen(false); setEditingId(null); setEditingEntryCount(0);
    setForm(buildEmptyState(t)); setFormModified(false); setActiveFormTab("general");
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && formModified) setDiscardConfirmOpen(true);
    else if (!open) reset();
    else setDialogOpen(true);
  };

  const openCreate = () => {
    setForm(buildEmptyState(t)); setFormModified(false);
    setActiveFormTab("general"); setEditingId(null); setEditingEntryCount(0);
    setDialogOpen(true);
  };

  const selectedChannel = channels.find((c) => c.id === form.channelId);
  const effectiveStart = form.startNow ? new Date() : (form.startTime ? new Date(form.startTime) : null);
  const effectiveEnd = form.endTime ? new Date(form.endTime) : null;
  const previewStatus: Giveaway["status"] = !effectiveStart ? "scheduled" : effectiveEnd && effectiveEnd.getTime() <= Date.now() ? "ended" : effectiveStart.getTime() <= Date.now() ? "ongoing" : "scheduled";
  const mentionLabels = form.mentions.map((id) => `@${roles.find((role) => role.id === id)?.name || id}`);
  const roleRestrictionLabels = form.roles.map((id) => `@${roles.find((role) => role.id === id)?.name || id}`);
  const previewParticipantCount = editingEntryCount;
  const markdownComponents = {
    p: ({ children }: any) => <p className="leading-6 [&:not(:first-child)]:mt-2">{children}</p>,
    strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    ul: ({ children }: any) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
    a: ({ href, children }: any) => <a href={href} className="text-sky-300 underline" target="_blank" rel="noreferrer">{children}</a>,
    code: ({ children }: any) => <code className="rounded bg-white/10 px-1 py-0.5 text-[0.9em]">{children}</code>,
  };
  const renderMarkdown = (value: string, fallback?: string) => (
    <ReactMarkdown components={markdownComponents}>{(value || fallback || "").replace(/\n/g, "  \n")}</ReactMarkdown>
  );
  const discordTimestamp = effectiveEnd ? fmt(effectiveEnd.toISOString()) : "-";
  const winnerCount = Number(form.winners || 1);

  const totalEntries = [...giveaways.ongoing, ...giveaways.upcoming, ...giveaways.ended]
    .reduce((sum, g) => sum + (g.entry_count || 0), 0);

  const openEdit = (g: Giveaway) => {
    setEditingId(g.id); setEditingEntryCount(g.entry_count || 0);
    setForm({
      prize: g.prize, channelId: g.channel_id || "", startTime: toInputDate(g.start_time), startNow: false,
      endTime: toInputDate(g.end_time), winners: String(g.winners), mentions: g.mentions || [],
      textAbove: g.text_above_embed || "", textEmbed: g.text_in_embed || "", textEnd: g.text_on_end || "",
      profileRequired: g.profile_picture_required, accountRequired: g.coc_account_required,
      rolesMode: g.roles_mode || "none", roles: g.roles || [], imageFile: null, imagePreview: g.image_url, removeImage: false,
      boosters: (g.boosters || []).map((b) => ({ ...b, id: crypto.randomUUID() })),
    });
    setFormModified(false); setActiveFormTab("general"); setDialogOpen(true);
  };

  const duplicate = (g: Giveaway) => {
    setEditingId(null); setEditingEntryCount(0);
    setForm({
      prize: g.prize, channelId: g.channel_id || "", startTime: "", startNow: false,
      endTime: "", winners: String(g.winners), mentions: g.mentions || [],
      textAbove: g.text_above_embed || "", textEmbed: g.text_in_embed || "", textEnd: g.text_on_end || "",
      profileRequired: g.profile_picture_required, accountRequired: g.coc_account_required,
      rolesMode: g.roles_mode || "none", roles: g.roles || [], imageFile: null, imagePreview: g.image_url, removeImage: false,
      boosters: (g.boosters || []).map((b) => ({ ...b, id: crypto.randomUUID() })),
    });
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

  const summaryStats = [
    { icon: Trophy, label: t("preview.winnerCount"), value: form.winners || "1" },
    { icon: Users, label: t("preview.mentionCount"), value: String(form.mentions.length) },
    { icon: ShieldCheck, label: t("preview.requirementCount"), value: String(requirementBadges.length) },
    { icon: CheckCircle2, label: t("preview.boosterCount"), value: String(form.boosters.filter((b) => b.roles.length > 0).length) },
  ];

  const openPreview = (mode: "giveaway" | "end") => { setPreviewMode(mode); setPreviewOpen(true); };

  const addBooster = () => updateForm((s) => ({ ...s, boosters: [...s.boosters, { id: crypto.randomUUID(), value: 1.25, roles: [] }] }));
  const updateBooster = (index: number, next: Booster) => updateForm((s) => ({ ...s, boosters: s.boosters.map((b, i) => i === index ? next : b) }));
  const removeBooster = (index: number) => updateForm((s) => ({ ...s, boosters: s.boosters.filter((_, i) => i !== index) }));

  const submit = async () => {
    try {
      if (!form.prize.trim()) throw new Error(t("validation.prizeRequired"));
      if (!form.channelId) throw new Error(t("validation.channelRequired"));
      if (!form.startNow && !form.startTime) throw new Error(t("validation.startTimeRequired"));
      if (!form.endTime) throw new Error(t("validation.endTimeRequired"));
      if (!form.startNow && form.startTime && new Date(form.endTime).getTime() <= new Date(form.startTime).getTime()) throw new Error(t("validation.endAfterStart"));
      setSaving(true);
      const body = new FormData();
      body.append("prize", form.prize.trim());
      if (form.startNow) body.append("now", "true"); else body.append("start_time", new Date(form.startTime).toISOString());
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

  const table = (items: Giveaway[], tab: "ongoing" | "upcoming" | "ended") => {
    const isEnded = tab === "ended";
    const displayItems = isEnded ? items.slice(0, shownEnded) : items;
    const hasMore = isEnded && items.length > shownEnded;

    if (items.length === 0) return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-10 text-center">
        <Gift className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-foreground">{t("emptyTab.title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t(`emptyTab.${tab}`)}</p>
        </div>
        {!isEnded && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />{t("create")}
          </Button>
        )}
      </div>
    );

    const activeWinnersLabel = (g: Giveaway) => {
      const active = g.winners_list.filter((w) => w.status === "winner");
      const rerolled = g.winners_list.filter((w) => w.status === "rerolled");
      if (active.length === 0 && rerolled.length === 0) return null;
      const shown = active.slice(0, 3);
      const overflow = active.length - shown.length;
      return (
        <div className="flex flex-wrap items-center gap-1">
          {shown.map((w) => (
            <span key={w.user_id} className="inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-400 ring-1 ring-green-500/20">
              <Trophy className="h-2.5 w-2.5" />{w.username ? `@${w.username}` : w.user_id}
            </span>
          ))}
          {overflow > 0 && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">+{overflow}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    {active.slice(3).map((w) => <div key={w.user_id}>{w.username ? `@${w.username}` : w.user_id}</div>)}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {rerolled.length > 0 && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground line-through">{t("table.rerolledCount", { count: rerolled.length })}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    {rerolled.map((w) => <div key={w.user_id} className="line-through opacity-60">{w.username ? `@${w.username}` : w.user_id}</div>)}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    };

    return (
      <div className={cn("space-y-3", tableLoading && "pointer-events-none opacity-50 transition-opacity")}>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3">{t("table.giveaway")}</th>
                <th className="px-4 py-3">{t("table.channel")}</th>
                <th className="px-4 py-3">{isEnded ? t("table.winnersHeader") : t("table.entries")}</th>
                <th className="px-4 py-3">{t("table.timing")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {displayItems.map((g) => {
                const ch = channelName(g.channel_id);
                return (
                  <tr key={g.id} className="border-t border-border/60 hover:bg-muted/20 transition-colors align-middle">
                    {/* Giveaway */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">{g.prize}</span>
                        {tab === "ongoing" && g.updated && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 text-[10px] cursor-default shrink-0">
                                  {t("table.pendingUpdate")}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{t("table.pendingUpdateHelp")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{t("table.winners", { count: g.winners })}</span>
                        {g.profile_picture_required && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild><User className="h-3 w-3" /></TooltipTrigger>
                              <TooltipContent>{t("preview.profileRequired")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {g.coc_account_required && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild><Sword className="h-3 w-3" /></TooltipTrigger>
                              <TooltipContent>{t("preview.accountRequired")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {g.boosters.length > 0 && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild><CheckCircle2 className="h-3 w-3" /></TooltipTrigger>
                              <TooltipContent>{t("table.boosters", { count: g.boosters.length })}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                    {/* Channel */}
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {ch ? (
                        <span>{ch}</span>
                      ) : (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1 text-destructive/60">
                                <AlertCircle className="h-3.5 w-3.5" />{t("table.noChannel")}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{t("table.noChannelHelp")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </td>
                    {/* Entries or Winners */}
                    <td className="px-4 py-3">
                      {isEnded ? (
                        activeWinnersLabel(g) ?? <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
                          <Users className="h-3.5 w-3.5 shrink-0" />{g.entry_count}
                        </span>
                      )}
                    </td>
                    {/* Timing */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tab === "ongoing" && (
                        <div>
                          <div className="text-sm font-medium text-green-500">{fmtRelative(g.end_time)}</div>
                          <div className="text-xs text-muted-foreground">{fmt(g.end_time)}</div>
                        </div>
                      )}
                      {tab === "upcoming" && (
                        <div>
                          <div className="text-sm text-foreground">{fmtRelative(g.start_time)}</div>
                          <div className="text-xs text-muted-foreground">{fmt(g.start_time)}</div>
                        </div>
                      )}
                      {tab === "ended" && (
                        <div>
                          <div className="text-sm text-muted-foreground">{fmt(g.end_time)}</div>
                          <div className="text-xs text-muted-foreground/60">{fmtRelative(g.end_time)}</div>
                        </div>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {g.message_id && g.channel_id && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`https://discord.com/channels/${guildId}/${g.channel_id}/${g.message_id}`, "_blank", "noreferrer")}>
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("table.viewInDiscord")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {isEnded && g.winners_list.some((w) => w.status === "winner") && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setRerollTarget(g); setRerollSelected([]); setRerollDialogOpen(true); }}>
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("table.reroll")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {isEnded ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{tCommon("view")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{tCommon("edit")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicate(g)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("table.duplicate")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirmId(g.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{tCommon("delete")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isEnded && (
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>{t("table.showingEnded", { shown: displayItems.length, total: items.length })}</span>
            {hasMore && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShownEnded((n) => n + ENDED_LIMIT)}>
                {t("table.showMore", { count: Math.min(ENDED_LIMIT, items.length - shownEnded) })}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
        <Skeleton className="h-[420px] w-full" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("description")}</p>
          </div>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{t("create")}</Button>
        </div>

        {/* Stat cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.totalEntries")}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between"><div className="text-3xl font-bold text-blue-500">{totalEntries.toLocaleString()}</div><Users className="h-8 w-8 text-blue-500/50" /></div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.totalEntries")}</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.ongoing")}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between"><div className="text-3xl font-bold text-green-500">{giveaways.ongoing.length}</div><Clock3 className="h-8 w-8 text-green-500/50" /></div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.ongoing")}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.upcoming")}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between"><div className="text-3xl font-bold text-amber-500">{giveaways.upcoming.length}</div><CalendarRange className="h-8 w-8 text-amber-500/50" /></div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.upcoming")}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-500/30 bg-slate-500/5">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.ended")}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between"><div className="text-3xl font-bold text-slate-300">{giveaways.ended.length}</div><Trophy className="h-8 w-8 text-slate-400/60" /></div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.ended")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader><CardTitle>{t("listTitle")}</CardTitle><CardDescription>{t("listDescription")}</CardDescription></CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 md:w-auto">
                <TabsTrigger value="ongoing">{t("tabs.ongoing")}{giveaways.ongoing.length > 0 && <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{giveaways.ongoing.length}</span>}</TabsTrigger>
                <TabsTrigger value="upcoming">{t("tabs.upcoming")}{giveaways.upcoming.length > 0 && <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">{giveaways.upcoming.length}</span>}</TabsTrigger>
                <TabsTrigger value="ended">{t("tabs.ended")}{giveaways.ended.length > 0 && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{giveaways.ended.length}</span>}</TabsTrigger>
              </TabsList>
              <TabsContent value="ongoing" className="mt-6">{table(giveaways.ongoing, "ongoing")}</TabsContent>
              <TabsContent value="upcoming" className="mt-6">{table(giveaways.upcoming, "upcoming")}</TabsContent>
              <TabsContent value="ended" className="mt-6">{table(giveaways.ended, "ended")}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingId ? t("dialog.editTitle") : t("dialog.createTitle")}</DialogTitle>
              <DialogDescription>{t("dialog.description")}</DialogDescription>
            </DialogHeader>

            {/* Live summary strip */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {summaryStats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-[10px] text-muted-foreground">{label}</div>
                    <div className="text-sm font-semibold text-foreground">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">{t("formTabs.general")}</TabsTrigger>
                <TabsTrigger value="messages">{t("formTabs.messages")}</TabsTrigger>
                <TabsTrigger value="restrictions">{t("formTabs.restrictions")}</TabsTrigger>
                <TabsTrigger value="advanced">{t("formTabs.advanced")}</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("form.prize")}</Label>
                    <Input value={form.prize} onChange={(e) => updateForm((s) => ({ ...s, prize: e.target.value }))} placeholder={t("form.prizePlaceholder")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("form.channel")}</Label>
                    <ChannelCombobox channels={channels} value={form.channelId} onValueChange={(value) => updateForm((s) => ({ ...s, channelId: value }))} placeholder={t("form.channelPlaceholder")} showDisabled={false} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("form.startTime")}</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox id="startNow" checked={form.startNow} onCheckedChange={(checked) => updateForm((s) => ({ ...s, startNow: Boolean(checked), startTime: Boolean(checked) ? "" : s.startTime }))} />
                      <Label htmlFor="startNow" className="cursor-pointer font-normal">{t("form.startNow")}</Label>
                    </div>
                    {!form.startNow && <Input type="datetime-local" value={form.startTime} onChange={(e) => updateForm((s) => ({ ...s, startTime: e.target.value }))} />}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("form.endTime")}</Label>
                    <Input type="datetime-local" value={form.endTime} onChange={(e) => updateForm((s) => ({ ...s, endTime: e.target.value }))} />
                  </div>
                </div>
                <div className="md:w-1/2 md:pr-2">
                  <div className="space-y-2">
                    <Label>{t("form.winners")}</Label>
                    <Input type="number" min="1" max="100" value={form.winners} onChange={(e) => updateForm((s) => ({ ...s, winners: e.target.value }))} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="messages" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>{t("form.textAboveEmbed")}</Label>
                  <Textarea rows={4} className="font-mono text-sm" value={form.textAbove} onChange={(e) => updateForm((s) => ({ ...s, textAbove: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("form.textInEmbed")}</Label>
                  <Textarea rows={4} className="font-mono text-sm" value={form.textEmbed} onChange={(e) => updateForm((s) => ({ ...s, textEmbed: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("form.textOnEnd")}</Label>
                  <Textarea rows={3} className="font-mono text-sm" value={form.textEnd} onChange={(e) => updateForm((s) => ({ ...s, textEnd: e.target.value }))} />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => openPreview("giveaway")}>
                    <Gift className="mr-2 h-4 w-4" />{t("form.previewGiveaway")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openPreview("end")}>
                    <Trophy className="mr-2 h-4 w-4" />{t("form.previewEnd")}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="restrictions" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>{t("form.mentions")}</Label>
                  <RoleCombobox roles={roles} mode="add" excludeRoleIds={form.mentions} onAdd={(id) => updateForm((s) => ({ ...s, mentions: [...s.mentions, id] }))} />
                  {form.mentions.length > 0 && roleBadges(form.mentions, (id) => updateForm((s) => ({ ...s, mentions: s.mentions.filter((x) => x !== id) })))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>{t("form.rolesMode")}</Label>
                  <Select value={form.rolesMode} onValueChange={(value: "allow" | "deny" | "none") => updateForm((s) => ({ ...s, rolesMode: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <RoleCombobox roles={roles} mode="add" excludeRoleIds={form.roles} onAdd={(id) => updateForm((s) => ({ ...s, roles: [...s.roles, id] }))} />
                    {form.roles.length > 0 && roleBadges(form.roles, (id) => updateForm((s) => ({ ...s, roles: s.roles.filter((x) => x !== id) })))}
                  </div>
                )}
                <Separator />
                <div className="space-y-3">
                  <Label>{t("form.requirements")}</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox id="profileRequired" checked={form.profileRequired} onCheckedChange={(checked) => updateForm((s) => ({ ...s, profileRequired: Boolean(checked) }))} />
                    <Label htmlFor="profileRequired" className="cursor-pointer font-normal">{t("form.profilePictureRequired")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="accountRequired" checked={form.accountRequired} onCheckedChange={(checked) => updateForm((s) => ({ ...s, accountRequired: Boolean(checked) }))} />
                    <Label htmlFor="accountRequired" className="cursor-pointer font-normal">{t("form.cocAccountRequired")}</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="mt-4 space-y-4">
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <Label>{t("form.image")}</Label>
                  <Input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > MAX_IMAGE_BYTES) {
                      toast({ title: t("toast.errorTitle"), description: t("validation.imageTooLarge"), variant: "destructive" });
                      e.target.value = ""; return;
                    }
                    updateForm((s) => ({ ...s, imageFile: file, imagePreview: file ? URL.createObjectURL(file) : s.imagePreview, removeImage: false }));
                  }} />
                  {form.imageFile && <p className="text-xs text-muted-foreground">{(form.imageFile.size / 1024 / 1024).toFixed(2)} MB</p>}
                  <div className="flex items-center gap-2">
                    <Checkbox id="removeImage" checked={form.removeImage} onCheckedChange={(checked) => updateForm((s) => ({ ...s, removeImage: Boolean(checked), imageFile: Boolean(checked) ? null : s.imageFile, imagePreview: Boolean(checked) ? null : s.imagePreview }))} />
                    <Label htmlFor="removeImage" className="cursor-pointer font-normal">{t("form.removeImage")}</Label>
                  </div>
                  {form.imagePreview && !form.removeImage && <Image src={form.imagePreview} alt={t("form.imagePreviewAlt")} width={640} height={240} unoptimized className="max-h-40 w-full rounded-lg border border-border object-cover" />}
                </div>

                <div className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <Label>{t("form.boosters")}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addBooster}>
                      <Plus className="mr-2 h-4 w-4" />{t("form.addBooster")}
                    </Button>
                  </div>
                  {form.boosters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("form.noBoosters")}</p>
                  ) : (
                    <div className="space-y-4">
                      {form.boosters.map((booster, index) => (
                        <div key={booster.id} className="rounded-lg border border-border p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="text-sm font-medium">{t("form.boosterLabel", { index: index + 1 })}</div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeBooster(index)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                            <div className="space-y-2">
                              <Label>{t("form.boostValue")}</Label>
                              <Select value={String(booster.value)} onValueChange={(value) => updateBooster(index, { ...booster, value: Number(value) })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{boostChoices.map((choice) => <SelectItem key={choice} value={String(choice)}>{`x${choice}`}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{t("form.boostRoles")}</Label>
                              <RoleCombobox roles={roles} mode="add" excludeRoleIds={booster.roles} onAdd={(id) => updateBooster(index, { ...booster, roles: [...booster.roles, id] })} />
                              {booster.roles.length > 0 && roleBadges(booster.roles, (id) => updateBooster(index, { ...booster, roles: booster.roles.filter((x) => x !== id) }))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={saving}>{tCommon("cancel")}</Button>
              <Button onClick={submit} disabled={saving}>
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("reroll.title")}</DialogTitle>
              <DialogDescription>{t("reroll.description")}</DialogDescription>
            </DialogHeader>
            {rerollTarget && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("reroll.selectWinners")}</p>
                <div className="space-y-2">
                  {rerollTarget.winners_list.filter((w) => w.status === "winner").map((w) => (
                    <div key={w.user_id} className="flex items-center gap-2">
                      <Checkbox
                        id={`reroll-${w.user_id}`}
                        checked={rerollSelected.includes(w.user_id)}
                        onCheckedChange={(checked) => setRerollSelected((prev) => checked ? [...prev, w.user_id] : prev.filter((id) => id !== w.user_id))}
                      />
                      <Label htmlFor={`reroll-${w.user_id}`} className="cursor-pointer text-sm">{w.username ? `@${w.username}` : w.user_id}</Label>
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

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-2xl">
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
                    <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{t("preview.discordPreview")}</div>
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
                    <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{t("preview.discordPreview")}</div>
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

      {/* Floating CTA */}
      {!dialogOpen && (
        <Button
          onClick={openCreate}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:hidden"
          aria-label={t("create")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
