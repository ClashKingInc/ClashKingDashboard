"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, LayoutTemplate, Save } from "lucide-react";

import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { DiscordEmbedPreview, extractFirstEmbed } from "@/components/dashboard/discord-embed-preview";
import { cn } from "@/lib/utils";
import { BUTTON_TYPES, BUTTON_COLORS } from "@/lib/api/types/panels";
import type { ButtonColor, ServerPanel } from "@/lib/api/types/panels";
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

const BUTTON_SKELETON_KEYS = BUTTON_TYPES.map((type) => `${type}-skeleton`);
const COLOR_SKELETON_KEYS = BUTTON_COLORS.map((color) => `${color}-skeleton`);
const PREVIEW_BUTTON_SKELETON_KEYS = ["preview-button-1", "preview-button-2", "preview-button-3"];

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
  const [isEmbedsLoading, setIsEmbedsLoading] = useState(true);
  const [isChannelsLoading, setIsChannelsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [embedName, setEmbedName] = useState<string>("");
  const [buttons, setButtons] = useState<string[]>([]);
  const [buttonColor, setButtonColor] = useState<ButtonColor>("Grey");
  const [welcomeChannel, setWelcomeChannel] = useState<string>("");

  // Supporting data
  const [embeds, setEmbeds] = useState<ServerEmbed[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const loaded = useRef(false);
  const panelCacheKey = `panel-${guildId}`;
  const embedsCacheKey = `embeds-${guildId}`;
  const channelsCacheKey = `channels-${guildId}`;

  const showLoadError = useCallback(() => {
    toast({ title: tCommon("error"), description: tCommon("loadError"), variant: "destructive" });
  }, [toast, tCommon]);

  const applyPanelData = useCallback((panel: ServerPanel) => {
    setEmbedName(panel.embed_name ?? "");
    setButtons(panel.buttons ?? []);
    setButtonColor((panel.button_color as ButtonColor) ?? "Grey");
    setWelcomeChannel(panel.welcome_channel ? String(panel.welcome_channel) : "");
  }, []);

  const loadPanel = useCallback(async () => {
    try {
      const panelRes = await apiCache.get(panelCacheKey, () => apiClient.panels.getPanel(guildId));
      if (panelRes.status === 401 || panelRes.status === 403) {
        router.push(`/${locale}/login`);
        return;
      }

      if (panelRes.data) {
        applyPanelData(panelRes.data as ServerPanel);
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
      setEmbeds(embedsRes.data?.items ?? []);
    } catch {
      showLoadError();
    } finally {
      setIsEmbedsLoading(false);
    }
  }, [embedsCacheKey, guildId, showLoadError]);

  const loadChannels = useCallback(async () => {
    try {
      const channelsRes = await apiCache.get(channelsCacheKey, () => apiClient.servers.getChannels(guildId));
      setChannels(channelsRes.data ?? []);
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

  const toggleButton = (type: string) => {
    setButtons(prev =>
      prev.includes(type) ? prev.filter(b => b !== type) : [...prev, type]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await apiClient.panels.updatePanel(guildId, {
        embed_name: embedName || null,
        buttons,
        button_color: buttonColor,
        welcome_channel: welcomeChannel ? parseInt(welcomeChannel, 10) : null,
      });
      if (res.error) throw new Error(res.error);
      apiCache.invalidate(panelCacheKey);
      toast({ title: tCommon("success"), description: t("saved") });
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Embed preview data
  const selectedEmbed = embeds.find(e => e.name === embedName);
  const embedPreview = selectedEmbed?.data ? extractFirstEmbed(selectedEmbed.data) : null;
  const buttonStyle = DISCORD_BUTTON_STYLE[buttonColor] ?? DISCORD_BUTTON_STYLE.Grey;
  const resolvedWelcomeChannelName = channels.find(c => c.id === welcomeChannel)?.name;
  let embedPreviewContent = (
    <div className="rounded border border-dashed border-white/20 p-4 text-center text-xs text-white/40">
      {embedName ? t("previewEmbedNoData") : t("previewNoEmbed")}
    </div>
  );
  if (isEmbedsLoading) {
    embedPreviewContent = <Skeleton className="h-40 w-full rounded-md" />;
  } else if (embedPreview) {
    embedPreviewContent = <DiscordEmbedPreview embed={embedPreview} />;
  }

  let buttonsPreviewContent = <div className="text-xs text-white/30 italic">{t("previewNoButtons")}</div>;
  if (isPanelLoading) {
    buttonsPreviewContent = (
      <div className="flex flex-wrap gap-2">
        {PREVIEW_BUTTON_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-8 w-28 rounded-md bg-white/10" />
        ))}
      </div>
    );
  } else if (buttons.length > 0) {
    buttonsPreviewContent = (
      <div className="flex flex-wrap gap-2">
        {buttons.map(type => {
          const meta = BUTTON_META[type];
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
  const welcomeAutoPostText = t("welcomeAutoPost", {
    channel: `#${resolvedWelcomeChannelName ?? welcomeChannel}`
  });

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
              <LayoutTemplate className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving || isPanelLoading} className="shrink-0">
            {isSaving
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Save className="mr-2 h-4 w-4" />}
            {tCommon("save")}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left: config ── */}
          <div className="space-y-6">

            {/* Embed */}
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
                    value={embedName}
                    onChange={e => setEmbedName(e.target.value)}
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

            {/* Buttons */}
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
                    const active = buttons.includes(type);
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
                          onChange={() => toggleButton(type)}
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

            {/* Color */}
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
                      onClick={() => setButtonColor(color)}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 rounded-lg p-3 border-2 transition-all",
                        buttonColor === color
                          ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                          : "border-transparent hover:border-border"
                      )}
                    >
                      {buttonColor === color && (
                        <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-primary" />
                      )}
                      <div
                        className={cn(
                          "h-6 w-10 rounded",
                          COLOR_SWATCH[color],
                          buttonColor === color && "ring-2 ring-background/70"
                        )}
                      />
                      <span className="text-xs font-medium">{t(`color.${color}`)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Welcome channel */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold">{t("welcomeSection")}</h2>
                <p className="mt-0.5 min-h-4 text-xs leading-4 text-muted-foreground">{t("welcomeHint")}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("welcomeChannel")}</Label>
                <div className="relative">
                  <ChannelCombobox
                    channels={channels}
                    value={welcomeChannel}
                    onValueChange={setWelcomeChannel}
                    placeholder={t("welcomeChannelPlaceholder")}
                    showDisabled={false}
                    disabled={isChannelsLoading}
                    className={cn(isChannelsLoading && "opacity-0")}
                  />
                  {isChannelsLoading && (
                    <Skeleton className="pointer-events-none absolute inset-0 h-9 w-full rounded-md border border-border bg-secondary" />
                  )}
                </div>
              </div>
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
                {/* Bot avatar + name */}
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">CK</div>
                  <span className="text-sm font-semibold text-white">ClashKing</span>
                  <span className="text-[10px] bg-[#5865f2] text-white px-1 rounded font-medium">APP</span>
                </div>

                {/* Embed preview */}
                {embedPreviewContent}

                {/* Buttons preview */}
                {buttonsPreviewContent}
              </div>

              {/* Welcome channel info */}
              {welcomeChannel && (
                <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground min-h-10 flex items-center">
                  {isChannelsLoading ? (
                    <Skeleton className="h-3.5 w-56 max-w-full" />
                  ) : (
                    welcomeAutoPostText
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
