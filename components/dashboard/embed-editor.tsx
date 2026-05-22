"use client";

import { decompressFromEncodedURIComponent, decompressFromBase64 } from 'lz-string';
import { useId, useRef, useState, type ComponentType, type MutableRefObject, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import emojiDataset from "emoji-datasource-twitter/emoji.json";
import { AtSign, Bike, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Clock3, Copy, ExternalLink, Flag, Gamepad2, GlassWater, Hash, Heart, Keyboard, Leaf, Loader2, Plus, Smile, Trash2, Utensils, Link2, Upload } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  DiscordMessagePreview,
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
const COMPACT_INPUT_CN = "bg-background border-border/80 h-8 text-sm";
const COMPACT_TEXTAREA_CN = "bg-background border-border/80 text-sm resize-none";

// Translation key lookups to avoid nested ternaries in JSX
const ACCESSORY_TYPE_KEYS = { none: "accessoryNone", thumbnail: "accessoryThumbnail", button: "accessoryButton" } as const;
const BUTTON_STYLE_KEYS = { 1: "buttonStylePrimary", 2: "buttonStyleSecondary", 3: "buttonStyleSuccess", 4: "buttonStyleDanger", 5: "buttonStyleLink" } as const;

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
interface ButtonState { id: string; customId: string; label: string; style: ButtonStyle; url: string; disabled: boolean }
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
  readonly initialData?: Record<string, unknown> | null;
  readonly onSave: (data: Record<string, unknown>) => Promise<void>;
  readonly isSaving: boolean;
  readonly onCancel: () => void;
  readonly channels?: PreviewDiscordChannel[];
  readonly roles?: PreviewDiscordRole[];
}

type MentionContext = {
  channels: PreviewDiscordChannel[];
  roles: PreviewDiscordRole[];
};

type EmojiCategory = {
  key: string;
  icon: typeof Smile;
  emojis: readonly string[];
};

const SPECIAL_FLAG_ORDER = ["🏳️", "🏴", "🏴‍☠️", "🏁", "🚩", "🏳️‍🌈", "🏳️‍⚧️", "🇺🇳"] as const;
const SPECIAL_FLAG_SHORTCODES: Record<string, string> = {
  "🏳️": "flag_white",
  "🏴": "flag_black",
  "🏴‍☠️": "pirate_flag",
  "🏁": "checkered_flag",
  "🚩": "triangular_flag_on_post",
  "🏳️‍🌈": "rainbow_flag",
  "🏳️‍⚧️": "transgender_flag",
  "🇺🇳": "united_nations",
};
const SKIN_TONE_TO_UNIFIED_SUFFIX: Record<string, string> = {
  "🏻": "1F3FB",
  "🏼": "1F3FC",
  "🏽": "1F3FD",
  "🏾": "1F3FE",
  "🏿": "1F3FF",
};
type EmojiDatasetEntry = {
  emoji?: string;
  unified: string;
  short_name: string;
  short_names?: string[];
  name?: string;
  category: string;
  sort_order?: number;
  skin_variations?: Record<string, { unified: string }>;
};

const EMOJI_DATA = (emojiDataset as EmojiDatasetEntry[]).map((entry) => ({
  ...entry,
  emoji: entry.emoji ?? unifiedToEmoji(entry.unified),
}));
const EMOJI_BY_CHAR = new Map(EMOJI_DATA.map((entry) => [entry.emoji, entry] as const));

function unifiedToEmoji(unified: string): string {
  return unified
    .split("-")
    .map((hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .join("");
}

const SKIN_TONE_VARIANTS = new Map<string, Record<string, string>>(
  (emojiDataset as EmojiDatasetEntry[])
    .filter((entry) => entry.skin_variations && Object.keys(entry.skin_variations).length > 0)
    .map((entry) => {
      const baseEmoji = unifiedToEmoji(entry.unified);
      const variants: Record<string, string> = {};
      for (const [suffix, variant] of Object.entries(entry.skin_variations ?? {})) {
        variants[suffix] = unifiedToEmoji(variant.unified);
      }
      return [baseEmoji, variants] as const;
    }),
);

const EMOJI_CATEGORIES: readonly EmojiCategory[] = [
  { key: "people", icon: Smile, emojis: buildDiscordPeopleEmojis() },
  { key: "nature", icon: Leaf, emojis: buildCategoryEmojis(["Animals & Nature"]) },
  { key: "food", icon: Utensils, emojis: buildCategoryEmojis(["Food & Drink"]) },
  { key: "activities", icon: Gamepad2, emojis: buildCategoryEmojis(["Activities"]) },
  { key: "travel", icon: Bike, emojis: buildCategoryEmojis(["Travel & Places"]) },
  { key: "objects", icon: GlassWater, emojis: buildCategoryEmojis(["Objects"]) },
  { key: "symbols", icon: Heart, emojis: buildCategoryEmojis(["Symbols"]) },
  { key: "flags", icon: Flag, emojis: buildSupportedFlagEmojis() },
];

const DISCORD_TIMESTAMP_STYLES = [
  { style: "t", label: "09:47" },
  { style: "T", label: "09:47:24" },
  { style: "f", label: "18 May 2026 09:47" },
  { style: "F", label: "Monday 18 May 2026 09:47" },
  { style: "d", label: "2026-05-18" },
  { style: "D", label: "18 May 2026" },
  { style: "R", label: "0 seconds ago" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToInt(hex: string): number {
  return Number.parseInt(hex.replaceAll("#", ""), 16);
}

function intToHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function createTimestampToken(dateValue: string, timeValue: string, style: string): string {
  const [year, month, day] = dateValue.split("-").map((part) => Number.parseInt(part, 10));
  const [hours, minutes, seconds] = timeValue.split(":").map((part) => Number.parseInt(part, 10));
  const safeDate = new Date(
    Number.isFinite(year) ? year : 1970,
    Number.isFinite(month) ? month - 1 : 0,
    Number.isFinite(day) ? day : 1,
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    Number.isFinite(seconds) ? seconds : 0,
    0,
  );
  const unix = Math.floor(safeDate.getTime() / 1000);
  const styleSuffix = style ? `:${style}` : "";
  return `<t:${unix}${styleSuffix}>`;
}

function formatTimestampStylePreview(dateValue: string, timeValue: string, style: string, locale: string): string {
  const token = createTimestampToken(dateValue, timeValue, style);
  const match = /^<t:(\d+)(?::([tTdDfFR]))?>$/.exec(token);
  if (!match) return token;
  const unix = Number.parseInt(match[1], 10);
  const date = new Date(unix * 1000);
  if (Number.isNaN(date.getTime())) return token;

  const pad = (value: number) => String(value).padStart(2, "0");
  const shortDate = `${pad(date.getDate())} ${new Intl.DateTimeFormat(locale, { month: "short" }).format(date)} ${date.getFullYear()}`;
  const longDate = `${new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date)} ${shortDate}`;

  switch (style) {
    case "t":
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    case "T":
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    case "d":
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    case "D":
      return shortDate;
    case "F":
      return `${longDate} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    case "R":
      return "relative time";
    case "f":
    default:
      return `${shortDate} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

function emojiToTwemojiUrl(emoji: string): string {
  const codePoints = Array.from(emoji)
    .map((char) => char.codePointAt(0))
    .filter((point): point is number => typeof point === "number")
    .map((point) => point.toString(16).padStart(4, "0"));
  return `/api/v2/app/twemoji/${codePoints.join("-")}.png`;
}

function isSkinToneVariant(emoji: string): boolean {
  return /[\u{1F3FB}-\u{1F3FF}]/u.test(emoji);
}

function buildCategoryEmojis(categories: readonly string[]): string[] {
  const allowed = new Set(categories);
  const picked = [...EMOJI_DATA
    .filter((entry) => allowed.has(entry.category))
  ].sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER))
    .map((entry) => entry.emoji)
    .filter((emoji) => !isSkinToneVariant(emoji));
  return [...new Set(picked)];
}

function buildDiscordPeopleEmojis(): string[] {
  return buildCategoryEmojis(["Smileys & Emotion", "People & Body"]);
}

function emojiToTwemojiFallbackUrl(emoji: string): string {
  const codePoints = Array.from(emoji)
    .map((char) => char.codePointAt(0))
    .filter((point): point is number => typeof point === "number")
    .filter((point) => point !== 0xfe0f && point !== 0xfe0e)
    .map((point) => point.toString(16).padStart(4, "0"));
  return `/api/v2/app/twemoji/${codePoints.join("-")}.png`;
}

function flagEmojiToCountryCode(emoji: string): string | null {
  const chars = Array.from(emoji);
  if (chars.length !== 2) return null;
  const points = chars.map((char) => char.codePointAt(0));
  if (points.includes(undefined)) return null;
  const normalizedPoints = points as [number, number];
  const isRegional = normalizedPoints.every((point) => point >= 0x1f1e6 && point <= 0x1f1ff);
  if (isRegional) {
    return String.fromCodePoint(
      65 + (normalizedPoints[0] - 0x1f1e6),
      65 + (normalizedPoints[1] - 0x1f1e6),
    ).toLowerCase();
  }
  return null;
}

function buildSupportedFlagEmojis(): string[] {
  const base = [...SPECIAL_FLAG_ORDER];
  const flagsFromSource = [...EMOJI_DATA
    .filter((entry) => entry.category === "Flags")
  ].sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER))
    .map((entry) => entry.emoji)
    .filter((emoji) => !base.includes(emoji as (typeof SPECIAL_FLAG_ORDER)[number]));
  return [...new Set([...base, ...flagsFromSource])];
}

function getEmojiShortcodeName(emoji: string): string {
  const specialFlagShortcode = SPECIAL_FLAG_SHORTCODES[emoji];
  if (specialFlagShortcode) return specialFlagShortcode;
  const countryCode = flagEmojiToCountryCode(emoji);
  if (countryCode) return `flag_${countryCode}`;
  const mapped = EMOJI_BY_CHAR.get(emoji)?.short_name;
  if (mapped) return mapped;
  return "";
}

function getEmojiSearchBlob(emoji: string): string {
  const specialFlagShortcode = SPECIAL_FLAG_SHORTCODES[emoji];
  if (specialFlagShortcode) return specialFlagShortcode;

  const datasetEntry = EMOJI_BY_CHAR.get(emoji);
  const names = datasetEntry?.short_names?.join(" ") ?? datasetEntry?.short_name ?? "";
  const formalName = datasetEntry?.name ?? "";
  const countryCode = flagEmojiToCountryCode(emoji);
  const flagName = countryCode ? `flag_${countryCode}` : "";
  return `${names} ${formalName} ${flagName}`.trim();
}

function sortCategoryEmojis(categoryKey: string, emojis: readonly string[]): string[] {
  const sorted = [...emojis];
  if (categoryKey === "flags") {
    const specialOrder = new Map<string, number>(SPECIAL_FLAG_ORDER.map((emoji, index) => [emoji, index]));
    sorted.sort((a, b) => {
      const aSpecial = specialOrder.get(a);
      const bSpecial = specialOrder.get(b);
      if (aSpecial !== undefined && bSpecial !== undefined) return aSpecial - bSpecial;
      if (aSpecial !== undefined) return -1;
      if (bSpecial !== undefined) return 1;
      // Keep non-special flags in existing source order.
      return 0;
    });
    return sorted;
  }
  // Preserve source order for all non-flag categories (Discord-like ordering).
  return sorted;
}

function matchesEmojiQuery(emoji: string, query: string): boolean {
  if (query.length === 0) return true;
  const normalized = query.toLowerCase();
  const shortcode = getEmojiShortcodeName(emoji).toLowerCase();
  const searchBlob = getEmojiSearchBlob(emoji).toLowerCase();
  const normalizedShortcode = shortcode.replaceAll("_", "").replaceAll("-", "");
  const normalizedSearchBlob = searchBlob.replaceAll("_", "").replaceAll("-", "");
  const normalizedQuery = normalized.replaceAll(":", "").replaceAll("_", "").replaceAll("-", "");
  const wrappedShortcode = shortcode.length > 0 ? `:${shortcode}:` : "";
  return emoji.includes(query)
    || shortcode.includes(normalized)
    || searchBlob.includes(normalized)
    || wrappedShortcode.includes(normalized)
    || normalizedShortcode.includes(normalizedQuery)
    || normalizedSearchBlob.includes(normalizedQuery);
}

function applySkinToneVariant(emoji: string, tone: string): string {
  if (tone === "default") return emoji;
  const suffix = SKIN_TONE_TO_UNIFIED_SUFFIX[tone];
  if (suffix === undefined) return emoji;
  const variants = SKIN_TONE_VARIANTS.get(emoji);
  return variants?.[suffix] ?? emoji;
}

function EmojiGlyph({ emoji, className = "h-7 w-7" }: { readonly emoji: string; readonly className?: string }) {
  const primarySrc = emojiToTwemojiUrl(emoji);
  const fallbackSrc = emojiToTwemojiFallbackUrl(emoji);
  return (
    <img
      src={primarySrc}
      alt={emoji}
      draggable={false}
      className={cn("pointer-events-none object-contain", className)}
      onError={(event) => {
        if (fallbackSrc !== primarySrc && event.currentTarget.src !== fallbackSrc) {
          event.currentTarget.src = fallbackSrc;
          return;
        }
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

function ServerGuideIcon({ className = "h-4 w-4" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor" shapeRendering="geometricPrecision">
      <path d="M11 3a1 1 0 1 1 2 0v2h5.75c.16 0 .3.07.4.2l2.63 3.5a.5.5 0 0 1 0 .6l-2.63 3.5a.5.5 0 0 1-.4.2H13v5h2a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-1c0-1.1.9-2 2-2h2v-5H2.8a.5.5 0 0 1-.44-.72L3.9 9.22a.5.5 0 0 0 0-.44L2.36 5.72A.5.5 0 0 1 2.81 5H11V3z" />
    </svg>
  );
}

function BrowseChannelsIcon({ className = "h-4 w-4" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor" shapeRendering="geometricPrecision">
      <path fillRule="evenodd" clipRule="evenodd" d="M18.5 23c.88 0 1.7-.25 2.4-.69l1.4 1.4a1 1 0 0 0 1.4-1.42l-1.39-1.4A4.5 4.5 0 1 0 18.5 23zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
      <path d="M3 3a1 1 0 0 0 0 2h18a1 1 0 1 0 0-2H3zM2 8a1 1 0 0 1 1-1h18a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1zm1 3a1 1 0 1 0 0 2h11a1 1 0 1 0 0-2H3zm-1 5a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1zm1 3a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H3z" />
    </svg>
  );
}

function insertTextAtCursor(
  element: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  nextText: string,
  onValueChange: (value: string) => void,
  maxLength?: number,
) {
  const clamp = (text: string) => {
    if (typeof maxLength === "number" && maxLength >= 0) {
      return text.slice(0, maxLength);
    }
    return text;
  };

  if (!element) {
    onValueChange(clamp(`${value}${nextText}`));
    return;
  }

  const start = element.selectionStart ?? value.length;
  const end = element.selectionEnd ?? start;
  const rawNextValue = `${value.slice(0, start)}${nextText}${value.slice(end)}`;
  const nextValue = clamp(rawNextValue);
  const insertedLength = nextValue.length - (value.length - (end - start));
  const cursorPosition = Math.max(start, start + insertedLength);
  onValueChange(nextValue);
  globalThis.setTimeout(() => {
    element.focus();
    element.setSelectionRange(cursorPosition, cursorPosition);
  }, 0);
}

function openNativePicker(input: HTMLInputElement | null) {
  if (input === null) return;
  if ("showPicker" in input && typeof input.showPicker === "function") {
    input.showPicker();
  }
  input.focus();
}

type MentionTextFieldProps = {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly mentionContext: MentionContext;
  readonly className?: string;
  readonly placeholder?: string;
  readonly maxLength?: number;
  readonly rows?: number;
  readonly multiline?: boolean;
};

function MentionTextField({
  value,
  onValueChange,
  mentionContext,
  className,
  placeholder,
  maxLength,
  rows,
  multiline = false,
}: MentionTextFieldProps) {
  const t = useTranslations("EmbedEditor");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<"mentions" | "time" | "emojis">("mentions");
  const [emojiQuery, setEmojiQuery] = useState("");
  const [skinTone, setSkinTone] = useState("default");
  const [skinToneOpen, setSkinToneOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<string>(EMOJI_CATEGORIES[0]?.key ?? "people");
  const [mentionSection, setMentionSection] = useState<"channels" | "roles">("channels");
  const [specialOpen, setSpecialOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [emojiOpen, setEmojiOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(EMOJI_CATEGORIES.map((category) => [category.key, true])),
  );
  const [dateValue, setDateValue] = useState(() => formatDateInputValue(new Date()));
  const [timeValue, setTimeValue] = useState(() => formatTimeInputValue(new Date()));
  const inputId = useId();
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const timeInputRef = useRef<HTMLInputElement | null>(null);
  const mentionsScrollerRef = useRef<HTMLDivElement | null>(null);
  const channelsSectionRef = useRef<HTMLDivElement | null>(null);
  const rolesSectionRef = useRef<HTMLDivElement | null>(null);
  const emojisScrollerRef = useRef<HTMLDivElement | null>(null);
  const emojiSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const emojiHeaderRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const insertToken = (token: string) => {
    insertTextAtCursor(fieldRef.current, value, token, onValueChange);
    setOpen(false);
  };

  const filteredChannels = mentionContext.channels;
  const filteredRoles = mentionContext.roles;
  const normalizedEmojiQuery = emojiQuery.trim();
  const filteredEmojiCategories = EMOJI_CATEGORIES
    .map((category) => ({
      ...category,
      emojis: sortCategoryEmojis(
        category.key,
        category.emojis.filter((emoji) => matchesEmojiQuery(emoji, normalizedEmojiQuery)),
      ),
    }))
    .filter((category) => category.emojis.length > 0);
  let channelsList: React.ReactNode = null;
  if (channelsOpen) {
    if (filteredChannels.length > 0) {
      channelsList = filteredChannels.map((channel) => (
        <MentionInsertButton key={`channel-${channel.id}`} icon={Hash} label={channel.name} compact onSelect={() => insertToken(`<#${channel.id}>`)} />
      ));
    } else {
      channelsList = <div className="rounded-md border border-dashed border-[#3f4147] px-3 py-2 text-xs text-[#949ba4]">{t("mentionsNoChannels")}</div>;
    }
  }

  useScrollSpy(
    mentionsScrollerRef,
    [
      { key: "channels", ref: channelsSectionRef },
      { key: "roles", ref: rolesSectionRef },
    ],
    (nextKey) => setMentionSection(nextKey === "roles" ? "roles" : "channels"),
  );

  const syncEmojiCategoryOnScroll = () => {
    const scroller = emojisScrollerRef.current;
    if (!scroller || filteredEmojiCategories.length === 0) return;
    const currentScroll = scroller.scrollTop;
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    if (currentScroll >= maxScroll - 2) {
      const lastKey = filteredEmojiCategories.at(-1)?.key;
      if (lastKey) setEmojiCategory(lastKey);
      return;
    }

    const scrollerTop = scroller.getBoundingClientRect().top;
    let activeKey = filteredEmojiCategories[0]?.key ?? "";
    for (const category of filteredEmojiCategories) {
      const node = emojiHeaderRefs.current[category.key] ?? emojiSectionRefs.current[category.key];
      if (!node) continue;
      const relativeTop = node.getBoundingClientRect().top - scrollerTop;
      if (relativeTop <= 0) {
        activeKey = category.key;
      }
    }
    if (activeKey) setEmojiCategory(activeKey);
  };

  useEffect(() => {
    if (open && pickerTab === "emojis") {
      syncEmojiCategoryOnScroll();
    }
  }, [open, pickerTab, emojiOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      {multiline ? (
        <Textarea
          ref={(node) => { fieldRef.current = node; }}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          className={cn(className, "pr-12 pb-10")}
        />
      ) : (
        <Input
          ref={(node) => { fieldRef.current = node; }}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          className={cn(className, "pr-12")}
        />
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Open mentions, time, and emojis"
            className={cn(
              "absolute rounded-md border border-border/70 bg-background/95 p-1.5 text-muted-foreground transition-colors hover:text-foreground",
              multiline ? "bottom-2 right-2" : "right-2 top-1/2 -translate-y-1/2",
            )}
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={8}
          sticky="always"
          collisionPadding={{ top: 56, right: 12, bottom: 12, left: 12 }}
          className="w-[min(92vw,400px)] max-h-[calc(100dvh-72px)] overflow-y-auto border-border bg-[#2b2d31] p-3 text-[#dbdee1]"
        >
          <Tabs value={pickerTab} onValueChange={(value) => setPickerTab(value as "mentions" | "time" | "emojis")}>
            <TabsList className="mb-3 h-9 w-full justify-start gap-1 bg-[#1e1f22] p-1">
              <TabsTrigger value="mentions" className="h-7 px-2.5 text-xs data-[state=active]:bg-[#4e5058] data-[state=active]:text-white">{t("tabMentions")}</TabsTrigger>
              <TabsTrigger value="time" className="h-7 px-2.5 text-xs data-[state=active]:bg-[#4e5058] data-[state=active]:text-white">{t("tabTime")}</TabsTrigger>
              <TabsTrigger value="emojis" className="h-7 px-2.5 text-xs data-[state=active]:bg-[#4e5058] data-[state=active]:text-white">{t("tabEmojis")}</TabsTrigger>
            </TabsList>

            <TabsContent value="mentions" className="mt-0">
              <div className="flex max-h-[min(52vh,360px)] gap-2 overflow-hidden">
                <div className="flex w-9 shrink-0 flex-col items-center gap-1 rounded-md bg-[#1e1f22] p-1">
                  <button
                    type="button"
                    onClick={() => channelsSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })}
                    className={cn("flex h-7 w-7 items-center justify-center rounded text-[#b5bac1] transition-colors hover:bg-[#3a3c43] hover:text-white", mentionSection === "channels" && "bg-[#3a3c43] text-white")}
                    title={t("mentionsChannels")}
                  >
                    <Hash className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => rolesSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })}
                    className={cn("flex h-7 w-7 items-center justify-center rounded text-[#b5bac1] transition-colors hover:bg-[#3a3c43] hover:text-white", mentionSection === "roles" && "bg-[#3a3c43] text-white")}
                    title={t("mentionsRoles")}
                  >
                    <AtSign className="h-4 w-4" />
                  </button>
                </div>
                <div
                  ref={mentionsScrollerRef}
                  onWheelCapture={(event) => {
                    event.stopPropagation();
                  }}
                  className="min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1"
                >
                  <div ref={channelsSectionRef} className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white">{t("mentionsChannels")}</p>
                  <button type="button" onClick={() => setSpecialOpen((prev) => !prev)} className="flex w-full items-center justify-between rounded px-1 py-1 text-left text-[10px] font-semibold tracking-wide text-white/90 hover:bg-[#3a3c43]">
                    <span>{t("mentionsSpecial")}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !specialOpen && "-rotate-90")} />
                  </button>
                  {specialOpen && (
                    <>
                      <MentionInsertButton icon={ServerGuideIcon} label={t("mentionsServerGuide")} compact onSelect={() => insertToken("<id:guide>")} />
                      <MentionInsertButton icon={BrowseChannelsIcon} label={t("mentionsBrowseChannels")} compact onSelect={() => insertToken("<id:browse>")} />
                      <MentionInsertButton icon={BrowseChannelsIcon} label={t("mentionsChannelsAndRoles")} compact onSelect={() => insertToken("<id:customize>")} />
                    </>
                  )}
                  <button type="button" onClick={() => setChannelsOpen((prev) => !prev)} className="mt-1 flex w-full items-center justify-between rounded px-1 py-1 text-left text-[10px] font-semibold tracking-wide text-white/90 hover:bg-[#3a3c43]">
                    <span>{t("mentionsChannelList")}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !channelsOpen && "-rotate-90")} />
                  </button>
                  {channelsList}
                </div>

                <div ref={rolesSectionRef} className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white">{t("mentionsRoles")}</p>
                  <MentionInsertButton icon={AtSign} label="@everyone" compact onSelect={() => insertToken("@everyone")} />
                  <MentionInsertButton icon={AtSign} label="@here" compact onSelect={() => insertToken("@here")} />
                  {filteredRoles.length > 0 ? filteredRoles.map((role) => (
                    <MentionInsertButton
                      key={`role-${role.id}`}
                      icon={AtSign}
                      label={role.name}
                      compact
                      onSelect={() => insertToken(`<@&${role.id}>`)}
                    />
                  )) : (
                    <div className="rounded-md border border-dashed border-[#3f4147] px-3 py-2 text-xs text-[#949ba4]">
                      {t("mentionsNoRoles")}
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="time"
              className="mt-0 max-h-[min(52vh,360px)] space-y-2 overflow-y-auto overscroll-contain pr-1"
              onWheelCapture={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="space-y-1">
                <Label htmlFor={`${inputId}-date`} className="text-xs text-white">{t("dateLabel")}</Label>
                <div className="relative">
                  <Input
                    ref={dateInputRef}
                    id={`${inputId}-date`}
                    type="date"
                    value={dateValue}
                    onChange={(event) => setDateValue(event.target.value)}
                    className="h-8 appearance-none border-[#3f4147] bg-[#1e1f22] px-2.5 pr-8 text-sm text-white focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-red-500/80 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:pointer-events-none"
                  />
                  <button
                    type="button"
                    aria-label={t("dateLabel")}
                    onClick={() => {
                      const el = dateInputRef.current;
                      openNativePicker(el);
                    }}
                    className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-white hover:text-white"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${inputId}-time`} className="text-xs text-white">{t("timeLabel")}</Label>
                <div className="relative">
                  <Input
                    ref={timeInputRef}
                    id={`${inputId}-time`}
                    type="time"
                    step={1}
                    value={timeValue}
                    onChange={(event) => setTimeValue(event.target.value)}
                    className="h-8 appearance-none border-[#3f4147] bg-[#1e1f22] px-2.5 pr-8 text-sm text-white focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-red-500/80 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:pointer-events-none"
                  />
                  <button
                    type="button"
                    aria-label={t("timeLabel")}
                    onClick={() => {
                      const el = timeInputRef.current;
                      openNativePicker(el);
                    }}
                    className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-white hover:text-white"
                  >
                    <Clock3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold tracking-wide text-white">{t("styleLabel")}</p>
                <div className="grid grid-cols-1 gap-1">
                  {DISCORD_TIMESTAMP_STYLES.map((item) => (
                    <TimeStyleInsertButton
                      key={item.style}
                      label={item.style === "R" ? t("timeRelativeNow") : formatTimestampStylePreview(dateValue, timeValue, item.style, locale)}
                      onSelect={() => insertToken(createTimestampToken(dateValue, timeValue, item.style))}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="emojis" className="mt-0 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={emojiQuery}
                  onChange={(event) => setEmojiQuery(event.target.value)}
                  placeholder={t("emojiSearchPlaceholder")}
                  className="h-9 flex-1 border-[#3f4147] bg-[#1e1f22] text-sm text-white placeholder:text-[#949ba4]"
                />
                <Popover open={skinToneOpen} onOpenChange={setSkinToneOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label={t("emojiToneLabel")} className="flex h-9 w-9 items-center justify-center rounded-md border border-[#3f4147] bg-[#1e1f22] text-lg text-white">
                      {skinTone === "default" ? "👋" : `👋${skinTone}`}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-auto border-[#3f4147] bg-[#2b2d31] p-1">
                    <div className="flex gap-1">
                      {["default", "🏻", "🏼", "🏽", "🏾", "🏿"].map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => {
                            setSkinTone(tone);
                            setSkinToneOpen(false);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded bg-[#1e1f22] text-base text-white hover:bg-[#3a3c43]"
                        >
                          {tone === "default" ? "👋" : `👋${tone}`}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex max-h-[calc(min(52vh,360px)-48px)] min-h-[212px] gap-2 overflow-hidden">
                <div className="flex w-9 shrink-0 flex-col items-center gap-1 overflow-y-auto rounded-md bg-[#1e1f22] p-1">
                  {filteredEmojiCategories.map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => {
                        setEmojiCategory(category.key);
                        emojiSectionRefs.current[category.key]?.scrollIntoView({ block: "start", behavior: "smooth" });
                      }}
                      className={cn("flex h-7 w-7 items-center justify-center rounded text-[#b5bac1] transition-colors hover:bg-[#3a3c43] hover:text-white", emojiCategory === category.key && "bg-[#3a3c43] text-white")}
                      title={t(`emojiCategory.${category.key}`)}
                    >
                      <category.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <div
                  ref={emojisScrollerRef}
                  onScroll={syncEmojiCategoryOnScroll}
                  onWheelCapture={(event) => {
                    event.stopPropagation();
                  }}
                  className="min-w-0 flex-1 overflow-y-auto overscroll-contain pr-1"
                >
                  {filteredEmojiCategories.map((category) => (
                    <div
                      key={category.key}
                      ref={(node) => { emojiSectionRefs.current[category.key] = node; }}
                      className="mb-3 space-y-2"
                    >
                      <button
                        ref={(node) => { emojiHeaderRefs.current[category.key] = node; }}
                        type="button"
                        onClick={() => setEmojiOpen((prev) => ({ ...prev, [category.key]: !prev[category.key] }))}
                        className="flex w-full items-center justify-between rounded px-1 py-1 text-left text-[11px] font-semibold tracking-wide text-white hover:bg-[#3a3c43]"
                      >
                        <span>{t(`emojiCategory.${category.key}`)}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !emojiOpen[category.key] && "-rotate-90")} />
                      </button>
                      {emojiOpen[category.key] && (
                        <div className="grid grid-cols-7 gap-1">
                          {category.emojis.map((emoji) => (
                            <button
                              key={`${category.key}-${emoji}`}
                              type="button"
                              title={`:${getEmojiShortcodeName(emoji) || emoji}:`}
                              className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1e1f22] transition-colors hover:bg-[#3a3c43]"
                              onClick={() => insertToken(applySkinToneVariant(emoji, skinTone))}
                            >
                              <EmojiGlyph emoji={applySkinToneVariant(emoji, skinTone)} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MentionInsertButton({
  icon: Icon,
  label,
  compact = false,
  onSelect,
}: {
  readonly icon: ComponentType<{ className?: string }>;
  readonly label: string;
  readonly compact?: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-md text-left transition-colors hover:bg-[#3a3c43]",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
      )}
    >
      <span className={cn("flex items-center justify-center rounded-md bg-[#1e1f22] text-[#b5bac1]", compact ? "h-7 w-7" : "h-8 w-8")}>
        <Icon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-medium text-white", compact ? "text-[13px]" : "text-sm")}>{label}</span>
      </span>
    </button>
  );
}

function TimeStyleInsertButton({ label, onSelect }: { readonly label: string; readonly onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex h-8 w-full items-center gap-1.5 rounded-[5px] border border-[#454850] bg-[#262930] px-2 text-left transition-colors hover:bg-[#343842]"
    >
      <span className="flex h-4 w-4 items-center justify-center text-[#b5bac1]">
        <Clock3 className="h-3 w-3" />
      </span>
      <span className="truncate text-[13px] font-medium leading-none text-white">{label}</span>
    </button>
  );
}

function useScrollSpy(
  scrollerRef: MutableRefObject<HTMLDivElement | null>,
  sections: Array<{ key: string; ref: MutableRefObject<HTMLDivElement | null> }>,
  onChange: (key: string) => void,
) {
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || sections.length === 0) return;

    const handleScroll = () => {
      const scrollerTop = scroller.getBoundingClientRect().top;
      let activeKey = sections[0]?.key;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const section of sections) {
        const node = section.ref.current;
        if (!node) continue;
        const distance = Math.abs(node.getBoundingClientRect().top - scrollerTop - 8);
        if (distance < bestDistance) {
          bestDistance = distance;
          activeKey = section.key;
        }
      }
      if (activeKey) onChange(activeKey);
    };

    handleScroll();
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, [onChange, scrollerRef, sections]);
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
    case "file": return { id: uid(), type: "file", url: "", spoiler: false };
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

function SectionEditorFields({ comp, onChange, mentionContext }: {
  readonly comp: SectionState;
  readonly onChange: (updated: SectionState) => void;
  readonly mentionContext: MentionContext;
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
              onClick={() => onChange({ ...comp, accessoryType: a })}
              className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors",
                comp.accessoryType === a ? "border-primary/60 bg-primary/10 font-medium" : "border-border/80 text-muted-foreground hover:text-foreground")}>
              {t(ACCESSORY_TYPE_KEYS[a])}
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
                  {t(BUTTON_STYLE_KEYS[style])}
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
          onChange={e => onChange({ ...comp, placeholder: e.target.value })}
          className={COMPACT_INPUT_CN} />
      </Field>
      <div className="flex gap-3">
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
              hasSelectMenu ? "border-border/80 text-muted-foreground hover:text-foreground" : "border-primary/60 bg-primary/10 font-medium")}>
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
      const token = /access_token=([^;]+)/.exec(document.cookie)?.[1];
      const res = await fetch("/api/v2/app/cdn-upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
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

export function EmbedEditor({ initialData, onSave, isSaving, onCancel, channels = [], roles = [] }: EmbedEditorProps) { // NOSONAR
  const t = useTranslations("EmbedEditor");
  const tCommon = useTranslations("Common");
  const mentionContext: MentionContext = { channels, roles };
  const parsedInitialData = initialData ? payloadToMessages(initialData) : null;
  const inputClassName = "bg-background border-border/80";
  const compactInputClassName = COMPACT_INPUT_CN;
  const compactTextareaClassName = COMPACT_TEXTAREA_CN;

  const [messages, setMessages] = useState<MessageState[]>(() =>
    parsedInitialData ? parsedInitialData.messages : [{ id: uid(), mode: "v1", embeds: [defaultState()], content: "", components: [] }]
  );
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
        components: source.components
          .map((component) => serializeComponentState(component))
          .filter((component): component is TopLevelComponent => component !== null)
          .map((component) => parseComponentState(component)),
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

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
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

  const addV2Component = (messageIndex: number, type: TopLevelComponentState["type"]) => {
    const newComp = createDefaultV2Component(type);
    setV2Components(messageIndex, prev => [...prev, newComp]);
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
    setImportError(false);
    setImportUrl("");
    setMessages(parsedMessages);
    setProfile(parsedProfile);
    setExpandedEmbedId(parsedMessages[0]?.embeds[0]?.editorId ?? null); // NOSONAR
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
  const previewMessages = messages.map((message) => ({
    id: message.id,
    content: message.content,
    embeds: message.mode === "v1" ? message.embeds.map(stateToEmbed).filter(hasMeaningfulEmbedContent) : [],
    isV2: message.mode === "v2",
    components: message.mode === "v2" ? message.components.map(serializeComponentState).filter((c): c is TopLevelComponent => c !== null) : [],
  }));
  const hasContent =
    messages.some(msg => {
      if (msg.mode === "v2") return msg.components.length > 0;
      return msg.embeds.map(stateToEmbed).some(hasMeaningfulEmbedContent) || msg.content.trim().length > 0; // NOSONAR
    }) ||
    profile.name.trim().length > 0 || // NOSONAR
    profile.avatarUrl.trim().length > 0;

  const handleCopyDiscohookUrl = async () => {
    await navigator.clipboard.writeText(discohookUrl); // NOSONAR
    setCopiedDiscohook(true);
    setTimeout(() => setCopiedDiscohook(false), 2000); // NOSONAR
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card text-card-foreground">
      {/* Two-column body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">

        {/* ── Left: form ── */}
        <div className="w-full overflow-y-auto border-b border-border bg-card px-4 py-5 space-y-5 md:w-[52%] md:border-b-0 md:border-r md:px-6">

          <div className="flex items-center justify-between">
            <Button size="sm" variant="secondary" className="h-8" onClick={() => setImportExportOpen(true)}>
              <Link2 className="h-3.5 w-3.5 mr-1" />{t("importExport")}
            </Button>
            <Button
              size="sm"
              className="h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setAddMessageDialogOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />{t("addMessage")}
            </Button>
          </div>

          <Separator />

          {/* ── Message headers ── */}
          <div className="space-y-2">
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div key={msg.id} className={cn("rounded-lg border bg-card", expandedMessageIds.has(msg.id) ? "border-primary/60" : "border-border/80")}>
                  <div className="flex items-center gap-2 px-3 py-2">
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
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                  </div>
                  {expandedMessageIds.has(msg.id) && (
                    <div className="border-t border-border/80 p-3 space-y-4">
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
                  <h3 className="text-sm font-semibold text-foreground dark:text-white">{`Embeds (${msg.embeds.length}/${MAX_DISCORD_EMBEDS_PER_MESSAGE})`}</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => addEmbed(i)}
                    disabled={msg.embeds.length >= MAX_DISCORD_EMBEDS_PER_MESSAGE}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />Add Embed
                  </Button>
                </div>
                {msg.embeds.map((embed, index) => {
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
                        <div className="border-t border-border/80">
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
                              <Field label={t("authorIconUrl")}>
                                <Input value={embed.authorIconUrl} onChange={e => setEmbedField(i, embed.editorId, "authorIconUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
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
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={embed.color || "#5865f2"}
                                    onChange={e => setEmbedField(i, embed.editorId, "color", e.target.value)}
                                    className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5"
                                  />
                                  <Input
                                    value={embed.color}
                                    onChange={e => {
                                      const value = e.target.value;
                                      if (/^#[0-9a-fA-F]{0,6}$/.test(value)) setEmbedField(i, embed.editorId, "color", value);
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
                                <div key={field.id} className="rounded-lg border border-border/80 bg-card p-3 space-y-2">
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
                              <Field label={t("thumbnailUrl")}>
                                <Input value={embed.thumbnailUrl} onChange={e => setEmbedField(i, embed.editorId, "thumbnailUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
                              </Field>
                              <Field label={t("imageUrl")}>
                                <Input value={embed.imageUrl} onChange={e => setEmbedField(i, embed.editorId, "imageUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
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
                              <Field label={t("footerIconUrl")}>
                                <Input value={embed.footerIconUrl} onChange={e => setEmbedField(i, embed.editorId, "footerIconUrl", e.target.value)} placeholder="https://..." className={compactInputClassName} />
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
            </>
                      ) : (
            /* ── V2 Components editor ── */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionLabel>{t("componentsSection")}</SectionLabel>
                <div className="relative">
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setOpenDropdownId(prev => prev === `__top__:${msg.id}` ? null : `__top__:${msg.id}`)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />{t("addComponent")}
                  </Button>
                  {openDropdownId === `__top__:${msg.id}` && (
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
                          { type: "file" as const, label: t("fileLabel") },
                        ] as const).map(item => (
                          <button key={item.type} type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                            onClick={() => { addV2Component(i, item.type); setOpenDropdownId(null); }}>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
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
                  <div key={comp.id} className={cn("rounded-lg border bg-card", isExpanded ? "border-primary/60" : "border-border/80")}>
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
                    {isExpanded && (
                      <div className="border-t border-border/80 px-3 py-3 space-y-3">
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
                            <Field label={t("accentColor")}>
                              <div className="flex items-center gap-2">
                                <input type="color" value={comp.accentColor || "#5865f2"}
                                  onChange={e => updateV2Component(i, comp.id, c => c.type === "container" ? { ...c, accentColor: e.target.value } : c)}
                                  className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5" />
                                <Input value={comp.accentColor}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) updateV2Component(i, comp.id, c => c.type === "container" ? { ...c, accentColor: val } : c);
                                  }}
                                  className={cn(inputClassName, "font-mono text-sm w-28")} maxLength={7} />
                              </div>
                            </Field>
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
                                <div key={child.id} className={cn("ml-3 rounded-md border", childIsExpanded ? "border-primary/40" : "border-border/60")}>
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
                                    <div className="border-t border-border/60 px-3 py-2 space-y-2">
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
                                      { type: "file" as const, label: t("fileLabel") },
                                    ] as const).map(item => (
                                      <button key={item.type} type="button"
                                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                                        onClick={() => { updateContainerChildren(i, comp.id, prev => [...prev, createDefaultV2Component(item.type) as ContainerChildState]); setOpenDropdownId(null); }}>
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
                </div>
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
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
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
