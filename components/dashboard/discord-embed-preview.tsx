"use client";

import { cn } from "@/lib/utils";

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
export function extractFirstEmbed(data: Record<string, unknown>): DiscordEmbed | null {
  // Full Discohook payload: { messages: [{ data: { embeds: [...] } }] }
  const messages = (data as any)?.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const embeds = messages[0]?.data?.embeds;
    if (Array.isArray(embeds) && embeds.length > 0) return embeds[0] as DiscordEmbed;
  }
  // { embeds: [...] }
  if (Array.isArray((data as any).embeds) && (data as any).embeds.length > 0) {
    return (data as any).embeds[0] as DiscordEmbed;
  }
  // Raw embed object
  if ((data as any).title || (data as any).description || (data as any).author) {
    return data as unknown as DiscordEmbed;
  }
  return null;
}

/** Very minimal markdown: **bold**, *italic*, __underline__, `code`, [text](url) */
function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Split on markdown tokens with a simple regex
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] !== undefined) parts.push(<strong key={key++}>{match[1]}</strong>);
    else if (match[2] !== undefined) parts.push(<em key={key++}>{match[2]}</em>);
    else if (match[3] !== undefined) parts.push(<u key={key++}>{match[3]}</u>);
    else if (match[4] !== undefined) parts.push(<code key={key++} className="rounded bg-[#2b2d31] px-1 text-[0.85em] font-mono">{match[4]}</code>);
    else if (match[5] !== undefined) parts.push(<a key={key++} href={match[6]} target="_blank" rel="noreferrer" className="text-[#00a8fc] hover:underline">{match[5]}</a>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function renderLines(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => (
    <span key={i}>
      {renderMarkdown(line)}
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  embed: DiscordEmbed;
  className?: string;
}

export function DiscordEmbedPreview({ embed, className }: Props) {
  const accentColor = embed.color != null ? intToHex(embed.color) : "#1d9bd1";
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
                    key={i}
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
