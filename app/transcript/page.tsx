import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Schema } from "effect";
import { TicketTranscriptDocument } from "@clashking/api-contracts";
import { useTranslations } from "use-intl";
import { FileText, Hash, Loader2, Pin } from "lucide-react";
import { getDefaultBaseUrl } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { DiscordMessagePreview, extractEmbeds, extractComponents } from "@/components/dashboard/discord-embed-preview";
import { transcriptTabUrl } from "@/lib/ticket-transcript-link";
import { DashboardQueryProvider } from "@/components/dashboard/dashboard-query-provider";
import { transcriptRasterMime } from "@/lib/ticket-transcript-image";

function ArchivedAttachment({ url, attachment }: {url: string; attachment: typeof TicketTranscriptDocument.Type.attachments[number]}) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    if (!/^image\/(png|jpeg|gif|webp)$/u.test(attachment.contentType)) return;
    const controller = new AbortController(); let objectUrl: string | undefined;
    void (async () => {
      const response = await fetch(url, {credentials:"omit",referrerPolicy:"no-referrer",signal:controller.signal});
      if (!response.ok) return;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength !== attachment.size || bytes.byteLength > 8 * 1024 * 1024) return;
      const mime = transcriptRasterMime(bytes); if (!mime) return;
      const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(value => value.toString(16).padStart(2,"0")).join("");
      if (hash !== attachment.sha256 || controller.signal.aborted) return;
      // Only a verified raster Blob enters an <img>; HTML/SVG never get an inline URL.
      objectUrl = URL.createObjectURL(new Blob([bytes], {type:mime})); setImage(objectUrl);
    })().catch(() => {});
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, attachment.contentType, attachment.size, attachment.sha256]);
  return <div className="max-w-full space-y-2">
    {image && <img src={image} alt={attachment.filename} loading="lazy" className="max-h-96 max-w-full rounded-xl object-contain" />}
    <a href={url} rel="noopener noreferrer" target="_blank" referrerPolicy="no-referrer" className="inline-flex items-center gap-2 rounded-xl bg-muted/55 px-3 py-2 text-sm"><FileText className="h-4 w-4" />{attachment.filename}<span className="text-xs text-muted-foreground">{Math.ceil(attachment.size / 1024)} KB</span></a>
  </div>;
}

export default function TranscriptPage() {
  return <DashboardQueryProvider><TranscriptContent /></DashboardQueryProvider>;
}

function TranscriptContent() {
  const t = useTranslations("TicketsSettingsPage");
  const [path] = useState(() => `/v2/ticket-transcripts/${window.location.hash.slice(1)}`);
  const [channelId, setChannelId] = useState<string | null>(null);
  const url = `${getDefaultBaseUrl().replace(/\/$/u, "")}${path}`;
  const query = useQuery({ queryKey: ["ticket-transcript", path], retry: false,
    queryFn: async () => {
      if (!transcriptTabUrl(path)) throw new Error(t("transcriptUnavailable"));
      const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok) throw new Error(t("transcriptUnavailable"));
      return Schema.decodeUnknownSync(TicketTranscriptDocument)(await response.json());
    } });
  const document = query.data;
  const channel = document?.channels.find(item => item.id === channelId) ?? document?.channels[0];
  return <main className="mx-auto min-h-dvh max-w-5xl px-4 py-8 sm:px-8">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><FileText className="h-6 w-6 text-muted-foreground" />
        <div><h1 className="text-2xl font-semibold">{t("transcriptTitle", { number: document?.ticket.number ?? "—" })}</h1>
          {document && <p className="mt-1 text-sm text-muted-foreground">{document.ticket.panelName} · {new Date(document.collectedAt).toLocaleString()}</p>}</div>
      </div>
      {document && <Button variant="secondary" asChild><a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{t("downloadTranscript")}</a></Button>}
    </header>
    {query.isPending && <Loader2 aria-label={t("actionPending")} className="h-6 w-6 animate-spin motion-reduce:animate-none" />}
    {query.error && <p role="alert" className="rounded-2xl bg-card p-5 text-destructive">{t("transcriptUnavailable")}</p>}
    {document && channel && <>
      <nav className="mb-5 flex flex-wrap gap-2" aria-label={t("viewTranscript")}>
        {document.channels.map(item => <Button key={item.id} variant={item.id === channel.id ? "secondary" : "ghost"} onClick={() => setChannelId(item.id)} aria-pressed={item.id === channel.id}><Hash className="h-4 w-4" />{item.name}</Button>)}
      </nav>
      {channel.topic && <p className="mb-4 text-sm text-muted-foreground">{channel.topic}</p>}
      {!channel.historyComplete && <p className="mb-4 text-sm text-muted-foreground">{t("limitedHistory")}</p>}
      <section className="rounded-3xl bg-card py-4 shadow-sm shadow-black/5">
        {channel.messages.map(message => message.type === 6 ? <article key={message.id} id={`message-${message.id}`} className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground sm:px-6">
          <Pin className="h-4 w-4 shrink-0" />
          <span>{t("pinnedMessage", { name: message.author.displayName })} {message.referencedMessageId && <a className="font-medium text-foreground hover:underline" href={`#message-${message.referencedMessageId}`} onClick={event => {
            event.preventDefault();
            window.document.getElementById(`message-${message.referencedMessageId}`)?.scrollIntoView({ block: "center" });
          }}>{t("viewPinnedMessage")}</a>}</span>
          <time className="text-xs" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
        </article> : <article key={message.id} id={`message-${message.id}`} className="px-4 py-4 hover:bg-muted/25 sm:px-6">
          {message.referencedMessageId && <a href={`#message-${message.referencedMessageId}`} onClick={event => {
            event.preventDefault();
            window.document.getElementById(`message-${message.referencedMessageId}`)?.scrollIntoView({ block: "center" });
          }} className="mb-2 ml-12 block text-xs text-muted-foreground">↳ {channel.messages.find(item => item.id === message.referencedMessageId)?.author.displayName ?? message.referencedMessageId}</a>}
          <DiscordMessagePreview profile={{ name: message.author.displayName, avatar_url: message.author.avatarUrl ?? `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(message.author.id) % 5n)}.png` }}
            bot={message.author.bot} timestamp={message.createdAt} content={message.content}
            mentionContext={{
              channels: document.channels.map(item => ({ id: item.id, name: item.name })),
              users: [...(message.mentions ?? []).map(item => ({ id: item.id, name: item.displayName })),
                ...document.channels.flatMap(item => item.messages.map(entry => ({ id: entry.author.id, name: entry.author.displayName })))],
            }}
            embeds={extractEmbeds({ embeds: message.embeds })} components={extractComponents({ components: message.components })}
            isV2={message.components.some(item => item.type !== 1)} className="max-w-none" />
          <div className="ml-12 mt-2 flex flex-wrap gap-2">
            {message.attachmentIds.map(id => { const attachment = document.attachments.find(item => item.id === id);
              return attachment ? <ArchivedAttachment key={id} url={`${url}/attachments/${id}`} attachment={attachment} /> : null; })}
            {message.reactions.map((reaction, index) => <span key={index} className="rounded-lg bg-muted/55 px-2 py-1 text-sm">{reaction.emoji} {reaction.count}</span>)}
          </div>
          {message.omittedAttachmentCount > 0 && <p className="ml-12 mt-2 text-xs text-muted-foreground">{t("omittedAttachments", { count: message.omittedAttachmentCount })}</p>}
        </article>)}
      </section>
    </>}
  </main>;
}
