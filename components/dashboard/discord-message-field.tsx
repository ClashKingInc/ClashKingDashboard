"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "use-intl";
import { ServerLinksEndpoint } from "@clashking/api-contracts";
import emojiDataset from "emoji-datasource-twitter/emoji.json";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PreviewDiscordChannel, PreviewDiscordRole } from "./discord-embed-preview";

type Trigger = { start: number; end: number; prefix: string; query: string };
type Suggestion = { id: string; label: string; token: string; glyph?: string };
const emojis = emojiDataset.map(entry => ({
  id: entry.short_name, label: `:${entry.short_name}:`,
  token: entry.unified.split("-").map(hex => String.fromCodePoint(Number.parseInt(hex, 16))).join(""),
  names: entry.short_names.join(" "),
}));

export function messageCompletionTrigger(value: string, start: number, end = start): Trigger | null {
  if (start !== end) return null;
  const before = value.slice(0, start);
  // Do not suggest inside inline/fenced code, links, email addresses or existing Discord tokens.
  if ((before.match(/(?<!\\)`/g)?.length ?? 0) % 2) return null;
  const template = /(?<!\\)\{([a-zA-Z0-9_]*)$/u.exec(before);
  if (template) return {start: start - template[1].length - 1, end: start, prefix: "{", query: template[1]};
  const match = /(?:^|[\s([{])([#@:])([\p{L}\p{N}_-]*)$/u.exec(before);
  return match ? { start: start - match[2].length - 1, end: start, prefix: match[1], query: match[2] } : null;
}

export function DiscordMessageField({ value, onValueChange, mentionContext, className, placeholder, maxLength, rows, multiline = false }: {
  value: string; onValueChange: (value: string) => void;
  mentionContext: { channels: PreviewDiscordChannel[]; roles: PreviewDiscordRole[]; serverId?: string; placeholders?: readonly string[] };
  className?: string; placeholder?: string; maxLength?: number; rows?: number; multiline?: boolean;
}) {
  const t = useTranslations("EmbedEditor"), listId = useId();
  const field = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null), [active, setActive] = useState(0);
  const [members, setMembers] = useState<Suggestion[]>([]), [memberError, setMemberError] = useState(false);
  const query = trigger?.query.toLocaleLowerCase() ?? "";
  const memberQuery = trigger?.prefix === "@" ? query : "";
  const serverId = mentionContext.serverId;
  useEffect(() => {
    setMembers([]); setMemberError(false);
    if (!serverId || memberQuery.length < 1 || /^\d+$/.test(memberQuery)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void executeSharedEndpoint(ServerLinksEndpoint, { path: { serverId }, query: { query: memberQuery, limit: 15 }, body: {} }, { signal: controller.signal })
        .then(result => { if (!controller.signal.aborted) setMembers(result.members.map(member => ({ id: member.user_id, label: `@${member.display_name || member.username}`, token: `<@${member.user_id}>` }))); })
        .catch(() => { if (!controller.signal.aborted) setMemberError(true); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [memberQuery, serverId]);
  let candidates: Suggestion[] = [];
  if (trigger?.prefix === "#") candidates = mentionContext.channels.map(channel => ({ id: channel.id, label: `#${channel.name}`, token: `<#${channel.id}>` }));
  if (trigger?.prefix === "@") candidates = [
    ...mentionContext.roles.filter(role => role.name !== "@everyone").map(role => ({ id: `role:${role.id}`, label: `@${role.name}`, token: `<@&${role.id}>` })),
    ...members, ...["everyone", "here"].map(name => ({ id: name, label: `@${name}`, token: `@${name}` })),
    ...(/^\d{17,20}$/.test(query) ? [{ id: query, label: `@${query}`, token: `<@${query}>` }] : []),
  ];
  if (trigger?.prefix === ":") candidates = emojis.filter(emoji => emoji.names.includes(query)).map(emoji => ({ ...emoji, glyph: emoji.token }));
  if (trigger?.prefix === "{") candidates = [...new Set(mentionContext.placeholders ?? [])].filter(key => /^[a-zA-Z0-9_]+$/.test(key))
    .map(key => ({ id: `placeholder:${key}`, label: `{${key}}`, token: `{${key}}` }));
  const suggestions = candidates.filter(item => trigger?.prefix === ":" || item.label.toLocaleLowerCase().includes(query)).slice(0, 25);
  const selected = Math.min(active, Math.max(0, suggestions.length - 1));
  const sync = (element: HTMLInputElement | HTMLTextAreaElement) => {
    const next = messageCompletionTrigger(element.value, element.selectionStart ?? element.value.length, element.selectionEnd ?? element.value.length);
    setTrigger(next?.prefix === "{" && !mentionContext.placeholders?.length ? null : next);
    setActive(0);
  };
  const insert = (token: string, range = trigger) => {
    const element = field.current;
    const start = range?.start ?? element?.selectionStart ?? value.length;
    let end = range?.end ?? element?.selectionEnd ?? start;
    if (range?.prefix === "{" && value[end] === "}") end++;
    const replacement = token + (/^\s/.test(value.slice(end)) ? "" : " "), next = value.slice(0, start) + replacement + value.slice(end);
    // Never truncate a Discord reference midway through its identifier.
    if (maxLength !== undefined && next.length > maxLength) return;
    onValueChange(next); setTrigger(null);
    setTimeout(() => { element?.focus(); element?.setSelectionRange(start + replacement.length, start + replacement.length); }, 0);
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!trigger || event.nativeEvent.isComposing) return;
    if (event.key === "Escape") { event.preventDefault(); setTrigger(null); }
    if (suggestions.length && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault(); setActive((selected + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
    }
    if (suggestions.length && ["Enter", "Tab"].includes(event.key)) { event.preventDefault(); insert(suggestions[selected].token); }
  };
  useEffect(() => { document.getElementById(`${listId}-${selected}`)?.scrollIntoView?.({ block: "nearest" }); }, [listId, selected]);
  const shared = {
    value, maxLength, placeholder, className,
    ref: (node: HTMLInputElement | HTMLTextAreaElement | null) => { field.current = node; },
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { onValueChange(event.target.value); sync(event.target); },
    onSelect: (event: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => sync(event.currentTarget),
    onKeyDown: keyDown,
    "aria-autocomplete": "list" as const, "aria-controls": trigger ? listId : undefined,
    "aria-activedescendant": trigger && suggestions.length ? `${listId}-${selected}` : undefined,
  };
  return <Popover open={!!trigger} onOpenChange={open => { if (!open) setTrigger(null); }}>
    <PopoverAnchor asChild><div className="relative">
      {multiline ? <Textarea {...shared} rows={rows} /> : <Input {...shared} />}
    </div></PopoverAnchor>
    <PopoverContent align="start" sideOffset={6} className="w-80 max-h-64 border-0 p-1.5" onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()} onInteractOutside={event => { if (event.target === field.current) event.preventDefault(); }}>
      <div id={listId} role="listbox" aria-label={t("completionSuggestions")}>
        {suggestions.map((item, index) => <button key={item.id} id={`${listId}-${index}`} type="button" role="option" aria-selected={index === selected} tabIndex={-1}
          onPointerDown={event => event.preventDefault()} onClick={() => insert(item.token)} onPointerMove={() => setActive(index)}
          className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm", index === selected ? "bg-muted" : "hover:bg-muted/55")}>
          {item.glyph && <span className="text-lg">{item.glyph}</span>}<span className="truncate">{item.label}</span>
        </button>)}
        {!suggestions.length && <p className="px-3 py-2 text-sm text-muted-foreground">{memberError ? t("memberSuggestionsUnavailable") : t("completionEmpty")}</p>}
      </div>
    </PopoverContent>
  </Popover>;
}
