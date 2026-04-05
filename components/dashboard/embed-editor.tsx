"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Plus, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DiscordEmbedPreview, extractFirstEmbed, type DiscordEmbed } from "./discord-embed-preview";

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

export interface EmbedEditorProps {
  initialData?: Record<string, unknown> | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  isSaving: boolean;
  onCancel: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
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

function payloadToState(data: Record<string, unknown>): EmbedFormState {
  const embed = extractFirstEmbed(data) as any ?? {};
  return {
    color: embed.color != null ? intToHex(embed.color as number) : "#5865f2",
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

function stateToEmbed(s: EmbedFormState): DiscordEmbed {
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

/** Outputs the Discohook-compatible payload stored in MongoDB */
export function stateToPayload(s: EmbedFormState): Record<string, unknown> {
  return { messages: [{ data: { content: null, embeds: [stateToEmbed(s)] } }] };
}

function parseDiscohookUrl(url: string): Record<string, unknown> | null {
  try {
    const match = url.match(/[?&]data=([^&\s]+)/);
    if (!match) return null;
    return JSON.parse(decodeURIComponent(escape(atob(match[1]))));
  } catch { return null; }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
      {children}
    </p>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  return (
    <span className={cn("text-[11px] tabular-nums", len > max ? "text-destructive" : "text-muted-foreground")}>
      {len}/{max}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EmbedEditor({ initialData, onSave, isSaving, onCancel }: EmbedEditorProps) {
  const t = useTranslations("EmbedEditor");
  const tCommon = useTranslations("Common");

  const [state, setState] = useState<EmbedFormState>(() =>
    initialData ? payloadToState(initialData) : defaultState()
  );
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState(false);

  const set = <K extends keyof EmbedFormState>(key: K, value: EmbedFormState[K]) =>
    setState(prev => ({ ...prev, [key]: value }));

  // ── Field management ────────────────────────────────────────────────────────

  const addField = () => {
    if (state.fields.length >= 25) return;
    setState(prev => ({ ...prev, fields: [...prev.fields, { id: uid(), name: "", value: "", inline: false }] }));
  };

  const updateField = (id: string, patch: Partial<FieldState>) =>
    setState(prev => ({ ...prev, fields: prev.fields.map(f => f.id === id ? { ...f, ...patch } : f) }));

  const removeField = (id: string) =>
    setState(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));

  const moveField = (id: string, dir: -1 | 1) =>
    setState(prev => {
      const arr = [...prev.fields];
      const idx = arr.findIndex(f => f.id === id);
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return prev;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...prev, fields: arr };
    });

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = () => {
    const parsed = parseDiscohookUrl(importUrl.trim());
    if (!parsed) { setImportError(true); return; }
    setImportError(false);
    setImportUrl("");
    setState(payloadToState(parsed));
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = () => onSave(stateToPayload(state));

  const preview = stateToEmbed(state);
  const hasContent = !!(state.title || state.description || state.authorName || state.footerText || state.fields.length);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Two-column body */}
      <div className="flex flex-1 gap-0 min-h-0 overflow-hidden">

        {/* ── Left: form ── */}
        <div className="w-[45%] overflow-y-auto border-r border-border pr-6 pl-6 py-5 space-y-5">

          {/* Import from Discohook */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
            <SectionLabel>{t("importSection")}</SectionLabel>
            <div className="flex gap-2">
              <Input
                value={importUrl}
                onChange={e => { setImportUrl(e.target.value); setImportError(false); }}
                placeholder="https://discohook.app/?data=..."
                className={cn("text-xs h-8", importError && "border-destructive")}
              />
              <Button size="sm" variant="secondary" className="h-8 shrink-0" onClick={handleImport}>
                <Link2 className="h-3.5 w-3.5 mr-1" />{t("import")}
              </Button>
            </div>
            {importError && <p className="text-xs text-destructive">{t("importError")}</p>}
          </div>

          <Separator />

          {/* Color */}
          <div>
            <SectionLabel>{t("colorSection")}</SectionLabel>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.color || "#5865f2"}
                onChange={e => set("color", e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5"
              />
              <Input
                value={state.color}
                onChange={e => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) set("color", v);
                }}
                className="font-mono text-sm w-28"
                maxLength={7}
              />
            </div>
          </div>

          <Separator />

          {/* Author */}
          <div className="space-y-3">
            <SectionLabel>{t("authorSection")}</SectionLabel>
            <Field label={t("authorName")}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground" />
                <CharCount value={state.authorName} max={256} />
              </div>
              <Input value={state.authorName} onChange={e => set("authorName", e.target.value)} maxLength={256} className="h-8 text-sm" />
            </Field>
            <Field label={t("authorIconUrl")}>
              <Input value={state.authorIconUrl} onChange={e => set("authorIconUrl", e.target.value)} placeholder="https://..." className="h-8 text-sm" />
            </Field>
            <Field label={t("authorUrl")}>
              <Input value={state.authorUrl} onChange={e => set("authorUrl", e.target.value)} placeholder="https://..." className="h-8 text-sm" />
            </Field>
          </div>

          <Separator />

          {/* Title & Description */}
          <div className="space-y-3">
            <SectionLabel>{t("bodySection")}</SectionLabel>
            <Field label={t("title")}>
              <div className="flex justify-between items-center mb-1">
                <span />
                <CharCount value={state.title} max={256} />
              </div>
              <Input value={state.title} onChange={e => set("title", e.target.value)} maxLength={256} className="h-8 text-sm" />
            </Field>
            <Field label={t("titleUrl")}>
              <Input value={state.titleUrl} onChange={e => set("titleUrl", e.target.value)} placeholder="https://..." className="h-8 text-sm" />
            </Field>
            <Field label={t("description")}>
              <div className="flex justify-end mb-1">
                <CharCount value={state.description} max={4096} />
              </div>
              <Textarea
                value={state.description}
                onChange={e => set("description", e.target.value)}
                maxLength={4096}
                rows={5}
                className="text-sm resize-none"
                placeholder={t("descriptionPlaceholder")}
              />
            </Field>
          </div>

          <Separator />

          {/* Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel>{t("fieldsSection")} ({state.fields.length}/25)</SectionLabel>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addField} disabled={state.fields.length >= 25}>
                <Plus className="h-3.5 w-3.5 mr-1" />{t("addField")}
              </Button>
            </div>
            {state.fields.map((field, idx) => (
              <div key={field.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{t("field")} {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(field.id, -1)} disabled={idx === 0}>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(field.id, 1)} disabled={idx === state.fields.length - 1}>
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
                  <Input value={field.name} onChange={e => updateField(field.id, { name: e.target.value })} maxLength={256} className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-xs">{t("fieldValue")}</Label>
                    <CharCount value={field.value} max={1024} />
                  </div>
                  <Textarea value={field.value} onChange={e => updateField(field.id, { value: e.target.value })} maxLength={1024} rows={2} className="text-xs resize-none" />
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

          <Separator />

          {/* Images */}
          <div className="space-y-3">
            <SectionLabel>{t("imagesSection")}</SectionLabel>
            <Field label={t("thumbnailUrl")}>
              <Input value={state.thumbnailUrl} onChange={e => set("thumbnailUrl", e.target.value)} placeholder="https://..." className="h-8 text-sm" />
            </Field>
            <Field label={t("imageUrl")}>
              <Input value={state.imageUrl} onChange={e => set("imageUrl", e.target.value)} placeholder="https://..." className="h-8 text-sm" />
            </Field>
          </div>

          <Separator />

          {/* Footer */}
          <div className="space-y-3">
            <SectionLabel>{t("footerSection")}</SectionLabel>
            <Field label={t("footerText")}>
              <div className="flex justify-end mb-1">
                <CharCount value={state.footerText} max={2048} />
              </div>
              <Input value={state.footerText} onChange={e => set("footerText", e.target.value)} maxLength={2048} className="h-8 text-sm" />
            </Field>
            <Field label={t("footerIconUrl")}>
              <Input value={state.footerIconUrl} onChange={e => set("footerIconUrl", e.target.value)} placeholder="https://..." className="h-8 text-sm" />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.includeTimestamp}
                onChange={e => set("includeTimestamp", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input accent-primary"
              />
              <span className="text-sm">{t("timestamp")}</span>
            </label>
          </div>

          {/* Bottom padding */}
          <div className="h-4" />
        </div>

        {/* ── Right: preview ── */}
        <div className="flex-1 overflow-y-auto bg-muted/10 flex flex-col">
          <div className="p-5 sticky top-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t("preview")}
            </p>
            {hasContent ? (
              <DiscordEmbedPreview embed={preview} />
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
    </div>
  );
}
