"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, ChevronUp, Copy, ExternalLink, Plus, Trash2, Link2 } from "lucide-react";
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
import { DiscordEmbedPreview, extractEmbeds, type DiscordEmbed } from "./discord-embed-preview";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldState {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

interface EmbedFormState {
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

type SectionKey = "color" | "author" | "body" | "fields" | "images" | "footer";
const MAX_DISCORD_EMBEDS_PER_MESSAGE = 10;

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

function payloadToEditorState(data: Record<string, unknown>): { embeds: EmbedFormState[] } {
  const embeds = extractEmbeds(data);
  if (embeds.length === 0) return { embeds: [defaultState()] };
  return { embeds: embeds.map(embedToState) };
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
export function stateToPayload(states: EmbedFormState[]): Record<string, unknown> {
  const embeds = states
    .map(stateToEmbed)
    .filter(hasMeaningfulEmbedContent)
    .slice(0, MAX_DISCORD_EMBEDS_PER_MESSAGE);
  return {
    embeds,
    messages: [{ data: { content: null, embeds } }],
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
      <Label className="text-xs">{label}</Label>
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
    <div className="rounded-lg border border-border/80 bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <SectionLabel>{title}</SectionLabel>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
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
  const [activeEmbedIndex, setActiveEmbedIndex] = useState(0);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    color: true,
    author: true,
    body: true,
    fields: true,
    images: true,
    footer: true,
  });
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [copiedDiscohook, setCopiedDiscohook] = useState(false);

  const activeEmbed = embeds[activeEmbedIndex] ?? defaultState();

  const setActiveField = <K extends keyof EmbedFormState>(key: K, value: EmbedFormState[K]) =>
    setEmbeds(prev => prev.map((embed, i) => i === activeEmbedIndex ? { ...embed, [key]: value } : embed));

  const updateActiveEmbed = (updater: (embed: EmbedFormState) => EmbedFormState) =>
    setEmbeds((prev) => prev.map((embed, i) => (i === activeEmbedIndex ? updater(embed) : embed)));

  const toggleSection = (section: SectionKey) =>
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));

  const addEmbed = () => {
    setEmbeds(prev => {
      if (prev.length >= MAX_DISCORD_EMBEDS_PER_MESSAGE) return prev;
      setActiveEmbedIndex(prev.length);
      return [...prev, defaultState()];
    });
  };

  const removeActiveEmbed = () => {
    setEmbeds(prev => {
      if (prev.length <= 1) {
        setActiveEmbedIndex(0);
        return [defaultState()];
      }
      const nextEmbeds = prev.filter((_, i) => i !== activeEmbedIndex);
      setActiveEmbedIndex(Math.max(0, activeEmbedIndex - 1));
      return nextEmbeds;
    });
  };

  // ── Field management ────────────────────────────────────────────────────────

  const addField = () => {
    if (activeEmbed.fields.length >= 25) return;
    updateActiveEmbed((embed) => ({
      ...embed,
      fields: [...embed.fields, { id: uid(), name: "", value: "", inline: false }],
    }));
  };

  const updateField = (id: string, patch: Partial<FieldState>) =>
    updateActiveEmbed((embed) => ({ ...embed, fields: patchField(embed.fields, id, patch) }));

  const removeField = (id: string) =>
    updateActiveEmbed((embed) => ({ ...embed, fields: removeFieldById(embed.fields, id) }));

  const moveField = (id: string, dir: -1 | 1) =>
    updateActiveEmbed((embed) => ({ ...embed, fields: reorderFieldById(embed.fields, id, dir) }));

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = () => {
    const parsed = parseDiscohookUrl(importUrl.trim());
    if (!parsed) { setImportError(true); return; }
    const editorState = payloadToEditorState(parsed);
    setImportError(false);
    setImportUrl("");
    setEmbeds(editorState.embeds);
    setActiveEmbedIndex(0);
    setImportExportOpen(false);
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = () => onSave(stateToPayload(embeds));

  const discohookPayload = stateToPayload(embeds);
  const discohookUrl = buildDiscohookUrl(discohookPayload);
  const previewEmbeds = embeds.map(stateToEmbed).filter(hasMeaningfulEmbedContent);
  const hasContent = previewEmbeds.length > 0;

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
        <div className="w-full overflow-y-auto border-b border-border bg-card px-4 py-5 space-y-5 md:w-[45%] md:border-b-0 md:border-r md:px-6">

          <Button size="sm" variant="secondary" className="h-8" onClick={() => setImportExportOpen(true)}>
            <Link2 className="h-3.5 w-3.5 mr-1" />{t("importExport")}
          </Button>

          <Separator />

          {/* Embed selector */}
          <div className="rounded-lg border border-border/80 bg-card p-3 space-y-2">
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
            <div className="space-y-1.5">
              {embeds.map((embed, i) => {
                const label = embed.title.trim() || embed.description.trim().slice(0, 40) || `Embed ${i + 1}`;
                const isActive = i === activeEmbedIndex;
                return (
                  <button
                    key={`${label}-${i}`} // NOSONAR — index keeps duplicate labels distinct
                    type="button"
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                      isActive ? "border-primary/60 bg-primary/10" : "border-border/80 hover:bg-accent/20"
                    )}
                    onClick={() => setActiveEmbedIndex(i)}
                  >
                    {`Embed ${i + 1}: ${label}`}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={removeActiveEmbed}
                disabled={embeds.length <= 1}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />Remove Active
              </Button>
            </div>
          </div>

          <CollapsibleSection title={t("colorSection")} open={openSections.color} onToggle={() => toggleSection("color")}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={activeEmbed.color || "#5865f2"}
                onChange={e => setActiveField("color", e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5"
              />
              <Input
                value={activeEmbed.color}
                onChange={e => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setActiveField("color", v);
                }}
                className={cn(inputClassName, "font-mono text-sm w-28")}
                maxLength={7}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t("authorSection")} open={openSections.author} onToggle={() => toggleSection("author")}>
            <div className="space-y-3">
              <Field label={t("authorName")}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground" />
                  <CharCount value={activeEmbed.authorName} max={256} />
                </div>
                <Input value={activeEmbed.authorName} onChange={e => setActiveField("authorName", e.target.value)} maxLength={256} className={compactInputClassName} />
              </Field>
              <Field label={t("authorIconUrl")}>
                <Input value={activeEmbed.authorIconUrl} onChange={e => setActiveField("authorIconUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
              </Field>
              <Field label={t("authorUrl")}>
                <Input value={activeEmbed.authorUrl} onChange={e => setActiveField("authorUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
              </Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t("bodySection")} open={openSections.body} onToggle={() => toggleSection("body")}>
            <div className="space-y-3">
              <Field label={t("title")}>
                <div className="flex justify-between items-center mb-1">
                  <span />
                  <CharCount value={activeEmbed.title} max={256} />
                </div>
                <Input value={activeEmbed.title} onChange={e => setActiveField("title", e.target.value)} maxLength={256} className={compactInputClassName} />
              </Field>
              <Field label={t("titleUrl")}>
                <Input value={activeEmbed.titleUrl} onChange={e => setActiveField("titleUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
              </Field>
              <Field label={t("description")}>
                <div className="flex justify-end mb-1">
                  <CharCount value={activeEmbed.description} max={4096} />
                </div>
                <Textarea
                  value={activeEmbed.description}
                  onChange={e => setActiveField("description", e.target.value)}
                  maxLength={4096}
                  rows={5}
                  className={compactTextareaClassName}
                  placeholder={t("descriptionPlaceholder")}
                />
              </Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={`${t("fieldsSection")} (${activeEmbed.fields.length}/25)`} open={openSections.fields} onToggle={() => toggleSection("fields")}>
            <div className="space-y-3">
              <div className="flex items-center justify-end">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addField} disabled={activeEmbed.fields.length >= 25}>
                  <Plus className="h-3.5 w-3.5 mr-1" />{t("addField")}
                </Button>
              </div>
              {activeEmbed.fields.map((field, idx) => (
                <div key={field.id} className="rounded-lg border border-border/80 bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{t("field")} {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(field.id, -1)} disabled={idx === 0}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(field.id, 1)} disabled={idx === activeEmbed.fields.length - 1}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeField(field.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t("fieldName")}</Label>
                      <CharCount value={field.name} max={256} />
                    </div>
                    <Input value={field.name} onChange={e => updateField(field.id, { name: e.target.value })} maxLength={256} className={cn(inputClassName, "h-7 text-xs")} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t("fieldValue")}</Label>
                      <CharCount value={field.value} max={1024} />
                    </div>
                    <Textarea value={field.value} onChange={e => updateField(field.id, { value: e.target.value })} maxLength={1024} rows={2} className={cn(inputClassName, "text-xs resize-none")} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.inline}
                      onChange={e => updateField(field.id, { inline: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    <span className="text-xs text-muted-foreground">{t("fieldInline")}</span>
                  </label>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t("imagesSection")} open={openSections.images} onToggle={() => toggleSection("images")}>
            <div className="space-y-3">
              <Field label={t("thumbnailUrl")}>
                <Input value={activeEmbed.thumbnailUrl} onChange={e => setActiveField("thumbnailUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
              </Field>
              <Field label={t("imageUrl")}>
                <Input value={activeEmbed.imageUrl} onChange={e => setActiveField("imageUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
              </Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t("footerSection")} open={openSections.footer} onToggle={() => toggleSection("footer")}>
            <div className="space-y-3">
              <Field label={t("footerText")}>
                <div className="flex justify-end mb-1">
                  <CharCount value={activeEmbed.footerText} max={2048} />
                </div>
                <Input value={activeEmbed.footerText} onChange={e => setActiveField("footerText", e.target.value)} maxLength={2048} className={compactInputClassName} />
              </Field>
              <Field label={t("footerIconUrl")}>
                <Input value={activeEmbed.footerIconUrl} onChange={e => setActiveField("footerIconUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
              </Field>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeEmbed.includeTimestamp}
                  onChange={e => setActiveField("includeTimestamp", e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-input accent-primary"
                />
                <span className="text-sm">{t("timestamp")}</span>
              </label>
            </div>
          </CollapsibleSection>

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
                <div className="space-y-2">
                  {previewEmbeds.map((embed, i) => (
                    <DiscordEmbedPreview
                      key={`${embed.title ?? "embed"}-${i}`} // NOSONAR — index keeps order-stable previews for duplicate embeds
                      embed={embed}
                    />
                  ))}
                </div>
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
              <div className="space-y-2">
                {previewEmbeds.map((embed, i) => (
                  <DiscordEmbedPreview
                    key={`${embed.title ?? "embed"}-${i}`} // NOSONAR — index keeps order-stable previews for duplicate embeds
                    embed={embed}
                  />
                ))}
              </div>
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
