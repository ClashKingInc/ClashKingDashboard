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
function isDiscordEmbed(value: unknown): value is DiscordEmbed {
  if (!value || typeof value !== "object") return false;
  const embed = value as Record<string, unknown>;
  return Boolean(
    embed.title || embed.description || embed.author || embed.fields || embed.image || embed.thumbnail || embed.footer
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
