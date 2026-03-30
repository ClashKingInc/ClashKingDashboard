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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { CalendarRange, CheckCircle2, Clock3, Gift, ImagePlus, Loader2, Pencil, Plus, ShieldCheck, Trash2, Trophy, Users, X } from "lucide-react";

type Giveaway = {
  id: string; prize: string; channel_id: string | null; status: "scheduled" | "ongoing" | "ended";
  start_time: string; end_time: string; winners: number; mentions: string[]; text_above_embed: string;
  text_in_embed: string; text_on_end: string; image_url: string | null; profile_picture_required: boolean;
  coc_account_required: boolean; roles_mode: "allow" | "deny" | "none"; roles: string[];
  boosters: { value: number; roles: string[] }[]; entry_count: number;
};
type Channel = { id: string; name: string; parent_name?: string };
type Role = { id: string; name: string; color?: number };
type FormState = {
  prize: string; channelId: string; startTime: string; startNow: boolean; endTime: string; winners: string;
  mentions: string[]; textAbove: string; textEmbed: string; textEnd: string; profileRequired: boolean;
  accountRequired: boolean; rolesMode: "allow" | "deny" | "none"; roles: string[]; imageFile: File | null;
  imagePreview: string | null; removeImage: boolean; boosters: { value: number; roles: string[] }[];
};

const emptyState: FormState = {
  prize: "", channelId: "", startTime: "", startNow: false, endTime: "", winners: "1", mentions: [],
  textAbove: "", textEmbed: "Tickets only. Click the button below to participate.", textEnd: "Congratulations to the winner(s)! We will contact you shortly.", profileRequired: false, accountRequired: false,
  rolesMode: "none", roles: [], imageFile: null, imagePreview: null, removeImage: false, boosters: [],
};

const toInputDate = (iso: string) => !iso ? "" : new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fmt = (value: string) => !value ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const statusVariant = (status: Giveaway["status"]) => status === "ongoing" ? "default" : status === "scheduled" ? "secondary" : "outline";
const boostChoices = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];

export default function GiveawaysPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params.guildId as string;
  const locale = params.locale as string;
  const t = useTranslations("GiveawaysPage");
  const tCommon = useTranslations("Common");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("ongoing");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"giveaway" | "end">("giveaway");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEntryCount, setEditingEntryCount] = useState<number>(0);
  const [giveaways, setGiveaways] = useState<{ ongoing: Giveaway[]; upcoming: Giveaway[]; ended: Giveaway[]; total: number }>({ ongoing: [], upcoming: [], ended: [], total: 0 });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<FormState>(emptyState);

  const authHeaders = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push(`/${locale}/login`);
      return null;
    }
    return { Authorization: `Bearer ${token}` };
  };

  const load = async () => {
    try {
      const headers = authHeaders();
      if (!headers) return;
      const [gRes, cRes, rRes] = await Promise.all([
        fetch(`/api/v2/server/${guildId}/giveaways`, { headers: { ...headers, "Content-Type": "application/json" } }),
        fetch(`/api/v2/server/${guildId}/channels`, { headers: { ...headers, "Content-Type": "application/json" } }),
        fetch(`/api/v2/server/${guildId}/discord-roles`, { headers: { ...headers, "Content-Type": "application/json" } }),
      ]);
      if (gRes.status === 401 || gRes.status === 403) {
        localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token"); localStorage.removeItem("user");
        router.push(`/${locale}/login`); return;
      }
      const gData = await gRes.json();
      if (!gRes.ok) throw new Error(gData.detail || gData.error || t("toast.loadError"));
      setGiveaways({ ongoing: gData.ongoing || [], upcoming: gData.upcoming || [], ended: gData.ended || [], total: gData.total || 0 });
      const channelData = cRes.ok ? await cRes.json() : [];
      setChannels(Array.isArray(channelData) ? channelData : []);
      const roleData = rRes.ok ? await rRes.json() : { roles: [] };
      setRoles(Array.isArray(roleData.roles) ? roleData.roles : []);
    } catch (error) {
      toast({ title: t("toast.errorTitle"), description: error instanceof Error ? error.message : t("toast.loadError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (guildId) void load(); }, [guildId]);

  const channelName = (id: string | null) => id ? (`#${channels.find((c) => c.id === id)?.name || id}`) : "-";
  const reset = () => { setDialogOpen(false); setEditingId(null); setEditingEntryCount(0); setForm(emptyState); };
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

  const openEdit = (g: Giveaway) => {
    setEditingId(g.id);
    setEditingEntryCount(g.entry_count || 0);
    setForm({
      prize: g.prize, channelId: g.channel_id || "", startTime: toInputDate(g.start_time), startNow: false,
      endTime: toInputDate(g.end_time), winners: String(g.winners), mentions: g.mentions || [],
      textAbove: g.text_above_embed || "", textEmbed: g.text_in_embed || "", textEnd: g.text_on_end || "",
      profileRequired: g.profile_picture_required, accountRequired: g.coc_account_required,
      rolesMode: g.roles_mode || "none", roles: g.roles || [], imageFile: null, imagePreview: g.image_url, removeImage: false,
      boosters: g.boosters || [],
    });
    setDialogOpen(true);
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
    { icon: CheckCircle2, label: t("preview.boosterCount"), value: String(form.boosters.filter((booster) => booster.roles.length > 0).length) },
  ];

  const openPreview = (mode: "giveaway" | "end") => {
    setPreviewMode(mode);
    setPreviewOpen(true);
  };

  const addBooster = () => setForm((s) => ({ ...s, boosters: [...s.boosters, { value: 1.25, roles: [] }] }));
  const updateBooster = (index: number, next: { value: number; roles: string[] }) => setForm((s) => ({
    ...s,
    boosters: s.boosters.map((booster, boosterIndex) => boosterIndex === index ? next : booster),
  }));
  const removeBooster = (index: number) => setForm((s) => ({
    ...s,
    boosters: s.boosters.filter((_, boosterIndex) => boosterIndex !== index),
  }));

  const submit = async () => {
    try {
      const headers = authHeaders(); if (!headers) return;
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
      body.append("boosters_json", JSON.stringify(
        form.boosters
          .filter((booster) => booster.roles.length > 0)
          .map((booster) => ({ value: booster.value, roles: booster.roles }))
      ));
      body.append("roles_mode", form.rolesMode);
      body.append("text_above_embed", form.textAbove);
      body.append("text_in_embed", form.textEmbed);
      body.append("text_on_end", form.textEnd);
      if (form.profileRequired) body.append("profile_picture_required", "true");
      if (form.accountRequired) body.append("coc_account_required", "true");
      if (form.removeImage) body.append("remove_image", "true");
      if (form.imageFile) body.append("image", form.imageFile);
      const url = editingId ? `/api/v2/server/${guildId}/giveaways/${editingId}` : `/api/v2/server/${guildId}/giveaways`;
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers, body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || t("toast.saveError"));
      toast({ title: t("toast.successTitle"), description: editingId ? t("toast.updated") : t("toast.created") });
      reset(); await load();
    } catch (error) {
      toast({ title: t("toast.errorTitle"), description: error instanceof Error ? error.message : t("toast.saveError"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteGiveaway = async (id: string) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const headers = authHeaders(); if (!headers) return;
      const res = await fetch(`/api/v2/server/${guildId}/giveaways/${id}`, { method: "DELETE", headers: { ...headers, "Content-Type": "application/json" } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || t("toast.deleteError"));
      toast({ title: t("toast.successTitle"), description: t("toast.deleted") });
      await load();
    } catch (error) {
      toast({ title: t("toast.errorTitle"), description: error instanceof Error ? error.message : t("toast.deleteError"), variant: "destructive" });
    }
  };

  const table = (items: Giveaway[]) => items.length === 0 ? (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("empty")}</div>
  ) : (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40"><tr className="text-left">
          <th className="px-4 py-3 font-medium">{t("table.giveaway")}</th><th className="px-4 py-3 font-medium">{t("table.channel")}</th>
          <th className="px-4 py-3 font-medium">{t("table.entries")}</th><th className="px-4 py-3 font-medium">{t("table.start")}</th>
          <th className="px-4 py-3 font-medium">{t("table.end")}</th><th className="px-4 py-3 font-medium">{tCommon("actions")}</th>
        </tr></thead>
        <tbody>{items.map((g) => <tr key={g.id} className="border-t border-border align-top">
          <td className="px-4 py-3"><div className="space-y-2"><div className="flex items-center gap-2"><span className="font-medium text-foreground">{g.prize}</span><Badge variant={statusVariant(g.status)}>{t(`status.${g.status}`)}</Badge></div><div className="text-xs text-muted-foreground">{t("table.winners", { count: g.winners })}</div><div className="flex flex-wrap gap-2 text-xs">{g.profile_picture_required && <Badge variant="secondary">{t("preview.profileRequired")}</Badge>}{g.coc_account_required && <Badge variant="secondary">{t("preview.accountRequired")}</Badge>}{g.boosters.length > 0 && <Badge variant="secondary">{t("table.boosters", { count: g.boosters.length })}</Badge>}</div></div></td>
          <td className="px-4 py-3 text-muted-foreground">{channelName(g.channel_id)}</td><td className="px-4 py-3 text-muted-foreground">{g.entry_count}</td>
          <td className="px-4 py-3 text-muted-foreground">{fmt(g.start_time)}</td><td className="px-4 py-3 text-muted-foreground">{fmt(g.end_time)}</td>
          <td className="px-4 py-3"><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openEdit(g)}><Pencil className="mr-2 h-4 w-4" />{tCommon("edit")}</Button><Button variant="outline" size="sm" onClick={() => deleteGiveaway(g.id)}><Trash2 className="mr-2 h-4 w-4" />{tCommon("delete")}</Button></div></td>
        </tr>)}</tbody>
      </table>
    </div>
  );

  if (loading) return <div className="min-h-screen bg-background p-4 md:p-6"><div className="mx-auto max-w-7xl space-y-6"><Skeleton className="h-10 w-56" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div><Skeleton className="h-[420px] w-full" /></div></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div><h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1><p className="mt-1 text-muted-foreground">{t("description")}</p></div>
          <Button onClick={() => { setEditingId(null); setEditingEntryCount(0); setForm(emptyState); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />{t("create")}</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.total")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-blue-500">{giveaways.total}</div>
                <Gift className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.total")}</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.ongoing")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-500">{giveaways.ongoing.length}</div>
                <Clock3 className="h-8 w-8 text-green-500/50" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.ongoing")}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.upcoming")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-amber-500">{giveaways.upcoming.length}</div>
                <CalendarRange className="h-8 w-8 text-amber-500/50" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.upcoming")}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-500/30 bg-slate-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.ended")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-slate-300">{giveaways.ended.length}</div>
                <Trophy className="h-8 w-8 text-slate-400/60" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("statsDescriptions.ended")}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>{t("listTitle")}</CardTitle><CardDescription>{t("listDescription")}</CardDescription></CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 md:w-auto"><TabsTrigger value="ongoing">{t("tabs.ongoing")}</TabsTrigger><TabsTrigger value="upcoming">{t("tabs.upcoming")}</TabsTrigger><TabsTrigger value="ended">{t("tabs.ended")}</TabsTrigger></TabsList>
              <TabsContent value="ongoing" className="mt-6">{table(giveaways.ongoing)}</TabsContent>
              <TabsContent value="upcoming" className="mt-6">{table(giveaways.upcoming)}</TabsContent>
              <TabsContent value="ended" className="mt-6">{table(giveaways.ended)}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? reset() : setDialogOpen(true))}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader><DialogTitle>{editingId ? t("dialog.editTitle") : t("dialog.createTitle")}</DialogTitle><DialogDescription>{t("dialog.description")}</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("form.prize")}</Label><Input value={form.prize} onChange={(e) => setForm((s) => ({ ...s, prize: e.target.value }))} placeholder={t("form.prizePlaceholder")} /></div>
                <div className="space-y-2"><Label>{t("form.channel")}</Label><ChannelCombobox channels={channels} value={form.channelId} onValueChange={(value) => setForm((s) => ({ ...s, channelId: value }))} placeholder={t("form.channelPlaceholder")} showDisabled={false} /></div>
                <div className="space-y-2"><Label>{t("form.startTime")}</Label><Input type="datetime-local" value={form.startTime} disabled={form.startNow} onChange={(e) => setForm((s) => ({ ...s, startTime: e.target.value }))} /><div className="flex items-center gap-2"><Checkbox checked={form.startNow} onCheckedChange={(checked) => setForm((s) => ({ ...s, startNow: Boolean(checked) }))} /><Label>{t("form.startNow")}</Label></div></div>
                <div className="space-y-2"><Label>{t("form.endTime")}</Label><Input type="datetime-local" value={form.endTime} onChange={(e) => setForm((s) => ({ ...s, endTime: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("form.winners")}</Label><Input type="number" min="1" value={form.winners} onChange={(e) => setForm((s) => ({ ...s, winners: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("form.rolesMode")}</Label><Select value={form.rolesMode} onValueChange={(value: "allow" | "deny" | "none") => setForm((s) => ({ ...s, rolesMode: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t("form.rolesModeOptions.none")}</SelectItem><SelectItem value="allow">{t("form.rolesModeOptions.allow")}</SelectItem><SelectItem value="deny">{t("form.rolesModeOptions.deny")}</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("form.mentions")}</Label><RoleCombobox roles={roles} mode="add" excludeRoleIds={form.mentions} onAdd={(id) => setForm((s) => ({ ...s, mentions: [...s.mentions, id] }))} />{form.mentions.length > 0 && roleBadges(form.mentions, (id) => setForm((s) => ({ ...s, mentions: s.mentions.filter((x) => x !== id) })))}</div>
                <div className="space-y-2"><Label>{t("form.roleRequirements")}</Label><RoleCombobox roles={roles} mode="add" disabled={form.rolesMode === "none"} excludeRoleIds={form.roles} onAdd={(id) => setForm((s) => ({ ...s, roles: [...s.roles, id] }))} />{form.roles.length > 0 && roleBadges(form.roles, (id) => setForm((s) => ({ ...s, roles: s.roles.filter((x) => x !== id) })))}</div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("form.textAboveEmbed")}</Label><Textarea rows={4} value={form.textAbove} onChange={(e) => setForm((s) => ({ ...s, textAbove: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("form.textInEmbed")}</Label><Textarea rows={4} value={form.textEmbed} onChange={(e) => setForm((s) => ({ ...s, textEmbed: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>{t("form.textOnEnd")}</Label><Textarea rows={3} value={form.textEnd} onChange={(e) => setForm((s) => ({ ...s, textEnd: e.target.value }))} /></div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => openPreview("giveaway")}>
                  <Gift className="mr-2 h-4 w-4" />
                  {t("form.previewGiveaway")}
                </Button>
                <Button type="button" variant="outline" onClick={() => openPreview("end")}>
                  <Trophy className="mr-2 h-4 w-4" />
                  {t("form.previewEnd")}
                </Button>
              </div>
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <Label>{t("form.boosters")}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addBooster}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("form.addBooster")}
                  </Button>
                </div>
                {form.boosters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("form.noBoosters")}</p>
                ) : (
                  <div className="space-y-4">
                    {form.boosters.map((booster, index) => (
                      <div key={`${index}-${booster.value}`} className="rounded-lg border border-border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-sm font-medium">{t("form.boosterLabel", { index: index + 1 })}</div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeBooster(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                          <div className="space-y-2">
                            <Label>{t("form.boostValue")}</Label>
                            <Select value={String(booster.value)} onValueChange={(value) => updateBooster(index, { ...booster, value: Number(value) })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {boostChoices.map((choice) => <SelectItem key={choice} value={String(choice)}>{`x${choice}`}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{t("form.boostRoles")}</Label>
                            <RoleCombobox
                              roles={roles}
                              mode="add"
                              excludeRoleIds={booster.roles}
                              onAdd={(id) => updateBooster(index, { ...booster, roles: [...booster.roles, id] })}
                            />
                            {booster.roles.length > 0 && roleBadges(booster.roles, (id) => updateBooster(index, { ...booster, roles: booster.roles.filter((x) => x !== id) }))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-border p-4">
                  <Label>{t("form.image")}</Label><Input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0] || null; setForm((s) => ({ ...s, imageFile: file, imagePreview: file ? URL.createObjectURL(file) : s.imagePreview, removeImage: false })); }} />
                  <div className="flex items-center gap-2"><Checkbox checked={form.removeImage} onCheckedChange={(checked) => setForm((s) => ({ ...s, removeImage: Boolean(checked), imageFile: Boolean(checked) ? null : s.imageFile, imagePreview: Boolean(checked) ? null : s.imagePreview }))} /><Label>{t("form.removeImage")}</Label></div>
                  {form.imagePreview && !form.removeImage && <Image src={form.imagePreview} alt={t("form.imagePreviewAlt")} width={640} height={240} unoptimized className="max-h-40 w-full rounded-lg border border-border object-cover" />}
                </div>
                <div className="space-y-2 rounded-xl border border-border p-4">
                  <Label>{t("form.requirements")}</Label>
                  <div className="flex items-center gap-2"><Checkbox checked={form.profileRequired} onCheckedChange={(checked) => setForm((s) => ({ ...s, profileRequired: Boolean(checked) }))} /><Label>{t("form.profilePictureRequired")}</Label></div>
                  <div className="flex items-center gap-2"><Checkbox checked={form.accountRequired} onCheckedChange={(checked) => setForm((s) => ({ ...s, accountRequired: Boolean(checked) }))} /><Label>{t("form.cocAccountRequired")}</Label></div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ImagePlus className="h-4 w-4 text-primary" />
                  {t("preview.liveSummary")}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {summaryStats.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</div>
                      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(previewStatus)}>{t(`status.${previewStatus}`)}</Badge>
                    <span className="text-sm text-muted-foreground">{selectedChannel ? `#${selectedChannel.name}` : t("preview.noChannel")}</span>
                  </div>
                  {mentionLabels.length > 0 && <div className="mt-3 flex flex-wrap gap-2 text-sm text-sky-300">{mentionLabels.map((mention) => <span key={mention}>{mention}</span>)}</div>}
                  {form.textAbove && <div className="mt-3 prose prose-invert max-w-none text-sm text-slate-200">{renderMarkdown(form.textAbove)}</div>}
                  <div className="mt-3 rounded-xl border-l-4 border-l-[#5865f2] border border-white/10 bg-[#2b2d31] p-4 text-slate-100 shadow-sm">
                    <div className="text-[15px] font-semibold">{`🎉 ${form.prize || t("preview.noPrize")} - ${winnerCount} ${t("preview.winnerWord", { count: winnerCount })} 🎉`}</div>
                    <div className="mt-3 prose prose-invert max-w-none text-sm text-slate-200">{renderMarkdown(form.textEmbed, t("preview.noEmbedText"))}</div>
                    {form.imagePreview && !form.removeImage && <Image src={form.imagePreview} alt={t("form.imagePreviewAlt")} width={900} height={360} unoptimized className="mt-4 max-h-72 w-full rounded-lg border border-white/10 object-cover" />}
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                      <span>{t("preview.endsFooter")}</span>
                      <span>{discordTimestamp}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="rounded-md bg-[#5865f2] px-3 py-2 text-sm font-medium text-white">{`🎟️ ${t("preview.participate")} (${previewParticipantCount})`}</div>
                  </div>
                  {requirementBadges.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{requirementBadges.map((badge) => <Badge key={badge} variant="secondary">{badge}</Badge>)}</div>}
                  {roleRestrictionLabels.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{roleRestrictionLabels.map((role) => <Badge key={role} variant="outline">{role}</Badge>)}</div>}
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={reset} disabled={saving}>{tCommon("cancel")}</Button><Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? t("dialog.saveChanges") : t("dialog.create")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

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
                    {mentionLabels.length > 0 && <div className="mt-4 flex flex-wrap gap-2 text-sm text-sky-300">{mentionLabels.map((mention) => <span key={mention}>{mention}</span>)}</div>}
                    {form.textAbove && <div className="mt-4 prose prose-invert max-w-none text-sm text-slate-200">{renderMarkdown(form.textAbove)}</div>}
                    <div className="mt-4 rounded-xl border-l-4 border-l-[#5865f2] border border-white/10 bg-[#2b2d31] p-4 text-slate-100">
                      <div className="text-[15px] font-semibold">{`🎉 ${form.prize || t("preview.noPrize")} - ${winnerCount} ${t("preview.winnerWord", { count: winnerCount })} 🎉`}</div>
                      <div className="mt-3 prose prose-invert max-w-none text-sm text-slate-200">{renderMarkdown(form.textEmbed, t("preview.noEmbedText"))}</div>
                      {form.imagePreview && !form.removeImage && <Image src={form.imagePreview} alt={t("form.imagePreviewAlt")} width={900} height={360} unoptimized className="mt-4 max-h-72 w-full rounded-lg border border-white/10 object-cover" />}
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                        <span>{t("preview.endsFooter")}</span>
                        <span>{discordTimestamp}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="rounded-md bg-[#5865f2] px-3 py-2 text-sm font-medium text-white">{`🎟️ ${t("preview.participate")} (${previewParticipantCount})`}</div>
                    </div>
                  </div>
                  {requirementBadges.length > 0 && <div className="flex flex-wrap gap-2">{requirementBadges.map((badge) => <Badge key={badge} variant="secondary">{badge}</Badge>)}</div>}
                  {roleRestrictionLabels.length > 0 && <div className="flex flex-wrap gap-2">{roleRestrictionLabels.map((role) => <Badge key={role} variant="outline">{role}</Badge>)}</div>}
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>{tCommon("close")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
