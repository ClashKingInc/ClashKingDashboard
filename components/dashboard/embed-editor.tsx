"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Copy, ExternalLink, Plus, Trash2, Link2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DiscordMessagePreview, extractEmbeds, extractMessageProfile, type DiscordEmbed } from "./discord-embed-preview";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldState {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

interface EmbedFormState {
  editorId: string;
  openSections: Record<SectionKey, boolean>;
  color: string;
  authorName: string;
  authorIconUrl: string;
  authorUrl: string;
  title: string;
  titleUrl: string;
  description: string;
  fields: FieldState[];
  thumbnailUrl: string;
  imageUrl: string;
  footerText: string;
  footerIconUrl: string;
  includeTimestamp: boolean;
}

type SectionKey = "author" | "body" | "fields" | "images" | "footer";
const MAX_DISCORD_EMBEDS_PER_MESSAGE = 10;
const MAX_DISCORD_MESSAGE_CONTENT_LENGTH = 2000;
const MAX_PROFILE_NAME_LENGTH = 80;

interface MessageProfileState {
  name: string;
  avatarUrl: string;
}

const EMPTY_MESSAGE_PROFILE: MessageProfileState = { name: "", avatarUrl: "" };

function createCollapsedSectionState(): Record<SectionKey, boolean> {
  return {
    author: false,
    body: false,
    fields: false,
    images: false,
    footer: false,
  };
}

export interface EmbedEditorProps {
  readonly initialData?: Record<string, unknown> | null;
  readonly onSave: (data: Record<string, unknown>) => Promise<void>;
  readonly isSaving: boolean;
  readonly onCancel: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToInt(hex: string): number {
  return Number.parseInt(hex.replace("#", ""), 16);
}

function intToHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function defaultState(): EmbedFormState {
  return {
    editorId: uid(),
    openSections: createCollapsedSectionState(),
    color: "#5865f2",
    authorName: "", authorIconUrl: "", authorUrl: "",
    title: "", titleUrl: "",
    description: "",
    fields: [],
    thumbnailUrl: "", imageUrl: "",
    footerText: "", footerIconUrl: "",
    includeTimestamp: false,
  };
}

function embedToState(embed: DiscordEmbed): EmbedFormState {
  return {
    editorId: uid(),
    openSections: createCollapsedSectionState(),
    color: typeof embed.color === "number" ? intToHex(embed.color) : "#5865f2",
    authorName: embed.author?.name ?? "",
    authorIconUrl: embed.author?.icon_url ?? "",
    authorUrl: embed.author?.url ?? "",
    title: embed.title ?? "",
    titleUrl: embed.url ?? "",
    description: embed.description ?? "",
    fields: (embed.fields ?? []).map((f: any, i: number) => ({
      id: `${i}-${Date.now()}`,
      name: f.name ?? "",
      value: f.value ?? "",
      inline: f.inline ?? false,
    })),
    thumbnailUrl: embed.thumbnail?.url ?? "",
    imageUrl: embed.image?.url ?? "",
    footerText: embed.footer?.text ?? "",
    footerIconUrl: embed.footer?.icon_url ?? "",
    includeTimestamp: !!embed.timestamp,
  };
}

function extractMessageContent(data: Record<string, unknown>): string {
  const messages = (data as { messages?: unknown }).messages;
  if (Array.isArray(messages)) {
    for (const message of messages) {
      const content = (message as { data?: { content?: unknown } })?.data?.content;
      if (typeof content === "string") {
        if (content.trim().length === 0) continue;
        return content.slice(0, MAX_DISCORD_MESSAGE_CONTENT_LENGTH);
      }
    }
  }

  const topLevelContent = (data as { content?: unknown }).content;
  if (typeof topLevelContent === "string") {
    if (topLevelContent.trim().length === 0) return "";
    return topLevelContent.slice(0, MAX_DISCORD_MESSAGE_CONTENT_LENGTH);
  }

  return "";
}

function payloadToEditorState(data: Record<string, unknown>): { embeds: EmbedFormState[]; content: string; profile: MessageProfileState } {
  const embeds = extractEmbeds(data);
  const content = extractMessageContent(data);
  const profile = extractMessageProfile(data);
  const mappedProfile: MessageProfileState = {
    name: (profile?.name ?? "").slice(0, MAX_PROFILE_NAME_LENGTH),
    avatarUrl: profile?.avatar_url ?? "",
  };
  if (embeds.length === 0) return { embeds: [defaultState()], content, profile: mappedProfile };
  return { embeds: embeds.map(embedToState), content, profile: mappedProfile };
}

function stateToEmbed(s: EmbedFormState): DiscordEmbed { // NOSONAR — sequential field assignments, no real logic branches
  const embed: DiscordEmbed = {};
  if (s.color) embed.color = hexToInt(s.color);
  if (s.authorName.trim()) {
    embed.author = { name: s.authorName.trim() };
    if (s.authorIconUrl.trim()) embed.author.icon_url = s.authorIconUrl.trim();
    if (s.authorUrl.trim()) embed.author.url = s.authorUrl.trim();
  }
  if (s.title.trim()) embed.title = s.title.trim();
  if (s.titleUrl.trim()) embed.url = s.titleUrl.trim();
  if (s.description.trim()) embed.description = s.description.trim();
  const validFields = s.fields.filter(f => f.name.trim() && f.value.trim());
  if (validFields.length > 0) {
    embed.fields = validFields.map(f => ({ name: f.name.trim(), value: f.value.trim(), inline: f.inline }));
  }
  if (s.thumbnailUrl.trim()) embed.thumbnail = { url: s.thumbnailUrl.trim() };
  if (s.imageUrl.trim()) embed.image = { url: s.imageUrl.trim() };
  if (s.footerText.trim()) {
    embed.footer = { text: s.footerText.trim() };
    if (s.footerIconUrl.trim()) embed.footer.icon_url = s.footerIconUrl.trim();
  }
  if (s.includeTimestamp) embed.timestamp = new Date().toISOString();
  return embed;
}

function hasMeaningfulEmbedContent(embed: DiscordEmbed): boolean {
  return Boolean(
    embed.author?.name ||
    embed.author?.icon_url ||
    embed.author?.url ||
    embed.title ||
    embed.url ||
    embed.description ||
    embed.fields?.length ||
    embed.thumbnail?.url ||
    embed.image?.url ||
    embed.footer?.text ||
    embed.footer?.icon_url ||
    embed.timestamp
  );
}

/** Outputs the Discohook-compatible payload stored in MongoDB */
export function stateToPayload(states: EmbedFormState[], content = "", profile: MessageProfileState = EMPTY_MESSAGE_PROFILE): Record<string, unknown> {
  const embeds = states
    .map(stateToEmbed)
    .filter(hasMeaningfulEmbedContent)
    .slice(0, MAX_DISCORD_EMBEDS_PER_MESSAGE);
  const normalizedContent = content.slice(0, MAX_DISCORD_MESSAGE_CONTENT_LENGTH);
  const normalizedProfile = {
    name: profile.name.slice(0, MAX_PROFILE_NAME_LENGTH).trim() || null,
    avatar_url: profile.avatarUrl.trim() || null,
  };
  const messageEntry: {
    data: {
      content: string | null;
      embeds: DiscordEmbed[];
      username?: string;
      avatar_url?: string;
    };
  } = {
    data: { content: normalizedContent || null, embeds },
  };
  if (normalizedProfile.name) messageEntry.data.username = normalizedProfile.name;
  if (normalizedProfile.avatar_url) messageEntry.data.avatar_url = normalizedProfile.avatar_url;

  return {
    version: "d2",
    messages: [messageEntry],
  };
}

function parseDiscohookUrl(url: string): Record<string, unknown> | null {
  try {
    const match = /[?&]data=([^&\s]+)/.exec(url);
    if (!match) return null;
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(match[1]), c => c.codePointAt(0) ?? 0)));
  } catch { return null; }
}

function buildDiscohookUrl(data: Record<string, unknown>): string {
  const encoded = btoa(Array.from(new TextEncoder().encode(JSON.stringify(data)), (byte) => String.fromCodePoint(byte)).join(""));
  return `https://discohook.app/?data=${encoded}`;
}

function uid(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('');
}

function patchField(fields: FieldState[], id: string, patch: Partial<FieldState>): FieldState[] {
  return fields.map((field) => (field.id === id ? { ...field, ...patch } : field));
}

function removeFieldById(fields: FieldState[], id: string): FieldState[] {
  return fields.filter((field) => field.id !== id);
}

function reorderFieldById(fields: FieldState[], id: string, dir: -1 | 1): FieldState[] {
  const arr = [...fields];
  const idx = arr.findIndex((field) => field.id === id);
  const next = idx + dir;
  if (idx === -1 || next < 0 || next >= arr.length) return fields;
  [arr[idx], arr[next]] = [arr[next], arr[idx]];
  return arr;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
      {children}
    </p>
  );
}

function Field({ label, hint, children }: { readonly label: string; readonly hint?: string; readonly children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {label ? <Label className="text-xs">{label}</Label> : null}
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CharCount({ value, max }: { readonly value: string; readonly max: number }) {
  const len = value.length;
  return (
    <span className={cn("text-[11px] tabular-nums", len > max ? "text-destructive" : "text-muted-foreground")}>
      {len}/{max}
    </span>
  );
}

interface CollapsibleSectionProps {
  readonly title: React.ReactNode;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly children: React.ReactNode;
}

function CollapsibleSection({ title, open, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border-b border-border/80">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-medium text-foreground">{title}</span>
      </button>
      {open && <div className="px-3 pb-3 pl-9">{children}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EmbedEditor({ initialData, onSave, isSaving, onCancel }: EmbedEditorProps) {
  const t = useTranslations("EmbedEditor");
  const tCommon = useTranslations("Common");
  const parsedInitialData = initialData ? payloadToEditorState(initialData) : null;
  const inputClassName = "bg-background border-border/80";
  const compactInputClassName = `${inputClassName} h-8 text-sm`;
  const compactTextareaClassName = `${inputClassName} text-sm resize-none`;

  const [embeds, setEmbeds] = useState<EmbedFormState[]>(() =>
    parsedInitialData ? parsedInitialData.embeds : [defaultState()]
  );
  const [expandedEmbedId, setExpandedEmbedId] = useState<string | null>(() => (
    (parsedInitialData?.embeds[0]?.editorId) ?? null
  ));
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [copiedDiscohook, setCopiedDiscohook] = useState(false);
  const [content, setContent] = useState(() => parsedInitialData?.content ?? "");
  const [profile, setProfile] = useState<MessageProfileState>(() => parsedInitialData?.profile ?? { name: "", avatarUrl: "" });
  const [profileOpen, setProfileOpen] = useState(false);

  const updateEmbed = (embedId: string, updater: (embed: EmbedFormState) => EmbedFormState) =>
    setEmbeds((prev) => prev.map((embed) => (embed.editorId === embedId ? updater(embed) : embed)));

  const setEmbedField = <K extends Exclude<keyof EmbedFormState, "editorId" | "openSections" | "fields">>(
    embedId: string,
    key: K,
    value: EmbedFormState[K],
  ) => {
    updateEmbed(embedId, (embed) => ({ ...embed, [key]: value }));
  };

  const toggleSection = (embedId: string, section: SectionKey) => {
    updateEmbed(embedId, (embed) => ({
      ...embed,
      openSections: {
        ...embed.openSections,
        [section]: !embed.openSections[section],
      },
    }));
  };

  const addEmbed = () => {
    setEmbeds((prev) => {
      if (prev.length >= MAX_DISCORD_EMBEDS_PER_MESSAGE) return prev;
      const nextEmbed = defaultState();
      setExpandedEmbedId(nextEmbed.editorId);
      return [...prev, nextEmbed];
    });
  };

  const removeEmbed = (embedId: string) => {
    setEmbeds((prev) => {
      if (prev.length <= 1) {
        const replacement = defaultState();
        setExpandedEmbedId(replacement.editorId);
        return [replacement];
      }
      const removedIndex = prev.findIndex((embed) => embed.editorId === embedId);
      const nextEmbeds = prev.filter((embed) => embed.editorId !== embedId);
      if (expandedEmbedId === embedId) {
        const fallback = nextEmbeds[Math.max(0, removedIndex - 1)] ?? nextEmbeds[0] ?? null;
        setExpandedEmbedId(fallback?.editorId ?? null);
      }
      return nextEmbeds;
    });
  };

  const duplicateEmbed = (embedId: string) => {
    setEmbeds((prev) => {
      if (prev.length >= MAX_DISCORD_EMBEDS_PER_MESSAGE) return prev;
      const index = prev.findIndex((embed) => embed.editorId === embedId);
      if (index === -1) return prev;
      const duplicated = duplicateEmbedState(prev[index]);
      setExpandedEmbedId(duplicated.editorId);
      return [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)];
    });
  };

  const moveEmbed = (embedId: string, direction: -1 | 1) => {
    setEmbeds((prev) => {
      const index = prev.findIndex((embed) => embed.editorId === embedId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  // ── Field management ────────────────────────────────────────────────────────

  const addField = (embedId: string) => {
    updateEmbed(embedId, (embed) => {
      if (embed.fields.length >= 25) return embed;
      return {
        ...embed,
        fields: [...embed.fields, { id: uid(), name: "", value: "", inline: false }],
      };
    });
  };

  const updateField = (embedId: string, fieldId: string, patch: Partial<FieldState>) =>
    updateEmbed(embedId, (embed) => ({
      ...embed,
      fields: patchField(embed.fields, fieldId, patch),
    }));

  const removeField = (embedId: string, fieldId: string) =>
    updateEmbed(embedId, (embed) => ({ ...embed, fields: removeFieldById(embed.fields, fieldId) }));

  const moveField = (embedId: string, fieldId: string, dir: -1 | 1) =>
    updateEmbed(embedId, (embed) => ({ ...embed, fields: reorderFieldById(embed.fields, fieldId, dir) }));

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = () => {
    const parsed = parseDiscohookUrl(importUrl.trim());
    if (!parsed) { setImportError(true); return; }
    const editorState = payloadToEditorState(parsed);
    setImportError(false);
    setImportUrl("");
    setEmbeds(editorState.embeds);
    setContent(editorState.content);
    setProfile(editorState.profile);
    setExpandedEmbedId(editorState.embeds[0]?.editorId ?? null);
    setImportExportOpen(false);
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = () => onSave(stateToPayload(embeds, content, profile));

  const discohookPayload = stateToPayload(embeds, content, profile);
  const discohookUrl = buildDiscohookUrl(discohookPayload);
  const previewEmbeds = embeds.map(stateToEmbed).filter(hasMeaningfulEmbedContent);
  const hasContent =
    previewEmbeds.length > 0 ||
    content.trim().length > 0 ||
    profile.name.trim().length > 0 ||
    profile.avatarUrl.trim().length > 0;

  const handleCopyDiscohookUrl = async () => {
    await navigator.clipboard.writeText(discohookUrl);
    setCopiedDiscohook(true);
    setTimeout(() => setCopiedDiscohook(false), 2000);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card text-card-foreground">
      {/* Two-column body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">

        {/* ── Left: form ── */}
        <div className="w-full overflow-y-auto border-b border-border bg-card px-4 py-5 space-y-5 md:w-[52%] md:border-b-0 md:border-r md:px-6">

          <Button size="sm" variant="secondary" className="h-8" onClick={() => setImportExportOpen(true)}>
            <Link2 className="h-3.5 w-3.5 mr-1" />{t("importExport")}
          </Button>

          <Separator />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("content")}</Label>
              <CharCount value={content} max={MAX_DISCORD_MESSAGE_CONTENT_LENGTH} />
            </div>
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, MAX_DISCORD_MESSAGE_CONTENT_LENGTH))}
              maxLength={MAX_DISCORD_MESSAGE_CONTENT_LENGTH}
              rows={4}
              className={compactTextareaClassName}
              placeholder={t("contentPlaceholder")}
            />
          </div>

          <CollapsibleSection title={t("profileSection")} open={profileOpen} onToggle={() => setProfileOpen((prev) => !prev)}>
            <div className="space-y-3">
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                {t("profileUnsupportedWarning")}
              </div>
              <Field label="">
                <div className="mb-1 flex items-center justify-between">
                  <Label className="text-xs">{t("profileName")}</Label>
                  <CharCount value={profile.name} max={MAX_PROFILE_NAME_LENGTH} />
                </div>
                <Input
                  value={profile.name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value.slice(0, MAX_PROFILE_NAME_LENGTH) }))}
                  maxLength={MAX_PROFILE_NAME_LENGTH}
                  className={compactInputClassName}
                />
              </Field>
              <Field label={t("profileAvatarUrl")}>
                <Input
                  value={profile.avatarUrl}
                  onChange={(event) => setProfile((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                  placeholder="https://..."
                  className={compactInputClassName}
                />
              </Field>
            </div>
          </CollapsibleSection>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <SectionLabel>{`Embeds (${embeds.length}/${MAX_DISCORD_EMBEDS_PER_MESSAGE})`}</SectionLabel>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={addEmbed}
                disabled={embeds.length >= MAX_DISCORD_EMBEDS_PER_MESSAGE}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />Add Embed
              </Button>
            </div>
            {embeds.map((embed, index) => {
              const label = embed.title.trim() || embed.description.trim().slice(0, 40) || `Embed ${index + 1}`;
              const isExpanded = expandedEmbedId === embed.editorId;
              return (
                <div
                  key={embed.editorId}
                  className={cn(
                    "rounded-lg border bg-card",
                    isExpanded ? "border-primary/60" : "border-border/80",
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => setExpandedEmbedId((prev) => (prev === embed.editorId ? null : embed.editorId))}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="truncate text-base font-semibold">{`Embed ${index + 1} - ${label}`}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveEmbed(embed.editorId, -1)} disabled={index === 0}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveEmbed(embed.editorId, 1)} disabled={index === embeds.length - 1}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateEmbed(embed.editorId)} disabled={embeds.length >= MAX_DISCORD_EMBEDS_PER_MESSAGE}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeEmbed(embed.editorId)} disabled={embeds.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-border/80">
                      <CollapsibleSection title={t("authorSection")} open={embed.openSections.author} onToggle={() => toggleSection(embed.editorId, "author")}>
                        <div className="space-y-3">
                          <Field label="">
                            <div className="mb-1 flex items-center justify-between">
                              <Label className="text-xs">{t("authorName")}</Label>
                              <CharCount value={embed.authorName} max={256} />
                            </div>
                            <Input value={embed.authorName} onChange={e => setEmbedField(embed.editorId, "authorName", e.target.value)} maxLength={256} className={compactInputClassName} />
                          </Field>
                          <Field label={t("authorUrl")}>
                            <Input value={embed.authorUrl} onChange={e => setEmbedField(embed.editorId, "authorUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
                          </Field>
                          <Field label={t("authorIconUrl")}>
                            <Input value={embed.authorIconUrl} onChange={e => setEmbedField(embed.editorId, "authorIconUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
                          </Field>
                        </div>
                      </CollapsibleSection>

                      <CollapsibleSection title={t("bodySection")} open={embed.openSections.body} onToggle={() => toggleSection(embed.editorId, "body")}>
                        <div className="space-y-3">
                          <Field label="">
                            <div className="mb-1 flex items-center justify-between">
                              <Label className="text-xs">{t("title")}</Label>
                              <CharCount value={embed.title} max={256} />
                            </div>
                            <Input value={embed.title} onChange={e => setEmbedField(embed.editorId, "title", e.target.value)} maxLength={256} className={compactInputClassName} />
                          </Field>
                          <Field label={t("titleUrl")}>
                            <Input value={embed.titleUrl} onChange={e => setEmbedField(embed.editorId, "titleUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
                          </Field>
                          <Field label={t("sidebarColor")}>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={embed.color || "#5865f2"}
                                onChange={e => setEmbedField(embed.editorId, "color", e.target.value)}
                                className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5"
                              />
                              <Input
                                value={embed.color}
                                onChange={e => {
                                  const value = e.target.value;
                                  if (/^#[0-9a-fA-F]{0,6}$/.test(value)) setEmbedField(embed.editorId, "color", value);
                                }}
                                className={cn(inputClassName, "font-mono text-sm w-28")}
                                maxLength={7}
                              />
                            </div>
                          </Field>
                          <Field label="">
                            <div className="mb-1 flex items-center justify-between">
                              <Label className="text-xs">{t("description")}</Label>
                              <CharCount value={embed.description} max={4096} />
                            </div>
                            <Textarea
                              value={embed.description}
                              onChange={e => setEmbedField(embed.editorId, "description", e.target.value)}
                              maxLength={4096}
                              rows={5}
                              className={compactTextareaClassName}
                              placeholder={t("descriptionPlaceholder")}
                            />
                          </Field>
                        </div>
                      </CollapsibleSection>

                      <CollapsibleSection title={`${t("fieldsSection")} (${embed.fields.length}/25)`} open={embed.openSections.fields} onToggle={() => toggleSection(embed.editorId, "fields")}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-end">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addField(embed.editorId)} disabled={embed.fields.length >= 25}>
                              <Plus className="h-3.5 w-3.5 mr-1" />{t("addField")}
                            </Button>
                          </div>
                          {embed.fields.map((field, fieldIndex) => (
                            <div key={field.id} className="rounded-lg border border-border/80 bg-card p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">{t("field")} {fieldIndex + 1}</span>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(embed.editorId, field.id, -1)} disabled={fieldIndex === 0}>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(embed.editorId, field.id, 1)} disabled={fieldIndex === embed.fields.length - 1}>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeField(embed.editorId, field.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">{t("fieldName")}</Label>
                                  <CharCount value={field.name} max={256} />
                                </div>
                                <Input value={field.name} onChange={e => updateField(embed.editorId, field.id, { name: e.target.value })} maxLength={256} className={cn(inputClassName, "h-7 text-xs")} />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">{t("fieldValue")}</Label>
                                  <CharCount value={field.value} max={1024} />
                                </div>
                                <Textarea value={field.value} onChange={e => updateField(embed.editorId, field.id, { value: e.target.value })} maxLength={1024} rows={2} className={cn(inputClassName, "text-xs resize-none")} />
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.inline}
                                  onChange={e => updateField(embed.editorId, field.id, { inline: e.target.checked })}
                                  className="h-3.5 w-3.5 rounded border-input accent-primary"
                                />
                                <span className="text-xs text-muted-foreground">{t("fieldInline")}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>

                      <CollapsibleSection title={t("imagesSection")} open={embed.openSections.images} onToggle={() => toggleSection(embed.editorId, "images")}>
                        <div className="space-y-3">
                          <Field label={t("thumbnailUrl")}>
                            <Input value={embed.thumbnailUrl} onChange={e => setEmbedField(embed.editorId, "thumbnailUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
                          </Field>
                          <Field label={t("imageUrl")}>
                            <Input value={embed.imageUrl} onChange={e => setEmbedField(embed.editorId, "imageUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
                          </Field>
                        </div>
                      </CollapsibleSection>

                      <CollapsibleSection title={t("footerSection")} open={embed.openSections.footer} onToggle={() => toggleSection(embed.editorId, "footer")}>
                        <div className="space-y-3">
                          <Field label="">
                            <div className="mb-1 flex items-center justify-between">
                              <Label className="text-xs">{t("footerText")}</Label>
                              <CharCount value={embed.footerText} max={2048} />
                            </div>
                            <Input value={embed.footerText} onChange={e => setEmbedField(embed.editorId, "footerText", e.target.value)} maxLength={2048} className={compactInputClassName} />
                          </Field>
                          <Field label={t("footerIconUrl")}>
                            <Input value={embed.footerIconUrl} onChange={e => setEmbedField(embed.editorId, "footerIconUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
                          </Field>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={embed.includeTimestamp}
                              onChange={e => setEmbedField(embed.editorId, "includeTimestamp", e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-input accent-primary"
                            />
                            <span className="text-sm">{t("timestamp")}</span>
                          </label>
                        </div>
                      </CollapsibleSection>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom padding */}
          <div className="h-4" />
        </div>

        {/* ── Right: preview ── */}
        <div className="flex flex-1 flex-col bg-card">
          <button
            type="button"
            className="flex items-center justify-between border-b border-border px-4 py-3 text-left md:hidden"
            onClick={() => setIsMobilePreviewOpen(prev => !prev)}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("preview")}
            </span>
            {isMobilePreviewOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {isMobilePreviewOpen && (
            <div className="border-b border-border p-4 md:hidden">
              {hasContent ? (
                <DiscordMessagePreview
                  profile={{ name: profile.name || undefined, avatar_url: profile.avatarUrl || undefined }}
                  content={content}
                  embeds={previewEmbeds}
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  {t("previewEmpty")}
                </div>
              )}
            </div>
          )}

          <div className="hidden p-5 md:sticky md:top-0 md:block">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t("preview")}
            </p>
            {hasContent ? (
              <DiscordMessagePreview
                profile={{ name: profile.name || undefined, avatar_url: profile.avatarUrl || undefined }}
                content={content}
                embeds={previewEmbeds}
              />
            ) : (
              <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
                {t("previewEmpty")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-border px-6 py-4 flex justify-end gap-2 shrink-0">
        <Button variant="outline" onClick={onCancel}>{tCommon("cancel")}</Button>
        <Button onClick={handleSave} disabled={isSaving || !hasContent}>
          {isSaving && <span className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />}
          {tCommon("save")}
        </Button>
      </div>

      <Dialog open={importExportOpen} onOpenChange={setImportExportOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("importExport")}</DialogTitle>
            <DialogDescription>{t("importExportDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("importFromDiscohook")}</Label>
              <div className="flex gap-2">
                <Input
                  value={importUrl}
                  onChange={e => { setImportUrl(e.target.value); setImportError(false); }}
                  placeholder="https://discohook.app/?data=..."
                  className={cn(inputClassName, "text-xs h-8", importError && "border-destructive")}
                />
                <Button size="sm" variant="secondary" className="h-8 shrink-0" onClick={handleImport}>
                  <Link2 className="h-3.5 w-3.5 mr-1" />{t("import")}
                </Button>
              </div>
              {importError && <p className="text-xs text-destructive">{t("importError")}</p>}
            </div>
            <Button type="button" variant="outline" className="w-full justify-start" onClick={handleCopyDiscohookUrl}>
              {copiedDiscohook ? <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {t("copyDiscohookUrl")}
            </Button>
            <Button type="button" asChild variant="outline" className="w-full justify-start">
              <a href={discohookUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("openInDiscohook")}
              </a>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportExportOpen(false)}>{tCommon("close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function duplicateEmbedState(embed: EmbedFormState): EmbedFormState {
  return {
    ...embed,
    editorId: uid(),
    openSections: createCollapsedSectionState(),
    fields: embed.fields.map((field) => ({ ...field, id: uid() })),
  };
}
