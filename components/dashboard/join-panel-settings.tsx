"use client";

import { useGuildId } from "@/lib/dashboard-route";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, LayoutTemplate, Save, Settings2 } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
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

export function JoinPanelSettings({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const guildId = useGuildId();
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
  const [isPanelEnabled, setIsPanelEnabled] = useState(false);
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
    setIsPanelEnabled(Boolean(nextPayload.welcome_channel));
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
        throw new Error(panelRes.error || "You do not have access to this panel.");
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
  }, [applyPanelData, guildId, panelCacheKey, showLoadError]);

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
    const previousEnabled = isPanelEnabled;
    setWelcomeChannel(nextChannel);
    setIsPanelEnabled(Boolean(nextChannel && nextChannel !== "disabled"));
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
      setIsPanelEnabled(previousEnabled);
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : tCommon("loadError"),
        variant: "destructive",
      });
    } finally {
      setIsSavingWelcomeChannel(false);
    }
  };

  const handleEnabledChange = async (enabled: boolean) => {
    if (enabled) {
      setIsPanelEnabled(true);
      return;
    }

    const previousChannel = welcomeChannel;
    setIsPanelEnabled(false);
    setWelcomeChannel("");
    setIsSavingWelcomeChannel(true);
    try {
      await queuePanelUpdate((snapshot) => ({ ...snapshot, welcome_channel: null }));
      toast({ title: tCommon("success"), description: t("welcomeAutosaveDisabled") });
    } catch (err) {
      setIsPanelEnabled(Boolean(previousChannel));
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
    <div className={cn("flex-1", !embedded && "overflow-auto p-4 md:p-6 lg:p-8")}>
      <div className="mx-auto max-w-7xl space-y-6">
        {!embedded && <div className="flex items-start gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3">
              <LayoutTemplate className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
            </div>
          </div>
        </div>}

        <div className="rounded-[20px] bg-card p-4 shadow-sm shadow-black/5 sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-medium text-foreground">{t("joinPanelTitle")}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{t("welcomeHint")}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:w-[520px]">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("welcomeChannel")}</Label>
                <div className="relative h-10">
                  {!shouldShowWelcomeChannelSkeleton && (
                    <ChannelCombobox
                      channels={channels}
                      value={welcomeChannel}
                      onValueChange={handleWelcomeChannelChange}
                      placeholder={t("welcomeChannelPlaceholder")}
                      disabled={isSavingWelcomeChannel || !isPanelEnabled}
                    />
                  )}
                  {shouldShowWelcomeChannelSkeleton && (
                    <Skeleton className="pointer-events-none absolute inset-0 h-full w-full rounded-md border border-border bg-secondary" />
                  )}
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={openEditDialog}
                disabled={isPanelLoading || isEmbedsLoading}
                className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                {t("editPanelButton")}
              </Button>
              <div className="flex h-10 items-center justify-between gap-3 sm:justify-start">
                <Label htmlFor="join-panel-enabled" className="text-xs text-muted-foreground sm:sr-only">{t("enabled")}</Label>
                <Switch
                  id="join-panel-enabled"
                  checked={isPanelEnabled}
                  onCheckedChange={(checked) => void handleEnabledChange(checked)}
                  disabled={shouldShowWelcomeChannelSkeleton || isSavingWelcomeChannel}
                  aria-label={t("enabled")}
                />
              </div>
            </div>
          </div>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent variant="workspace" className="overflow-hidden bg-card shadow-2xl sm:max-w-6xl">
            <DialogHeader className="bg-muted/35 px-6 pb-5 pt-6 sm:px-7">
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
              <DialogDescription>{t("editDialogDescription")}</DialogDescription>
            </DialogHeader>

            <div className="grid h-full min-h-0 grid-cols-1 gap-7 overflow-y-auto p-6 sm:p-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-7">
                <section className="space-y-4">
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
                        className="h-11 w-full rounded-xl border-0 bg-muted/55 px-3 text-sm shadow-sm shadow-black/5 focus:outline-none focus:ring-2 focus:ring-ring/35"
                      >
                        <option value="">{t("noEmbed")}</option>
                        {embeds.map(e => (
                          <option key={e.name} value={e.name}>{e.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">{t("buttonsSection")}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("buttonsHint")}</p>
                  </div>
                  {isPanelLoading ? (
                    <div className="space-y-2">
                      {BUTTON_SKELETON_KEYS.map((key) => (
                        <div
                          key={key}
                          className="flex items-center gap-3 rounded-2xl bg-muted/45 px-4 py-3"
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
                              "flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition-colors",
                              active
                                ? "bg-primary/10 shadow-sm shadow-black/5"
                                : "bg-muted/45 hover:bg-muted/70"
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
                </section>

                <section className="space-y-4">
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
                            "relative flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-[background-color,box-shadow]",
                            draftButtonColor === color
                              ? "bg-primary/10 shadow-sm shadow-black/5 ring-2 ring-primary/35"
                              : "bg-muted/45 hover:bg-muted/70"
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
                </section>
              </div>

              <div className="space-y-4">
                <div className="space-y-4 rounded-[20px] bg-muted/35 p-5 lg:sticky lg:top-0">
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

            <DialogFooter className="bg-muted/35 px-6 py-4 sm:px-7">
              <Button variant="secondary" className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
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
