"use client";

import { decompressFromEncodedURIComponent, decompressFromBase64 } from 'lz-string';
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Copy, ExternalLink, Loader2, Plus, Trash2, Link2 } from "lucide-react";
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
import {
  DiscordMessagePreview,
  extractEmbeds,
  extractMessageProfile,
  IS_COMPONENTS_V2_FLAG,
  COMPONENT_TYPE,
  type DiscordEmbed,
  type TopLevelComponent,
  type ContainerChild,
  type SelectMenuComponent,
} from "./discord-embed-preview";

// Shared compact class names used across V2 sub-editor components
const COMPACT_INPUT_CN = "bg-background border-border/80 h-8 text-sm";
const COMPACT_TEXTAREA_CN = "bg-background border-border/80 text-sm resize-none";

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

// ─── Components V2 state types ────────────────────────────────────────────────

interface TextDisplayState { id: string; type: "text_display"; content: string }
interface SeparatorState { id: string; type: "separator"; divider: boolean; spacing: "small" | "large" }
interface MediaGalleryItemState { id: string; url: string; description: string; spoiler: boolean }
interface MediaGalleryState { id: string; type: "media_gallery"; items: MediaGalleryItemState[] }
interface SectionState {
  id: string;
  type: "section";
  texts: TextDisplayState[];
  accessoryType: "none" | "thumbnail" | "button";
  thumbnailUrl: string;
  thumbnailDescription: string;
  buttonLabel: string;
  buttonStyle: 1 | 2 | 3 | 4 | 5;
  buttonUrl: string;
  buttonCustomId: string;
  buttonDisabled: boolean;
}
/** Preserves unknown V2 component types (e.g. Action Rows with buttons) for round-trip import/export. */
interface RawComponentState { id: string; type: "raw"; rawType: number; rawData: Record<string, unknown> }
interface ButtonState { id: string; customId: string; label: string; style: 1 | 2 | 3 | 4 | 5; url: string; disabled: boolean }
interface SelectOptionState { id: string; label: string; value: string; description: string; isDefault: boolean }
interface StringSelectState { id: string; type: "string_select"; customId: string; placeholder: string; minValues: number; maxValues: number; disabled: boolean; options: SelectOptionState[] }
interface GenericSelectState { id: string; type: "user_select" | "role_select" | "mentionable_select" | "channel_select"; customId: string; placeholder: string; minValues: number; maxValues: number; disabled: boolean }
type SelectMenuEditorState = StringSelectState | GenericSelectState;
interface ActionRowState { id: string; type: "action_row"; buttons: ButtonState[]; selectMenu?: SelectMenuEditorState }
type ContainerChildState = TextDisplayState | SeparatorState | MediaGalleryState | SectionState | ActionRowState | StringSelectState | GenericSelectState;
interface ContainerState {
  id: string;
  type: "container";
  accentColor: string;
  spoiler?: boolean;
  children: ContainerChildState[];
}
type TopLevelComponentState = ContainerState | TextDisplayState | SeparatorState | MediaGalleryState | SectionState | ActionRowState | StringSelectState | GenericSelectState | RawComponentState;

interface MessageState {
  id: string;
  mode: "v1" | "v2";
  embeds: EmbedFormState[];
  content: string;
  components: TopLevelComponentState[];
}

type SectionKey = "author" | "body" | "fields" | "images" | "footer";
const MAX_DISCORD_EMBEDS_PER_MESSAGE = 10;
const MAX_DISCORD_MESSAGE_CONTENT_LENGTH = 2000;
const MAX_PROFILE_NAME_LENGTH = 80;

interface MessageProfileState {
  name: string;
  avatarUrl: string;
}

export const EMPTY_MESSAGE_PROFILE: MessageProfileState = { name: "", avatarUrl: "" };

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

// ─── Components V2 serialization ──────────────────────────────────────────────

function hexToIntSafe(hex: string): number | null {
  const val = Number.parseInt(hex.replace("#", ""), 16);
  return Number.isNaN(val) ? null : val;
}

function serializeSelectMenu(s: SelectMenuEditorState): Record<string, unknown> {
  const typeMap: Record<string, number> = { string_select: 3, user_select: 5, role_select: 6, mentionable_select: 7, channel_select: 8 };
  const base: Record<string, unknown> = {
    type: typeMap[s.type],
    custom_id: s.customId,
    ...(s.placeholder ? { placeholder: s.placeholder } : {}),
    ...(s.minValues !== 1 ? { min_values: s.minValues } : {}),
    ...(s.maxValues !== 1 ? { max_values: s.maxValues } : {}),
    ...(s.disabled ? { disabled: true } : {}),
  };
  if (s.type === "string_select") {
    base.options = s.options.map(opt => ({
      label: opt.label || "\u200b",
      value: opt.value || opt.id,
      ...(opt.description ? { description: opt.description } : {}),
      ...(opt.isDefault ? { default: true } : {}),
    }));
  }
  return base;
}

export function serializeComponentState(s: TopLevelComponentState): TopLevelComponent | null {
  switch (s.type) {
    case "action_row": {
      if (s.selectMenu) {
        return { type: 1, components: [serializeSelectMenu(s.selectMenu)] } as unknown as TopLevelComponent;
      }
      if (s.buttons.length === 0) return null;
      return {
        type: 1,
        components: s.buttons.map(btn => ({
          type: 2,
          style: btn.style,
          ...(btn.label ? { label: btn.label } : {}),
          ...(btn.style === 5 ? (btn.url ? { url: btn.url } : {}) : { custom_id: btn.customId }),
          ...(btn.disabled ? { disabled: true } : {}),
        })),
      } as unknown as TopLevelComponent;
    }
    case "string_select":
    case "user_select":
    case "role_select":
    case "mentionable_select":
    case "channel_select":
      return { type: 1, components: [serializeSelectMenu(s)] } as unknown as TopLevelComponent;
    case "raw":
      return s.rawData as unknown as TopLevelComponent;
    case "container": {
      const accent = hexToIntSafe(s.accentColor);
      return {
        type: 17,
        accent_color: accent ?? undefined,
        ...(s.spoiler ? { spoiler: true } : {}),
        components: s.children.map(child => serializeComponentState(child)).filter((c): c is ContainerChild => c !== null),
      };
    }
    case "text_display":
      return { type: 10, content: s.content };
    case "separator":
      return { type: 14, divider: s.divider, spacing: s.spacing === "large" ? 2 : 1 };
    case "media_gallery":
      return {
        type: 12,
        items: s.items.map(item => ({
          media: { url: item.url },
          ...(item.description.trim() ? { description: item.description.trim() } : {}),
          ...(item.spoiler ? { spoiler: true } : {}),
        })),
      };
    case "section": {
      const texts = s.texts.filter(t => t.content.trim()).map(t => ({ type: 10 as const, content: t.content }));
      let accessory: Record<string, unknown> | null = null;
      if (s.accessoryType === "thumbnail" && s.thumbnailUrl.trim()) {
        accessory = { type: 11, media: { url: s.thumbnailUrl.trim() }, ...(s.thumbnailDescription.trim() ? { description: s.thumbnailDescription.trim() } : {}) };
      } else if (s.accessoryType === "button") {
        accessory = {
          type: 2,
          style: s.buttonStyle,
          ...(s.buttonLabel.trim() ? { label: s.buttonLabel.trim() } : {}),
          ...(s.buttonStyle === 5 ? (s.buttonUrl.trim() ? { url: s.buttonUrl.trim() } : {}) : { custom_id: s.buttonCustomId }),
          ...(s.buttonDisabled ? { disabled: true } : {}),
        };
      }
      return { type: 9, components: texts, ...(accessory ? { accessory } : {}) };
    }
  }
}

function parseSelectMenu(c: any): SelectMenuEditorState {
  const typeMap: Record<number, SelectMenuEditorState["type"]> = { 3: "string_select", 5: "user_select", 6: "role_select", 7: "mentionable_select", 8: "channel_select" };
  const type = typeMap[c.type] ?? "string_select";
  const base = {
    id: uid(),
    customId: c.custom_id ?? uid(),
    placeholder: c.placeholder ?? "",
    minValues: typeof c.min_values === "number" ? c.min_values : 1,
    maxValues: typeof c.max_values === "number" ? c.max_values : 1,
    disabled: c.disabled === true,
  };
  if (type === "string_select") {
    return {
      ...base,
      type: "string_select" as const,
      options: (c.options ?? []).map((opt: any) => ({
        id: uid(),
        label: opt.label ?? "",
        value: opt.value ?? "",
        description: opt.description ?? "",
        isDefault: opt.default === true,
      })),
    };
  }
  return { ...base, type: type as "user_select" | "role_select" | "mentionable_select" | "channel_select" };
}

export function parseComponentState(c: TopLevelComponent): TopLevelComponentState {
  switch (c.type) {
    case 17: return {
      id: uid(),
      type: "container",
      accentColor: c.accent_color == null ? "" : `#${c.accent_color.toString(16).padStart(6, "0")}`,
      spoiler: (c as any).spoiler === true,
      children: (c.components ?? []).map(child => parseComponentState(child as TopLevelComponent) as ContainerChildState),
    };
    case 10: return { id: uid(), type: "text_display", content: c.content ?? "" };
    case 14: return { id: uid(), type: "separator", divider: (c as any).divider !== false, spacing: (c as any).spacing === 2 ? "large" : "small" };
    case 12: return {
      id: uid(),
      type: "media_gallery",
      items: ((c as any).items ?? []).map((item: any) => ({ id: uid(), url: item.media?.url ?? "", description: item.description ?? "", spoiler: item.spoiler ?? false })),
    };
    case 9: {
      const sec = c as any;
      const accType = sec.accessory?.type === 11 && sec.accessory?.media?.url
        ? "thumbnail"
        : sec.accessory?.type === 2
        ? "button"
        : "none";
      return {
        id: uid(),
        type: "section",
        texts: (sec.components ?? []).filter((ch: any) => ch.type === COMPONENT_TYPE.TEXT_DISPLAY).map((ch: any) => ({ id: uid(), type: "text_display" as const, content: ch.content ?? "" })),
        accessoryType: accType,
        thumbnailUrl: sec.accessory?.type === 11 ? sec.accessory?.media?.url ?? "" : "",
        thumbnailDescription: sec.accessory?.type === 11 ? sec.accessory?.description ?? "" : "",
        buttonLabel: sec.accessory?.type === 2 ? sec.accessory?.label ?? "" : "",
        buttonStyle: sec.accessory?.type === 2 ? (sec.accessory?.style ?? 2) : 2,
        buttonUrl: sec.accessory?.type === 2 ? sec.accessory?.url ?? "" : "",
        buttonCustomId: sec.accessory?.type === 2 ? (sec.accessory?.custom_id ?? uid()) : uid(),
        buttonDisabled: sec.accessory?.type === 2 ? sec.accessory?.disabled === true : false,
      };
    }
    case 1: {
      const arComponents = (c as any).components ?? [];
      const selectTypes = [3, 5, 6, 7, 8];
      const selectComp = arComponents.find((x: any) => selectTypes.includes(x.type));
      if (selectComp) {
        return {
          id: uid(),
          type: "action_row",
          buttons: [],
          selectMenu: parseSelectMenu(selectComp),
        };
      }
      return {
        id: uid(),
        type: "action_row",
        buttons: arComponents
          .filter((b: any) => b.type === 2)
          .map((b: any) => ({
            id: uid(),
            customId: b.custom_id ?? uid(),
            label: b.label ?? "",
            style: ([1, 2, 3, 4, 5].includes(b.style) ? b.style : 2) as 1 | 2 | 3 | 4 | 5,
            url: b.url ?? "",
            disabled: b.disabled ?? false,
          })),
      };
    }
    case 3: return parseSelectMenu(c as any) as unknown as TopLevelComponentState;
    case 5: return parseSelectMenu(c as any) as unknown as TopLevelComponentState;
    case 6: return parseSelectMenu(c as any) as unknown as TopLevelComponentState;
    case 7: return parseSelectMenu(c as any) as unknown as TopLevelComponentState;
    case 8: return parseSelectMenu(c as any) as unknown as TopLevelComponentState;
    default: return { id: uid(), type: "raw", rawType: (c as { type: number }).type, rawData: c as unknown as Record<string, unknown> };
  }
}

function createDefaultV2Component(type: TopLevelComponentState["type"]): TopLevelComponentState {
  switch (type) {
    case "container": return { id: uid(), type: "container", accentColor: "", spoiler: false, children: [] };
    case "text_display": return { id: uid(), type: "text_display", content: "" };
    case "separator": return { id: uid(), type: "separator", divider: true, spacing: "small" };
    case "media_gallery": return { id: uid(), type: "media_gallery", items: [] };
    case "section": return {
      id: uid(), type: "section",
      texts: [{ id: uid(), type: "text_display", content: "" }],
      accessoryType: "none", thumbnailUrl: "", thumbnailDescription: "",
      buttonLabel: "", buttonStyle: 2, buttonUrl: "", buttonCustomId: uid(), buttonDisabled: false,
    };
    case "action_row": return { id: uid(), type: "action_row", buttons: [] };
    case "string_select": return { id: uid(), type: "string_select", customId: uid(), placeholder: "", minValues: 1, maxValues: 1, disabled: false, options: [] };
    case "user_select": return { id: uid(), type: "user_select", customId: uid(), placeholder: "", minValues: 1, maxValues: 1, disabled: false };
    case "role_select": return { id: uid(), type: "role_select", customId: uid(), placeholder: "", minValues: 1, maxValues: 1, disabled: false };
    case "mentionable_select": return { id: uid(), type: "mentionable_select", customId: uid(), placeholder: "", minValues: 1, maxValues: 1, disabled: false };
    case "channel_select": return { id: uid(), type: "channel_select", customId: uid(), placeholder: "", minValues: 1, maxValues: 1, disabled: false };
    case "raw": return { id: uid(), type: "raw", rawType: 0, rawData: {} };
  }
}

export function payloadToMessages(data: Record<string, unknown>): { messages: MessageState[]; profile: MessageProfileState } {
  const profile = extractMessageProfile(data);
  const mappedProfile: MessageProfileState = {
    name: (profile?.name ?? "").slice(0, MAX_PROFILE_NAME_LENGTH),
    avatarUrl: profile?.avatar_url ?? "",
  };

  const rawMessages = (data as { messages?: unknown[] }).messages;
  if (Array.isArray(rawMessages) && rawMessages.length > 0) {
    return {
      messages: rawMessages.map(rawMsg => {
        const msgData: Record<string, unknown> = (rawMsg as { data?: Record<string, unknown> })?.data ?? {};
        const rawMsgFlags = (rawMsg as { flags?: unknown }).flags;
        let flags = 0;
        if (typeof msgData.flags === "number") flags = msgData.flags;
        else if (typeof rawMsgFlags === "number") flags = rawMsgFlags;
        const isV2 = (flags & IS_COMPONENTS_V2_FLAG) !== 0;
        if (isV2) {
          const rawMsgComponents = (rawMsg as { components?: unknown }).components;
          let rawComponents: TopLevelComponent[];
          if (Array.isArray(msgData.components)) rawComponents = msgData.components as TopLevelComponent[];
          else if (Array.isArray(rawMsgComponents)) rawComponents = rawMsgComponents as TopLevelComponent[];
          else rawComponents = [];
          return {
            id: uid(),
            mode: "v2" as const,
            embeds: [defaultState()],
            content: "",
            components: rawComponents.map(parseComponentState),
          };
        }
        const rawEmbeds = Array.isArray((msgData as any).embeds) ? (msgData as any).embeds as DiscordEmbed[] : [];
        const rawContent = (msgData as any).content;
        return {
          id: uid(),
          mode: "v1" as const,
          embeds: rawEmbeds.length > 0 ? rawEmbeds.map(embedToState) : [defaultState()],
          content: typeof rawContent === "string" ? rawContent.slice(0, MAX_DISCORD_MESSAGE_CONTENT_LENGTH) : "",
          components: [],
        };
      }),
      profile: mappedProfile,
    };
  }

  // Fallback: top-level V2 (e.g. Discohook payloads without messages array)
  const topFlags = typeof (data as any).flags === "number" ? (data as any).flags : 0;
  if ((topFlags & IS_COMPONENTS_V2_FLAG) !== 0) {
    const rawComponents = Array.isArray((data as any).components) ? (data as any).components as TopLevelComponent[] : [];
    return {
      messages: [{
        id: uid(),
        mode: "v2" as const,
        embeds: [defaultState()],
        content: "",
        components: rawComponents.map(parseComponentState),
      }],
      profile: mappedProfile,
    };
  }

  // Fallback: top-level embeds/content (legacy V1 format)
  const rawEmbeds = extractEmbeds(data);
  const rawContent = (data as any).content;
  return {
    messages: [{
      id: uid(),
      mode: "v1" as const,
      embeds: rawEmbeds.length > 0 ? rawEmbeds.map(embedToState) : [defaultState()],
      content: typeof rawContent === "string" ? rawContent.slice(0, MAX_DISCORD_MESSAGE_CONTENT_LENGTH) : "",
      components: [],
    }],
    profile: mappedProfile,
  };
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
export function stateToPayload( // NOSONAR — sequential field assignments, no real logic branches
  messages: MessageState[],
  profile: MessageProfileState = EMPTY_MESSAGE_PROFILE,
): Record<string, unknown> {
  const normalizedProfile = {
    name: profile.name.slice(0, MAX_PROFILE_NAME_LENGTH).trim() || null,
    avatar_url: profile.avatarUrl.trim() || null,
  };

  const messageEntries = messages.map(msg => {
    if (msg.mode === "v2") {
      const components = msg.components.map(serializeComponentState).filter((c): c is TopLevelComponent => c !== null);
      return { data: { flags: IS_COMPONENTS_V2_FLAG, components } };
    }
    const embeds = msg.embeds.map(stateToEmbed).filter(hasMeaningfulEmbedContent).slice(0, MAX_DISCORD_EMBEDS_PER_MESSAGE);
    const content = msg.content.slice(0, MAX_DISCORD_MESSAGE_CONTENT_LENGTH);
    const msgData: Record<string, unknown> = { content: content || null, embeds };
    if (normalizedProfile.name) msgData.username = normalizedProfile.name;
    if (normalizedProfile.avatar_url) msgData.avatar_url = normalizedProfile.avatar_url;
    return { data: msgData };
  });

  const firstMsg = messages[0];
  const firstData: Record<string, unknown> = messageEntries[0]?.data ?? { content: null, embeds: [] };
  const payload: Record<string, unknown> = {
    version: "d2",
    messages: messageEntries,
  };
  if (firstMsg?.mode === "v2") {
    payload.flags = IS_COMPONENTS_V2_FLAG;
    payload.components = firstData.components ?? [];
  } else {
    payload.content = firstData.content;
    payload.embeds = firstData.embeds;
    if (normalizedProfile.name) payload.username = normalizedProfile.name;
    if (normalizedProfile.avatar_url) payload.avatar_url = normalizedProfile.avatar_url;
  }
  return payload;
}

function decodeBase64DiscohookPayload(raw: string): string {
  const normalized = raw.replaceAll("-", "+").replaceAll("_", "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${"=".repeat(paddingLength)}`;
  return new TextDecoder().decode(Uint8Array.from(atob(padded), c => c.codePointAt(0) ?? 0));
}

export function parseDiscohookUrl(url: string): Record<string, unknown> | null {
  try {
    const match = /[?&]data=([^&\s]+)/.exec(url);
    if (!match) return null;
    const raw = match[1];
    const decoded = decodeURIComponent(raw);

    // 1. New Discohook format: base64url
    try {
      const json = decodeBase64DiscohookPayload(decoded);
      if (json) return JSON.parse(json);
    } catch { /* fall through */ }

    // 2. Discohook legacy format: LZString.compressToEncodedURIComponent
    try {
      const json = decompressFromEncodedURIComponent(raw);
      if (json) return JSON.parse(json);
    } catch { /* fall through */ }

    // 3. LZString.compressToBase64 variant
    try {
      const json = decompressFromBase64(decoded);
      if (json) return JSON.parse(json);
    } catch { /* fall through */ }

    return null;
  } catch { return null; }
}

export function requiresDiscohookResolve(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "share.discohook.app" ||
      (parsed.hostname === "discohook.app" && parsed.searchParams.has("share"));
  } catch {
    return false;
  }
}

function base64UrlEncode(utf8: string): string {
  const percentEncoded = encodeURIComponent(utf8);
  const escaped = percentEncoded.replace(/%[\dA-Fa-f]{2}/g, (hex) =>
    String.fromCharCode(Number.parseInt(hex.slice(1), 16)),
  );
  return btoa(escaped).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function buildDiscohookUrl(data: Record<string, unknown>): string {
  const encoded = base64UrlEncode(JSON.stringify(data));
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

// ─── V2 component sub-editors ─────────────────────────────────────────────────

function SeparatorEditorFields({ comp, onChange }: {
  readonly comp: SeparatorState;
  readonly onChange: (updated: SeparatorState) => void;
}) {
  const t = useTranslations("EmbedEditor");
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={comp.divider}
          onChange={e => onChange({ ...comp, divider: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-input accent-primary" />
        <span className="text-xs text-muted-foreground">{t("dividerLine")}</span>
      </label>
      <Field label={t("spacing")}>
        <div className="flex gap-2">
          {(["small", "large"] as const).map(s => (
            <button key={s} type="button"
              onClick={() => onChange({ ...comp, spacing: s })}
              className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors",
                comp.spacing === s ? "border-primary/60 bg-primary/10 font-medium" : "border-border/80 text-muted-foreground hover:text-foreground")}>
              {s === "small" ? t("spacingSmall") : t("spacingLarge")}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function MediaGalleryEditorFields({ comp, onChange }: {
  readonly comp: MediaGalleryState;
  readonly onChange: (updated: MediaGalleryState) => void;
}) {
  const t = useTranslations("EmbedEditor");
  return (
    <div className="space-y-2">
      {comp.items.map((item, itemIdx) => (
        <div key={item.id} className="rounded-md border border-border/80 bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Image {itemIdx + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onChange({ ...comp, items: comp.items.filter(it => it.id !== item.id) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Field label={t("imageUrl")}>
            <Input value={item.url}
              onChange={e => onChange({ ...comp, items: comp.items.map(it => it.id === item.id ? { ...it, url: e.target.value } : it) })}
              placeholder="https://..." className={COMPACT_INPUT_CN} />
          </Field>
          <Field label={t("imageDescription")}>
            <Input value={item.description}
              onChange={e => onChange({ ...comp, items: comp.items.map(it => it.id === item.id ? { ...it, description: e.target.value } : it) })}
              className={COMPACT_INPUT_CN} />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={item.spoiler}
              onChange={e => onChange({ ...comp, items: comp.items.map(it => it.id === item.id ? { ...it, spoiler: e.target.checked } : it) })}
              className="h-3.5 w-3.5 rounded border-input accent-primary" />
            <span className="text-xs text-muted-foreground">{t("imageSpoiler")}</span>
          </label>
        </div>
      ))}
      <Button size="sm" variant="outline" className="h-7 text-xs w-full"
        onClick={() => onChange({ ...comp, items: [...comp.items, { id: uid(), url: "", description: "", spoiler: false }] })}>
        <Plus className="h-3.5 w-3.5 mr-1" />{t("addImage")}
      </Button>
    </div>
  );
}

function SectionEditorFields({ comp, onChange }: {
  readonly comp: SectionState;
  readonly onChange: (updated: SectionState) => void;
}) {
  const t = useTranslations("EmbedEditor");
  return (
    <div className="space-y-3">
      {comp.texts.map((text, textIdx) => (
        <div key={text.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{`${t("textDisplayLabel")} ${textIdx + 1}`}</Label>
            {comp.texts.length > 1 && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onChange({ ...comp, texts: comp.texts.filter(tx => tx.id !== text.id) })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Textarea value={text.content}
            onChange={e => onChange({ ...comp, texts: comp.texts.map(tx => tx.id === text.id ? { ...tx, content: e.target.value } : tx) })}
            rows={3} className={COMPACT_TEXTAREA_CN} />
        </div>
      ))}
      <Button size="sm" variant="outline" className="h-7 text-xs"
        onClick={() => onChange({ ...comp, texts: [...comp.texts, { id: uid(), type: "text_display" as const, content: "" }] })}>
        <Plus className="h-3.5 w-3.5 mr-1" />{t("addTextBlock")}
      </Button>
      <Field label={t("accessory")}>
        <div className="flex gap-2">
          {(["none", "thumbnail", "button"] as const).map(a => (
            <button key={a} type="button"
              onClick={() => onChange({ ...comp, accessoryType: a })}
              className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors",
                comp.accessoryType === a ? "border-primary/60 bg-primary/10 font-medium" : "border-border/80 text-muted-foreground hover:text-foreground")}>
              {a === "none" ? t("accessoryNone") : a === "thumbnail" ? t("accessoryThumbnail") : t("accessoryButton")}
            </button>
          ))}
        </div>
      </Field>
      {comp.accessoryType === "thumbnail" && (
        <>
          <Field label={t("thumbnailUrl")}>
            <Input value={comp.thumbnailUrl}
              onChange={e => onChange({ ...comp, thumbnailUrl: e.target.value })}
              placeholder="https://..." className={COMPACT_INPUT_CN} />
          </Field>
          <Field label={t("thumbnailAlt")}>
            <Input value={comp.thumbnailDescription}
              onChange={e => onChange({ ...comp, thumbnailDescription: e.target.value })}
              className={COMPACT_INPUT_CN} />
          </Field>
        </>
      )}
      {comp.accessoryType === "button" && (
        <>
          <Field label={t("buttonLabel")}>
            <Input value={comp.buttonLabel}
              onChange={e => onChange({ ...comp, buttonLabel: e.target.value })}
              className={COMPACT_INPUT_CN} />
          </Field>
          <Field label={t("buttonStyle")}>
            <div className="flex flex-wrap gap-1">
              {([1, 2, 3, 4, 5] as const).map(style => (
                <button key={style} type="button"
                  onClick={() => onChange({ ...comp, buttonStyle: style })}
                  className={cn("text-xs px-2 py-1 rounded border transition-colors",
                    comp.buttonStyle === style ? "border-primary/60 bg-primary/10 font-medium" : "border-border/80 text-muted-foreground hover:text-foreground")}>
                  {style === 1 ? t("buttonStylePrimary") : style === 2 ? t("buttonStyleSecondary") : style === 3 ? t("buttonStyleSuccess") : style === 4 ? t("buttonStyleDanger") : t("buttonStyleLink")}
                </button>
              ))}
            </div>
          </Field>
          {comp.buttonStyle === 5 && (
            <Field label={t("buttonUrl")}>
              <Input value={comp.buttonUrl}
                onChange={e => onChange({ ...comp, buttonUrl: e.target.value })}
                placeholder="https://..." className={COMPACT_INPUT_CN} />
            </Field>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={comp.buttonDisabled}
              onChange={e => onChange({ ...comp, buttonDisabled: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-input accent-primary" />
            <span className="text-xs text-muted-foreground">{t("buttonDisabled")}</span>
          </label>
        </>
      )}
    </div>
  );
}

function SelectMenuCommonFields({ comp, onChange }: {
  readonly comp: SelectMenuEditorState;
  readonly onChange: (updated: SelectMenuEditorState) => void;
}) {
  const t = useTranslations("EmbedEditor");
  return (
    <div className="space-y-2">
      <Field label={t("selectPlaceholder")}>
        <Input value={comp.placeholder}
          onChange={e => onChange({ ...comp, placeholder: e.target.value } as SelectMenuEditorState)}
          className={COMPACT_INPUT_CN} />
      </Field>
      <div className="flex gap-3">
        <Field label={t("selectMinValues")}>
          <Input type="number" value={comp.minValues} min={0} max={25}
            onChange={e => onChange({ ...comp, minValues: Math.max(0, Math.min(25, Number(e.target.value) || 1)) } as SelectMenuEditorState)}
            className={cn(COMPACT_INPUT_CN, "w-16")} />
        </Field>
        <Field label={t("selectMaxValues")}>
          <Input type="number" value={comp.maxValues} min={1} max={25}
            onChange={e => onChange({ ...comp, maxValues: Math.max(1, Math.min(25, Number(e.target.value) || 1)) } as SelectMenuEditorState)}
            className={cn(COMPACT_INPUT_CN, "w-16")} />
        </Field>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={comp.disabled}
          onChange={e => onChange({ ...comp, disabled: e.target.checked } as SelectMenuEditorState)}
          className="h-3.5 w-3.5 rounded border-input accent-primary" />
        <span className="text-xs text-muted-foreground">{t("selectDisabled")}</span>
      </label>
    </div>
  );
}

function StringSelectEditorFields({ comp, onChange }: {
  readonly comp: StringSelectState;
  readonly onChange: (updated: StringSelectState) => void;
}) {
  const t = useTranslations("EmbedEditor");
  return (
    <div className="space-y-3">
      <SelectMenuCommonFields comp={comp} onChange={updated => onChange(updated as StringSelectState)} />
      <div className="space-y-2 pt-1">
        <Label className="text-xs font-medium">{t("selectOptions")}</Label>
        {comp.options.map((opt, optIdx) => (
          <div key={opt.id} className="rounded-md border border-border/80 bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{t("selectOption")} {optIdx + 1}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onChange({ ...comp, options: comp.options.filter(o => o.id !== opt.id) })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Field label={t("selectOptionLabel")}>
              <Input value={opt.label}
                onChange={e => onChange({ ...comp, options: comp.options.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o) })}
                className={COMPACT_INPUT_CN} />
            </Field>
            <Field label={t("selectOptionValue")}>
              <Input value={opt.value}
                onChange={e => onChange({ ...comp, options: comp.options.map(o => o.id === opt.id ? { ...o, value: e.target.value } : o) })}
                className={COMPACT_INPUT_CN} />
            </Field>
            <Field label={t("selectOptionDescription")}>
              <Input value={opt.description}
                onChange={e => onChange({ ...comp, options: comp.options.map(o => o.id === opt.id ? { ...o, description: e.target.value } : o) })}
                className={COMPACT_INPUT_CN} />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={opt.isDefault}
                onChange={e => onChange({ ...comp, options: comp.options.map(o => o.id === opt.id ? { ...o, isDefault: e.target.checked } : o) })}
                className="h-3.5 w-3.5 rounded border-input accent-primary" />
              <span className="text-xs text-muted-foreground">{t("selectOptionDefault")}</span>
            </label>
          </div>
        ))}
        <Button size="sm" variant="outline" className="h-7 text-xs w-full"
          onClick={() => onChange({ ...comp, options: [...comp.options, { id: uid(), label: "", value: "", description: "", isDefault: false }] })}>
          <Plus className="h-3.5 w-3.5 mr-1" />{t("addSelectOption")}
        </Button>
      </div>
    </div>
  );
}

function GenericSelectEditorFields({ comp, onChange }: {
  readonly comp: GenericSelectState;
  readonly onChange: (updated: GenericSelectState) => void;
}) {
  return <SelectMenuCommonFields comp={comp} onChange={updated => onChange(updated as GenericSelectState)} />;
}

function ActionRowEditorFields({ comp, onChange }: {
  readonly comp: ActionRowState;
  readonly onChange: (updated: ActionRowState) => void;
}) {
  const t = useTranslations("EmbedEditor");
  const hasSelectMenu = !!comp.selectMenu;

  const switchToSelect = (type: SelectMenuEditorState["type"]) => {
    const defaultSelect = createDefaultV2Component(type) as SelectMenuEditorState;
    onChange({ ...comp, selectMenu: defaultSelect, buttons: [] });
  };
  const switchToButtons = () => onChange({ ...comp, selectMenu: undefined });

  return (
    <div className="space-y-3">
      <Field label={t("actionRowMode")}>
        <div className="flex gap-2 flex-wrap">
          <button type="button"
            onClick={switchToButtons}
            className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors",
              !hasSelectMenu ? "border-primary/60 bg-primary/10 font-medium" : "border-border/80 text-muted-foreground hover:text-foreground")}>
            {t("actionRowModeButtons")}
          </button>
          {([
            { type: "string_select" as const, label: t("stringSelectLabel") },
            { type: "user_select" as const, label: t("userSelectLabel") },
            { type: "role_select" as const, label: t("roleSelectLabel") },
            { type: "mentionable_select" as const, label: t("mentionableSelectLabel") },
            { type: "channel_select" as const, label: t("channelSelectLabel") },
          ]).map(({ type, label }) => (
            <button key={type} type="button"
              onClick={() => switchToSelect(type)}
              className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors",
                comp.selectMenu?.type === type ? "border-primary/60 bg-primary/10 font-medium" : "border-border/80 text-muted-foreground hover:text-foreground")}>
              {label}
            </button>
          ))}
        </div>
      </Field>
      {!hasSelectMenu && (
        <>
          {comp.buttons.map((btn, btnIdx) => (
            <div key={btn.id} className="rounded-md border border-border/80 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Button {btnIdx + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onChange({ ...comp, buttons: comp.buttons.filter(b => b.id !== btn.id) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Field label={t("buttonLabel")}>
                <Input value={btn.label}
                  onChange={e => onChange({ ...comp, buttons: comp.buttons.map(b => b.id === btn.id ? { ...b, label: e.target.value } : b) })}
                  className={COMPACT_INPUT_CN} />
              </Field>
              <Field label={t("buttonStyle")}>
                <div className="flex flex-wrap gap-1">
                  {([
                    { style: 1 as const, label: t("buttonStylePrimary") },
                    { style: 2 as const, label: t("buttonStyleSecondary") },
                    { style: 3 as const, label: t("buttonStyleSuccess") },
                    { style: 4 as const, label: t("buttonStyleDanger") },
                    { style: 5 as const, label: t("buttonStyleLink") },
                  ]).map(({ style, label }) => (
                    <button key={style} type="button"
                      onClick={() => onChange({ ...comp, buttons: comp.buttons.map(b => b.id === btn.id ? { ...b, style } : b) })}
                      className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors",
                        btn.style === style ? "border-primary/60 bg-primary/10 font-medium" : "border-border/80 text-muted-foreground hover:text-foreground")}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              {btn.style === 5 && (
                <Field label={t("buttonUrl")}>
                  <Input value={btn.url}
                    onChange={e => onChange({ ...comp, buttons: comp.buttons.map(b => b.id === btn.id ? { ...b, url: e.target.value } : b) })}
                    placeholder="https://..." className={COMPACT_INPUT_CN} />
                </Field>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={btn.disabled}
                  onChange={e => onChange({ ...comp, buttons: comp.buttons.map(b => b.id === btn.id ? { ...b, disabled: e.target.checked } : b) })}
                  className="h-3.5 w-3.5 rounded border-input accent-primary" />
                <span className="text-xs text-muted-foreground">{t("buttonDisabled")}</span>
              </label>
            </div>
          ))}
          <Button size="sm" variant="outline" className="h-7 text-xs w-full"
            onClick={() => onChange({ ...comp, buttons: [...comp.buttons, { id: uid(), customId: uid(), label: "", style: 2 as const, url: "", disabled: false }] })}>
            <Plus className="h-3.5 w-3.5 mr-1" />{t("addButton")}
          </Button>
        </>
      )}
      {comp.selectMenu && comp.selectMenu.type === "string_select" && (
        <StringSelectEditorFields
          comp={comp.selectMenu}
          onChange={updated => onChange({ ...comp, selectMenu: updated })}
        />
      )}
      {comp.selectMenu && comp.selectMenu.type !== "string_select" && (
        <GenericSelectEditorFields
          comp={comp.selectMenu as GenericSelectState}
          onChange={updated => onChange({ ...comp, selectMenu: updated })}
        />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EmbedEditor({ initialData, onSave, isSaving, onCancel }: EmbedEditorProps) {
  const t = useTranslations("EmbedEditor");
  const tCommon = useTranslations("Common");
  const parsedInitialData = initialData ? payloadToMessages(initialData) : null;
  const inputClassName = "bg-background border-border/80";
  const compactInputClassName = COMPACT_INPUT_CN;
  const compactTextareaClassName = COMPACT_TEXTAREA_CN;

  const [messages, setMessages] = useState<MessageState[]>(() =>
    parsedInitialData ? parsedInitialData.messages : [{ id: uid(), mode: "v1", embeds: [defaultState()], content: "", components: [] }]
  );
  const [activeMessageIdx, setActiveMessageIdx] = useState(0);
  const [expandedEmbedId, setExpandedEmbedId] = useState<string | null>(() =>
    parsedInitialData?.messages[0]?.embeds[0]?.editorId ?? null
  );
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState(false);
  const [importWarning, setImportWarning] = useState<string | null>(null);
  const [importResolving, setImportResolving] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [copiedDiscohook, setCopiedDiscohook] = useState(false);
  const [profile, setProfile] = useState<MessageProfileState>(() => parsedInitialData?.profile ?? { name: "", avatarUrl: "" });
  const [profileOpen, setProfileOpen] = useState(false);

  const safeIdx = Math.min(activeMessageIdx, messages.length - 1);
  const activeMessage = messages[safeIdx];
  const embeds = activeMessage.embeds;
  const content = activeMessage.content;

  const setEmbeds = (updater: EmbedFormState[] | ((prev: EmbedFormState[]) => EmbedFormState[])) =>
    setMessages(prev => prev.map((msg, i) => i === safeIdx ? {
      ...msg,
      embeds: typeof updater === "function" ? updater(msg.embeds) : updater,
    } : msg));

  const setContent = (value: string) =>
    setMessages(prev => prev.map((msg, i) => i === safeIdx ? { ...msg, content: value } : msg));

  const addMessage = () => {
    const newEmbed = defaultState();
    const newMsg: MessageState = { id: uid(), mode: "v1", embeds: [newEmbed], content: "", components: [] };
    setMessages(prev => [...prev, newMsg]);
    setActiveMessageIdx(messages.length);
    setExpandedEmbedId(newEmbed.editorId);
  };

  const removeMessage = (index: number) => {
    if (messages.length <= 1) return;
    setMessages(prev => prev.filter((_, i) => i !== index));
    const newIdx = Math.max(0, Math.min(index, messages.length - 2));
    setActiveMessageIdx(newIdx);
    setExpandedEmbedId(messages[newIdx]?.embeds[0]?.editorId ?? null);
  };

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

  // ── V2 Component management ──────────────────────────────────────────────────

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [expandedV2Ids, setExpandedV2Ids] = useState<Set<string>>(new Set());
  const toggleV2Expanded = (id: string) =>
    setExpandedV2Ids(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const setMessageMode = (idx: number, mode: "v1" | "v2") =>
    setMessages(prev => prev.map((msg, i) => i === idx ? { ...msg, mode } : msg));

  const setV2Components = (updater: TopLevelComponentState[] | ((prev: TopLevelComponentState[]) => TopLevelComponentState[])) =>
    setMessages(prev => prev.map((msg, i) => i === safeIdx ? {
      ...msg,
      components: typeof updater === "function" ? updater(msg.components) : updater,
    } : msg));

  const addV2Component = (type: TopLevelComponentState["type"]) => {
    const newComp = createDefaultV2Component(type);
    setV2Components(prev => [...prev, newComp]);
  };

  const removeV2Component = (id: string) =>
    setV2Components(prev => prev.filter(c => c.id !== id));

  const moveV2Component = (id: string, dir: -1 | 1) =>
    setV2Components(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(c => c.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= arr.length) return prev;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });

  const updateV2Component = (id: string, updater: (c: TopLevelComponentState) => TopLevelComponentState) =>
    setV2Components(prev => prev.map(c => c.id === id ? updater(c) : c));

  const updateContainerChildren = (containerId: string, updater: (children: ContainerChildState[]) => ContainerChildState[]) =>
    updateV2Component(containerId, comp => {
      if (comp.type !== "container") return comp;
      return { ...comp, children: updater(comp.children) };
    });

  // ── Import ──────────────────────────────────────────────────────────────────

  const applyParsed = (parsed: Record<string, unknown>) => {
    const { messages: parsedMessages, profile: parsedProfile } = payloadToMessages(parsed);
    setImportError(false);
    setImportUrl("");
    setMessages(parsedMessages);
    setActiveMessageIdx(0);
    setProfile(parsedProfile);
    setExpandedEmbedId(parsedMessages[0]?.embeds[0]?.editorId ?? null);
    setImportWarning(null);
    setImportExportOpen(false);
  };

  const handleImport = async () => {
    let urlToparse = importUrl.trim();

    // Share links don't carry ?data= and can't be fetched client-side (CORS).
    // Resolve both share.discohook.app URLs and discohook.app/?share= links via the Next.js proxy.
    if (requiresDiscohookResolve(urlToparse)) {
      setImportResolving(true);
      setImportError(false);
      try {
        const res = await fetch(`/api/v2/app/discohook-resolve?url=${encodeURIComponent(urlToparse)}`);
        const json = await res.json();
        if (!res.ok) { setImportError(true); setImportWarning(null); return; }

        if (json.payload) {
          // Backend returned the raw JSON payload directly
          applyParsed(json.payload as Record<string, unknown>);
          return;
        }
        if (json.resolvedUrl) {
          urlToparse = json.resolvedUrl;
        } else {
          setImportError(true); setImportWarning(null); return;
        }
      } catch {
        setImportError(true); setImportWarning(null); return;
      } finally {
        setImportResolving(false);
      }
    }

    const parsed = parseDiscohookUrl(urlToparse);
    if (!parsed) { setImportError(true); setImportWarning(null); return; }
    applyParsed(parsed);
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = () => onSave(stateToPayload(messages, profile));

  const discohookPayload = stateToPayload(messages, profile);
  const discohookUrl = buildDiscohookUrl(discohookPayload);
  const previewEmbeds = activeMessage.mode === "v1" ? embeds.map(stateToEmbed).filter(hasMeaningfulEmbedContent) : [];
  const previewV2Components = activeMessage.mode === "v2" ? activeMessage.components.map(serializeComponentState).filter((c): c is TopLevelComponent => c !== null) : [];
  const hasContent =
    messages.some(msg => {
      if (msg.mode === "v2") return msg.components.length > 0;
      return msg.embeds.map(stateToEmbed).some(hasMeaningfulEmbedContent) || msg.content.trim().length > 0;
    }) ||
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

          {/* ── Message switcher ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 flex-wrap">
              {messages.map((msg, i) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => { setActiveMessageIdx(i); setExpandedEmbedId(msg.embeds[0]?.editorId ?? null); }}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md border transition-colors",
                    i === safeIdx
                      ? "border-primary/60 bg-primary/10 text-foreground font-medium"
                      : "border-border/80 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  Message {i + 1}
                </button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={addMessage}
              >
                <Plus className="h-3 w-3 mr-1" />Add
              </Button>
              {messages.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => removeMessage(safeIdx)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />Remove
                </Button>
              )}
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMessageMode(safeIdx, "v1")}
              className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors",
                activeMessage.mode === "v1" ? "border-primary/60 bg-primary/10 font-medium" : "border-border/80 text-muted-foreground hover:text-foreground")}>
              {t("modeToggleV1")}
            </button>
            <button type="button" onClick={() => setMessageMode(safeIdx, "v2")}
              className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1",
                activeMessage.mode === "v2" ? "border-primary/60 bg-primary/10 font-medium" : "border-border/80 text-muted-foreground hover:text-foreground")}>
              {t("modeToggleV2")}
              <span className="rounded bg-[#5865F2] px-1 py-0.5 text-[9px] font-semibold text-white uppercase tracking-wide">NEW</span>
            </button>
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

          {activeMessage.mode === "v1" ? (
            <>
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
            </>
          ) : (
            /* ── V2 Components editor ── */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionLabel>{t("componentsSection")}</SectionLabel>
                <div className="relative">
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setOpenDropdownId(prev => prev === "__top__" ? null : "__top__")}>
                    <Plus className="h-3.5 w-3.5 mr-1" />{t("addComponent")}
                  </Button>
                  {openDropdownId === "__top__" && (
                    <>
                      <button type="button" tabIndex={-1} aria-hidden="true" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpenDropdownId(null)} />
                      <div className="absolute right-0 top-8 z-20 rounded-md border border-border bg-card shadow-lg min-w-[160px]">
                        {([
                          { type: "container" as const, label: t("containerLabel") },
                          { type: "text_display" as const, label: t("textDisplayLabel") },
                          { type: "separator" as const, label: t("separatorLabel") },
                          { type: "media_gallery" as const, label: t("mediaGalleryLabel") },
                          { type: "section" as const, label: t("sectionLabel") },
                          { type: "action_row" as const, label: t("actionRowLabel") },
                          { type: "string_select" as const, label: t("stringSelectLabel") },
                          { type: "user_select" as const, label: t("userSelectLabel") },
                          { type: "role_select" as const, label: t("roleSelectLabel") },
                          { type: "mentionable_select" as const, label: t("mentionableSelectLabel") },
                          { type: "channel_select" as const, label: t("channelSelectLabel") },
                        ] as const).map(item => (
                          <button key={item.type} type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                            onClick={() => { addV2Component(item.type); setOpenDropdownId(null); }}>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {activeMessage.components.map((comp, compIdx) => {
                const compV2Labels: Record<string, string> = {
                  container: t("containerLabel"),
                  text_display: t("textDisplayLabel"),
                  separator: t("separatorLabel"),
                  media_gallery: t("mediaGalleryLabel"),
                  action_row: t("actionRowLabel"),
                  section: t("sectionLabel"),
                  string_select: t("stringSelectLabel"),
                  user_select: t("userSelectLabel"),
                  role_select: t("roleSelectLabel"),
                  mentionable_select: t("mentionableSelectLabel"),
                  channel_select: t("channelSelectLabel"),
                };
                const isExpanded = expandedV2Ids.has(comp.id);
                const compLabel = comp.type === "raw"
                  ? `${t("unknownComponent")} (type ${comp.rawType})`
                  : (compV2Labels[comp.type] ?? t("sectionLabel"));
                return (
                  <div key={comp.id} className={cn("rounded-lg border bg-card", isExpanded ? "border-primary/60" : "border-border/80")}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => toggleV2Expanded(comp.id)}>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="truncate text-base font-semibold">{`${compLabel} ${compIdx + 1}`}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveV2Component(comp.id, -1)} disabled={compIdx === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveV2Component(comp.id, 1)} disabled={compIdx === activeMessage.components.length - 1}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeV2Component(comp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border/80 px-3 py-3 space-y-3">
                        {comp.type === "action_row" && (
                          <ActionRowEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(comp.id, () => updated)}
                          />
                        )}
                        {comp.type === "string_select" && (
                          <StringSelectEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(comp.id, () => updated)}
                          />
                        )}
                        {(comp.type === "user_select" || comp.type === "role_select" || comp.type === "mentionable_select" || comp.type === "channel_select") && (
                          <GenericSelectEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(comp.id, () => updated)}
                          />
                        )}
                        {comp.type === "raw" && (
                          <p className="text-xs text-muted-foreground">{t("unknownComponentHint")}</p>
                        )}
                        {comp.type === "text_display" && (
                          <Textarea value={comp.content}
                            onChange={e => updateV2Component(comp.id, c => c.type === "text_display" ? { ...c, content: e.target.value } : c)}
                            rows={4} className={compactTextareaClassName} />
                        )}
                        {comp.type === "separator" && (
                          <SeparatorEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(comp.id, () => updated)}
                          />
                        )}
                        {comp.type === "media_gallery" && (
                          <MediaGalleryEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(comp.id, () => updated)}
                          />
                        )}
                        {comp.type === "section" && (
                          <SectionEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(comp.id, () => updated)}
                          />
                        )}
                        {comp.type === "container" && (
                          <div className="space-y-2">
                            <Field label={t("accentColor")}>
                              <div className="flex items-center gap-2">
                                <input type="color" value={comp.accentColor || "#5865f2"}
                                  onChange={e => updateV2Component(comp.id, c => c.type === "container" ? { ...c, accentColor: e.target.value } : c)}
                                  className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5" />
                                <Input value={comp.accentColor}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) updateV2Component(comp.id, c => c.type === "container" ? { ...c, accentColor: val } : c);
                                  }}
                                  className={cn(inputClassName, "font-mono text-sm w-28")} maxLength={7} />
                              </div>
                            </Field>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={comp.spoiler ?? false}
                                onChange={e => updateV2Component(comp.id, c => c.type === "container" ? { ...c, spoiler: e.target.checked } : c)}
                                className="h-3.5 w-3.5 rounded border-input accent-primary" />
                              <span className="text-xs text-muted-foreground">{t("containerSpoiler")}</span>
                            </label>
                            {comp.children.map((child, childIdx) => {
                              const childIsExpanded = expandedV2Ids.has(child.id);
                              const childV2Labels: Record<string, string> = {
                                text_display: t("textDisplayLabel"),
                                separator: t("separatorLabel"),
                                media_gallery: t("mediaGalleryLabel"),
                                action_row: t("actionRowLabel"),
                                string_select: t("stringSelectLabel"),
                                user_select: t("userSelectLabel"),
                                role_select: t("roleSelectLabel"),
                                mentionable_select: t("mentionableSelectLabel"),
                                channel_select: t("channelSelectLabel"),
                              };
                              const childLabel = childV2Labels[child.type] ?? t("sectionLabel");
                              return (
                                <div key={child.id} className={cn("ml-3 rounded-md border", childIsExpanded ? "border-primary/40" : "border-border/60")}>
                                  <div className="flex items-center gap-2 px-2 py-1.5">
                                    <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                                      onClick={() => toggleV2Expanded(child.id)}>
                                      {childIsExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                      <span className="truncate text-sm font-medium">{`${childLabel} ${childIdx + 1}`}</span>
                                    </button>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" className="h-6 w-6"
                                        onClick={() => updateContainerChildren(comp.id, children => { const arr = [...children]; const i = arr.findIndex(c => c.id === child.id); if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; } return arr; })}
                                        disabled={childIdx === 0}>
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6"
                                        onClick={() => updateContainerChildren(comp.id, children => { const arr = [...children]; const i = arr.findIndex(c => c.id === child.id); if (i < arr.length - 1) { [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; } return arr; })}
                                        disabled={childIdx === comp.children.length - 1}>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => updateContainerChildren(comp.id, children => children.filter(c => c.id !== child.id))}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  {childIsExpanded && (
                                    <div className="border-t border-border/60 px-3 py-2 space-y-2">
                                      {child.type === "text_display" && (
                                        <Textarea value={child.content}
                                          onChange={e => updateContainerChildren(comp.id, children => children.map(c => c.id === child.id && c.type === "text_display" ? { ...c, content: e.target.value } : c))}
                                          rows={3} className={compactTextareaClassName} />
                                      )}
                                      {child.type === "separator" && (
                                        <SeparatorEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                      {child.type === "media_gallery" && (
                                        <MediaGalleryEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                      {child.type === "section" && (
                                        <SectionEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                      {child.type === "action_row" && (
                                        <ActionRowEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                      {child.type === "string_select" && (
                                        <StringSelectEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                      {(child.type === "user_select" || child.type === "role_select" || child.type === "mentionable_select" || child.type === "channel_select") && (
                                        <GenericSelectEditorFields
                                          comp={child as GenericSelectState}
                                          onChange={updated => updateContainerChildren(comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <div className="relative">
                              <Button size="sm" variant="outline" className="h-7 text-xs w-full"
                                onClick={() => setOpenDropdownId(prev => prev === comp.id ? null : comp.id)}>
                                <Plus className="h-3.5 w-3.5 mr-1" />{t("addContainer")}
                              </Button>
                              {openDropdownId === comp.id && (
                                <>
                                <button type="button" tabIndex={-1} aria-hidden="true" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpenDropdownId(null)} />
                                  <div className="absolute left-0 top-8 z-20 rounded-md border border-border bg-card shadow-lg min-w-[160px]">
                                    {([
                                      { type: "text_display" as const, label: t("textDisplayLabel") },
                                      { type: "separator" as const, label: t("separatorLabel") },
                                      { type: "media_gallery" as const, label: t("mediaGalleryLabel") },
                                      { type: "section" as const, label: t("sectionLabel") },
                                      { type: "action_row" as const, label: t("actionRowLabel") },
                                      { type: "string_select" as const, label: t("stringSelectLabel") },
                                      { type: "user_select" as const, label: t("userSelectLabel") },
                                      { type: "role_select" as const, label: t("roleSelectLabel") },
                                      { type: "mentionable_select" as const, label: t("mentionableSelectLabel") },
                                      { type: "channel_select" as const, label: t("channelSelectLabel") },
                                    ] as const).map(item => (
                                      <button key={item.type} type="button"
                                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                                        onClick={() => { updateContainerChildren(comp.id, prev => [...prev, createDefaultV2Component(item.type) as ContainerChildState]); setOpenDropdownId(null); }}>
                                        {item.label}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
                  isV2={activeMessage.mode === "v2"}
                  components={previewV2Components}
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  {t("previewEmpty")}
                </div>
              )}
            </div>
          )}

          <div className="hidden max-h-screen overflow-y-auto p-5 md:sticky md:top-0 md:block">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("preview")}
              </p>
              {messages.length > 1 && (
                <span className="text-[11px] text-muted-foreground">
                  — Message {safeIdx + 1}/{messages.length}
                </span>
              )}
            </div>
            {hasContent ? (
              <DiscordMessagePreview
                profile={{ name: profile.name || undefined, avatar_url: profile.avatarUrl || undefined }}
                content={content}
                embeds={previewEmbeds}
                isV2={activeMessage.mode === "v2"}
                components={previewV2Components}
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

      <Dialog open={importExportOpen} onOpenChange={(open) => { if (!open) { setImportWarning(null); setImportError(false); } setImportExportOpen(open); }}>
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
                  onChange={e => { setImportUrl(e.target.value); setImportError(false); setImportWarning(null); }}
                  placeholder="https://discohook.app/?data=..."
                  className={cn(inputClassName, "text-xs h-8", importError && "border-destructive")}
                />
                <Button size="sm" variant="secondary" className="h-8 shrink-0" onClick={handleImport} disabled={importResolving}>
                  {importResolving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1" />}
                  {t("import")}
                </Button>
              </div>
              {importError && <p className="text-xs text-destructive">{t("importError")}</p>}
              {importWarning && <p className="text-xs text-amber-500">{importWarning}</p>}
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
