"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, LayoutTemplate, Save } from "lucide-react";

import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import { dashboardCacheKeys, normalizeChannelsPayload } from "@/lib/dashboard-cache";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { DiscordMessagePreview, extractEmbeds, extractMessageContent, extractMessageProfile } from "@/components/dashboard/discord-embed-preview";
import { cn } from "@/lib/utils";
import { BUTTON_TYPES, BUTTON_COLORS } from "@/lib/api/types/panels";
import type { ButtonColor, ServerPanel, UpdatePanelRequest } from "@/lib/api/types/panels";
import type { ServerEmbed } from "@/lib/api/types/tickets";

// ─── Discord button colour styles ─────────────────────────────────────────────

const DISCORD_BUTTON_STYLE: Record<string, string> = {
  Blue:  "bg-[#5865f2] hover:bg-[#4752c4] text-white",
  Green: "bg-[#57f287] hover:bg-[#45c46c] text-black",
  Grey:  "bg-[#4e5058] hover:bg-[#6d6f78] text-white",
  Red:   "bg-[#ed4245] hover:bg-[#c03537] text-white",
};

const COLOR_SWATCH: Record<string, string> = {
  Blue:  "bg-[#5865f2]",
  Green: "bg-[#57f287]",
  Grey:  "bg-[#4e5058]",
  Red:   "bg-[#ed4245]",
};

// ─── Button type config (label + emoji) ───────────────────────────────────────

const BUTTON_META: Record<string, { label: string; emoji: string; desc: string }> = {
  "Link Button":      { label: "Link Account",  emoji: "🔗", desc: "Link a Clash of Clans account" },
  "Link Help Button": { label: "Help",          emoji: "❓", desc: "Show account linking instructions" },
  "Refresh Button":   { label: "Refresh Roles", emoji: "🔄", desc: "Refresh Discord roles" },
  "To-Do Button":     { label: "To-Do List",    emoji: "✅", desc: "Show account tasks" },
  "Roster Button":    { label: "My Rosters",    emoji: "📅", desc: "Show roster memberships" },
};

// ─── Channel type ─────────────────────────────────────────────────────────────

interface Channel {
  id: string;
  name: string;
  parent_name?: string;
}

type PanelUpdatePayload = UpdatePanelRequest & { button_color: ButtonColor };

function normalizeEmbedsPayload(payload: unknown): ServerEmbed[] {
  if (Array.isArray(payload)) return payload as ServerEmbed[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as { items?: unknown; data?: { items?: unknown } };
  if (Array.isArray(obj.items)) return obj.items as ServerEmbed[];
  if (obj.data && Array.isArray(obj.data.items)) return obj.data.items as ServerEmbed[];

  return [];
}

function normalizeWelcomeChannelForApi(value: string): string | null {
  if (!value || value === "disabled") return null;
  return value;
}

const BUTTON_SKELETON_KEYS = BUTTON_TYPES.map((type) => `${type}-skeleton`);
const COLOR_SKELETON_KEYS = BUTTON_COLORS.map((color) => `${color}-skeleton`);
const PREVIEW_BUTTON_SKELETON_KEYS = ["preview-button-1", "preview-button-2", "preview-button-3"];
const UNKNOWN_BUTTON_META = { label: "Unknown", emoji: "🔘", desc: "" };

function orderButtonsForPreview(selectedButtons: string[]) {
  const knownOrdered = BUTTON_TYPES.filter((type) => selectedButtons.includes(type));
  const unknown = selectedButtons.filter((type) => !BUTTON_TYPES.includes(type as (typeof BUTTON_TYPES)[number]));
  return [...knownOrdered, ...unknown];
}

function buildEmbedPreviewContent({
  isEmbedsLoading,
  embedName,
  embedPreviews,
  messageContent,
  messageProfile,
  hasMessageProfile,
  previewEmbedNoDataText,
  previewNoEmbedText,
}: {
  isEmbedsLoading: boolean;
  embedName: string;
  embedPreviews: ReturnType<typeof extractEmbeds>;
  messageContent: ReturnType<typeof extractMessageContent>;
  messageProfile: ReturnType<typeof extractMessageProfile>;
  hasMessageProfile: boolean;
  previewEmbedNoDataText: string;
  previewNoEmbedText: string;
}): ReactNode {
  if (isEmbedsLoading) {
    return <Skeleton className="h-40 w-full rounded-md" />;
  }

  if (embedPreviews.length > 0 || Boolean(messageContent) || hasMessageProfile) {
    return (
      <DiscordMessagePreview
        profile={messageProfile}
        content={messageContent}
        embeds={embedPreviews}
      />
    );
  }

  return (
    <div className="rounded border border-dashed border-white/20 p-4 text-center text-xs text-white/40">
      {embedName ? previewEmbedNoDataText : previewNoEmbedText}
    </div>
  );
}

function buildButtonsPreviewContent({
  isPanelLoading,
  selectedButtons,
  buttonStyle,
  previewNoButtonsText,
}: {
  isPanelLoading: boolean;
  selectedButtons: string[];
  buttonStyle: string;
  previewNoButtonsText: string;
}): ReactNode {
  if (isPanelLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {PREVIEW_BUTTON_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-8 w-28 rounded-md bg-white/10" />
        ))}
      </div>
    );
  }

  const orderedButtons = orderButtonsForPreview(selectedButtons);
  if (orderedButtons.length === 0) {
    return <div className="text-xs text-white/30 italic">{previewNoButtonsText}</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {orderedButtons.map(type => {
        const meta = BUTTON_META[type] ?? { ...UNKNOWN_BUTTON_META, label: type };
        return (
          <button
            key={type}
            className={cn("flex items-center gap-1.5 rounded px-4 py-1.5 text-sm font-medium transition-colors pointer-events-none", buttonStyle)}
          >
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PanelsPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;
  const locale = params.locale as string;
  const t = useTranslations("PanelsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();

  const [isPanelLoading, setIsPanelLoading] = useState(true);
  const [isPanelSnapshotInitialized, setIsPanelSnapshotInitialized] = useState(false);
  const [isEmbedsLoading, setIsEmbedsLoading] = useState(true);
  const [isChannelsLoading, setIsChannelsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingWelcomeChannel, setIsSavingWelcomeChannel] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state
  const [embedName, setEmbedName] = useState<string>("");
  const [buttons, setButtons] = useState<string[]>([]);
  const [buttonColor, setButtonColor] = useState<ButtonColor>("Grey");
  const [welcomeChannel, setWelcomeChannel] = useState<string>("");
  const [draftEmbedName, setDraftEmbedName] = useState<string>("");
  const [draftButtons, setDraftButtons] = useState<string[]>([]);
  const [draftButtonColor, setDraftButtonColor] = useState<ButtonColor>("Grey");

  // Supporting data
  const [embeds, setEmbeds] = useState<ServerEmbed[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const loaded = useRef(false);
  const panelSnapshotRef = useRef<PanelUpdatePayload>({
    embed_name: null,
    buttons: [],
    button_color: "Grey",
    welcome_channel: null,
  });
  const panelUpdateQueueRef = useRef(Promise.resolve<void>(undefined));
  const panelCacheKey = `panel-${guildId}`;
  const embedsCacheKey = `panels-embeds-list-${guildId}`;
  const channelsCacheKey = dashboardCacheKeys.channels(guildId);

  const showLoadError = useCallback(() => {
    toast({ title: tCommon("error"), description: tCommon("loadError"), variant: "destructive" });
  }, [toast, tCommon]);

  const applyPanelData = useCallback((panel: ServerPanel) => {
    const nextPayload: PanelUpdatePayload = {
      embed_name: panel.embed_name ?? null,
      buttons: panel.buttons ?? [],
      button_color: (panel.button_color as ButtonColor) ?? "Grey",
      welcome_channel: panel.welcome_channel ? String(panel.welcome_channel) : null,
    };
    panelSnapshotRef.current = { ...nextPayload, buttons: [...nextPayload.buttons] };
    setEmbedName(nextPayload.embed_name ?? "");
    setButtons(nextPayload.buttons);
    setButtonColor(nextPayload.button_color);
    setWelcomeChannel(nextPayload.welcome_channel ?? "");
    setIsPanelSnapshotInitialized(true);
  }, []);

  const queuePanelUpdate = useCallback(
    async (buildPayload: (snapshot: PanelUpdatePayload) => PanelUpdatePayload) => {
      const run = async () => {
        const nextPayload = buildPayload(panelSnapshotRef.current);
        const requestPayload: UpdatePanelRequest = {
          embed_name: nextPayload.embed_name,
          buttons: nextPayload.buttons,
          button_color: nextPayload.button_color,
          welcome_channel: nextPayload.welcome_channel,
        };
        const res = await apiClient.panels.updatePanel(guildId, requestPayload);
        if (res.error) throw new Error(res.error);
        panelSnapshotRef.current = { ...nextPayload, buttons: [...nextPayload.buttons] };
        apiCache.invalidate(panelCacheKey);
      };

      const queuedRun = panelUpdateQueueRef.current.then(run, run);
      panelUpdateQueueRef.current = queuedRun.then(
        () => undefined,
        () => undefined
      );
      return queuedRun;
    },
    [guildId, panelCacheKey]
  );

  const loadPanel = useCallback(async () => {
    try {
      const panelRes = await apiCache.get(panelCacheKey, () => apiClient.panels.getPanel(guildId));
      if (panelRes.status === 401 || panelRes.status === 403) {
        router.push(`/${locale}/login`);
        return;
      }

      if (panelRes.data) {
        applyPanelData(panelRes.data);
      } else {
        // No panel configured yet; treat the default snapshot as initialized.
        setIsPanelSnapshotInitialized(true);
      }
    } catch {
      showLoadError();
    } finally {
      setIsPanelLoading(false);
    }
  }, [applyPanelData, guildId, locale, panelCacheKey, router, showLoadError]);

  const loadEmbeds = useCallback(async () => {
    try {
      const embedsRes = await apiCache.get(embedsCacheKey, () => apiClient.tickets.getEmbeds(guildId));
      setEmbeds(normalizeEmbedsPayload(embedsRes));
    } catch {
      showLoadError();
    } finally {
      setIsEmbedsLoading(false);
    }
  }, [embedsCacheKey, guildId, showLoadError]);

  const loadChannels = useCallback(async () => {
    try {
      const channelsPayload = await apiCache.get(channelsCacheKey, async () => {
        const response = await apiClient.servers.getChannels(guildId);
        if (response.error) {
          throw new Error(response.error);
        }
        return response.data;
      });
      setChannels(normalizeChannelsPayload(channelsPayload));
    } catch {
      showLoadError();
    } finally {
      setIsChannelsLoading(false);
    }
  }, [channelsCacheKey, guildId, showLoadError]);

  const load = useCallback(async () => {
    await Promise.all([loadPanel(), loadEmbeds(), loadChannels()]);
  }, [loadChannels, loadEmbeds, loadPanel]);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    load();
  }, [load]);

  const toggleDraftButton = (type: string) => {
    setDraftButtons(prev =>
      prev.includes(type) ? prev.filter(b => b !== type) : [...prev, type]
    );
  };

  const openEditDialog = () => {
    setDraftEmbedName(embedName);
    setDraftButtons(buttons);
    setDraftButtonColor(buttonColor);
    setIsEditDialogOpen(true);
  };

  const handleWelcomeChannelChange = async (nextChannel: string) => {
    if (isPanelLoading || !isPanelSnapshotInitialized) {
      return;
    }

    const previousChannel = welcomeChannel;
    setWelcomeChannel(nextChannel);
    setIsSavingWelcomeChannel(true);

    try {
      const nextWelcomeChannel = normalizeWelcomeChannelForApi(nextChannel);
      await queuePanelUpdate((snapshot) => ({
        ...snapshot,
        welcome_channel: nextWelcomeChannel,
      }));
      const autosaveDescription = !nextChannel || nextChannel === "disabled"
        ? t("welcomeAutosaveDisabled")
        : t("welcomeAutosaveSuccess");
      toast({
        title: tCommon("success"),
        description: autosaveDescription,
      });
    } catch (err) {
      setWelcomeChannel(previousChannel);
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : tCommon("loadError"),
        variant: "destructive",
      });
    } finally {
      setIsSavingWelcomeChannel(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await queuePanelUpdate((snapshot) => ({
        ...snapshot,
        embed_name: draftEmbedName || null,
        buttons: draftButtons,
        button_color: draftButtonColor,
        welcome_channel: normalizeWelcomeChannelForApi(welcomeChannel),
      }));
      setEmbedName(draftEmbedName);
      setButtons(draftButtons);
      setButtonColor(draftButtonColor);
      toast({ title: tCommon("success"), description: t("saved") });
      setIsEditDialogOpen(false);
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Embed preview data
  const selectedEmbed = embeds.find(e => e.name === embedName);
  const embedPreviews = selectedEmbed?.data ? extractEmbeds(selectedEmbed.data) : [];
  const messageContent = selectedEmbed?.data ? extractMessageContent(selectedEmbed.data) : null;
  const messageProfile = selectedEmbed?.data ? extractMessageProfile(selectedEmbed.data) : null;
  const hasMessageProfile = Boolean(messageProfile?.name || messageProfile?.avatar_url);
  const buttonStyle = DISCORD_BUTTON_STYLE[buttonColor] ?? DISCORD_BUTTON_STYLE.Grey;
  const embedPreviewContent = buildEmbedPreviewContent({
    isEmbedsLoading,
    embedName,
    embedPreviews,
    messageContent,
    messageProfile,
    hasMessageProfile,
    previewEmbedNoDataText: t("previewEmbedNoData"),
    previewNoEmbedText: t("previewNoEmbed"),
  });
  const buttonsPreviewContent = buildButtonsPreviewContent({
    isPanelLoading,
    selectedButtons: buttons,
    buttonStyle,
    previewNoButtonsText: t("previewNoButtons"),
  });
  const draftSelectedEmbed = embeds.find(e => e.name === draftEmbedName);
  const draftEmbedPreviews = draftSelectedEmbed?.data ? extractEmbeds(draftSelectedEmbed.data) : [];
  const draftMessageContent = draftSelectedEmbed?.data ? extractMessageContent(draftSelectedEmbed.data) : null;
  const draftMessageProfile = draftSelectedEmbed?.data ? extractMessageProfile(draftSelectedEmbed.data) : null;
  const draftHasMessageProfile = Boolean(draftMessageProfile?.name || draftMessageProfile?.avatar_url);
  const draftButtonStyle = DISCORD_BUTTON_STYLE[draftButtonColor] ?? DISCORD_BUTTON_STYLE.Grey;
  const draftEmbedPreviewContent = buildEmbedPreviewContent({
    isEmbedsLoading,
    embedName: draftEmbedName,
    embedPreviews: draftEmbedPreviews,
    messageContent: draftMessageContent,
    messageProfile: draftMessageProfile,
    hasMessageProfile: draftHasMessageProfile,
    previewEmbedNoDataText: t("previewEmbedNoData"),
    previewNoEmbedText: t("previewNoEmbed"),
  });
  const draftButtonsPreviewContent = buildButtonsPreviewContent({
    isPanelLoading,
    selectedButtons: draftButtons,
    buttonStyle: draftButtonStyle,
    previewNoButtonsText: t("previewNoButtons"),
  });
  const shouldShowWelcomeChannelSkeleton = isChannelsLoading || isPanelLoading || !isPanelSnapshotInitialized;

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
              <LayoutTemplate className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.25fr]">
          {/* ── Left: welcome channel ── */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold">{t("welcomeSection")}</h2>
                <p className="mt-0.5 min-h-4 text-xs leading-4 text-muted-foreground">{t("welcomeHint")}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("welcomeChannel")}</Label>
                <div className="relative h-9">
                  {!shouldShowWelcomeChannelSkeleton && (
                    <ChannelCombobox
                      channels={channels}
                      value={welcomeChannel}
                      onValueChange={handleWelcomeChannelChange}
                      placeholder={t("welcomeChannelPlaceholder")}
                      showDisabled
                      disabled={isSavingWelcomeChannel}
                    />
                  )}
                  {shouldShowWelcomeChannelSkeleton && (
                    <Skeleton className="pointer-events-none absolute inset-0 h-full w-full rounded-md border border-border bg-secondary" />
                  )}
                </div>
              </div>
              <Button
                onClick={openEditDialog}
                disabled={isPanelLoading || isEmbedsLoading}
                className="w-full sm:w-auto"
              >
                {t("editPanelButton")}
              </Button>
            </div>
          </div>

          {/* ── Right: preview ── */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 sticky top-4">
              <div>
                <h2 className="text-sm font-semibold">{t("previewSection")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t("previewHint")}</p>
              </div>

              {/* Discord message mockup */}
              <div className="rounded-lg bg-[#313338] p-4 space-y-3">
                {/* Embed preview */}
                {embedPreviewContent}

                {/* Buttons preview */}
                <div className="pl-12">
                  {buttonsPreviewContent}
                </div>
              </div>

            </div>
          </div>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-card border-border max-w-6xl w-[97vw] h-[92vh] overflow-hidden p-0">
            <DialogHeader className="border-b border-border px-6 pt-5 pb-4">
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
              <DialogDescription>{t("editDialogDescription")}</DialogDescription>
            </DialogHeader>

            <div className="grid h-full min-h-0 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1fr_1.25fr]">
              <div className="space-y-6">
                <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">{t("embedSection")}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("embedHint")}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("embedLabel")}</Label>
                    {isEmbedsLoading ? (
                      <Skeleton className="h-9 w-full" />
                    ) : (
                      <select
                        value={draftEmbedName}
                        onChange={e => setDraftEmbedName(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">{t("noEmbed")}</option>
                        {embeds.map(e => (
                          <option key={e.name} value={e.name}>{e.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">{t("buttonsSection")}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("buttonsHint")}</p>
                  </div>
                  {isPanelLoading ? (
                    <div className="space-y-2">
                      {BUTTON_SKELETON_KEYS.map((key) => (
                        <div
                          key={key}
                          className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3"
                        >
                          <Skeleton className="h-4 w-4 rounded-sm" />
                          <Skeleton className="h-5 w-5 rounded-sm" />
                          <div className="flex-1 min-w-0 space-y-1">
                            <Skeleton className="h-[18px] w-28" />
                            <Skeleton className="h-3.5 w-52 max-w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {BUTTON_TYPES.map(type => {
                        const meta = BUTTON_META[type];
                        const active = draftButtons.includes(type);
                        return (
                          <label
                            key={type}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                              active
                                ? "border-primary/50 bg-primary/5"
                                : "border-border/60 hover:bg-accent/40"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleDraftButton(type)}
                              className="h-4 w-4 rounded accent-primary"
                            />
                            <span className="text-lg">{meta.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{meta.label}</p>
                              <p className="text-xs text-muted-foreground">{meta.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">{t("colorSection")}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("colorHint")}</p>
                  </div>
                  {isPanelLoading ? (
                    <div className="flex gap-3">
                      {COLOR_SKELETON_KEYS.map((key) => (
                        <Skeleton key={key} className="h-[72px] w-[74px] rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      {BUTTON_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setDraftButtonColor(color)}
                          className={cn(
                            "relative flex flex-col items-center gap-1.5 rounded-lg p-3 border-2 transition-all",
                            draftButtonColor === color
                              ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                              : "border-transparent hover:border-border"
                          )}
                        >
                          {draftButtonColor === color && (
                            <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-primary" />
                          )}
                          <div
                            className={cn(
                              "h-6 w-10 rounded",
                              COLOR_SWATCH[color],
                              draftButtonColor === color && "ring-2 ring-background/70"
                            )}
                          />
                          <span className="text-xs font-medium">{t(`color.${color}`)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 lg:sticky lg:top-0">
                  <div>
                    <h2 className="text-sm font-semibold">{t("previewSection")}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("previewHint")}</p>
                  </div>
                  <div className="rounded-lg bg-[#313338] p-4 space-y-3">
                    {draftEmbedPreviewContent}
                    <div className="pl-12">
                      {draftButtonsPreviewContent}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border px-6 py-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isPanelLoading}>
                {isSaving
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Save className="mr-2 h-4 w-4" />}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
