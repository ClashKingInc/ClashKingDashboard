"use client";

import { dashboardEndpoints, ServerChannelsEndpoint, DiscordRolesEndpoint, UpsertEmbedRequest as UpsertEmbedRequestSchema } from "@clashking/api-contracts";
import { Schema } from "effect";
import type { UpsertEmbedRequest } from "@/lib/api/types/tickets";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { decompressFromEncodedURIComponent, decompressFromBase64 } from 'lz-string';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode, useEffect } from "react";
import { useTranslations } from "use-intl";
import { CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Copy, ExternalLink, Loader2, Plus, Trash2, Link2, Upload } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DiscordMessageField } from "./discord-message-field";
import { UploadedImageField, ImageUploadActivityContext } from "./uploaded-image-field";
import { EmbedColorPicker } from "./embed-color-picker";
import { cn } from "@/lib/utils";
import {
  DiscordMessagePreview,
  BUTTON_STYLE_CLASSES,
  extractEmbeds,
  extractMessageProfile,
  type PreviewDiscordChannel,
  type PreviewDiscordRole,
  IS_COMPONENTS_V2_FLAG,
  COMPONENT_TYPE,
  type DiscordEmbed,
  type TopLevelComponent,
  type ContainerChild,
  type SectionComponent,
  type FileComponent,
} from "./discord-embed-preview";

// Shared compact class names used across V2 sub-editor components
const COMPACT_INPUT_CN = "h-9 rounded-xl border-0 bg-muted/55 text-sm shadow-sm shadow-black/5";
const COMPACT_TEXTAREA_CN = "rounded-xl border-0 bg-muted/55 text-sm shadow-sm shadow-black/5 resize-none";

// Translation key lookups to avoid nested ternaries in JSX
const ACCESSORY_TYPE_KEYS = { none: "accessoryNone", thumbnail: "accessoryThumbnail", button: "accessoryButton" } as const;
const BUTTON_COLOR_KEYS = { 1: "buttonColorBlue", 2: "buttonColorGray", 3: "buttonColorGreen", 4: "buttonColorRed", 5: "buttonStyleLink" } as const;

function ButtonColorPicker({ value, onChange, allowLink }: { readonly value: ButtonStyle; readonly onChange: (color: ButtonStyle) => void; readonly allowLink: boolean }) {
  const t = useTranslations("EmbedEditor");
  return <div className="flex flex-wrap gap-2" role="group" aria-label={t("buttonColor")}>
    {([1, 2, 3, 4, 5] as const).filter(color => allowLink || color !== 5).map(color => (
      <button key={color} type="button" aria-pressed={value === color} onClick={() => onChange(color)}
        className={cn("rounded-xl px-3 py-2 text-xs font-medium shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", BUTTON_STYLE_CLASSES[color], value === color && "ring-2 ring-foreground/65 ring-offset-2 ring-offset-card")}>
        {t(BUTTON_COLOR_KEYS[color])}
      </button>
    ))}
  </div>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonStyle = 1 | 2 | 3 | 4 | 5;

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
  buttonStyle: ButtonStyle;
  buttonUrl: string;
  buttonCustomId: string;
  buttonDisabled: boolean;
}
/** Preserves unknown V2 component types (e.g. Action Rows with buttons) for round-trip import/export. */
interface RawComponentState { id: string; type: "raw"; rawType: number; rawData: Record<string, unknown> }
interface FileComponentState { id: string; type: "file"; url: string; spoiler: boolean }
interface ButtonState { id: string; customId: string; label: string; style: ButtonStyle; url: string; disabled: boolean; emoji?: { id?: string; name?: string; animated?: boolean } }
interface SelectOptionState { id: string; label: string; value: string; description: string; isDefault: boolean }
interface StringSelectState { id: string; type: "string_select"; customId: string; placeholder: string; minValues: number; maxValues: number; disabled: boolean; options: SelectOptionState[] }
interface GenericSelectState { id: string; type: "user_select" | "role_select" | "mentionable_select" | "channel_select"; customId: string; placeholder: string; minValues: number; maxValues: number; disabled: boolean }
type SelectMenuEditorState = StringSelectState | GenericSelectState;
interface ActionRowState { id: string; type: "action_row"; buttons: ButtonState[]; selectMenu?: SelectMenuEditorState }
type ContainerChildState = TextDisplayState | SeparatorState | MediaGalleryState | SectionState | ActionRowState | StringSelectState | GenericSelectState | FileComponentState;
interface ContainerState {
  id: string;
  type: "container";
  accentColor: string;
  spoiler?: boolean;
  children: ContainerChildState[];
}
type TopLevelComponentState = ContainerState | TextDisplayState | SeparatorState | MediaGalleryState | SectionState | ActionRowState | StringSelectState | GenericSelectState | RawComponentState | FileComponentState;

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
  readonly variant?: "full" | "ticket-panel";
  readonly previewActions?: ReactNode;
  readonly initialData?: Record<string, unknown> | null;
  readonly onSave: (data: UpsertEmbedRequest["data"]) => Promise<void>;
  readonly isSaving: boolean;
  readonly onCancel: () => void;
  readonly channels?: PreviewDiscordChannel[];
  readonly roles?: PreviewDiscordRole[];
  readonly serverId?: string;
  readonly placeholders?: readonly string[];
  readonly ticketActions?: readonly { readonly customId: string; readonly label: string }[];
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly onFormatChosen?: () => void;
}

const TicketActionsContext = createContext<EmbedEditorProps["ticketActions"]>(undefined);
function TicketActionPicker({ value, onChange }: { readonly value: string; readonly onChange: (value: string) => void }) {
  const actions = useContext(TicketActionsContext), t = useTranslations("TicketsSettingsPage");
  if (!actions) return null;
  return <Field label={t("clickAction")}><Select value={actions.some(action => action.customId === value) ? value : ""} onValueChange={onChange}>
    <SelectTrigger aria-label={t("clickAction")} className="h-9 rounded-xl border-0 bg-muted/55"><SelectValue placeholder={t("chooseTicketAction")} /></SelectTrigger>
    <SelectContent>{actions.map(action => <SelectItem key={action.customId} value={action.customId}>{action.label}</SelectItem>)}</SelectContent>
  </Select></Field>;
}

type MentionContext = {
  channels: PreviewDiscordChannel[];
  roles: PreviewDiscordRole[];
  serverId?: string;
  placeholders?: readonly string[];
};

function hexToInt(hex: string): number { return Number.parseInt(hex.replaceAll("#", ""), 16); }
function intToHex(color: number): string { return `#${color.toString(16).padStart(6, "0")}`; }
const MentionTextField = DiscordMessageField;

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
  const val = Number.parseInt(hex.replaceAll("#", ""), 16);
  return Number.isNaN(val) ? null : val;
}

function serializeSelectMenu(s: SelectMenuEditorState): Record<string, unknown> {
  const typeMap: Record<string, number> = { string_select: 3, user_select: 5, role_select: 6, mentionable_select: 7, channel_select: 8 };
  const base: Record<string, unknown> = {
    type: typeMap[s.type],
    custom_id: s.customId,
    ...(s.placeholder ? { placeholder: s.placeholder } : {}),
    ...(s.minValues === 1 ? {} : { min_values: s.minValues }),
    ...(s.maxValues === 1 ? {} : { max_values: s.maxValues }),
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
        return { type: 1, components: [serializeSelectMenu(s.selectMenu)] } as unknown as TopLevelComponent; // NOSONAR
      }
      if (s.buttons.length === 0) return null;
      return {
        type: 1,
        components: s.buttons.map(btn => ({
          type: 2,
          style: btn.style,
          ...(btn.label ? { label: btn.label } : {}),
          ...(btn.emoji ? { emoji: btn.emoji } : {}),
          ...(btn.style === 5 ? (btn.url ? { url: btn.url } : {}) : { custom_id: btn.customId }), // NOSONAR
          ...(btn.disabled ? { disabled: true } : {}),
        })),
      } as unknown as TopLevelComponent; // NOSONAR
    }
    case "string_select":
    case "user_select":
    case "role_select":
    case "mentionable_select":
    case "channel_select":
      return { type: 1, components: [serializeSelectMenu(s)] } as unknown as TopLevelComponent; // NOSONAR
    case "file":
      if (!s.url.trim()) return null;
      return { type: 13, file: { url: s.url.trim() }, ...(s.spoiler ? { spoiler: true } : {}) } as unknown as TopLevelComponent; // NOSONAR
    case "raw":
      return s.rawData as unknown as TopLevelComponent; // NOSONAR
    case "container": {
      const accent = hexToIntSafe(s.accentColor);
      return {
        type: 17,
        ...(accent === null ? {} : { accent_color: accent }),
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
      let accessory: NonNullable<SectionComponent["accessory"]> | null = null;
      if (s.accessoryType === "thumbnail" && s.thumbnailUrl.trim()) {
        accessory = { type: 11, media: { url: s.thumbnailUrl.trim() }, ...(s.thumbnailDescription.trim() ? { description: s.thumbnailDescription.trim() } : {}) };
      } else if (s.accessoryType === "button") {
        accessory = {
          type: 2,
          style: s.buttonStyle,
          ...(s.buttonLabel.trim() ? { label: s.buttonLabel.trim() } : {}),
          ...(s.buttonStyle === 5 ? (s.buttonUrl.trim() ? { url: s.buttonUrl.trim() } : {}) : { custom_id: s.buttonCustomId }), // NOSONAR
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
  return { ...base, type };
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
        : sec.accessory?.type === 2 // NOSONAR
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
      const selectTypes = new Set([3, 5, 6, 7, 8]);
      const selectComp = arComponents.find((x: any) => selectTypes.has(x.type));
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
            ...(b.emoji ? { emoji: b.emoji } : {}),
          })),
      };
    }
    case 3: return parseSelectMenu(c as any) as unknown as TopLevelComponentState; // NOSONAR
    case 5: return parseSelectMenu(c as any) as unknown as TopLevelComponentState; // NOSONAR
    case 6: return parseSelectMenu(c as any) as unknown as TopLevelComponentState; // NOSONAR
    case 7: return parseSelectMenu(c as any) as unknown as TopLevelComponentState; // NOSONAR
    case 8: return parseSelectMenu(c as any) as unknown as TopLevelComponentState; // NOSONAR
    case 13: {
      const fc = c as unknown as FileComponent; // NOSONAR
      return { id: uid(), type: "file", url: fc.file?.url ?? "", spoiler: (c as any).spoiler === true };
    }
    default: return { id: uid(), type: "raw", rawType: (c as { type: number }).type, rawData: c as unknown as Record<string, unknown> }; // NOSONAR
  }
}

function createDefaultV2Component(type: TopLevelComponentState["type"]): TopLevelComponentState {
  switch (type) {
    case "container": return { id: uid(), type: "container", accentColor: "#5865f2", spoiler: false, children: [] };
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
    case "file": return { id: uid(), type: "file", url: "", spoiler: false };
    case "raw": return { id: uid(), type: "raw", rawType: 0, rawData: {} };
  }
}

function singleChoiceTicketMenu(component: TopLevelComponentState): TopLevelComponentState {
  if (component.type === "container") return { ...component, children: component.children.map(child => singleChoiceTicketMenu(child) as ContainerChildState) };
  if (component.type === "section") return { ...component, buttonDisabled: false };
  if (component.type === "action_row") return { ...component, buttons: component.buttons.map(button => ({ ...button, disabled: false })), ...(component.selectMenu ? { selectMenu: { ...component.selectMenu, minValues: 1, maxValues: 1, disabled: false } } : {}) };
  if (["string_select", "user_select", "role_select", "mentionable_select", "channel_select"].includes(component.type)) return { ...component, minValues: 1, maxValues: 1, disabled: false } as SelectMenuEditorState;
  return component;
}

/** Ticket controls must point to a configured action, including nested v2 accessories. */
export function hasUnassignedTicketActions(components: unknown, actions: readonly { readonly customId: string }[]): boolean {
  const allowed = new Set(actions.map(action => action.customId));
  const visit = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(visit);
    if (!value || typeof value !== "object") return false;
    const node = value as Record<string, unknown>;
    if (node.type === 2 && (node.style === 5 || !allowed.has(String(node.custom_id)))) return true;
    if (node.type === 3 && (!Array.isArray(node.options) || !node.options.length || node.options.some(option => !allowed.has(String((option as { value?: unknown })?.value))))) return true;
    if ([5, 6, 7, 8].includes(Number(node.type))) return true;
    return visit(node.components) || visit(node.accessory);
  };
  return visit(components);
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
          components: Array.isArray(msgData.components) ? (msgData.components as TopLevelComponent[]).map(parseComponentState) : [],
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
      components: Array.isArray(data.components) ? (data.components as TopLevelComponent[]).map(parseComponentState) : [],
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
): UpsertEmbedRequest["data"] {
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
    const components = msg.components.map(serializeComponentState).filter((component): component is TopLevelComponent => component !== null);
    if (components.length) msgData.components = components;
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
    if (firstData.components) payload.components = firstData.components;
    if (normalizedProfile.name) payload.username = normalizedProfile.name;
    if (normalizedProfile.avatar_url) payload.avatar_url = normalizedProfile.avatar_url;
  }
  return Schema.decodeUnknownSync(UpsertEmbedRequestSchema.fields.data)(payload);
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
    String.fromCodePoint(Number.parseInt(hex.slice(1), 16)),
  );
  return btoa(escaped).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
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
    <p className="mb-2 text-xs font-medium text-muted-foreground">
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
    <div className="rounded-xl">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

function MediaGalleryEditorFields({ comp, onChange, onImageChange }: {
  readonly comp: MediaGalleryState;
  readonly onChange: (updated: MediaGalleryState) => void;
  readonly onImageChange: (itemId: string, url: string) => void;
}) {
  const t = useTranslations("EmbedEditor");
  return (
    <div className="space-y-2">
      {comp.items.map((item, itemIdx) => (
        <div key={item.id} className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Image {itemIdx + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onChange({ ...comp, items: comp.items.filter(it => it.id !== item.id) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Field label={t("imageUploadLabel")}>
            <UploadedImageField value={item.url} label={`${t("imageUploadLabel")} ${itemIdx + 1}`}
              onChange={url => onImageChange(item.id, url)} />
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

function SectionEditorFields({ comp, onChange, mentionContext }: {
  readonly comp: SectionState;
  readonly onChange: (updated: SectionState) => void;
  readonly mentionContext: MentionContext;
}) {
  const t = useTranslations("EmbedEditor");
  const actions = useContext(TicketActionsContext);
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
          <MentionTextField
            value={text.content}
            onValueChange={(nextValue) => onChange({ ...comp, texts: comp.texts.map(tx => tx.id === text.id ? { ...tx, content: nextValue } : tx) })}
            rows={3}
            multiline
            className={COMPACT_TEXTAREA_CN}
            mentionContext={mentionContext}
          />
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
              disabled={a === "button" && actions?.length === 0}
              onClick={() => onChange({ ...comp, accessoryType: a, ...(a === "button" && actions?.[0] ? { buttonCustomId: actions[0].customId, buttonLabel: actions[0].label, buttonStyle: 2 } : {}) })}
              className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors",
                comp.accessoryType === a ? "border-primary/60 bg-primary/10 font-medium" : "border-border/80 text-muted-foreground hover:text-foreground")}>
              {t(ACCESSORY_TYPE_KEYS[a])}
            </button>
          ))}
        </div>
      </Field>
      {comp.accessoryType === "thumbnail" && (
        <>
          <Field label={t("thumbnailUploadLabel")}>
            <UploadedImageField value={comp.thumbnailUrl} label={t("thumbnailUploadLabel")} onChange={thumbnailUrl => onChange({ ...comp, thumbnailUrl })} />
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
          <Field label={t("buttonColor")}>
            <ButtonColorPicker value={comp.buttonStyle} allowLink={actions === undefined} onChange={buttonStyle => onChange({ ...comp, buttonStyle })} />
          </Field>
          {comp.buttonStyle === 5 && (
            <Field label={t("buttonUrl")}>
              <Input value={comp.buttonUrl}
                onChange={e => onChange({ ...comp, buttonUrl: e.target.value })}
                placeholder="https://..." className={COMPACT_INPUT_CN} />
            </Field>
          )}
          {comp.buttonStyle !== 5 && <TicketActionPicker value={comp.buttonCustomId} onChange={buttonCustomId => onChange({ ...comp, buttonCustomId })} />}
          {actions === undefined && <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={comp.buttonDisabled}
              onChange={e => onChange({ ...comp, buttonDisabled: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-input accent-primary" />
            <span className="text-xs text-muted-foreground">{t("buttonDisabled")}</span>
          </label>}
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
  const ticketActions = useContext(TicketActionsContext);
  return (
    <div className="space-y-2">
      <Field label={t("selectPlaceholder")}>
        <Input value={comp.placeholder}
          onChange={e => onChange({ ...comp, placeholder: e.target.value })}
          className={COMPACT_INPUT_CN} />
      </Field>
      {ticketActions === undefined && <><div className="flex gap-3">
        <Field label={t("selectMinValues")}>
          <Input type="number" value={comp.minValues} min={0} max={25}
            onChange={e => onChange({ ...comp, minValues: Math.max(0, Math.min(25, Number(e.target.value) || 1)) })}
            className={cn(COMPACT_INPUT_CN, "w-16")} />
        </Field>
        <Field label={t("selectMaxValues")}>
          <Input type="number" value={comp.maxValues} min={1} max={25}
            onChange={e => onChange({ ...comp, maxValues: Math.max(1, Math.min(25, Number(e.target.value) || 1)) })}
            className={cn(COMPACT_INPUT_CN, "w-16")} />
        </Field>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={comp.disabled}
          onChange={e => onChange({ ...comp, disabled: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-input accent-primary" />
        <span className="text-xs text-muted-foreground">{t("selectDisabled")}</span>
      </label></>}
    </div>
  );
}

function StringSelectEditorFields({ comp, onChange }: {
  readonly comp: StringSelectState;
  readonly onChange: (updated: StringSelectState) => void;
}) {
  const t = useTranslations("EmbedEditor");
  const actions = useContext(TicketActionsContext);
  return (
    <div className="space-y-3">
      <SelectMenuCommonFields comp={comp} onChange={updated => onChange(updated as StringSelectState)} />
      <div className="space-y-2 pt-1">
        <Label className="text-xs font-medium">{t("selectOptions")}</Label>
        {comp.options.map((opt, optIdx) => (
          <div key={opt.id} className="space-y-3 pt-3">
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
            {actions ? <TicketActionPicker value={opt.value} onChange={value => onChange({ ...comp, options: comp.options.map(option => option.id === opt.id ? { ...option, value } : option) })} /> : <Field label={t("selectOptionValue")}>
              <Input value={opt.value}
                onChange={e => onChange({ ...comp, options: comp.options.map(o => o.id === opt.id ? { ...o, value: e.target.value } : o) })}
                className={COMPACT_INPUT_CN} />
            </Field>}
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
        <Button size="sm" variant="secondary" className="h-8 rounded-xl border-0 bg-muted/55 text-xs"
          disabled={comp.options.length >= 25 || actions?.length === 0}
          onClick={() => onChange({ ...comp, options: [...comp.options, { id: uid(), label: actions?.[0]?.label ?? "", value: actions?.[0]?.customId ?? "", description: "", isDefault: false }] })}>
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
  const actions = useContext(TicketActionsContext);
  const hasSelectMenu = !!comp.selectMenu;

  const switchToSelect = (type: SelectMenuEditorState["type"]) => {
    if (actions?.length === 0) return;
    const defaultSelect = createDefaultV2Component(type) as SelectMenuEditorState;
    if (actions?.[0] && defaultSelect.type === "string_select") defaultSelect.options = [{ id: uid(), label: actions[0].label, value: actions[0].customId, description: "", isDefault: false }];
    const panelId = actions?.[0]?.customId.split(":")[3];
    if (panelId) defaultSelect.customId = `ck:ticket:menu:${panelId}:${defaultSelect.customId}`;
    onChange({ ...comp, selectMenu: defaultSelect, buttons: [] });
  };
  const switchToButtons = () => onChange({ ...comp, selectMenu: undefined });

  return (
    <div className="space-y-3">
      <Field label={t("actionRowMode")}>
        <div className="flex gap-2 flex-wrap">
          <button type="button"
            onClick={switchToButtons}
            aria-pressed={!hasSelectMenu}
            className={cn("rounded-xl px-3 py-2 text-xs transition-colors",
              hasSelectMenu ? "text-muted-foreground hover:bg-muted/55" : "bg-muted font-semibold text-foreground shadow-sm")}>
            {t("actionRowModeButtons")}
          </button>
          {([
            { type: "string_select" as const, label: t("stringSelectLabel") },
            { type: "user_select" as const, label: t("userSelectLabel") },
            { type: "role_select" as const, label: t("roleSelectLabel") },
            { type: "mentionable_select" as const, label: t("mentionableSelectLabel") },
            { type: "channel_select" as const, label: t("channelSelectLabel") },
          ]).filter(item => !actions || item.type === "string_select").map(({ type, label }) => (
            <button key={type} type="button"
              disabled={actions?.length === 0}
              aria-pressed={comp.selectMenu?.type === type}
              onClick={() => switchToSelect(type)}
              className={cn("rounded-xl px-3 py-2 text-xs transition-colors disabled:pointer-events-none disabled:opacity-45",
                comp.selectMenu?.type === type ? "bg-muted font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/55")}>
              {label}
            </button>
          ))}
        </div>
      </Field>
      {!hasSelectMenu && (
        <>
          {comp.buttons.map((btn, btnIdx) => (
            <div key={btn.id} className="space-y-3 pt-3">
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
              <Field label={t("buttonColor")}>
                <ButtonColorPicker value={btn.style} allowLink={actions === undefined} onChange={style => onChange({ ...comp, buttons: comp.buttons.map(button => button.id === btn.id ? { ...button, style } : button) })} />
              </Field>
              {btn.style === 5 && (
                <Field label={t("buttonUrl")}>
                  <Input value={btn.url}
                    onChange={e => onChange({ ...comp, buttons: comp.buttons.map(b => b.id === btn.id ? { ...b, url: e.target.value } : b) })}
                    placeholder="https://..." className={COMPACT_INPUT_CN} />
                </Field>
              )}
              {btn.style !== 5 && <TicketActionPicker value={btn.customId} onChange={customId => onChange({ ...comp, buttons: comp.buttons.map(button => button.id === btn.id ? { ...button, customId } : button) })} />}
              {actions === undefined && <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={btn.disabled}
                  onChange={e => onChange({ ...comp, buttons: comp.buttons.map(b => b.id === btn.id ? { ...b, disabled: e.target.checked } : b) })}
                  className="h-3.5 w-3.5 rounded border-input accent-primary" />
                <span className="text-xs text-muted-foreground">{t("buttonDisabled")}</span>
              </label>}
            </div>
          ))}
          <Button size="sm" variant="secondary" className="h-8 rounded-xl border-0 bg-muted/55 text-xs"
            disabled={comp.buttons.length >= 5 || actions?.length === 0}
            onClick={() => onChange({ ...comp, buttons: [...comp.buttons, { id: uid(), customId: actions?.[0]?.customId ?? uid(), label: actions?.[0]?.label ?? "", style: 2 as const, url: "", disabled: false }] })}>
            <Plus className="h-3.5 w-3.5 mr-1" />{t("addButton")}
          </Button>
        </>
      )}
      {comp.selectMenu?.type === "string_select" && (
        <StringSelectEditorFields
          comp={comp.selectMenu}
          onChange={updated => onChange({ ...comp, selectMenu: updated })}
        />
      )}
      {comp.selectMenu && comp.selectMenu.type !== "string_select" && (
        <GenericSelectEditorFields
          comp={comp.selectMenu as GenericSelectState} // NOSONAR
          onChange={updated => onChange({ ...comp, selectMenu: updated })}
        />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function FileComponentEditorFields({
  comp,
  onChange,
}: {
  readonly comp: FileComponentState;
  readonly onChange: (updated: FileComponentState) => void;
}) {
  const t = useTranslations("EmbedEditor");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await executeSharedEndpoint(dashboardEndpoints.dashboardCdnUpload, {
        path: {},
        query: {},
        body: formData,
      });
      if (data.url) onChange({ ...comp, url: data.url });
      else throw new Error("No URL in response");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Field label={t("fileUrl")}>
        <div className="flex gap-2">
          <Input
            value={comp.url}
            onChange={e => onChange({ ...comp, url: e.target.value })}
            placeholder="https://..."
            className={cn(COMPACT_INPUT_CN, "flex-1")}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 shrink-0"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) { void handleUpload(file); }
              e.target.value = "";
            }}
          />
        </div>
        {uploadError && <p className="text-xs text-destructive mt-1">{uploadError}</p>}
      </Field>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={comp.spoiler}
          onChange={e => onChange({ ...comp, spoiler: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-input accent-primary"
        />
        <span className="text-xs text-muted-foreground">{t("fileSpoiler")}</span>
      </label>
    </div>
  );
}

export function EmbedEditor({ initialData, onSave, isSaving, onCancel, channels = [], roles = [], serverId, placeholders = [], variant = "full", previewActions, ticketActions, onDirtyChange, onFormatChosen }: EmbedEditorProps) { // NOSONAR
  const isTicketPanel = variant === "ticket-panel";
  const t = useTranslations("EmbedEditor");
  const tCommon = useTranslations("Common");
  const [loadedMentions, setLoadedMentions] = useState<{ serverId?: string; channels: PreviewDiscordChannel[]; roles: PreviewDiscordRole[] }>({ channels: [], roles: [] });
  useEffect(() => {
    if (!serverId || (channels.length && roles.length)) return;
    const controller = new AbortController();
    const input = { path: { serverId }, query: {}, body: {} };
    void Promise.all([
      channels.length ? Promise.resolve(channels) : executeSharedEndpoint(ServerChannelsEndpoint, input, { signal: controller.signal }).then(result => [...result]).catch(() => []),
      roles.length ? Promise.resolve(roles) : executeSharedEndpoint(DiscordRolesEndpoint, input, { signal: controller.signal }).then(result => [...result.roles]).catch(() => []),
    ]).then(([nextChannels, nextRoles]) => { if (!controller.signal.aborted) setLoadedMentions({ serverId, channels: nextChannels, roles: nextRoles }); });
    return () => controller.abort();
  }, [serverId, channels.length, roles.length]);
  const loaded = loadedMentions.serverId === serverId ? loadedMentions : { channels: [], roles: [] };
  const mentionContext: MentionContext = { channels: channels.length ? channels : loaded.channels, roles: roles.length ? roles : loaded.roles, serverId, placeholders };
  const [activeUploads, setActiveUploads] = useState(0);
  const updateUploadActivity = useCallback((delta: number) => setActiveUploads(count => Math.max(0, count + delta)), []);
  const parsedInitialData = initialData ? payloadToMessages(initialData) : null;
  const inputClassName = "rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5";
  const compactInputClassName = COMPACT_INPUT_CN;
  const compactTextareaClassName = COMPACT_TEXTAREA_CN;

  const [messages, setMessages] = useState<MessageState[]>(() =>
    parsedInitialData ? parsedInitialData.messages : [{ id: uid(), mode: "v1", embeds: [defaultState()], content: "", components: [] }]
  );
  const [formatChosen, setFormatChosen] = useState(() => !isTicketPanel || !!parsedInitialData?.messages.some(message =>
    message.content.trim().length > 0 || message.components.length > 0 || message.embeds.map(stateToEmbed).some(hasMeaningfulEmbedContent)
  ));
  const savedMessageState = useRef(JSON.stringify(messages));
  useEffect(() => { onDirtyChange?.(JSON.stringify(messages) !== savedMessageState.current); }, [messages, onDirtyChange]);
  const [expandedEmbedId, setExpandedEmbedId] = useState<string | null>(() =>
    parsedInitialData?.messages[0]?.embeds[0]?.editorId ?? null
  );
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState(false);
  const [importWarning, setImportWarning] = useState<string | null>(null);
  const [importResolving, setImportResolving] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [addMessageDialogOpen, setAddMessageDialogOpen] = useState(false);
  const [copiedDiscohook, setCopiedDiscohook] = useState(false);
  const [profile, setProfile] = useState<MessageProfileState>(() => parsedInitialData?.profile ?? { name: "", avatarUrl: "" });
  const [profileOpen, setProfileOpen] = useState(false);
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
    () => new Set((parsedInitialData?.messages ?? []).map((message) => message.id)),
  );

  useEffect(() => {
    setExpandedMessageIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set(messages.map((message) => message.id));
    });
  }, [messages]);

  const setEmbedsForMessage = (messageIndex: number, updater: EmbedFormState[] | ((prev: EmbedFormState[]) => EmbedFormState[])) =>
    setMessages(prev => prev.map((msg, i) => i === messageIndex ? {
      ...msg,
      embeds: typeof updater === "function" ? updater(msg.embeds) : updater,
    } : msg));

  const setContentForMessage = (messageIndex: number, value: string) =>
    setMessages(prev => prev.map((msg, i) => i === messageIndex ? { ...msg, content: value } : msg));

  const addMessage = (mode: "v1" | "v2") => {
    const newEmbed = defaultState();
    const newMsg: MessageState = { id: uid(), mode, embeds: [newEmbed], content: "", components: [] };
    setMessages(prev => [...prev, newMsg]);
    setExpandedMessageIds((prev) => new Set(prev).add(newMsg.id));
    setExpandedEmbedId(newEmbed.editorId);
    setAddMessageDialogOpen(false);
  };

  const removeMessage = (index: number) => {
    if (messages.length <= 1) return;
    const removingId = messages[index]?.id;
    setMessages(prev => prev.filter((_, i) => i !== index));
    if (removingId) {
      setExpandedMessageIds((prev) => {
        const next = new Set(prev);
        next.delete(removingId);
        return next;
      });
    }
    const newIdx = Math.max(0, Math.min(index, messages.length - 2));
    setExpandedEmbedId(messages[newIdx]?.embeds[0]?.editorId ?? null);
  };

  const duplicateMessage = (index: number) => {
    setMessages((prev) => {
      const source = prev[index];
      if (!source) return prev;
      const duplicated: MessageState = {
        id: uid(),
        mode: source.mode,
        embeds: source.embeds.map((embed) => duplicateEmbedState(embed)),
        content: source.content,
        components: source.components.map((component) => duplicateComponentState(component)),
      };
      const next = [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)];
      setExpandedMessageIds((expandedPrev) => new Set(expandedPrev).add(duplicated.id));
      setExpandedEmbedId(duplicated.embeds[0]?.editorId ?? null);
      return next;
    });
  };

  const moveMessage = (index: number, direction: -1 | 1) => {
    setMessages((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const updateEmbed = (messageIndex: number, embedId: string, updater: (embed: EmbedFormState) => EmbedFormState) =>
    setEmbedsForMessage(messageIndex, (prev) => prev.map((embed) => (embed.editorId === embedId ? updater(embed) : embed)));

  const setEmbedField = <K extends Exclude<keyof EmbedFormState, "editorId" | "openSections" | "fields">>(
    messageIndex: number,
    embedId: string,
    key: K,
    value: EmbedFormState[K], // NOSONAR
  ) => {
    updateEmbed(messageIndex, embedId, (embed) => ({ ...embed, [key]: value }));
  };

  const toggleSection = (messageIndex: number, embedId: string, section: SectionKey) => {
    updateEmbed(messageIndex, embedId, (embed) => ({ // NOSONAR
      ...embed,
      openSections: {
        ...embed.openSections,
        [section]: !embed.openSections[section],
      },
    }));
  };

  const addEmbed = (messageIndex: number) => {
    setEmbedsForMessage(messageIndex, (prev) => {
      if (prev.length >= MAX_DISCORD_EMBEDS_PER_MESSAGE) return prev;
      const nextEmbed = defaultState();
      setExpandedEmbedId(nextEmbed.editorId); // NOSONAR
      return [...prev, nextEmbed];
    });
  };

  const removeEmbed = (messageIndex: number, embedId: string) => {
    setEmbedsForMessage(messageIndex, (prev) => {
      if (prev.length <= 1) {
        setExpandedEmbedId(null);
        return [];
      } // NOSONAR
      const removedIndex = prev.findIndex((embed) => embed.editorId === embedId);
      const nextEmbeds = prev.filter((embed) => embed.editorId !== embedId);
      if (expandedEmbedId === embedId) {
        const fallback = nextEmbeds[Math.max(0, removedIndex - 1)] ?? nextEmbeds[0] ?? null;
        setExpandedEmbedId(fallback?.editorId ?? null);
      } // NOSONAR
      return nextEmbeds;
    });
  };

  const duplicateEmbed = (messageIndex: number, embedId: string) => {
    setEmbedsForMessage(messageIndex, (prev) => {
      if (prev.length >= MAX_DISCORD_EMBEDS_PER_MESSAGE) return prev;
      const index = prev.findIndex((embed) => embed.editorId === embedId);
      if (index === -1) return prev;
      const duplicated = duplicateEmbedState(prev[index]);
      setExpandedEmbedId(duplicated.editorId);
      return [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)];
    });
  };

  const moveEmbed = (messageIndex: number, embedId: string, direction: -1 | 1) => {
    setEmbedsForMessage(messageIndex, (prev) => {
      const index = prev.findIndex((embed) => embed.editorId === embedId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  // ── Field management ────────────────────────────────────────────────────────

  const addField = (messageIndex: number, embedId: string) => {
    updateEmbed(messageIndex, embedId, (embed) => {
      if (embed.fields.length >= 25) return embed;
      return { // NOSONAR
        ...embed,
        fields: [...embed.fields, { id: uid(), name: "", value: "", inline: false }],
      };
    });
  };

  const updateField = (messageIndex: number, embedId: string, fieldId: string, patch: Partial<FieldState>) =>
    updateEmbed(messageIndex, embedId, (embed) => ({
      ...embed,
      fields: patchField(embed.fields, fieldId, patch),
    }));

  const removeField = (messageIndex: number, embedId: string, fieldId: string) =>
    updateEmbed(messageIndex, embedId, (embed) => ({ ...embed, fields: removeFieldById(embed.fields, fieldId) }));

  const moveField = (messageIndex: number, embedId: string, fieldId: string, dir: -1 | 1) =>
    updateEmbed(messageIndex, embedId, (embed) => ({ ...embed, fields: reorderFieldById(embed.fields, fieldId, dir) })); // NOSONAR

  // ── V2 Component management ──────────────────────────────────────────────────

  const [expandedV2Ids, setExpandedV2Ids] = useState<Set<string>>(new Set());
  const toggleV2Expanded = (id: string) =>
    setExpandedV2Ids(prev => { // NOSONAR
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    }); // NOSONAR

  const setV2Components = (messageIndex: number, updater: TopLevelComponentState[] | ((prev: TopLevelComponentState[]) => TopLevelComponentState[])) =>
    setMessages(prev => prev.map((msg, i) => i === messageIndex ? {
      ...msg,
      components: typeof updater === "function" ? updater(msg.components) : updater,
    } : msg));

  const createBoundV2Component = (type: TopLevelComponentState["type"]): TopLevelComponentState => {
    const component = createDefaultV2Component(type), action = ticketActions?.[0];
    if (action && component.type === "action_row") component.buttons = [{ id: uid(), customId: action.customId, label: action.label, style: 2, url: "", disabled: false }];
    if (action && component.type === "string_select") {
      component.customId = `ck:ticket:menu:${action.customId.split(":")[3]}:${component.customId}`;
      component.options = [{ id: uid(), label: action.label, value: action.customId, description: "", isDefault: false }];
    }
    return component;
  };

  const addV2Component = (messageIndex: number, type: TopLevelComponentState["type"]) => {
    if (ticketActions?.length === 0 && ["action_row", "string_select"].includes(type)) return;
    const newComp = createBoundV2Component(type);
    setV2Components(messageIndex, prev => [...prev, newComp]);
    setExpandedV2Ids(previous => new Set(previous).add(newComp.id));
  };

  const removeV2Component = (messageIndex: number, id: string) =>
    setV2Components(messageIndex, prev => prev.filter(c => c.id !== id));

  const moveV2Component = (messageIndex: number, id: string, dir: -1 | 1) =>
    setV2Components(messageIndex, prev => {
      const arr = [...prev];
      const idx = arr.findIndex(c => c.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= arr.length) return prev;
      [arr[idx], arr[next]] = [arr[next], arr[idx]]; // NOSONAR
      return arr;
    });

  const updateV2Component = (messageIndex: number, id: string, updater: (c: TopLevelComponentState) => TopLevelComponentState) =>
    setV2Components(messageIndex, prev => prev.map(c => c.id === id ? updater(c) : c));

  const updateContainerChildren = (messageIndex: number, containerId: string, updater: (children: ContainerChildState[]) => ContainerChildState[]) =>
    updateV2Component(messageIndex, containerId, comp => {
      if (comp.type !== "container") return comp;
      return { ...comp, children: updater(comp.children) };
    });

  // ── Import ──────────────────────────────────────────────────────────────────

  const applyParsed = (parsed: Record<string, unknown>) => {
    const { messages: parsedMessages, profile: parsedProfile } = payloadToMessages(parsed);
    if (isTicketPanel && (parsedMessages.length !== 1 || parsedMessages[0]?.mode !== messages[0]?.mode)) {
      setImportError(true);
      return;
    }
    if (ticketActions !== undefined && parsedMessages.some(message => hasUnassignedTicketActions(message.components.map(serializeComponentState), ticketActions))) {
      setImportError(true);
      return;
    }
    setImportError(false);
    setImportUrl("");
    setMessages(parsedMessages);
    setProfile(isTicketPanel ? EMPTY_MESSAGE_PROFILE : parsedProfile);
    setExpandedEmbedId(parsedMessages[0]?.embeds[0]?.editorId ?? null); // NOSONAR
    setImportWarning(null);
    setImportExportOpen(false);
  };

  const handleImport = async () => {
    let urlToparse = importUrl.trim();

    // Share links don't carry ?data= and can't be fetched client-side (CORS).
    // Resolve both supported Discohook forms through the API.
    if (requiresDiscohookResolve(urlToparse)) {
      setImportResolving(true);
      setImportError(false);
      try {
        const json = await executeSharedEndpoint(dashboardEndpoints.dashboardDiscohookResolve, {
          path: {},
          query: { url: urlToparse },
          body: {},
        });

        if ("payload" in json && typeof json.payload === "object" && json.payload !== null && !Array.isArray(json.payload)) {
          // Backend returned the raw JSON payload directly
          applyParsed({ ...json.payload });
          return;
        }
        if ("resolvedUrl" in json) {
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

  const outputMessages = ticketActions === undefined ? messages : messages.map(message => ({ ...message, components: message.components.map(singleChoiceTicketMenu) }));

  const emptyContainers = outputMessages.flatMap(message => message.mode === "v2" ? message.components.flatMap((component, index) =>
    component.type === "container" && component.children.length === 0 ? [{ id: component.id, number: index + 1 }] : []) : []);

  const handleSave = async () => {
    if (activeUploads > 0 || isSaving || emptyContainers.length > 0) return;
    try { await onSave(stateToPayload(outputMessages, profile)); } catch { return; }
    savedMessageState.current = JSON.stringify(messages);
    onDirtyChange?.(false);
  };

  const discohookPayload = stateToPayload(outputMessages, profile);
  const unassignedActions = ticketActions !== undefined && hasUnassignedTicketActions(discohookPayload.components ?? (discohookPayload.messages as { data: { components?: unknown } }[] | undefined)?.[0]?.data.components, ticketActions);
  const discohookUrl = buildDiscohookUrl(discohookPayload);
  const previewMessages = outputMessages.map((message) => ({
    id: message.id,
    content: message.content,
    embeds: message.mode === "v1" ? message.embeds.map(stateToEmbed).filter(hasMeaningfulEmbedContent) : [],
    isV2: message.mode === "v2",
    components: message.components.map(serializeComponentState).filter((c): c is TopLevelComponent => c !== null),
  }));
  const hasContent =
    messages.some(msg => {
      if (msg.mode === "v2") return msg.components.length > 0;
      return msg.components.length > 0 || msg.embeds.map(stateToEmbed).some(hasMeaningfulEmbedContent) || msg.content.trim().length > 0; // NOSONAR
    }) ||
    profile.name.trim().length > 0 || // NOSONAR
    profile.avatarUrl.trim().length > 0;

  const handleCopyDiscohookUrl = async () => {
    await navigator.clipboard.writeText(discohookUrl); // NOSONAR
    setCopiedDiscohook(true);
    setTimeout(() => setCopiedDiscohook(false), 2000); // NOSONAR
  };

  if (!formatChosen) return <section className="space-y-5 rounded-3xl bg-card p-5 sm:p-6" aria-label={t("messageFormat")}>
    <h3 className="text-base font-semibold">{t("messageFormat")}</h3>
    <div className="grid gap-3 sm:grid-cols-2">{(["v2", "v1"] as const).map(mode => <Button key={mode} variant="ghost"
      className="h-auto justify-start whitespace-normal rounded-2xl bg-muted/55 p-5 text-left shadow-sm shadow-black/5 hover:bg-muted"
      onClick={() => { setMessages(previous => previous.map(message => ({ ...message, mode }))); setFormatChosen(true); onFormatChosen?.(); }}>
      <span className="space-y-1"><span className="flex items-center gap-2 text-sm font-semibold">{t(mode === "v1" ? "addMessageClassicTitle" : "addMessageV2Title")}{mode === "v2" && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t("recommendedFormat")}</span>}</span>
        <span className="block text-sm font-normal text-muted-foreground">{t(mode === "v1" ? "classicFormatHint" : "v2FormatHint")}</span></span>
    </Button>)}</div>
    <Button variant="ghost" onClick={onCancel}>{tCommon("cancel")}</Button>
  </section>;

  return (
    <TicketActionsContext.Provider value={ticketActions}><ImageUploadActivityContext.Provider value={updateUploadActivity}><div data-ticket-message-editor={isTicketPanel || undefined} className={cn("flex flex-col bg-card text-card-foreground", !isTicketPanel && "h-full min-h-0")}>
      {/* Two-column body */}
      <div className={isTicketPanel ? "grid min-w-0 items-start md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row"}>

        {/* ── Left: form ── */}
        <div className={cn("min-w-0 space-y-5 bg-card px-4 py-5 md:px-6", !isTicketPanel && "w-full overflow-y-auto border-b border-border md:w-[52%] md:border-b-0 md:border-r")}>

          <div className="flex items-center justify-between">
            <Button size="sm" variant="secondary" className="h-8 rounded-xl border-0 bg-muted/55" onClick={() => setImportExportOpen(true)}>
              <Link2 className="h-3.5 w-3.5 mr-1" />{t("importExport")}
            </Button>
            {!isTicketPanel && <Button
              size="sm"
              className="h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setAddMessageDialogOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />{t("addMessage")}
            </Button>}
          </div>

          {!isTicketPanel && <Separator />}

          {/* ── Message headers ── */}
          <div className="space-y-2">
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div key={msg.id} className={cn("rounded-lg bg-card", !isTicketPanel && "border", !isTicketPanel && (expandedMessageIds.has(msg.id) ? "border-primary/60" : "border-border/80"))}>
                  {!isTicketPanel && <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => {
                        setExpandedMessageIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(msg.id)) {
                            next.delete(msg.id);
                          } else {
                            next.add(msg.id);
                          }
                          return next;
                        });
                        setExpandedEmbedId(msg.embeds[0]?.editorId ?? null);
                      }}
                    >
                      {expandedMessageIds.has(msg.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="truncate text-base font-semibold">{`Message ${i + 1}`}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {msg.mode === "v2" ? "Components v2" : "Classic"}
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveMessage(i, -1)}
                        disabled={i === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveMessage(i, 1)}
                        disabled={i === messages.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => duplicateMessage(i)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMessage(i)}
                        disabled={messages.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>}
                  {(isTicketPanel || expandedMessageIds.has(msg.id)) && (
                    <div className={cn("space-y-4", !isTicketPanel && "border-t border-border/80 p-3")}>
                      {msg.mode === "v1" ? (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("content")}</Label>
                  <CharCount value={msg.content} max={MAX_DISCORD_MESSAGE_CONTENT_LENGTH} />
                </div>
                <MentionTextField
                  value={msg.content}
                  onValueChange={(nextValue) => setContentForMessage(i, nextValue.slice(0, MAX_DISCORD_MESSAGE_CONTENT_LENGTH))}
                  maxLength={MAX_DISCORD_MESSAGE_CONTENT_LENGTH}
                  rows={4}
                  multiline
                  className={compactTextareaClassName}
                  placeholder={t("contentPlaceholder")}
                  mentionContext={mentionContext}
                />
              </div>

              {!isTicketPanel && <CollapsibleSection title={t("profileSection")} open={profileOpen} onToggle={() => setProfileOpen((prev) => !prev)}>
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
                    <UploadedImageField value={profile.avatarUrl} label={t("profileAvatarUrl")} onChange={avatarUrl => setProfile(prev => ({ ...prev, avatarUrl }))} />
                  </Field>
                </div>
              </CollapsibleSection>}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground dark:text-white">{`Embeds (${msg.embeds.length}/${MAX_DISCORD_EMBEDS_PER_MESSAGE})`}</h3>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 rounded-xl border-0 bg-muted/55 text-xs"
                    onClick={() => addEmbed(i)}
                    disabled={msg.embeds.length >= MAX_DISCORD_EMBEDS_PER_MESSAGE}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />Add Embed
                  </Button>
                </div>
                {msg.embeds.map((embed, index) => {
                  const label = embed.title.trim() || embed.description.trim().slice(0, 40);
                  const isExpanded = expandedEmbedId === embed.editorId;
                  return (
                    <div
                      key={embed.editorId}
                      className={cn(
                        "rounded-2xl bg-muted/25",
                      )}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          onClick={() => setExpandedEmbedId((prev) => (prev === embed.editorId ? null : embed.editorId))}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <span className="truncate text-sm font-semibold">{`Embed ${index + 1}${label ? ` · ${label}` : ""}`}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveEmbed(i, embed.editorId, -1)} disabled={index === 0}>
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveEmbed(i, embed.editorId, 1)} disabled={index === msg.embeds.length - 1}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateEmbed(i, embed.editorId)} disabled={msg.embeds.length >= MAX_DISCORD_EMBEDS_PER_MESSAGE}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeEmbed(i, embed.editorId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="space-y-1 px-2 pb-2">
                          <CollapsibleSection title={t("authorSection")} open={embed.openSections.author} onToggle={() => toggleSection(i, embed.editorId, "author")}>
                            <div className="space-y-3">
                              <Field label="">
                                <div className="mb-1 flex items-center justify-between">
                                  <Label className="text-xs">{t("authorName")}</Label>
                                  <CharCount value={embed.authorName} max={256} />
                                </div>
                                <MentionTextField value={embed.authorName} onValueChange={(nextValue) => setEmbedField(i, embed.editorId, "authorName", nextValue)} maxLength={256} className={compactInputClassName} mentionContext={mentionContext} />
                              </Field>
                              <Field label={t("authorUrl")}>
                                <Input value={embed.authorUrl} onChange={e => setEmbedField(i, embed.editorId, "authorUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
                              </Field>
                              <Field label={t("authorImageLabel")}>
                                <UploadedImageField value={embed.authorIconUrl} label={t("authorImageLabel")} onChange={url => setEmbedField(i, embed.editorId, "authorIconUrl", url)} />
                              </Field>
                            </div>
                          </CollapsibleSection>

                          <CollapsibleSection title={t("bodySection")} open={embed.openSections.body} onToggle={() => toggleSection(i, embed.editorId, "body")}>
                            <div className="space-y-3">
                              <Field label="">
                                <div className="mb-1 flex items-center justify-between">
                                  <Label className="text-xs">{t("title")}</Label>
                                  <CharCount value={embed.title} max={256} />
                                </div>
                                <MentionTextField value={embed.title} onValueChange={(nextValue) => setEmbedField(i, embed.editorId, "title", nextValue)} maxLength={256} className={compactInputClassName} mentionContext={mentionContext} />
                              </Field>
                              <Field label={t("titleUrl")}>
                                <Input value={embed.titleUrl} onChange={e => setEmbedField(i, embed.editorId, "titleUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
                              </Field>
                              <Field label={t("sidebarColor")}>
                                <EmbedColorPicker compact value={hexToIntSafe(embed.color) ?? 0x5865f2} defaultValue={0x5865f2} unset={hexToIntSafe(embed.color) === null}
                                  onChange={color => setEmbedField(i, embed.editorId, "color", intToHex(color))} />
                              </Field>
                              <Field label="">
                                <div className="mb-1 flex items-center justify-between">
                                  <Label className="text-xs">{t("description")}</Label>
                                  <CharCount value={embed.description} max={4096} />
                                </div>
                                <MentionTextField
                                  value={embed.description}
                                  onValueChange={(nextValue) => setEmbedField(i, embed.editorId, "description", nextValue)}
                                  maxLength={4096}
                                  rows={5}
                                  multiline
                                  className={compactTextareaClassName}
                                  placeholder={t("descriptionPlaceholder")}
                                  mentionContext={mentionContext}
                                />
                              </Field>
                            </div>
                          </CollapsibleSection>

                          <CollapsibleSection title={`${t("fieldsSection")} (${embed.fields.length}/25)`} open={embed.openSections.fields} onToggle={() => toggleSection(i, embed.editorId, "fields")}>
                            <div className="space-y-3">
                              <div className="flex items-center justify-end">
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addField(i, embed.editorId)} disabled={embed.fields.length >= 25}>
                                  <Plus className="h-3.5 w-3.5 mr-1" />{t("addField")}
                                </Button>
                              </div>
                              {embed.fields.map((field, fieldIndex) => (
                                <div key={field.id} className="space-y-3 pt-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">{t("field")} {fieldIndex + 1}</span>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(i, embed.editorId, field.id, -1)} disabled={fieldIndex === 0}>
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(i, embed.editorId, field.id, 1)} disabled={fieldIndex === embed.fields.length - 1}>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeField(i, embed.editorId, field.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-xs">{t("fieldName")}</Label>
                                      <CharCount value={field.name} max={256} />
                                    </div>
                                    <MentionTextField value={field.name} onValueChange={(nextValue) => updateField(i, embed.editorId, field.id, { name: nextValue })} maxLength={256} className={cn(inputClassName, "h-7 text-xs")} mentionContext={mentionContext} />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-xs">{t("fieldValue")}</Label>
                                      <CharCount value={field.value} max={1024} />
                                    </div>
                                    <MentionTextField value={field.value} onValueChange={(nextValue) => updateField(i, embed.editorId, field.id, { value: nextValue })} maxLength={1024} rows={2} multiline className={cn(inputClassName, "text-xs resize-none")} mentionContext={mentionContext} />
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.inline}
                                      onChange={e => updateField(i, embed.editorId, field.id, { inline: e.target.checked })}
                                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                                    />
                                    <span className="text-xs text-muted-foreground">{t("fieldInline")}</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </CollapsibleSection>

                          <CollapsibleSection title={t("imagesSection")} open={embed.openSections.images} onToggle={() => toggleSection(i, embed.editorId, "images")}>
                            <div className="space-y-3">
                              <Field label={t("thumbnailUploadLabel")}>
                                <UploadedImageField value={embed.thumbnailUrl} label={t("thumbnailUploadLabel")} onChange={url => setEmbedField(i, embed.editorId, "thumbnailUrl", url)} />
                              </Field>
                              <Field label={t("imageUploadLabel")}>
                                <UploadedImageField value={embed.imageUrl} label={t("imageUploadLabel")} onChange={url => setEmbedField(i, embed.editorId, "imageUrl", url)} />
                              </Field>
                            </div>
                          </CollapsibleSection>

                          <CollapsibleSection title={t("footerSection")} open={embed.openSections.footer} onToggle={() => toggleSection(i, embed.editorId, "footer")}>
                            <div className="space-y-3">
                              <Field label="">
                                <div className="mb-1 flex items-center justify-between">
                                  <Label className="text-xs">{t("footerText")}</Label>
                                  <CharCount value={embed.footerText} max={2048} />
                                </div>
                                <MentionTextField value={embed.footerText} onValueChange={(nextValue) => setEmbedField(i, embed.editorId, "footerText", nextValue)} maxLength={2048} className={compactInputClassName} mentionContext={mentionContext} />
                              </Field>
                              <Field label={t("footerImageLabel")}>
                                <UploadedImageField value={embed.footerIconUrl} label={t("footerImageLabel")} onChange={url => setEmbedField(i, embed.editorId, "footerIconUrl", url)} />
                              </Field>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={embed.includeTimestamp}
                                  onChange={e => setEmbedField(i, embed.editorId, "includeTimestamp", e.target.checked)}
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
              {isTicketPanel && <div className="space-y-3">
                {msg.components.filter((component): component is ActionRowState => component.type === "action_row").map(component =>
                  <div key={component.id} className="space-y-3">
                    <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => removeV2Component(i, component.id)}><Trash2 className="h-4 w-4" />{tCommon("delete")}</Button></div>
                    <ActionRowEditorFields comp={component} onChange={updated => updateV2Component(i, component.id, () => updated)} />
                  </div>)}
                <Button size="sm" variant="secondary" className="rounded-xl border-0 bg-muted/55" disabled={msg.components.length >= 5 || ticketActions?.length === 0} onClick={() => addV2Component(i, "action_row")}><Plus className="h-4 w-4" />{t("actionRowLabel")}</Button>
              </div>}
            </>
                      ) : (
            /* ── V2 Components editor ── */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionLabel>{t("componentsSection")}</SectionLabel>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="sm" variant="secondary" className="h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />{t("addComponent")}
                  </Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" collisionPadding={12} className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-48 rounded-xl">
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
                          { type: "file" as const, label: t("fileLabel") },
                        ] as const).filter(item => (!isTicketPanel || item.type !== "file") && (ticketActions === undefined || !["user_select", "role_select", "mentionable_select", "channel_select"].includes(item.type))).map(item => (
                          <DropdownMenuItem key={item.type} disabled={ticketActions?.length === 0 && ["action_row", "string_select"].includes(item.type)} onSelect={() => addV2Component(i, item.type)}>
                            {item.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {msg.components.map((comp, compIdx) => {
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
                  file: t("fileLabel"),
                };
                const isExpanded = expandedV2Ids.has(comp.id);
                const compLabel = comp.type === "raw"
                  ? `${t("unknownComponent")} (type ${comp.rawType})`
                  : (compV2Labels[comp.type] ?? t("sectionLabel"));
                return (
                  <div key={comp.id} className={cn(isTicketPanel ? "rounded-2xl bg-muted/35" : "rounded-lg border bg-card", !isTicketPanel && (isExpanded ? "border-primary/60" : "border-border/80"))}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => toggleV2Expanded(comp.id)}>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="truncate text-base font-semibold">{`${compLabel} ${compIdx + 1}`}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveV2Component(i, comp.id, -1)} disabled={compIdx === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveV2Component(i, comp.id, 1)} disabled={compIdx === msg.components.length - 1}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeV2Component(i, comp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {!isExpanded && comp.type === "container" && comp.children.length === 0 && <p role="alert" className="px-3 pb-3 text-sm text-destructive">{t("emptyContainerError", { number: compIdx + 1 })}</p>}
                    {isExpanded && (
                      <div className={cn("px-3 py-3 space-y-3", !isTicketPanel && "border-t border-border/80")}>
                        {comp.type === "action_row" && (
                          <ActionRowEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(i, comp.id, () => updated)}
                          />
                        )}
                        {comp.type === "string_select" && (
                          <StringSelectEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(i, comp.id, () => updated)}
                          />
                        )}
                        {(comp.type === "user_select" || comp.type === "role_select" || comp.type === "mentionable_select" || comp.type === "channel_select") && (
                          <GenericSelectEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(i, comp.id, () => updated)}
                          />
                        )}
                        {comp.type === "raw" && (
                          <p className="text-xs text-muted-foreground">{t("unknownComponentHint")}</p>
                        )}
                        {comp.type === "text_display" && (
                          <MentionTextField
                            value={comp.content}
                            onValueChange={(nextValue) => updateV2Component(i, comp.id, c => c.type === "text_display" ? { ...c, content: nextValue } : c)}
                            rows={4}
                            multiline
                            className={compactTextareaClassName}
                            mentionContext={mentionContext}
                          />
                        )}
                        {comp.type === "separator" && (
                          <SeparatorEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(i, comp.id, () => updated)}
                          />
                        )}
                        {comp.type === "media_gallery" && (
                          <MediaGalleryEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(i, comp.id, () => updated)}
                            onImageChange={(itemId, url) => updateV2Component(i, comp.id, current => current.type === "media_gallery" ? { ...current, items: current.items.map(item => item.id === itemId ? { ...item, url } : item) } : current)}
                          />
                        )}
                        {comp.type === "section" && (
                          <SectionEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(i, comp.id, () => updated)}
                            mentionContext={mentionContext}
                          />
                        )}
                        {comp.type === "file" && (
                          <FileComponentEditorFields
                            comp={comp}
                            onChange={updated => updateV2Component(i, comp.id, () => updated)}
                          />
                        )}
                        {comp.type === "container" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-muted-foreground">{t("accentColor")}</span>
                              <EmbedColorPicker compact value={hexToIntSafe(comp.accentColor) ?? 0x5865f2} defaultValue={0x5865f2} unset={hexToIntSafe(comp.accentColor) === null}
                                onChange={color => updateV2Component(i, comp.id, c => c.type === "container" ? { ...c, accentColor: intToHex(color) } : c)} />
                            </div>
                            {comp.children.length === 0 && <p role="alert" className="text-sm text-destructive">{t("emptyContainerError", { number: compIdx + 1 })}</p>}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={comp.spoiler ?? false}
                                onChange={e => updateV2Component(i, comp.id, c => c.type === "container" ? { ...c, spoiler: e.target.checked } : c)}
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
                                file: t("fileLabel"),
                              };
                              const childLabel = childV2Labels[child.type] ?? t("sectionLabel");
                              return (
                                <div key={child.id} className="space-y-1 pt-2">
                                  <div className="flex items-center gap-2 px-2 py-1.5">
                                    <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                                      onClick={() => toggleV2Expanded(child.id)}>
                                      {childIsExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                      <span className="truncate text-sm font-medium">{`${childLabel} ${childIdx + 1}`}</span>
                                    </button>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" className="h-6 w-6"
                                        onClick={() => updateContainerChildren(i, comp.id, children => { const arr = [...children]; const childIndex = arr.findIndex(c => c.id === child.id); if (childIndex > 0) { [arr[childIndex - 1], arr[childIndex]] = [arr[childIndex], arr[childIndex - 1]]; } return arr; })}
                                        disabled={childIdx === 0}>
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6"
                                        onClick={() => updateContainerChildren(i, comp.id, children => { const arr = [...children]; const childIndex = arr.findIndex(c => c.id === child.id); if (childIndex < arr.length - 1) { [arr[childIndex], arr[childIndex + 1]] = [arr[childIndex + 1], arr[childIndex]]; } return arr; })}
                                        disabled={childIdx === comp.children.length - 1}>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => updateContainerChildren(i, comp.id, children => children.filter(c => c.id !== child.id))}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  {childIsExpanded && (
                                    <div className="px-3 py-2 space-y-3">
                                      {child.type === "text_display" && (
                                        <MentionTextField
                                          value={child.content}
                                          onValueChange={(nextValue) => updateContainerChildren(i, comp.id, children => children.map(c => c.id === child.id && c.type === "text_display" ? { ...c, content: nextValue } : c))}
                                          rows={3}
                                          multiline
                                          className={compactTextareaClassName}
                                          mentionContext={mentionContext}
                                        />
                                      )}
                                      {child.type === "separator" && (
                                        <SeparatorEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(i, comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                      {child.type === "media_gallery" && (
                                        <MediaGalleryEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(i, comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                          onImageChange={(itemId, url) => updateContainerChildren(i, comp.id, children => children.map(current => current.id === child.id && current.type === "media_gallery" ? { ...current, items: current.items.map(item => item.id === itemId ? { ...item, url } : item) } : current))}
                                        />
                                      )}
                                      {child.type === "section" && (
                                        <SectionEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(i, comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                          mentionContext={mentionContext}
                                        />
                                      )}
                                      {child.type === "action_row" && (
                                        <ActionRowEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(i, comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                      {child.type === "string_select" && (
                                        <StringSelectEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(i, comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                      {(child.type === "user_select" || child.type === "role_select" || child.type === "mentionable_select" || child.type === "channel_select") && (
                                        <GenericSelectEditorFields
                                          comp={child as GenericSelectState}
                                          onChange={updated => updateContainerChildren(i, comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                      {child.type === "file" && (
                                        <FileComponentEditorFields
                                          comp={child}
                                          onChange={updated => updateContainerChildren(i, comp.id, children => children.map(c => c.id === child.id ? updated : c))}
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button size="sm" variant="secondary" className="h-8 text-xs w-full">
                                <Plus className="h-3.5 w-3.5 mr-1" />{t("addContainer")}
                              </Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" collisionPadding={12} className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-48 rounded-xl">
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
                                      { type: "file" as const, label: t("fileLabel") },
                                    ] as const).filter(item => (!isTicketPanel || item.type !== "file") && (ticketActions === undefined || !["user_select", "role_select", "mentionable_select", "channel_select"].includes(item.type))).map(item => (
                                      <DropdownMenuItem key={item.type} disabled={ticketActions?.length === 0 && ["action_row", "string_select"].includes(item.type)} onSelect={() => {
                                        const child = createBoundV2Component(item.type) as ContainerChildState;
                                        updateContainerChildren(i, comp.id, prev => [...prev, child]);
                                        setExpandedV2Ids(previous => new Set(previous).add(child.id));
                                      }}>
                                        {item.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom padding */}
          <div className="h-4" />
        </div>

        {/* ── Right: preview ── */}
        <div className="flex min-w-0 flex-1 flex-col bg-card">
          <button
            type="button"
            className="flex items-center justify-between border-b border-border px-4 py-3 text-left md:hidden"
            onClick={() => setIsMobilePreviewOpen(prev => !prev)}
          >
            <span className="text-xs font-medium text-muted-foreground">
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
                <div className="space-y-4">
                  {previewMessages.map((message) => (
                    <DiscordMessagePreview
                      key={message.id}
                      profile={{ name: profile.name || undefined, avatar_url: profile.avatarUrl || undefined }}
                      content={message.content}
                      embeds={message.embeds}
                      isV2={message.isV2}
                      components={message.components}
                      mentionContext={mentionContext}
                    />
                  ))}
                  {previewActions}
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-2xl bg-muted/25 px-4 text-sm text-muted-foreground">
                  {t("previewEmpty")}
                </div>
              )}
            </div>
          )}

          <div className="hidden max-h-screen overflow-y-auto p-5 md:sticky md:top-0 md:block">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t("preview")}
              </p>
            </div>
            {hasContent ? (
              <div className="space-y-4">
                {previewMessages.map((message) => (
                  <DiscordMessagePreview
                    key={message.id}
                    profile={{ name: profile.name || undefined, avatar_url: profile.avatarUrl || undefined }}
                    content={message.content}
                    embeds={message.embeds}
                    isV2={message.isV2}
                    components={message.components}
                    mentionContext={mentionContext}
                  />
                ))}
                {previewActions}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 rounded-2xl bg-muted/25 px-4 text-muted-foreground text-sm">
                {t("previewEmpty")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      {unassignedActions && <p role="alert" className="px-6 pt-3 text-sm text-destructive">{t("assignTicketActions")}</p>}
      <div className={cn("px-6 py-4 flex justify-end gap-2 shrink-0", !isTicketPanel && "border-t border-border")}>
        <Button variant="outline" onClick={onCancel}>{tCommon("cancel")}</Button>
        <Button onClick={handleSave} disabled={isSaving || activeUploads > 0 || !hasContent || unassignedActions || emptyContainers.length > 0}>
          {isSaving && <span className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />}
          {tCommon("save")}
        </Button>
      </div>

      <Dialog open={addMessageDialogOpen} onOpenChange={setAddMessageDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addMessageDialogTitle")}</DialogTitle>
            <DialogDescription>{t("addMessageDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button type="button" variant="outline" className="h-auto justify-start whitespace-normal py-2" onClick={() => addMessage("v1")}>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold">{t("addMessageClassicTitle")}</p>
                <p className="break-words text-xs text-muted-foreground">{t("addMessageClassicDescription")}</p>
              </div>
            </Button>
            <Button type="button" variant="outline" className="h-auto justify-start whitespace-normal py-2" onClick={() => addMessage("v2")}>
              <div className="min-w-0 text-left">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span>{t("addMessageV2Title")}</span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    {t("betaTag")}
                  </span>
                </p>
                <p className="break-words text-xs text-muted-foreground">{t("addMessageV2Description")}</p>
              </div>
            </Button>
          </div>
          <DialogFooter className="mt-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setAddMessageDialogOpen(false)}>{tCommon("cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div></ImageUploadActivityContext.Provider></TicketActionsContext.Provider>
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

function duplicateComponentState(component: TopLevelComponentState): TopLevelComponentState {
  switch (component.type) {
    case "container":
      return {
        ...component,
        id: uid(),
        children: component.children.map((child) => duplicateContainerChildState(child)),
      };
    case "section":
      return {
        ...component,
        id: uid(),
        texts: component.texts.map((text) => ({ ...text, id: uid() })),
      };
    case "media_gallery":
      return {
        ...component,
        id: uid(),
        items: component.items.map((item) => ({ ...item, id: uid() })),
      };
    case "action_row":
      return {
        ...component,
        id: uid(),
        buttons: component.buttons.map((button) => ({ ...button, id: uid() })),
        selectMenu: component.selectMenu ? duplicateSelectMenuState(component.selectMenu) : undefined,
      };
    case "string_select":
      return {
        ...component,
        id: uid(),
        options: component.options.map((option) => ({ ...option, id: uid() })),
      };
    case "text_display":
    case "separator":
    case "user_select":
    case "role_select":
    case "mentionable_select":
    case "channel_select":
    case "raw":
    case "file":
      return { ...component, id: uid() };
  }
}

function duplicateContainerChildState(child: ContainerChildState): ContainerChildState {
  return duplicateComponentState(child) as ContainerChildState;
}

function duplicateSelectMenuState(selectMenu: SelectMenuEditorState): SelectMenuEditorState {
  if (selectMenu.type === "string_select") {
    return {
      ...selectMenu,
      id: uid(),
      options: selectMenu.options.map((option) => ({ ...option, id: uid() })),
    };
  }
  return { ...selectMenu, id: uid() };
}
