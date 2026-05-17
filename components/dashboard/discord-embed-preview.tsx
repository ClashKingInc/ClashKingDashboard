"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { clashKingAssets } from "@/lib/theme";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface EmbedAuthor {
  name?: string;
  icon_url?: string;
  url?: string;
}

interface EmbedFooter {
  text?: string;
  icon_url?: string;
}

interface EmbedImage {
  url?: string;
}

interface EmbedThumbnail {
  url?: string;
}

export interface DiscordEmbed {
  color?: number;
  author?: EmbedAuthor;
  title?: string;
  url?: string;
  description?: string;
  fields?: EmbedField[];
  image?: EmbedImage;
  thumbnail?: EmbedThumbnail;
  footer?: EmbedFooter;
  timestamp?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function intToHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

/** Extract the first embed from any Discohook-compatible payload shape */
function isDiscordEmbed(value: unknown): value is DiscordEmbed {
  if (!value || typeof value !== "object") return false;
  const embed = value as Record<string, unknown>;
  return Boolean(
    embed.title ||
    embed.description ||
    embed.author ||
    embed.fields ||
    embed.image ||
    embed.thumbnail ||
    embed.footer ||
    embed.url ||
    embed.timestamp
  );
}

/** Extract all embeds from any Discohook-compatible payload shape */
export function extractEmbeds(data: Record<string, unknown>): DiscordEmbed[] {
  // Full Discohook payload: { messages: [{ data: { embeds: [...] } }] }
  const messages = (data as any)?.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const flattenedEmbeds = messages.flatMap((message: any) => {
      const embeds = message?.data?.embeds;
      return Array.isArray(embeds) ? embeds : [];
    });
    if (flattenedEmbeds.length > 0) {
      return flattenedEmbeds.filter(isDiscordEmbed);
    }
  }

  // { embeds: [...] }
  if (Array.isArray((data as any).embeds) && (data as any).embeds.length > 0) {
    return (data as any).embeds.filter(isDiscordEmbed);
  }

  // Raw embed object
  if (isDiscordEmbed(data)) {
    return [data];
  }

  return [];
}

export interface DiscordMessageProfile {
  name?: string;
  avatar_url?: string;
}

type UnknownRecord = Record<string, unknown>;

function profileFromPair(name: unknown, avatarUrl: unknown): DiscordMessageProfile | null {
  const normalizedName = typeof name === "string" ? name : undefined;
  const normalizedAvatarUrl = typeof avatarUrl === "string" ? avatarUrl : undefined;
  if (!normalizedName && !normalizedAvatarUrl) return null;
  return { name: normalizedName, avatar_url: normalizedAvatarUrl };
}

function profileFromMessageData(message: UnknownRecord): DiscordMessageProfile | null {
  const messageData = (message.data ?? null) as UnknownRecord | null;
  if (!messageData) return null;

  const directProfile = profileFromPair(messageData.username, messageData.avatar_url);
  if (directProfile) return directProfile;

  const messageAuthor = (messageData.author ?? null) as UnknownRecord | null;
  if (!messageAuthor) return null;
  return profileFromPair(messageAuthor.name, messageAuthor.icon_url);
}

function profileFromMessageLevel(message: UnknownRecord): DiscordMessageProfile | null {
  const directProfile = profileFromPair(message.username, message.avatar_url);
  if (directProfile) return directProfile;

  const nestedProfile = (message.profile ?? null) as UnknownRecord | null;
  if (!nestedProfile) return null;
  return profileFromPair(nestedProfile.name, nestedProfile.avatar_url);
}

function profileFromMessage(message: unknown): DiscordMessageProfile | null {
  if (!message || typeof message !== "object") return null;
  const messageRecord = message as UnknownRecord;
  return profileFromMessageData(messageRecord) ?? profileFromMessageLevel(messageRecord);
}

function profileFromTopLevel(data: UnknownRecord): DiscordMessageProfile | null {
  const nestedProfile = (data.profile ?? null) as UnknownRecord | null;
  if (nestedProfile) {
    const profile = profileFromPair(nestedProfile.name, nestedProfile.avatar_url);
    if (profile) return profile;
  }
  return profileFromPair(data.username, data.avatar_url);
}

export function extractMessageContent(data: Record<string, unknown>): string | null {
  const messages = (data as { messages?: unknown }).messages;
  if (Array.isArray(messages) && messages.length > 0) {
    for (const message of messages) {
      const content = (message as { data?: { content?: unknown } })?.data?.content;
      if (typeof content === "string") {
        const trimmed = content.trim();
        if (trimmed.length > 0) return content;
      }
    }
  }

  const topLevelContent = (data as { content?: unknown }).content;
  if (typeof topLevelContent === "string") {
    const trimmed = topLevelContent.trim();
    if (trimmed.length > 0) return topLevelContent;
  }

  return null;
}

export function extractMessageProfile(data: Record<string, unknown>): DiscordMessageProfile | null {
  const messages = (data as { messages?: unknown }).messages;
  if (Array.isArray(messages)) {
    for (const message of messages) {
      const messageProfile = profileFromMessage(message);
      if (messageProfile) return messageProfile;
    }
  }

  return profileFromTopLevel(data);
}

/** Extract the first embed from any Discohook-compatible payload shape */
export function extractFirstEmbed(data: Record<string, unknown>): DiscordEmbed | null {
  return extractEmbeds(data)[0] ?? null;
}

/** Very minimal markdown: **bold**, *italic*, __underline__, `code`, [text](url) */
type MarkdownParseResult = {
  node: React.ReactNode;
  nextIndex: number;
};

type MarkdownParser = (text: string, start: number, key: number) => MarkdownParseResult | null;

function parseDelimited(
  text: string,
  start: number,
  open: string,
  close: string
): { content: string; nextIndex: number } | null {
  if (!text.startsWith(open, start)) return null;
  const end = text.indexOf(close, start + open.length);
  if (end <= start + open.length) return null;
  return { content: text.slice(start + open.length, end), nextIndex: end + close.length };
}

const parseBold: MarkdownParser = (text, start, key) => {
  const parsed = parseDelimited(text, start, "**", "**");
  if (!parsed) return null;
  return { node: <strong key={key}>{parsed.content}</strong>, nextIndex: parsed.nextIndex };
};

const parseUnderline: MarkdownParser = (text, start, key) => {
  const parsed = parseDelimited(text, start, "__", "__");
  if (!parsed) return null;
  return { node: <u key={key}>{parsed.content}</u>, nextIndex: parsed.nextIndex };
};

const parseItalic: MarkdownParser = (text, start, key) => {
  const parsed = parseDelimited(text, start, "*", "*");
  if (!parsed) return null;
  return { node: <em key={key}>{parsed.content}</em>, nextIndex: parsed.nextIndex };
};

const parseCode: MarkdownParser = (text, start, key) => {
  const parsed = parseDelimited(text, start, "`", "`");
  if (!parsed) return null;
  return {
    node: (
      <code key={key} className="rounded bg-[#2b2d31] px-1 text-[0.85em] font-mono">
        {parsed.content}
      </code>
    ),
    nextIndex: parsed.nextIndex,
  };
};

const parseLink: MarkdownParser = (text, start, key) => {
  if (text[start] !== "[") return null;
  const labelEnd = text.indexOf("]", start + 1);
  if (labelEnd <= start + 1 || text[labelEnd + 1] !== "(") return null;
  const urlEnd = text.indexOf(")", labelEnd + 2);
  if (urlEnd <= labelEnd + 2) return null;

  const label = text.slice(start + 1, labelEnd);
  const url = text.slice(labelEnd + 2, urlEnd);
  return {
    node: (
      <a key={key} href={url} target="_blank" rel="noreferrer" className="text-[#00a8fc] hover:underline">
        {label}
      </a>
    ),
    nextIndex: urlEnd + 1,
  };
};

const MARKDOWN_PARSERS: MarkdownParser[] = [parseBold, parseUnderline, parseItalic, parseCode, parseLink];

function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < text.length) {
    let parsed: MarkdownParseResult | null = null;
    for (const parser of MARKDOWN_PARSERS) {
      parsed = parser(text, i, key);
      if (parsed) break;
    }

    if (parsed) {
      parts.push(parsed.node);
      key += 1;
      i = parsed.nextIndex;
      continue;
    }

    parts.push(text[i]);
    i += 1;
  }

  return <>{parts}</>;
}

function renderLines(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => (
    <span key={`line-${i}`}>{/* NOSONAR — index is the only stable key for text line fragments */}
      {renderMarkdown(line)}
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  readonly embed: DiscordEmbed;
  readonly className?: string;
}

export function DiscordEmbedPreview({ embed, className }: Props) {
  const accentColor = embed.color == null ? "#1d9bd1" : intToHex(embed.color);
  const hasContent =
    embed.author?.name || embed.title || embed.description ||
    (embed.fields && embed.fields.length > 0) || embed.image?.url || embed.footer?.text;

  if (!hasContent) return null;

  return (
    <div
      className={cn(
        "flex rounded overflow-hidden text-[0.9rem] leading-snug font-discord",
        "bg-[#2b2d31] text-[#dbdee1] max-w-[480px]",
        className
      )}
      style={{ fontFamily: "Whitney, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      {/* Left color bar */}
      <div className="w-1 shrink-0 rounded-l" style={{ backgroundColor: accentColor }} />

      {/* Main content */}
      <div className="flex flex-col gap-1.5 px-3 py-3 flex-1 min-w-0">
        {/* Author */}
        {embed.author?.name && (
          <div className="flex items-center gap-1.5">
            {embed.author.icon_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={embed.author.icon_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            )}
            <span className="text-xs font-semibold text-[#dbdee1]">
              {embed.author.url
                ? <a href={embed.author.url} target="_blank" rel="noreferrer" className="hover:underline">{embed.author.name}</a>
                : embed.author.name}
            </span>
          </div>
        )}

        {/* Title */}
        {embed.title && (
          <div className="font-semibold text-white text-sm">
            {embed.url
              ? <a href={embed.url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "#00a8fc" }}>{embed.title}</a>
              : embed.title}
          </div>
        )}

        {/* Description + thumbnail side-by-side */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {embed.description && (
              <div className="text-xs text-[#dbdee1] whitespace-pre-wrap break-words">
                {renderLines(embed.description)}
              </div>
            )}

            {/* Fields */}
            {embed.fields && embed.fields.length > 0 && (
              <div className="grid gap-x-4 gap-y-1.5 mt-0.5" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                {embed.fields.map((field, i) => (
                  <div
                    key={i} // NOSONAR — index is the only stable key for these items (skeleton/static list)
                    className="flex flex-col gap-0.5"
                    style={{ gridColumn: field.inline ? "span 1" : "span 3" }}
                  >
                    <span className="text-xs font-semibold text-white">{field.name}</span>
                    <span className="text-xs text-[#dbdee1] whitespace-pre-wrap break-words">
                      {renderLines(field.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail */}
          {embed.thumbnail?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={embed.thumbnail.url}
              alt=""
              className="w-16 h-16 rounded object-cover shrink-0 self-start"
            />
          )}
        </div>

        {/* Image */}
        {embed.image?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={embed.image.url} alt="" className="rounded max-w-full mt-1" />
        )}

        {/* Footer */}
        {(embed.footer?.text || embed.timestamp) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {embed.footer?.icon_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={embed.footer.icon_url} alt="" className="w-4 h-4 rounded-full object-cover" />
            )}
            <span className="text-[0.7rem] text-[#949ba4]">
              {embed.footer?.text}
              {embed.footer?.text && embed.timestamp && " • "}
              {embed.timestamp && new Date(embed.timestamp).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface DiscordMessagePreviewProps {
  readonly profile?: DiscordMessageProfile | null;
  readonly content?: string | null;
  readonly embeds: DiscordEmbed[];
  readonly components?: TopLevelComponent[];
  readonly isV2?: boolean;
  readonly className?: string;
}

export function DiscordMessagePreview({ profile, content, embeds, components, isV2, className }: DiscordMessagePreviewProps) {
  const displayName = profile?.name?.trim() || "ClashKing";
  const avatarUrl = profile?.avatar_url?.trim() || clashKingAssets.logos.botApp;
  const v1Content = content?.trim() ? content : null;
  const messageContent = isV2 ? null : v1Content;
  const v2Components = isV2 && components && components.length > 0 ? components : null;

  return (
    <div className={cn("max-w-[520px]", messageContent ? "space-y-2" : "space-y-0", className)}>
      <div className="flex items-start gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" className="mt-0.5 h-10 w-10 rounded-full object-cover" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
            <span className="rounded bg-[#5865F2] px-1 py-0.5 text-[10px] font-semibold text-white">APP</span>
          </div>
          {messageContent && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
              {messageContent}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2 pl-12">
        {v2Components
          ? v2Components.map((comp, index) => (
              <V2TopLevelPreview key={`v2-${comp.type}-${index}`} component={comp} /> // NOSONAR
            ))
          : embeds.map((embed, index) => (
              <DiscordEmbedPreview
                key={`${embed.title ?? "embed"}-${index}`} // NOSONAR — index keeps order-stable previews for duplicate embeds
                embed={embed}
              />
            ))}
      </div>
    </div>
  );
}

// ─── Discord Components V2 ────────────────────────────────────────────────────

export const COMPONENT_TYPE = {
  ACTION_ROW: 1,
  BUTTON: 2,
  STRING_SELECT: 3,
  USER_SELECT: 5,
  ROLE_SELECT: 6,
  MENTIONABLE_SELECT: 7,
  CHANNEL_SELECT: 8,
  SECTION: 9,
  TEXT_DISPLAY: 10,
  THUMBNAIL: 11,
  MEDIA_GALLERY: 12,
  FILE: 13,
  SEPARATOR: 14,
  CONTAINER: 17,
} as const;

export const IS_COMPONENTS_V2_FLAG = 32768;

export interface TextDisplayComponent { type: 10; content: string; id?: number }
export interface ThumbnailComponent { type: 11; media: { url: string }; description?: string; spoiler?: boolean; id?: number }
export interface MediaGalleryItem { media: { url: string }; description?: string; spoiler?: boolean }
export interface MediaGalleryComponent { type: 12; items: MediaGalleryItem[]; id?: number }
export interface SeparatorComponent { type: 14; divider?: boolean; spacing?: 1 | 2; id?: number }
export interface SectionComponent {
  type: 9;
  components: TextDisplayComponent[];
  accessory?: ThumbnailComponent | { type: number; [key: string]: unknown };
  id?: number;
}
export interface ButtonComponent {
  type: 2;
  style?: 1 | 2 | 3 | 4 | 5;
  label?: string;
  emoji?: { id?: string | null; name?: string | null; animated?: boolean };
  url?: string;
  disabled?: boolean;
  id?: number;
}
export interface StringSelectOption { label: string; value?: string; description?: string; default?: boolean }
export interface StringSelectComponent { type: 3; custom_id?: string; placeholder?: string; min_values?: number; max_values?: number; disabled?: boolean; options?: StringSelectOption[]; id?: number }
export interface UserSelectComponent { type: 5; custom_id?: string; placeholder?: string; min_values?: number; max_values?: number; disabled?: boolean; id?: number }
export interface RoleSelectComponent { type: 6; custom_id?: string; placeholder?: string; min_values?: number; max_values?: number; disabled?: boolean; id?: number }
export interface MentionableSelectComponent { type: 7; custom_id?: string; placeholder?: string; min_values?: number; max_values?: number; disabled?: boolean; id?: number }
export interface ChannelSelectComponent { type: 8; custom_id?: string; placeholder?: string; min_values?: number; max_values?: number; disabled?: boolean; channel_types?: number[]; id?: number }
export interface FileComponent { type: 13; file: { url: string; proxy_url?: string; content_type?: string }; name?: string; spoiler?: boolean; id?: number }
export type SelectMenuComponent = StringSelectComponent | UserSelectComponent | RoleSelectComponent | MentionableSelectComponent | ChannelSelectComponent;
export interface ActionRowComponent { type: 1; components: (ButtonComponent | SelectMenuComponent)[]; id?: number }
export type ContainerChild = TextDisplayComponent | SeparatorComponent | MediaGalleryComponent | SectionComponent | ActionRowComponent | SelectMenuComponent | FileComponent;
export interface ContainerComponent { type: 17; accent_color?: number | null; spoiler?: boolean; components: ContainerChild[]; id?: number }
export type TopLevelComponent = ContainerComponent | TextDisplayComponent | SeparatorComponent | MediaGalleryComponent | SectionComponent | ActionRowComponent | SelectMenuComponent | FileComponent;

export function isV2Payload(data: Record<string, unknown>): boolean {
  if (typeof (data as any).flags === 'number' && ((data as any).flags & IS_COMPONENTS_V2_FLAG) !== 0) return true;
  const messages = (data as any).messages;
  if (Array.isArray(messages)) {
    return messages.some((m: any) => {
      const flags = m?.data?.flags ?? m?.flags;
      return typeof flags === 'number' && (flags & IS_COMPONENTS_V2_FLAG) !== 0;
    });
  }
  return false;
}

export function extractComponents(data: Record<string, unknown>): TopLevelComponent[] {
  const messages = (data as any)?.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const components = messages[0]?.data?.components ?? messages[0]?.components;
    if (Array.isArray(components)) return components as TopLevelComponent[];
  }
  const components = (data as any)?.components;
  if (Array.isArray(components)) return components as TopLevelComponent[];
  return [];
}

const BUTTON_STYLE_CLASSES: Record<number, string> = {
  1: "bg-[#5865f2] text-white",
  2: "bg-[#4e5058] text-white",
  3: "bg-[#248046] text-white",
  4: "bg-[#da373c] text-white",
  5: "bg-[#4e5058] text-[#00aff4]",
};

function ButtonPreview({ button }: { readonly button: ButtonComponent }) {
  const style = button.style ?? 2;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium cursor-default select-none",
        BUTTON_STYLE_CLASSES[style] ?? BUTTON_STYLE_CLASSES[2],
        button.disabled && "opacity-50",
      )}
    >
      {button.emoji?.name && <span>{button.emoji.name}</span>}
      {button.label}
      {style === 5 && <ExternalLink className="w-3 h-3 opacity-70" />}
    </span>
  );
}

function SelectMenuPreview({ component }: { readonly component: SelectMenuComponent }) {
  const [open, setOpen] = useState(false);
  const placeholder = component.placeholder ?? "Make a selection";
  const isString = component.type === COMPONENT_TYPE.STRING_SELECT;
  const options = isString ? (component as StringSelectComponent).options ?? [] : []; // NOSONAR
  return (
    <div className={cn("flex flex-col gap-1 w-full", component.disabled && "opacity-50")}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center justify-between px-3 py-2 rounded bg-[#1e1f22] border border-[#3b3d44] text-[#87898c] text-sm w-full"
      >
        <span>{placeholder}</span>
        <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && isString && options.length > 0 && (
        <div className="rounded border border-[#3b3d44] bg-[#2b2d31] overflow-hidden">
          {options.slice(0, 25).map((opt, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="px-3 py-1.5 text-xs text-[#dbdee1] border-b border-[#3b3d44] last:border-0">
              <span className="font-medium">{opt.label}</span>
              {opt.description && <span className="ml-2 text-[#87898c]">{opt.description}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionRowPreview({ component }: { readonly component: ActionRowComponent }) {
  const items = component.components ?? [];
  if (items.length === 0) return null;
  const firstSelectType = new Set<number>([COMPONENT_TYPE.STRING_SELECT, COMPONENT_TYPE.USER_SELECT, COMPONENT_TYPE.ROLE_SELECT, COMPONENT_TYPE.MENTIONABLE_SELECT, COMPONENT_TYPE.CHANNEL_SELECT]);
  const selectMenu = items.find(c => firstSelectType.has(c.type)) as SelectMenuComponent | undefined;
  if (selectMenu) return <SelectMenuPreview component={selectMenu} />;
  return (
    <div className="flex flex-wrap gap-1 py-0.5">
      {items.map((btn, i) => (
        <ButtonPreview key={i} button={btn as ButtonComponent} /> // NOSONAR
      ))}
    </div>
  );
}

function V2TextDisplayPreview({ component }: { readonly component: TextDisplayComponent }) {
  return (
    <div className="text-xs text-[#dbdee1] whitespace-pre-wrap break-words leading-snug">
      {renderLines(component.content)}
    </div>
  );
}

function V2SeparatorPreview({ component }: { readonly component: SeparatorComponent }) {
  const large = component.spacing === 2;
  const hasDivider = component.divider !== false;
  return (
    <hr className={cn(
      "border-0",
      hasDivider ? "border-t border-[#3f3f3f]" : "",
      large ? "my-3" : "my-1",
    )} />
  );
}

function V2MediaGalleryPreview({ component }: { readonly component: MediaGalleryComponent }) {
  const items = component.items ?? [];
  if (items.length === 0) return null;
  const single = items.length === 1;
  return (
    <div className={cn("grid gap-1", single ? "grid-cols-1" : "grid-cols-2")}>
      {items.map((item, i) => (
        <div
          key={i} // NOSONAR
          className={cn(
            "overflow-hidden rounded",
            single ? "max-h-64" : "aspect-square",
            items.length === 3 && i === 0 ? "col-span-2" : "",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.media.url} alt={item.description ?? ""} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function V2SectionPreview({ component }: { readonly component: SectionComponent }) {
  const accessory = component.accessory ?? null;
  const isThumbnail = accessory?.type === COMPONENT_TYPE.THUMBNAIL;
  const isButton = accessory?.type === COMPONENT_TYPE.BUTTON;
  return (
    <div className="flex justify-between gap-3">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {component.components
          .filter(c => c.type === COMPONENT_TYPE.TEXT_DISPLAY)
          .map((c, i) => (
            <V2TextDisplayPreview key={i} component={c as TextDisplayComponent} /> // NOSONAR
          ))}
      </div>
      {isThumbnail && (accessory as ThumbnailComponent).media.url && ( // NOSONAR
        <div className="w-[85px] h-[85px] shrink-0 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={(accessory as ThumbnailComponent).media.url} // NOSONAR
            alt={(accessory as ThumbnailComponent).description ?? ""} // NOSONAR
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {isButton && (
        <div className="shrink-0 self-center">
          <ButtonPreview button={accessory as ButtonComponent} />
        </div>
      )}
    </div>
  );
}

function V2FilePreview({ component }: { readonly component: FileComponent }) {
  const url = component.file?.url ?? "";
  const name = component.name ?? url.split("/").pop() ?? "File";
  return (
    <div className="relative">
      {component.spoiler && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded bg-black/80 backdrop-blur-sm text-xs text-white cursor-pointer select-none">
          SPOILER
        </div>
      )}
      <div className={cn("flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-2 text-sm", component.spoiler && "opacity-60")}>
        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-foreground/90">{name}</span>
      </div>
    </div>
  );
}

function V2ContainerChildPreview({ component }: { readonly component: ContainerChild }) {
  switch (component.type) {
    case COMPONENT_TYPE.TEXT_DISPLAY: return <V2TextDisplayPreview component={component} />;
    case COMPONENT_TYPE.SEPARATOR: return <V2SeparatorPreview component={component} />;
    case COMPONENT_TYPE.MEDIA_GALLERY: return <V2MediaGalleryPreview component={component} />;
    case COMPONENT_TYPE.SECTION: return <V2SectionPreview component={component} />;
    case COMPONENT_TYPE.FILE: return <V2FilePreview component={component as FileComponent} />; // NOSONAR
    case COMPONENT_TYPE.ACTION_ROW: return <ActionRowPreview component={component} />;
    case COMPONENT_TYPE.STRING_SELECT:
    case COMPONENT_TYPE.USER_SELECT:
    case COMPONENT_TYPE.ROLE_SELECT:
    case COMPONENT_TYPE.MENTIONABLE_SELECT:
    case COMPONENT_TYPE.CHANNEL_SELECT:
      return <SelectMenuPreview component={component as SelectMenuComponent} />; // NOSONAR
    default: return null;
  }
}

function V2ContainerPreview({ component }: { readonly component: ContainerComponent }) {
  const accentColor = component.accent_color == null ? null : intToHex(component.accent_color);
  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border border-[#3b3d44] bg-[#232428] text-[#dbdee1] flex flex-col gap-1.5 p-4",
        component.spoiler && "cursor-pointer",
      )}
    >
      {accentColor && (
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l" style={{ backgroundColor: accentColor }} />
      )}
      <div className={cn("flex flex-col gap-1.5", accentColor ? "pl-2" : "", component.spoiler && "blur-md select-none")}>
        {component.components.map((child, i) => (
          <V2ContainerChildPreview key={i} component={child} /> // NOSONAR
        ))}
      </div>
      {component.spoiler && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded bg-[#1e1f22] px-2 py-1 text-xs font-medium text-[#b5bac1]">SPOILER</span>
        </div>
      )}
    </div>
  );
}

export function V2TopLevelPreview({ component }: { readonly component: TopLevelComponent }) {
  switch (component.type) {
    case COMPONENT_TYPE.CONTAINER: return <V2ContainerPreview component={component} />;
    case COMPONENT_TYPE.TEXT_DISPLAY: return <V2TextDisplayPreview component={component} />;
    case COMPONENT_TYPE.SEPARATOR: return <V2SeparatorPreview component={component} />;
    case COMPONENT_TYPE.MEDIA_GALLERY: return <V2MediaGalleryPreview component={component} />;
    case COMPONENT_TYPE.SECTION: return <V2SectionPreview component={component} />;
    case COMPONENT_TYPE.FILE: return <V2FilePreview component={component as FileComponent} />; // NOSONAR
    case COMPONENT_TYPE.ACTION_ROW: return <ActionRowPreview component={component} />;
    case COMPONENT_TYPE.STRING_SELECT:
    case COMPONENT_TYPE.USER_SELECT:
    case COMPONENT_TYPE.ROLE_SELECT:
    case COMPONENT_TYPE.MENTIONABLE_SELECT:
    case COMPONENT_TYPE.CHANNEL_SELECT:
      return <SelectMenuPreview component={component as SelectMenuComponent} />; // NOSONAR
    default: return null;
  }
}