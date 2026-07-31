"use client";

import { useGuildId } from "@/lib/dashboard-route";
import { type Dispatch, type ReactNode, type SetStateAction, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
import { useToast } from "@/components/ui/use-toast";
import { DiscordEmbedPreview, extractEmbeds, extractMessageContent, type DiscordEmbed } from "@/components/dashboard/discord-embed-preview";
import { normalizeAllChannelsPayload } from "@/lib/dashboard-cache";
import { cn } from "@/lib/utils";
import type {
  ApproveMessage,
  ServerEmbed,
  THRequirement,
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
const getTicketsEmbedsCacheKey = (guildId: string) => `ticket-embeds-${guildId}`;
const getServerChannelsCacheKey = (guildId: string) => `server-channels-${guildId}`;
const getServerRolesCacheKey = (guildId: string) => `server-roles-${guildId}`;
const MAX_APPROVE_MESSAGE_NAME_LENGTH = 100;
const MAX_APPROVE_MESSAGE_CONTENT_LENGTH = 2000;
const DEFAULT_TOWNHALL_REQUIREMENT_FIELDS = ["BK", "AQ", "GW", "RC", "WARST"];


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
  const normalized = normalizeAllChannelsPayload(payload) as DiscordChannel[];
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
const DEFAULT_PREVIEW_ACCENT = "#3ba55d";
const CANCEL_BUTTON_CLASS = "!bg-black !text-white hover:!bg-zinc-900";
const CLASHKING_RED_BUTTON_CLASS = "bg-red-600 hover:bg-red-700 text-white";
const DEFAULT_TICKET_MESSAGE_SELECT_VALUE = "__ck_default_ticket_message__";
const LEGACY_DISABLED_EMBED_TOKEN = "disabled";

const normalizeTownhallRequirementFields = (fields: readonly string[] | null | undefined): string[] => {
  const normalized = (fields ?? []).filter((field): field is string => typeof field === "string" && field.trim().length > 0);
  return normalized.length > 0 ? normalized : [...DEFAULT_TOWNHALL_REQUIREMENT_FIELDS];
};

const createTownhallRequirementRow = (th: string, fields: readonly string[]): THRequirement => {
  const row: THRequirement = { TH: Number(th) };
  for (const field of fields) {
    row[field] = 0;
  }
  return row;
};

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
  const [isSavingEmbed, setIsSavingEmbed] = useState(false);
  const [embedName, setEmbedName] = useState(panel.embed_name ?? "disabled");
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [draftEmbedName, setDraftEmbedName] = useState(panel.embed_name ?? "disabled");
  const embedOptions = Array.from(new Set([...(panel.embed_name ? [panel.embed_name] : []), ...availableEmbeds])).sort((a, b) => a.localeCompare(b));
  const selectedEmbed = embeds.find((embed) => embed.name === (embedName === "disabled" ? null : embedName));
  const selectedEmbedData = toEmbedDataRecord(selectedEmbed?.data);
  const embedPreviews = selectedEmbedData ? extractEmbeds(selectedEmbedData) : [];
  const draftSelectedEmbed = embeds.find((embed) => embed.name === (draftEmbedName === "disabled" ? null : draftEmbedName));
  const draftSelectedEmbedData = toEmbedDataRecord(draftSelectedEmbed?.data);
  const draftEmbedPreviews = draftSelectedEmbedData ? extractEmbeds(draftSelectedEmbedData) : [];
  const hasDraftChanges = draftEmbedName !== embedName;
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

  const renderEmbedPreviewList = (previewEmbeds: DiscordEmbed[], keyPrefix: string): ReactNode => {
    if (previewEmbeds.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
          {t("panelEmbedPreviewEmpty")}
        </div>
      );
    }

    const duplicateCounts = new Map<string, number>();
    return (
      <div className="space-y-2">
        {previewEmbeds.map((embed) => {
          const baseKey = getEmbedPreviewKey(embed);
          const occurrence = duplicateCounts.get(baseKey) ?? 0;
          duplicateCounts.set(baseKey, occurrence + 1);
          return (
            <DiscordEmbedPreview
              key={`${keyPrefix}-${baseKey}-${occurrence}`}
              embed={embed}
            />
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    const currentEmbedName = panel.embed_name ?? "disabled";
    setEmbedName(currentEmbedName);
    setDraftEmbedName(currentEmbedName);
    setEmbedDialogOpen(false);
  }, [panel.name, panel.embed_name]);

  const openEmbedDialog = () => {
    setDraftEmbedName(embedName);
    setEmbedDialogOpen(true);
  };

  const handleSaveEmbed = async () => {
    if (!hasDraftChanges) {
      setEmbedDialogOpen(false);
      return;
    }

    setIsSavingEmbed(true);
    try {
      const payload: UpdateTicketPanelRequest = {
        embed_name: draftEmbedName === "disabled" ? null : draftEmbedName,
      };
      const res = await apiClient.tickets.updatePanel(guildId, panel.name, payload);
      if (res.error) throw new Error(res.error);
      apiCache.invalidate(getTicketsPanelsCacheKey(guildId));
      setEmbedName(draftEmbedName);
      setEmbedDialogOpen(false);
      toast({ title: tCommon("success"), description: t("savedSuccess", { panel: panel.name }) });
    } catch (err) {
      toast({ title: t("autoSaveErrorTitle"), description: err instanceof Error ? err.message : t("autoSaveErrorDescription"), variant: "destructive" });
    } finally {
      setIsSavingEmbed(false);
    }
  };

  return (
    <div className="space-y-6">
      <Dialog
        open={embedDialogOpen}
        onOpenChange={(open) => {
          setEmbedDialogOpen(open);
          if (open) {
            setDraftEmbedName(embedName);
          }
        }}
      >
        <DialogContent className="bg-card border-border sm:max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("panelEmbed")}</DialogTitle>
            <DialogDescription>{t("panelEmbedHint")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-sm">{t("panelEmbed")}</Label>
              <Select value={draftEmbedName} onValueChange={setDraftEmbedName}>
                <SelectTrigger
                  className={cn(
                    draftEmbedName !== "disabled" && "!border-red-600 focus-visible:!ring-red-600/30",
                  )}
                >
                  <SelectValue placeholder={t("selectEmbed")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">{t("defaultEmbed")}</SelectItem>
                  {embedOptions.map((embed) => (
                    <SelectItem key={embed} value={embed}>{embed}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("panelEmbedHint")}</p>
            </div>

            <div className="space-y-2 lg:max-h-[58vh] lg:overflow-y-auto lg:pr-1">
              <Label className="text-sm">{t("panelEmbedPreview")}</Label>
              {renderEmbedPreviewList(draftEmbedPreviews, draftSelectedEmbed?.name ?? "ticket-panel-embed-draft")}
              {previewButtons.length > 0 ? (
                <div className="pt-2 flex flex-wrap gap-2">
                  {previewButtons.map((button) => (
                    <span
                      key={`draft-${button.custom_id}`}
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

          <DialogFooter>
            <Button className={CANCEL_BUTTON_CLASS} onClick={() => setEmbedDialogOpen(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleSaveEmbed} disabled={isSavingEmbed || !hasDraftChanges}>
              {isSavingEmbed && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1.5">
          <div className="space-y-1.5">
            <Label className="text-sm">{t("panelEmbed")}</Label>
            <p className="text-xs text-muted-foreground">{t("panelEmbedHint")}</p>
          </div>

          <div className="grid gap-2 pt-1 sm:grid-cols-4 sm:items-stretch">
            <div
              className="sm:col-span-3 h-9 rounded-md border border-border/60 bg-muted/20 px-3 flex items-center"
            >
              <p className="truncate text-sm font-medium">
                {embedName === "disabled" ? t("defaultEmbed") : embedName}
              </p>
            </div>
            <Button
              onClick={openEmbedDialog}
              className={cn("sm:col-span-1 h-9", CLASHKING_RED_BUTTON_CLASS)}
            >
              {tCommon("edit")}
            </Button>
          </div>

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
                  onClick={() => {
                    setEmbedDialogOpen(false);
                    onOpenButtonsTab();
                  }}
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
          {renderEmbedPreviewList(embedPreviews, selectedEmbed?.name ?? "ticket-panel-embed")}

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
  type PanelSettingsForm = {
    open_category: string;
    sleep_category: string;
    closed_category: string;
    status_change_log: string;
    ticket_button_click_log: string;
    ticket_close_log: string;
  };
  const createFormState = (): PanelSettingsForm => ({
    open_category: panel.open_category ?? "disabled",
    sleep_category: panel.sleep_category ?? "disabled",
    closed_category: panel.closed_category ?? "disabled",
    status_change_log: panel.status_change_log ?? "disabled",
    ticket_button_click_log: panel.ticket_button_click_log ?? "disabled",
    ticket_close_log: panel.ticket_close_log ?? "disabled",
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
    if (value === "disabled") {
      return tCommon("disabled");
    }

    if (key === "open_category" || key === "sleep_category" || key === "closed_category") {
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
      const settingFields: Array<keyof PanelSettingsForm> = [
        "open_category",
        "sleep_category",
        "closed_category",
        "status_change_log",
        "ticket_button_click_log",
        "ticket_close_log",
      ];
      const nextForm: PanelSettingsForm = { ...form };
      const changedFields = settingFields.filter((field) => lastSavedFormRef.current[field] !== nextForm[field]);

      if (changedFields.length === 0) {
        hasPendingUserChange.current = false;
        return;
      }

      try {
        const payload: UpdateTicketPanelRequest = {
          open_category: toNullable(nextForm.open_category),
          sleep_category: toNullable(nextForm.sleep_category),
          closed_category: toNullable(nextForm.closed_category),
          status_change_log: toNullable(nextForm.status_change_log),
          ticket_button_click_log: toNullable(nextForm.ticket_button_click_log),
          ticket_close_log: toNullable(nextForm.ticket_close_log),
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
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{t("categories")}</p>
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
        <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{t("logChannels")}</p>
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
  new_message: settings.new_message ?? null,
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
  new_message: form.new_message ?? null,
});

function ButtonCard({
  customId, label, style, settings, panelName, guildId, roles, availableEmbeds, embeds, townhallRequirementFields, onDeleted, onAppearanceUpdated,
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
  readonly townhallRequirementFields: string[];
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
  const hasDisabledEmbedOption = availableEmbeds.includes(LEGACY_DISABLED_EMBED_TOKEN)
    || settings.new_message === LEGACY_DISABLED_EMBED_TOKEN;
  const hasLegacyDisabledToken = form.new_message === LEGACY_DISABLED_EMBED_TOKEN && !hasDisabledEmbedOption;
  const effectiveButtonEmbedName = hasLegacyDisabledToken ? null : (form.new_message ?? null);
  const embedOptions = Array.from(new Set([
    ...(settings.new_message && (settings.new_message !== LEGACY_DISABLED_EMBED_TOKEN || hasDisabledEmbedOption) ? [settings.new_message] : []),
    ...availableEmbeds,
  ])).sort((a, b) => a.localeCompare(b));
  const selectedButtonEmbed = embeds.find((embed) => embed.name === (effectiveButtonEmbedName ?? ""));
  const selectedButtonEmbedData = toEmbedDataRecord(selectedButtonEmbed?.data);
  const buttonEmbedPreviews = selectedButtonEmbedData ? extractEmbeds(selectedButtonEmbedData) : [];
  const buttonMessageContentPreview = selectedButtonEmbedData ? extractMessageContent(selectedButtonEmbedData) : null;
  const isUsingDefaultTicketMessage = effectiveButtonEmbedName === null;
  const effectiveTownhallRequirementFields = useMemo(
    () => normalizeTownhallRequirementFields(townhallRequirementFields),
    [townhallRequirementFields],
  );

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
        [th]: createTownhallRequirementRow(th, effectiveTownhallRequirementFields),
      },
    }));
  };
  const removeTHRow = (th: string) =>
    setForm((p) => {
      const next = { ...p.townhall_requirements };
      delete next[th];
      return { ...p, townhall_requirements: next };
    });
  const setTHField = (th: string, field: string, val: number) =>
    setForm((p) => ({
      ...p,
      townhall_requirements: {
        ...p.townhall_requirements,
        [th]: { ...p.townhall_requirements[th], [field]: val },
      },
    }));

  const buildButtonSettingsPayload = (sourceForm: UpdateButtonSettingsRequest): UpdateButtonSettingsRequest => {
    const normalizedNewMessage = sourceForm.new_message === LEGACY_DISABLED_EMBED_TOKEN && !hasDisabledEmbedOption
      ? null
      : (sourceForm.new_message ?? null);

    return {
      ...sourceForm,
      new_message: normalizedNewMessage,
      questions: sourceForm.questions.filter(Boolean),
    };
  };

  const updateAppearanceIfNeeded = async (shouldUpdateAppearance: boolean): Promise<boolean> => {
    if (!shouldUpdateAppearance) return false;

    const appearanceRes = await apiClient.tickets.updateButtonAppearance(guildId, panelName, customId, {
      label: editLabel,
      style: editStyle,
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
    });
    if (!rollbackRes.error) {
      onAppearanceUpdated(label, style);
    }
  };

  const handleSave = async () => {
    if (!editLabel.trim()) return;

    setIsSaving(true);
    const didChangeAppearance = editLabel !== label || editStyle !== style;
    const payloadForm = buildButtonSettingsPayload(form);
    let appearanceUpdated = false;

    try {
      appearanceUpdated = await updateAppearanceIfNeeded(didChangeAppearance);
      await saveButtonSettings(payloadForm);
      setLatestSettings(createButtonSettingsFromForm(payloadForm));
      syncAppearanceIfNeeded(didChangeAppearance);
      toast({ title: tCommon("success"), description: t("buttonSaved", { label: editLabel }) });
      setSettingsOpen(false);
    } catch (err) {
      await rollbackAppearanceIfNeeded(appearanceUpdated);
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
            <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-lg border border-border bg-muted p-1 sm:grid-cols-3 sm:gap-0">
              <TabsTrigger value="general" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
                General
              </TabsTrigger>
              <TabsTrigger value="requirements" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
                Requirements
              </TabsTrigger>
              <TabsTrigger value="embeds" className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
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
                          {effectiveTownhallRequirementFields.map((h) => (
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
                              {effectiveTownhallRequirementFields.map((hero) => (
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
                        value={effectiveButtonEmbedName ?? DEFAULT_TICKET_MESSAGE_SELECT_VALUE}
                        onValueChange={(value) => setField("new_message", value === DEFAULT_TICKET_MESSAGE_SELECT_VALUE ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectEmbed")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DEFAULT_TICKET_MESSAGE_SELECT_VALUE}>{t("noCustomMessage")}</SelectItem>
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
                      if (isUsingDefaultTicketMessage) {
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
                      if (buttonMessageContentPreview) {
                        return (
                          <div className="rounded-md border-l-4 bg-[#2b2d31]/70 p-3 text-sm leading-relaxed text-slate-100 whitespace-pre-line" style={{ borderLeftColor: DEFAULT_PREVIEW_ACCENT }}>
                            {buttonMessageContentPreview}
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
            <Button className={CANCEL_BUTTON_CLASS} onClick={() => setSettingsOpen(false)}>{tCommon("cancel")}</Button>
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
            <Button className={CANCEL_BUTTON_CLASS} onClick={() => setConfirmDeleteOpen(false)}>{tCommon("cancel")}</Button>
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
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function createLocalMessageId(): string {
  return globalThis.crypto.randomUUID();
}

function MessagesTab({ panel, guildId }: { readonly panel: TicketPanel; readonly guildId: string }) {
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
    const valid = draftMessages.filter((m) => m.name.trim());
    if (valid.length !== draftMessages.length) {
      toast({ title: tCommon("error"), description: t("messageNameRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payloadMessages = valid.map(({ name, message }) => ({ name, message }));
      const res = await apiClient.tickets.updateApproveMessages(guildId, panel.name, { messages: payloadMessages });
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
              <Button size="sm" className={CLASHKING_RED_BUTTON_CLASS} onClick={addMessage} disabled={draftMessages.length >= 25}>
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
                            className="h-8 w-8 shrink-0 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
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
            <Button className={CANCEL_BUTTON_CLASS} onClick={() => setEditOpen(false)}>{tCommon("cancel")}</Button>
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
          <Button
            size="sm"
            onClick={() => setEditOpen(true)}
            className={CLASHKING_RED_BUTTON_CLASS}
          >
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
  panel, categories, textChannels, roles, guildId, availableEmbeds, embeds, townhallRequirementFields, onDeleted,
}: {
  readonly panel: TicketPanel;
  readonly categories: DiscordChannel[];
  readonly textChannels: DiscordChannel[];
  readonly roles: DiscordRole[];
  readonly guildId: string;
  readonly availableEmbeds: string[];
  readonly embeds: ServerEmbed[];
  readonly townhallRequirementFields: string[];
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
            <Button className={CANCEL_BUTTON_CLASS} onClick={() => setAddButtonOpen(false)}>{tCommon("cancel")}</Button>
            <Button className={CLASHKING_RED_BUTTON_CLASS} onClick={handleAddButton} disabled={isAddingButton || !newButtonLabel.trim()}>
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
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
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
              <TabsList className="mb-4 grid h-auto w-full grid-cols-1 gap-1 rounded-lg border border-border bg-muted p-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-0">
                <TabsTrigger
                  value="ticket-panel"
                  className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
                >
                  <Ticket className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                  <span className="truncate">{t("tabChannels")}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="buttons"
                  className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  <span className="truncate">{t("tabButtons")}</span>
                  <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-green-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                    {components.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="messages"
                  className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="truncate">{t("tabMessages")}</span>
                  <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-amber-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm">
                    {panel.approve_messages.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="h-9 justify-center gap-2 px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
                >
                  <Settings className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                  <span className="truncate">{t("tabSettings")}</span>
                </TabsTrigger>
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
                    <Button
                      size="sm"
                      onClick={() => setAddButtonOpen(true)}
                      disabled={components.length >= 5}
                      className={CLASHKING_RED_BUTTON_CLASS}
                    >
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
                          townhallRequirementFields={townhallRequirementFields}
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
  const [townhallRequirementFields, setTownhallRequirementFields] = useState<string[]>(DEFAULT_TOWNHALL_REQUIREMENT_FIELDS);
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
        setTownhallRequirementFields(normalizeTownhallRequirementFields(panelsRes.data?.townhall_requirement_fields));
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
      setTownhallRequirementFields(normalizeTownhallRequirementFields(panelsRes.data?.townhall_requirement_fields));
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
            <Button className={CANCEL_BUTTON_CLASS} onClick={() => setCreatePanelOpen(false)}>{tCommon("cancel")}</Button>
            <Button className={CLASHKING_RED_BUTTON_CLASS} onClick={handleCreatePanel} disabled={isCreatingPanel || !newPanelName.trim()}>
              {isCreatingPanel && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setCreatePanelOpen(true)}
            className={CLASHKING_RED_BUTTON_CLASS}
          >
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
              townhallRequirementFields={townhallRequirementFields}
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
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
            <Ticket className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>

        <ConfigTab guildId={guildId} />
      </div>
    </div>
  );
}
