"use client";

import { useGuildId, dashboardHref } from "@/lib/dashboard-route";
import { useSearchParams } from "@/lib/navigation";
import { type Dispatch, type ReactNode, type SetStateAction, lazy, Suspense, useCallback, useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { nativePanelMessage } from "./ticket-panel-message";
import { TicketActivity } from "./ticket-activity";
import { TicketMessageLibrary } from "./ticket-message-library";
import { SignupQuestionsEditor } from "../rosters/_components/SignupQuestionsEditor";
import { hasInvalidDropdownOptions } from "../rosters/_lib/signup-questions";
import Link from "@/components/app-link";
import { useTranslations } from "use-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  MessageSquare,
  Plus,
  Settings,
  Ticket,
  Trash2,
  X,
} from "lucide-react";

import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { RoleCombobox } from "@/components/ui/role-combobox";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import { InfoPopover } from "@/components/ui/info-popover";
import { useToast } from "@/components/ui/use-toast";
import {
  extractEmbeds,
  extractMessageContent,
} from "@/components/dashboard/discord-embed-preview";
import { normalizeAllChannelsPayload } from "@/lib/dashboard-cache";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";
import { cn } from "@/lib/utils";
import type {
  ApproveMessage,
  ServerEmbed,
  ServerEmbedsResponse,
  TicketButton,
  TicketButtonSettings,
  TicketPanel,
  UpdateButtonSettingsRequest,
  UpdateTicketPanelRequest,
} from "@/lib/api/types/tickets";

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
const MAX_APPROVE_MESSAGE_NAME_LENGTH = 100;
const MAX_APPROVE_MESSAGE_CONTENT_LENGTH = 2000;


const ticketPanelsQuery = (guildId: string) => ({
  queryKey: dashboardQueryKeys.route("ticket-panels", guildId),
  staleTime: 30_000,
  queryFn: () => apiClient.tickets.getPanels(guildId),
});

const ticketEmbedsQuery = (guildId: string) => ({
  queryKey: dashboardQueryKeys.route("embeds", guildId),
  staleTime: 30_000,
  queryFn: () => apiClient.tickets.getEmbeds(guildId),
});


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
  return normalizeAllChannelsPayload(payload);
};

const normalizeTicketEmbeds = (payload: ServerEmbedsResponse): ServerEmbed[] => {
  return [...payload.items];
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
const CANCEL_BUTTON_CLASS = "!bg-black !text-white hover:!bg-zinc-900";
const CLASHKING_RED_BUTTON_CLASS = "bg-red-600 hover:bg-red-700 text-white";
const LEGACY_DISABLED_EMBED_TOKEN = "disabled";
const TICKET_INPUT_CLASS = "rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5";
const TICKET_WORKSPACE_TAB_CLASS = "mt-0 min-w-0 space-y-5";
const NativeMessageEditor = lazy(() => import("@/components/dashboard/embed-editor").then(module => ({ default: module.EmbedEditor })));

function TicketEditorSurface({ inline = false, open, onOpenChange, title, description, children, busy = false, heading }: {
  readonly inline?: boolean; readonly open: boolean; readonly onOpenChange: (open: boolean) => void;
  readonly title: string; readonly description: string; readonly children: ReactNode;
  readonly busy?: boolean;
  readonly heading?: ReactNode;
}) {
  const tCommon = useTranslations("Common");
  if (inline) return open ? <section className="min-w-0 space-y-5" aria-label={title} aria-busy={busy}>
    {heading ?? <div className="flex items-start justify-between gap-4">
      <div><h2 className="text-xl font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
    </div>}
    {children}
  </section> : null;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent variant="workspace" closeLabel={tCommon("close")} aria-busy={busy} className="flex min-h-0 flex-col gap-0 overflow-hidden bg-background sm:max-w-5xl">
      <DialogHeader className="shrink-0 px-5 pb-4 pr-16 pt-5 text-left sm:px-7 sm:pb-5 sm:pr-16 sm:pt-7">
        <DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>;
}

export function TicketPanelTab({ panel, guildId, embeds, previewButtons, onOpenButtonsTab, channels = [], roles = [] }: {
  readonly panel: TicketPanel; readonly guildId: string; readonly embeds: ServerEmbed[];
  readonly previewButtons: TicketButton[]; readonly onOpenButtonsTab: () => void;
  readonly channels?: DiscordChannel[]; readonly roles?: DiscordRole[];
}) {
  const t = useTranslations("TicketsSettingsPage"), tCommon = useTranslations("Common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [savedPanel, setSavedPanel] = useState(panel);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  useEffect(() => { setSavedPanel(panel); }, [panel]);
  const reloadPanel = async () => {
    apiCache.invalidate(getTicketsPanelsCacheKey(guildId));
    await queryClient.invalidateQueries({ queryKey: ticketPanelsQuery(guildId).queryKey, exact: true });
    const result = await apiClient.tickets.getPanels(guildId);
    if (result.error || !result.data) throw new Error(result.error || tCommon("loadError"));
    const latest = result.data.items.find(item => item.name === panel.name);
    if (!latest) throw new Error(tCommon("loadError"));
    setSavedPanel(latest);
    return latest;
  };
  const draftChanged = !savedPanel.publication || new Date(savedPanel.draftUpdatedAt ?? "").getTime() !== new Date(savedPanel.publication.sourceUpdatedAt).getTime();
  const publish = async () => {
    if (!savedPanel.draftUpdatedAt || publishing || (!savedPanel.publication && !channelId)) return;
    setPublishing(true);
    try {
      const body = { nonce: `${Date.now()}${Math.floor(Math.random() * 900000 + 100000)}`, expectedUpdatedAt: savedPanel.draftUpdatedAt,
        ...(!savedPanel.publication && channelId ? { channelId } : {}) };
      let result = await apiClient.tickets.publishPanel(guildId, panel.name, body);
      for (let attempt = 0; !result.error && result.data && ["pending", "executing"].includes(result.data.state) && attempt < 10; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = await apiClient.tickets.publishPanel(guildId, panel.name, body);
      }
      if (result.error || !result.data) throw new Error(result.error || tCommon("loadError"));
      if (result.data.state !== "succeeded") throw new Error(t(result.data.state === "failed" ? "panelPublishFailed" : "panelPublishPending"));
      setPublishOpen(false);
      await reloadPanel();
      toast({ title: tCommon("success"), description: t("panelPublished") });
    } catch (error) {
      toast({ title: tCommon("error"), description: error instanceof Error ? error.message : tCommon("loadError"), variant: "destructive" });
    } finally { setPublishing(false); }
  };
  const legacy = toEmbedDataRecord(embeds.find(embed => embed.name === panel.embed_name)?.data);
  // Only persisted content establishes a format; starter actions must not silently choose Classic.
  const initial = panel.panel_message ?? (legacy ? {
    content: extractMessageContent(legacy) ?? undefined, embeds: extractEmbeds(legacy),
    components: previewButtons.length ? [{ type: 1, components: previewButtons }] : [],
  } : null);
  const [saved, setSaved] = useState<Record<string, unknown> | null>(initial);
  const save = async (payload: Record<string, unknown>) => {
    setIsSaving(true);
    try {
      const message = nativePanelMessage(payload, previewButtons[0]?.custom_id.split(":")[3]);
      const result = await apiClient.tickets.updatePanel(guildId, panel.name, { panel_message: message, embed_name: null });
      if (result.error) throw new Error(result.error);
      setSaved(message);
      await reloadPanel();
      setPublishOpen(true);
      toast({ title: tCommon("success"), description: t("panelMessageSaved") });
    } catch (error) {
      toast({ title: tCommon("error"), description: error instanceof Error ? error.message : tCommon("loadError"), variant: "destructive" });
      throw error;
    } finally { setIsSaving(false); }
  };
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{t("panelActionHint")}</p>
      <Button size="sm" variant="secondary" onClick={onOpenButtonsTab}>{t("manageTicketActions")}</Button></div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        <p>{t(draftChanged ? "panelDraftSaved" : "panelUpToDate")}</p>
        {savedPanel.publication && <a className="text-primary hover:underline" href={`https://discord.com/channels/${guildId}/${savedPanel.publication.channelId}/${savedPanel.publication.messageId}`} target="_blank" rel="noreferrer">{t("panelViewLive")}</a>}
      </div>
      <Button variant="secondary" disabled={isSaving || publishing || editorDirty || !saved || !savedPanel.draftUpdatedAt || !draftChanged} onClick={() => setPublishOpen(true)}>{t("panelPublishChanges")}</Button>
    </div>
    <Dialog open={publishOpen} onOpenChange={open => { if (!publishing) setPublishOpen(open); }}>
      <DialogContent variant="form">
        <DialogHeader><DialogTitle>{t("panelPublishTitle")}</DialogTitle><DialogDescription>{t(savedPanel.publication ? "panelPublishUpdateDescription" : "panelPublishFirstDescription")}</DialogDescription></DialogHeader>
        {!savedPanel.publication && <ChannelCombobox channels={channels.filter(channel => Number(channel.type) === 0 || Number(channel.type) === 5)} value={channelId ?? ""} onValueChange={setChannelId} placeholder={t("selectChannel")} />}
        <DialogFooter><Button variant="outline" disabled={publishing} onClick={() => setPublishOpen(false)}>{t("panelPublishLater")}</Button><Button disabled={publishing || (!savedPanel.publication && !channelId)} onClick={publish}>{publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("panelPublishNow")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <div className="min-w-0 rounded-3xl bg-card">
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <NativeMessageEditor key={revision} initialData={saved} variant="ticket-panel" channels={channels} roles={roles} serverId={guildId}
        ticketActions={previewButtons.map(button => ({ customId: button.custom_id, label: button.label }))} isSaving={isSaving || publishing} onDirtyChange={setEditorDirty} onSave={save} onCancel={() => setRevision(value => value + 1)} />
    </Suspense>
    </div>
  </div>;
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
  type PanelSettingsForm = {
    applicant_can_close: string;
    transcripts_enabled: string;
    open_category: string;
    sleep_category: string;
    status_change_log: string;
    ticket_button_click_log: string;
  };
  const createFormState = (): PanelSettingsForm => ({
    applicant_can_close: panel.applicant_can_close === true ? "enabled" : "disabled",
    transcripts_enabled: panel.transcripts_enabled === false ? "disabled" : "enabled",
    open_category: panel.open_category ?? "disabled",
    sleep_category: panel.sleep_category ?? "disabled",
    status_change_log: panel.status_change_log ?? panel.ticket_close_log ?? "disabled",
    ticket_button_click_log: panel.ticket_button_click_log ?? "disabled",
  });
  const skipNextAutosave = useRef(true);
  const hasPendingUserChange = useRef(false);
  const [form, setForm] = useState<PanelSettingsForm>(() => createFormState());
  const lastSavedFormRef = useRef<PanelSettingsForm>(createFormState());

  const toNullable = (v: string) => (v === "disabled" ? null : v);
  const set = (key: keyof PanelSettingsForm) => (val: string) => {
    hasPendingUserChange.current = true;
    setForm((p) => ({ ...p, [key]: val }));
  };

  const getSavedValueLabel = (key: keyof PanelSettingsForm, value: string): string => {
    if (key === "transcripts_enabled" || key === "applicant_can_close") return t(value === "enabled" ? "transcriptsOn" : "transcriptsOff");
    if (value === "disabled") {
      return tCommon("disabled");
    }

    if (key === "open_category" || key === "sleep_category") {
      return categories.find((channel) => channel.id === value)?.name ?? value;
    }

    const channel = textChannels.find((item) => item.id === value);
    if (!channel) return value;
    return channel.parent_name ? `${channel.parent_name} / #${channel.name}` : `#${channel.name}`;
  };

  const resetForm = useEffectEvent(() => {
    const initialForm = createFormState();
    setForm(initialForm);
    lastSavedFormRef.current = initialForm;
    skipNextAutosave.current = true;
    hasPendingUserChange.current = false;
  });
  const describeSavedValue = useEffectEvent(getSavedValueLabel);

  useEffect(() => {
    resetForm();
  }, [
    panel.name,
    panel.transcripts_enabled,
    panel.applicant_can_close,
    panel.open_category,
    panel.sleep_category,
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
      const settingFields: Array<keyof PanelSettingsForm> = [
        "applicant_can_close",
        "transcripts_enabled",
        "open_category",
        "sleep_category",
        "status_change_log",
        "ticket_button_click_log",
      ];
      const nextForm: PanelSettingsForm = { ...form };
      const changedFields = settingFields.filter((field) => lastSavedFormRef.current[field] !== nextForm[field]);

      if (changedFields.length === 0) {
        hasPendingUserChange.current = false;
        return;
      }

      try {
        const payload: UpdateTicketPanelRequest = {
          applicant_can_close: nextForm.applicant_can_close === "enabled",
          transcripts_enabled: nextForm.transcripts_enabled !== "disabled",
          open_category: toNullable(nextForm.open_category),
          sleep_category: toNullable(nextForm.sleep_category),
          status_change_log: toNullable(nextForm.status_change_log),
          ticket_button_click_log: toNullable(nextForm.ticket_button_click_log),
        };
        const res = await apiClient.tickets.updatePanel(guildId, panel.name, payload);
        if (res.error) throw new Error(res.error);
        apiCache.invalidate(getTicketsPanelsCacheKey(guildId));
        hasPendingUserChange.current = false;
        lastSavedFormRef.current = nextForm;

        const changedDetails = changedFields
          .map((field) => `${t(field)}: ${describeSavedValue(field, nextForm[field])}`)
          .join(" • ");

        toast({
          title: tCommon("success"),
          description: `${t("savedSuccess", { panel: panel.name })} • ${changedDetails}`,
        });
      } catch (err) {
        toast({ title: t("autoSaveErrorTitle"), description: err instanceof Error ? err.message : t("autoSaveErrorDescription"), variant: "destructive" });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form, guildId, panel.name, t, tCommon, toast, categories, textChannels]);

  const catChannels = categories.map((c) => ({ id: c.id, name: c.name }));
  const txtChannels = textChannels.map((c) => ({ id: c.id, name: c.name, parent_name: c.parent_name }));

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between gap-4">
        <div className="space-y-1"><Label htmlFor="applicant-close">{t("applicant_can_close")}</Label><p className="text-sm text-muted-foreground">{t("applicantCanCloseHint")}</p></div>
        <Switch id="applicant-close" checked={form.applicant_can_close === "enabled"} onCheckedChange={value => set("applicant_can_close")(value ? "enabled" : "disabled")} />
      </section>
      <section className="flex items-center justify-between gap-4">
        <div className="space-y-1"><Label htmlFor="panel-transcripts">{t("transcripts_enabled")}</Label><p className="text-sm text-muted-foreground">{t("transcriptsEnabledHint")}</p></div>
        <Switch id="panel-transcripts" checked={form.transcripts_enabled !== "disabled"} onCheckedChange={value => set("transcripts_enabled")(value ? "enabled" : "disabled")} />
      </section>
      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("categories")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["open_category", "sleep_category"] as const).map((key) => (
            <div key={key} className="min-w-0 space-y-2">
              <Label className="text-sm text-muted-foreground"><span aria-hidden="true" className="mr-2">{key === "open_category" ? "✅" : "💤"}</span>{t(key)}</Label>
              <ChannelCombobox
                className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5 hover:bg-muted"
                channels={catChannels}
                value={form[key]}
                onValueChange={set(key)}
                placeholder={t("selectCategory")}
                searchPlaceholder={tCommon("searchCategories")}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("logChannels")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["status_change_log", "ticket_button_click_log"] as const).map((key) => (
            <div key={key} className="min-w-0 space-y-2">
              <Label className="text-sm text-muted-foreground"><span aria-hidden="true" className="mr-2">{key === "status_change_log" ? "🔄" : key === "ticket_button_click_log" ? "🖱️" : "❌"}</span>{t(key)}</Label>
              <ChannelCombobox className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5 hover:bg-muted" channels={txtChannels} value={form[key]} onValueChange={set(key)} placeholder={t("selectChannel")} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const createDefaultButtonSettings = (): TicketButtonSettings => ({
  questions: [],
  mod_role: [],
  no_ping_mod_role: [],
  private_thread: false,
  th_min: 0,
  num_apply: 1,
  naming: "{ticket_count}-{user}",
  account_apply: false,
  player_info: false,
  apply_clans: [],
  roles_to_add: [],
  roles_to_remove: [],
  townhall_requirements: {},
  new_message: null,
  opening_message: null,
  application_questions: [],
});

const createSettingsForm = (settings: TicketButtonSettings): UpdateButtonSettingsRequest => ({
  questions: [...settings.questions],
  application_questions: settings.application_questions ? [...settings.application_questions] : settings.questions.filter(question => question.trim()).map((label, order) => ({ id: `legacy-${order}`, label, type: "text" as const, required: true, options: [], order })),
  opening_message: settings.opening_message ?? null,
  mod_role: [...settings.mod_role],
  no_ping_mod_role: [...settings.no_ping_mod_role],
  private_thread: settings.private_thread,
  th_min: settings.th_min,
  hero_min_percent: settings.hero_min_percent ?? 0,
  num_apply: 1,
  naming: settings.naming || "{ticket_count}-{user}",
  account_apply: settings.account_apply,
  player_info: settings.player_info,
  apply_clans: [],
  roles_to_add: [...(settings.roles_to_add ?? [])],
  roles_to_remove: [...(settings.roles_to_remove ?? [])],
  townhall_requirements: {},
  new_message: settings.new_message ?? null,
});

const createButtonSettingsFromForm = (form: UpdateButtonSettingsRequest): TicketButtonSettings => ({
  ...createDefaultButtonSettings(),
  questions: form.questions.filter((question) => question.trim().length > 0),
  mod_role: [...form.mod_role],
  no_ping_mod_role: [...form.no_ping_mod_role],
  private_thread: form.private_thread,
  th_min: form.th_min,
  hero_min_percent: form.hero_min_percent ?? 0,
  num_apply: 1,
  naming: form.naming,
  account_apply: form.account_apply,
  player_info: form.player_info,
  apply_clans: [],
  roles_to_add: [...form.roles_to_add],
  roles_to_remove: [...form.roles_to_remove],
  townhall_requirements: {},
  new_message: form.new_message ?? null,
  opening_message: form.opening_message ?? null,
  application_questions: form.application_questions ?? [],
});

export function ButtonCard({
  customId, label, style, emoji, settings, panelName, guildId, roles, embeds, onDeleted, onAppearanceUpdated,
}: {
  readonly customId: string;
  readonly label: string;
  readonly style: number;
  readonly emoji?: TicketButton["emoji"];
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
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const namingInputId = useId();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const editStyle = style;
  const [openingDirty, setOpeningDirty] = useState(false);
  const [settingsSection, setSettingsSection] = useState<"general" | "questions" | "embeds">("general");
  const [latestSettings, setLatestSettings] = useState<TicketButtonSettings>(settings);

  const handleDeleteButton = async () => {
    setIsDeleting(true);
    try {
      const res = await apiClient.tickets.deleteButton(guildId, panelName, customId);
      if (res.error) throw new Error(res.error);
      toast({ title: tCommon("success"), description: t("actionDeleted") });
      await queryClient.invalidateQueries({ queryKey: ticketPanelsQuery(guildId).queryKey, exact: true });
      onDeleted();
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  const [form, setForm] = useState<UpdateButtonSettingsRequest>(() => createSettingsForm(settings));

  useEffect(() => {
    if (settingsOpen) return;
    setLatestSettings(settings);
  }, [settings, settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    setSettingsSection("general");
    setEditLabel(label);
    setForm(createSettingsForm(latestSettings));
  }, [settingsOpen, label, style, latestSettings]);
  const setField = <K extends keyof UpdateButtonSettingsRequest>(key: K, val: UpdateButtonSettingsRequest[K]) =>
    setForm((p) => ({ ...p, [key]: val }));
  const addRole = (type: "mod_role" | "no_ping_mod_role" | "roles_to_add" | "roles_to_remove") => (id: string) =>
    setForm((p) => ({ ...p, [type]: [...p[type], id] }));
  const removeRole = (type: "mod_role" | "no_ping_mod_role" | "roles_to_add" | "roles_to_remove", id: string) =>
    setForm((p) => ({ ...p, [type]: p[type].filter((r) => r !== id) }));

  const buildButtonSettingsPayload = (sourceForm: UpdateButtonSettingsRequest): UpdateButtonSettingsRequest => {
    const normalizedNewMessage = sourceForm.new_message === LEGACY_DISABLED_EMBED_TOKEN
      ? null
      : (sourceForm.new_message ?? null);

    return {
      ...sourceForm,
      num_apply: 1, apply_clans: [], townhall_requirements: {},
      th_min: sourceForm.account_apply ? sourceForm.th_min : 0,
      hero_min_percent: sourceForm.account_apply ? sourceForm.hero_min_percent ?? 0 : 0,
      player_info: sourceForm.account_apply && sourceForm.player_info,
      new_message: normalizedNewMessage,
      questions: sourceForm.questions.filter(Boolean),
    };
  };

  const updateAppearanceIfNeeded = async (shouldUpdateAppearance: boolean): Promise<boolean> => {
    if (!shouldUpdateAppearance) return false;

    const appearanceRes = await apiClient.tickets.updateButtonAppearance(guildId, panelName, customId, {
      label: editLabel,
      style: editStyle,
      ...(emoji ? { emoji } : {}),
    });
    if (appearanceRes.error) throw new Error(appearanceRes.error);
    return true;
  };

  const saveButtonSettings = async (payloadForm: UpdateButtonSettingsRequest): Promise<void> => {
    const settingsRes = await apiClient.tickets.updateButtonSettings(guildId, panelName, customId, payloadForm);
    if (settingsRes.error) throw new Error(settingsRes.error);
  };

  const syncAppearanceIfNeeded = (shouldSyncAppearance: boolean) => {
    if (!shouldSyncAppearance) return;
    onAppearanceUpdated(editLabel, editStyle);
  };

  const rollbackAppearanceIfNeeded = async (didUpdateAppearance: boolean): Promise<void> => {
    if (!didUpdateAppearance) return;

    const rollbackRes = await apiClient.tickets.updateButtonAppearance(guildId, panelName, customId, {
      label,
      style,
      ...(emoji ? { emoji } : {}),
    });
    if (!rollbackRes.error) {
      onAppearanceUpdated(label, style);
    }
  };

  const handleSave = async (sourceForm = form, propagateError = false) => {
    if (!editLabel.trim() || invalidQuestions) throw new Error(t("invalidApplicationQuestions"));

    setIsSaving(true);
    const didChangeAppearance = editLabel !== label || editStyle !== style;
    const payloadForm = buildButtonSettingsPayload(sourceForm);
    let appearanceUpdated = false;

    try {
      appearanceUpdated = await updateAppearanceIfNeeded(didChangeAppearance);
      await saveButtonSettings(payloadForm);
      setLatestSettings(createButtonSettingsFromForm(payloadForm));
      syncAppearanceIfNeeded(didChangeAppearance);
      await queryClient.invalidateQueries({ queryKey: ticketPanelsQuery(guildId).queryKey, exact: true });
      toast({ title: tCommon("success"), description: t("actionSaved", { label: editLabel }) });
      setSettingsOpen(false);
    } catch (err) {
      await rollbackAppearanceIfNeeded(appearanceUpdated);
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
      if (propagateError) throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const invalidQuestions = (form.application_questions?.length ?? 0) > (form.account_apply ? 4 : 5)
    || (form.application_questions ?? []).some(question => !question.label.trim() || question.label.length > 45)
    || hasInvalidDropdownOptions((form.application_questions ?? []).map(question => ({ ...question, options: [...question.options] })));

  const roleOptions = roles.filter((r) => r.name !== "@everyone");
  const namingPlaceholders = [
    "{ticket_count}",
    "{user}",
    "{account_name}",
    "{account_th}",
    "{ticket_status}",
    "{emoji_status}",
  ] as const;

  const settingsEditor = (
      <section className="min-w-0 space-y-5" aria-label={t("editTicketAction")}>
          <Tabs
            value={settingsSection}
            onValueChange={(value) => setSettingsSection(value as "general" | "questions" | "embeds")}
            className="min-w-0 space-y-5"
          >
            <DashboardTabsList className="w-fit max-w-full">
              <DashboardTabTrigger value="general">
                {t("generalSettings")}
              </DashboardTabTrigger>
              <DashboardTabTrigger value="embeds">{t("messageSection")}</DashboardTabTrigger>
              <DashboardTabTrigger value="questions">{t("questionsSection")}</DashboardTabTrigger>
            </DashboardTabsList>

            <TabsContent value="general" className={cn(TICKET_WORKSPACE_TAB_CLASS, "space-y-4")}>
              <div className="max-w-xl space-y-2">
                <Label htmlFor={`action-name-${customId}`}>{t("actionName")}</Label>
                <Input id={`action-name-${customId}`} value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder={t("actionNamePlaceholder")} maxLength={80} className={TICKET_INPUT_CLASS} />
              </div>

              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {(["mod_role", "no_ping_mod_role"] as const).map((type) => (
                  <div key={type} className="min-w-0 space-y-2">
                    <Label className="text-sm font-medium">{t(type === "mod_role" ? "modRoles" : "noPingRoles")}</Label>
                    <p className="text-xs text-muted-foreground">{t(type === "mod_role" ? "modRolesHint" : "noPingRolesHint")}</p>
                    <div className={cn("flex flex-wrap gap-2", form[type].length === 0 && "hidden")}>
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
                    <RoleCombobox className={TICKET_INPUT_CLASS} roles={roleOptions} mode="add" excludeRoleIds={[...form[type]]} onAdd={addRole(type)} />
                  </div>
                ))}
              </div>

              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {(["roles_to_add", "roles_to_remove"] as const).map((type) => (
                  <div key={type} className="min-w-0 space-y-2">
                    <Label className="text-sm font-medium">{t(type === "roles_to_add" ? "rolesToAdd" : "rolesToRemove")}</Label>
                    <p className="text-xs text-muted-foreground">{t(type === "roles_to_add" ? "rolesToAddHint" : "rolesToRemoveHint")}</p>
                    <div className={cn("flex flex-wrap gap-2", form[type].length === 0 && "hidden")}>
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
                    <RoleCombobox className={TICKET_INPUT_CLASS} roles={roleOptions} mode="add" excludeRoleIds={[...form[type]]} onAdd={addRole(type)} />
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["private_thread", "privateThread", "privateThreadHint"],
                ] as const).map(([field, labelKey, hintKey]) => (
                  <div key={field} className="flex items-center justify-between gap-4 py-2">
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

              <div className="min-w-0 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={namingInputId} className="text-sm font-medium">{t("naming")}</Label>
                  <Input
                    id={namingInputId}
                    value={form.naming}
                    onChange={(e) => setField("naming", e.target.value)}
                    placeholder="{ticket_count}-{user}"
                    className={cn(TICKET_INPUT_CLASS, "font-mono text-sm")}
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
                        const input = document.getElementById(namingInputId) as HTMLInputElement | null;
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
              <section className="space-y-4 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1"><Label htmlFor={`require-account-${customId}`}>{t("accountApply")}</Label><p className="text-xs text-muted-foreground">{t("singleAccountHint")}</p></div>
                  <Switch id={`require-account-${customId}`} checked={form.account_apply} onCheckedChange={value => setField("account_apply", value)} />
                </div>
                {form.account_apply && <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor={`min-th-${customId}`}>{t("thMin")}</Label>
                    <Input id={`min-th-${customId}`} className={TICKET_INPUT_CLASS} type="number" min={0} max={18} value={form.th_min} onChange={event => setField("th_min", Number(event.target.value))} /></div>
                  <div className="space-y-2"><div className="flex items-center gap-2"><Label htmlFor={`hero-percent-${customId}`}>{t("heroMinPercent")}</Label><InfoPopover content={t("heroMinPercentHint")} /></div>
                    <div className="relative"><Input id={`hero-percent-${customId}`} className={cn(TICKET_INPUT_CLASS, "pr-10")} type="number" min={0} max={100} value={form.hero_min_percent ?? 0} onChange={event => setField("hero_min_percent", Number(event.target.value))} /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div></div>
                </div>}
              </section>
            </TabsContent>

            <TabsContent value="embeds" className={TICKET_WORKSPACE_TAB_CLASS} forceMount>
              <section className="min-w-0 space-y-3">
                <div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{t("openingMessage")}</h3><InfoPopover content={t("openingMessageHint")} /></div>
                <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
                  <NativeMessageEditor variant="ticket-panel" serverId={guildId} roles={roles}
                    initialData={form.opening_message ? form.opening_message as Record<string, unknown> : toEmbedDataRecord(embeds.find(embed => embed.name === form.new_message)?.data)}
                    isSaving={isSaving} onDirtyChange={setOpeningDirty} onCancel={() => setSettingsOpen(false)}
                    onSave={async payload => { const message = nativePanelMessage(payload); await handleSave({ ...form, new_message: null, opening_message: message }, true); }} />
                </Suspense>
              </section>
            </TabsContent>
            <TabsContent value="questions" className={TICKET_WORKSPACE_TAB_CLASS}>
              <SignupQuestionsEditor context="ticket" accountEnabled={form.account_apply}
                questions={(form.application_questions ?? []).map(question => ({ ...question, options: [...question.options] }))}
                onChange={questions => setField("application_questions", questions.map(question => ({ ...question, options: question.options ?? [] })))} />
            </TabsContent>
          </Tabs>
          {invalidQuestions && <p role="alert" className="text-sm text-destructive">{t("invalidApplicationQuestions")}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" className="min-w-0 flex-1 border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted sm:flex-none" onClick={() => setSettingsOpen(false)}>{tCommon("cancel")}</Button>
            <Button className="min-w-0 flex-1 sm:flex-none" onClick={() => void handleSave()} disabled={isSaving || !editLabel.trim() || openingDirty || invalidQuestions}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </div>
      </section>
  );
  return (
    <>
      {/* Confirm delete dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deleteTicketAction", { label })}</DialogTitle>
            <DialogDescription>{t("deleteTicketActionHint")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className={CANCEL_BUTTON_CLASS} onClick={() => setConfirmDeleteOpen(false)}>{tCommon("cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteButton} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <article className="min-w-0 rounded-3xl bg-card p-5 shadow-sm shadow-black/5">
        <div className="flex w-full flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-3">
          <button type="button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(open => !open)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left font-semibold focus-visible:ring-2 focus-visible:ring-ring"><ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", settingsOpen && "rotate-180")} />{label}</button>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {settings.account_apply && <Badge variant="secondary">{t("badge.accountApply")}</Badge>}
            {settings.private_thread && <Badge variant="secondary">{t("badge.privateThread")}</Badge>}
            {settings.th_min > 0 && <Badge variant="secondary">TH{settings.th_min}+</Badge>}
          </div>
        </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label={t("editTicketAction")} onClick={() => setSettingsOpen(open => !open)}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
              aria-label={tCommon("delete")} onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {settingsOpen && <div className="pt-5">{settingsEditor}</div>}
      </article>
    </>
  );
}

function createLocalMessageId(): string {
  return globalThis.crypto.randomUUID();
}

export function MessagesTab({ panel, guildId, inline = false }: { readonly panel: TicketPanel; readonly guildId: string; readonly inline?: boolean }) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  type EditableApproveMessage = ApproveMessage & { localId: string };
  const [messages, setMessages] = useState<EditableApproveMessage[]>(
    () => (panel.approve_messages ?? []).map((message, index) => ({ ...message, localId: `saved-${index}` })),
  );
  const [draftMessages, setDraftMessages] = useState<EditableApproveMessage[]>(
    () => (panel.approve_messages ?? []).map((message, index) => ({ ...message, localId: `saved-${index}` })),
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
    const nextMessages = (panel.approve_messages ?? []).map((message, index) => ({ ...message, localId: `saved-${index}` }));
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
    const localId = createLocalMessageId();
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
    if (isSaving) return;
    if (draftMessages.some((message) => !message.name.trim())) {
      toast({ title: tCommon("error"), description: t("messageNameRequired"), variant: "destructive" });
      return;
    }
    const payload = { messages: draftMessages.map(({ name, message }) => ({ name, message })) };
    setIsSaving(true);
    try {
      const res = await apiClient.tickets.updateApproveMessages(guildId, panel.name, payload);
      if (res.error !== undefined) throw new Error(res.error || tCommon("loadError"));
      const valid = draftMessages;
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
      <TicketEditorSurface inline={inline} busy={isSaving} open={editOpen} title={t("editMessagesTitle")} description={t("editMessagesDescription")} onOpenChange={(open) => {
        if (isSaving) return;
        setEditOpen(open);
        if (open) {
          setDraftMessages(cloneMessages(messages));
          setExpandedEditorIds(new Set());
          return;
        }
        setDraftMessages(cloneMessages(messages));
        setExpandedEditorIds(new Set());
      }}>
          <fieldset disabled={isSaving} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 pb-8 sm:px-7">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{t("messagesMaxHint")}</p>
              <Button size="sm" className={CLASHKING_RED_BUTTON_CLASS} onClick={addMessage} disabled={draftMessages.length >= 25}>
                <Plus className="mr-1.5 h-4 w-4" />{t("addMessage")}
              </Button>
            </div>

            <div>
              {draftMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/45 py-10 text-muted-foreground gap-2">
                  <MessageSquare className="h-8 w-8 opacity-40" />
                  <p className="text-sm">{t("noMessages")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {draftMessages.map((msg, i) => {
                    const isExpanded = expandedEditorIds.has(msg.localId);
                    return (
                      <div key={msg.localId} className="rounded-[20px] bg-card p-4 shadow-sm shadow-black/5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-expanded={isExpanded}
                            aria-controls={`message-editor-${msg.localId}`}
                            onClick={() => toggleExpanded(setExpandedEditorIds, msg.localId)}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            <span className="text-sm font-medium text-muted-foreground truncate">{msg.name.trim() || `${t("messageName")} ${i + 1}`}</span>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${tCommon("delete")}: ${i + 1}. ${msg.name.trim() || t("messageName")}`}
                            className="h-8 w-8 shrink-0 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeMessage(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${t("moveMessageUp")}: ${i + 1}. ${msg.name.trim() || t("messageName")}`}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => moveMessage(i, "up")}
                            disabled={i === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${t("moveMessageDown")}: ${i + 1}. ${msg.name.trim() || t("messageName")}`}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => moveMessage(i, "down")}
                            disabled={i === draftMessages.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>

                        {isExpanded ? (
                          <div id={`message-editor-${msg.localId}`} className="mt-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-muted-foreground">{t("messageName")}</p>
                              <p className="text-xs text-muted-foreground">({msg.name.length}/{MAX_APPROVE_MESSAGE_NAME_LENGTH})</p>
                            </div>
                            <Input
                              aria-label={`${t("messageName")}: ${i + 1}`}
                              className="h-9 bg-background border-border font-medium"
                              value={msg.name}
                              onChange={(e) => updateMessageField(i, "name", e.target.value)}
                              maxLength={MAX_APPROVE_MESSAGE_NAME_LENGTH}
                              placeholder={t("messageName")}
                            />
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-muted-foreground">{t("contentLabel")}</p>
                              <p className="text-xs text-muted-foreground">({msg.message.length}/{MAX_APPROVE_MESSAGE_CONTENT_LENGTH})</p>
                            </div>
                            <Textarea
                              aria-label={`${t("contentLabel")}: ${i + 1}`}
                              className="bg-background border-border"
                              value={msg.message}
                              onChange={(e) => updateMessageField(i, "message", e.target.value)}
                              maxLength={MAX_APPROVE_MESSAGE_CONTENT_LENGTH}
                              placeholder={t("messageContent")}
                              rows={4}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </fieldset>

          <DialogFooter className="shrink-0 flex-row gap-2 border-t border-border/50 bg-background px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-4 [&>*]:w-auto">
            <Button variant="secondary" disabled={isSaving} className="min-w-0 flex-1 border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted sm:flex-none" onClick={() => setEditOpen(false)}>{tCommon("cancel")}</Button>
            <Button className="min-w-0 flex-1 sm:flex-none" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
      </TicketEditorSurface>

      {(!inline || !editOpen) && <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("approveMessages")}</p>
            <p className="text-xs text-muted-foreground">{t("approveMessagesHint")}</p>
          </div>
          <Button
            size="sm"
            onClick={() => setEditOpen(true)}
            className={cn("w-full shrink-0 sm:w-auto", CLASHKING_RED_BUTTON_CLASS)}
          >
            {t("editMessagesButton")}
          </Button>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/45 py-10 text-muted-foreground gap-2">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-sm">{t("noMessages")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, i) => {
              const isExpanded = expandedPreviewIds.has(msg.localId);
              return (
                <div key={msg.localId} className="rounded-[20px] bg-card p-4 shadow-sm shadow-black/5">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-expanded={isExpanded}
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
      </div>}
    </>
  );
}

function PanelCard({
  panel, categories, textChannels, roles, guildId, availableEmbeds, embeds, onDeleted, detail = false,
}: {
  readonly panel: TicketPanel;
  readonly categories: DiscordChannel[];
  readonly textChannels: DiscordChannel[];
  readonly roles: DiscordRole[];
  readonly guildId: string;
  readonly availableEmbeds: string[];
  readonly embeds: ServerEmbed[];
  readonly onDeleted: () => void;
  readonly detail?: boolean;
}) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [components, setComponents] = useState(panel.components);
  useEffect(() => setComponents(panel.components), [panel.components]);
  const [confirmDeletePanelOpen, setConfirmDeletePanelOpen] = useState(false);
  const [isDeletingPanel, setIsDeletingPanel] = useState(false);
  const [addButtonOpen, setAddButtonOpen] = useState(false);
  const [newButtonLabel, setNewButtonLabel] = useState("");
  const [isAddingButton, setIsAddingButton] = useState(false);
  const params = useSearchParams();
  const [activeConfigTab, setActiveConfigTab] = useState(params.get("tab") === "ticket-panel" ? "ticket-panel" : "activity");
  const configuredCategoryCount = [panel.open_category, panel.sleep_category].filter(Boolean).length;
  const configuredLogCount = [panel.status_change_log ?? panel.ticket_close_log, panel.ticket_button_click_log].filter(Boolean).length;

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
        style: 2,
        emoji: { name: "📩" },
      });
      if (res.error) throw new Error(res.error);
      toast({ title: tCommon("success"), description: t("actionAdded") });
      // Reload panel data by fetching fresh panels
      apiCache.invalidate(getTicketsPanelsCacheKey(guildId));
      const panelsRes = await apiCache.get(getTicketsPanelsCacheKey(guildId), () => apiClient.tickets.getPanels(guildId));
      const fresh = panelsRes.data?.items.find(p => p.name === panel.name);
      if (fresh) setComponents(fresh.components);
      setAddButtonOpen(false);
      setNewButtonLabel("");
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
            <Button className={CANCEL_BUTTON_CLASS} onClick={() => setConfirmDeletePanelOpen(false)}>{tCommon("cancel")}</Button>
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
            <DialogTitle>{t("addTicketAction")}</DialogTitle>
            <DialogDescription>{t("addTicketActionHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-ticket-action">{t("actionName")}</Label>
              <Input id="new-ticket-action" className={TICKET_INPUT_CLASS} value={newButtonLabel} onChange={(e) => setNewButtonLabel(e.target.value)} placeholder={t("actionNamePlaceholder")} maxLength={80} />
            </div>
          </div>
          <DialogFooter>
            <Button className={CANCEL_BUTTON_CLASS} onClick={() => setAddButtonOpen(false)}>{tCommon("cancel")}</Button>
            <Button className={CLASHKING_RED_BUTTON_CLASS} onClick={handleAddButton} disabled={isAddingButton || !newButtonLabel.trim()}>
              {isAddingButton && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("addTicketAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TicketEditorSurface inline open={detail} onOpenChange={() => {}} title={panel.name} description="" heading={<div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-xl"><Link href={dashboardHref("tickets", guildId)} aria-label={t("backToPanels")}><ArrowLeft className="h-5 w-5" /></Link></Button>
        <h1 className="min-w-0 break-words text-2xl font-semibold">{panel.name}</h1>
        <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive" onClick={() => setConfirmDeletePanelOpen(true)}><Trash2 className="h-4 w-4" />{tCommon("delete")}</Button>
      </div>}>
            <Tabs value={activeConfigTab} onValueChange={setActiveConfigTab} className="min-w-0 space-y-5">
              <DashboardTabsList className="w-fit max-w-full">
                <DashboardTabTrigger value="activity" artwork={<Ticket className="text-blue-500" />}>{t("ticketHistory")}</DashboardTabTrigger>
                <DashboardTabTrigger
                  value="ticket-panel"
                  artwork={<Ticket className="text-blue-500" />}
                >
                  {t("tabChannels")}
                </DashboardTabTrigger>
                <DashboardTabTrigger
                  value="buttons"
                  artwork={<Plus className="text-green-500" />}
                  count={components.length}
                >
                  {t("tabButtons")}
                </DashboardTabTrigger>
                <DashboardTabTrigger
                  value="settings"
                  artwork={<Settings className="text-purple-500" />}
                >
                  {t("tabSettings")}
                </DashboardTabTrigger>
              </DashboardTabsList>
              <TabsContent value="activity" className={TICKET_WORKSPACE_TAB_CLASS} forceMount>
                <TicketActivity panel={panel} guildId={guildId} />
              </TabsContent>
              <TabsContent value="ticket-panel" className={TICKET_WORKSPACE_TAB_CLASS} forceMount>
                <TicketPanelTab
                  panel={panel}
                  guildId={guildId}
                  embeds={embeds}
                  channels={textChannels}
                  roles={roles}
                  previewButtons={[...components]}
                  onOpenButtonsTab={() => setActiveConfigTab("buttons")}
                />
              </TabsContent>
              <TabsContent value="buttons" className={TICKET_WORKSPACE_TAB_CLASS} forceMount>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{components.length}/5 {t("tabButtons")}</p>
                    <Button
                      size="sm"
                      onClick={() => setAddButtonOpen(true)}
                      disabled={components.length >= 5}
                      className={CLASHKING_RED_BUTTON_CLASS}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />{t("addTicketAction")}
                    </Button>
                  </div>
                  {components.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                      <Ticket className="h-8 w-8 opacity-40" />
                      <p className="text-sm">{t("noTicketActions")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {components.map((btn) => (
                        <ButtonCard key={btn.custom_id} customId={btn.custom_id} label={btn.label} style={btn.style} emoji={btn.emoji}
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
              <TabsContent value="settings" className={TICKET_WORKSPACE_TAB_CLASS} forceMount>
                <PanelSettingsTab panel={panel} categories={categories} textChannels={textChannels} guildId={guildId} />
              </TabsContent>
            </Tabs>
      </TicketEditorSurface>

      {!detail && <article className="flex flex-col gap-3 rounded-3xl bg-card px-5 py-4 shadow-sm shadow-black/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="truncate text-base font-semibold">{panel.name}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{components.length} {t("tabButtons")}</span>
            <span>{t("categoryCoverage", { configured: configuredCategoryCount, total: 2 })}</span>
            <span>{t("logCoverage", { configured: configuredLogCount, total: 2 })}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link href={dashboardHref("tickets/detail", guildId, new URLSearchParams({ panel: panel.name, tab: "activity" }))}><Eye className="h-4 w-4" />{tCommon("view")}</Link></Button>
          <Button variant="secondary" size="sm" asChild><Link href={dashboardHref("tickets/detail", guildId, new URLSearchParams({ panel: panel.name, tab: "ticket-panel" }))}><Settings className="h-4 w-4" />{t("configurePanel")}</Link></Button>
        </div>
      </article>}
    </>
  );
}

function ConfigTab({ guildId, panelName }: { readonly guildId: string; readonly panelName?: string }) {
  const t = useTranslations("TicketsSettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const panelQuery = useQuery({ ...ticketPanelsQuery(guildId), enabled: Boolean(guildId), refetchInterval: panelName ? 30_000 : false });

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
  const loadedGuildId = useRef("");
  const metadataLoaded = useRef(false);
  useEffect(() => {
    if (!panelQuery.data?.data) return;
    setPanels([...panelQuery.data.data.items]);
    setAvailableEmbeds([...panelQuery.data.data.available_embeds]);
  }, [panelQuery.data]);

  const loadDiscordMetadata = useCallback(async () => {
    if (metadataLoaded.current) return;
    metadataLoaded.current = true;
    const [channelsResult, rolesResult] = await Promise.allSettled([
      queryClient.fetchQuery(dashboardQueryOptions.channels(guildId)),
      queryClient.fetchQuery(dashboardQueryOptions.roles(guildId)),
    ]);
    if (channelsResult.status === "fulfilled") {
      const all = normalizeTicketChannels(channelsResult.value);
      setCategories(all.filter(isCategoryChannel));
      setTextChannels(all.filter(isTextLikeChannel));
    }
    if (rolesResult.status === "fulfilled") setRoles([...(rolesResult.value.roles ?? [])]);
    if (channelsResult.status === "rejected" && rolesResult.status === "rejected") metadataLoaded.current = false;
  }, [guildId, queryClient]);

  useEffect(() => { if (panelName && guildId) void loadDiscordMetadata(); }, [guildId, panelName, loadDiscordMetadata]);

  useEffect(() => {
    if (!guildId || loadedGuildId.current === guildId) return;
    loadedGuildId.current = guildId;

    const load = async () => {
      setIsLoading(true);
      try {
        const [panelsRes, embedsRes] = await Promise.all([
          queryClient.fetchQuery(ticketPanelsQuery(guildId)),
          queryClient.fetchQuery(ticketEmbedsQuery(guildId)),
        ]);
        if (panelsRes.error) throw new Error(panelsRes.error);
        if (embedsRes.error || !embedsRes.data) throw new Error(embedsRes.error || "Failed to load server embeds");

        setPanels([...(panelsRes.data?.items ?? [])]);
        setAvailableEmbeds([...(panelsRes.data?.available_embeds ?? [])]);
        setEmbeds(normalizeTicketEmbeds(embedsRes.data));
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
  }, [guildId, queryClient]);

  const handleCreatePanel = async () => {
    if (!newPanelName.trim()) return;
    setIsCreatingPanel(true);
    try {
      const res = await apiClient.tickets.createPanel(guildId, { name: newPanelName.trim() });
      if (res.error) throw new Error(res.error);
      toast({ title: tCommon("success"), description: t("panelCreated", { name: newPanelName.trim() }) });
      // Fetch fresh panel list
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("ticket-panels", guildId), exact: true });
      const panelsRes = await queryClient.fetchQuery(ticketPanelsQuery(guildId));
      setPanels([...(panelsRes.data?.items ?? [])]);
      setAvailableEmbeds([...(panelsRes.data?.available_embeds ?? [])]);
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
        {["a", "b"].map(id => <Skeleton key={id} className="h-24 w-full rounded-3xl" />)}
      </div>
    );
  }

  if (panelName) {
    const panel = panels.find(item => item.name === panelName);
    return panel ? <PanelCard panel={panel} categories={categories} textChannels={textChannels} roles={roles} guildId={guildId}
      availableEmbeds={availableEmbeds} embeds={embeds} detail
      onDeleted={() => setPanels(previous => previous.filter(item => item.name !== panel.name))} />
      : <p className="rounded-3xl bg-card p-8 text-muted-foreground">{t("panelNotFound")}</p>;
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
            <Button className={CANCEL_BUTTON_CLASS} onClick={() => setCreatePanelOpen(false)}>{tCommon("cancel")}</Button>
            <Button className={CLASHKING_RED_BUTTON_CLASS} onClick={handleCreatePanel} disabled={isCreatingPanel || !newPanelName.trim()}>
              {isCreatingPanel && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setCreatePanelOpen(true)}
            className={cn("w-full sm:w-auto", CLASHKING_RED_BUTTON_CLASS)}
          >
            <Plus className="mr-1.5 h-4 w-4" />{t("createPanel")}
          </Button>
        </div>

        {panels.length === 0 ? (
          <div className="rounded-[24px] bg-muted/35 px-5 py-10 text-center shadow-sm shadow-black/5">
            <p className="font-medium text-foreground">{t("noPanels")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noPanelsHint")}</p>
          </div>
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
  const guildId = useGuildId();
  const t = useTranslations("TicketsSettingsPage");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <Tabs defaultValue="panels" className="space-y-4">
          <DashboardTabsList className="w-fit max-w-full"><DashboardTabTrigger value="panels">{t("ticketPanels")}</DashboardTabTrigger><DashboardTabTrigger value="messages">{t("sharedMessages")}</DashboardTabTrigger></DashboardTabsList>
          <TabsContent value="panels" className="m-0"><ConfigTab guildId={guildId} /></TabsContent>
          <TabsContent value="messages" className="m-0"><TicketMessageLibrary guildId={guildId} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export function TicketDetailPage() {
  const guildId = useGuildId();
  const params = useSearchParams();
  return <div className="min-h-screen bg-background p-4 md:p-6">
    <div className="mx-auto max-w-7xl space-y-6">
      <ConfigTab guildId={guildId} panelName={params.get("panel") ?? ""} />
    </div>
  </div>;
}
