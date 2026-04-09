"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Plus,
  Settings,
  Trash2,
  Loader2,
} from "lucide-react";

import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { EmbedEditor } from "@/components/dashboard/embed-editor";
import { DiscordEmbedPreview, extractFirstEmbed } from "@/components/dashboard/discord-embed-preview";
import type { ServerEmbed } from "@/lib/api/types/tickets";

// ─── Discohook URL builder (kept for list actions) ────────────────────────────

function buildDiscohookUrl(data: Record<string, unknown>): string {
  let payload: unknown;
  if (data.messages) {
    payload = data;
  } else if (Array.isArray((data as any).embeds)) {
    payload = { messages: [{ data: { content: null, embeds: (data as any).embeds } }] };
  } else {
    payload = { messages: [{ data: { content: null, embeds: [data] } }] };
  }
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  return `https://discohook.app/?data=${encoded}`;
}

function normalizeEmbedsPayload(payload: unknown): ServerEmbed[] {
  if (Array.isArray(payload)) return payload as ServerEmbed[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as { items?: unknown; data?: { items?: unknown } };
  if (Array.isArray(obj.items)) return obj.items as ServerEmbed[];
  if (obj.data && Array.isArray(obj.data.items)) return obj.data.items as ServerEmbed[];

  return [];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmbedsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const t = useTranslations("TicketsSettingsPage");
  const tPage = useTranslations("EmbedsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();

  const [embeds, setEmbeds] = useState<ServerEmbed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedName, setExpandedName] = useState<string | null>(null);

  // Name dialog (shown before editor for new embeds)
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEmbed, setEditingEmbed] = useState<ServerEmbed | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [copiedName, setCopiedName] = useState<string | null>(null);
  const loaded = useRef(false);
  const embedsCacheKey = `tickets-embeds-list-${guildId}`;

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      apiCache.invalidate(embedsCacheKey);
    }

    try {
      const embedsData = await apiCache.get(embedsCacheKey, async () => {
        const res = await apiClient.tickets.getEmbeds(guildId);
        if (res.error) throw new Error(res.error);
        return res.data?.items ?? [];
      });
      setEmbeds(normalizeEmbedsPayload(embedsData));
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [embedsCacheKey, guildId, toast, tCommon]);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    load();
  }, [load]);

  // Open "choose name" dialog for new embed
  const openCreate = () => {
    setPendingName("");
    setNameDialogOpen(true);
  };

  // Confirm name → open editor
  const confirmName = () => {
    if (!pendingName.trim()) return;
    setNameDialogOpen(false);
    setEditingEmbed(null);
    setEditorOpen(true);
  };

  // Open editor for existing embed
  const openEdit = (embed: ServerEmbed) => {
    setEditingEmbed(embed);
    setEditorOpen(true);
  };

  const handleSave = async (data: Record<string, unknown>) => {
    const name = editingEmbed ? editingEmbed.name : pendingName.trim();
    setIsSaving(true);
    try {
      let res;
      if (editingEmbed) {
        res = await apiClient.tickets.updateEmbed(guildId, editingEmbed.name, { name, data });
        if (res.error) throw new Error(res.error);
        toast({ title: tCommon("success"), description: t("embedSaved", { name }) });
      } else {
        res = await apiClient.tickets.createEmbed(guildId, { name, data });
        if (res.error) throw new Error(res.error);
        toast({ title: tCommon("success"), description: t("embedCreated", { name }) });
      }
      setEditorOpen(false);
      await load(true);
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiClient.tickets.deleteEmbed(guildId, deleteTarget);
      if (res.error) throw new Error(res.error);
      toast({ title: tCommon("success"), description: t("embedDeleted") });
      setDeleteTarget(null);
      await load(true);
    } catch (err) {
      toast({ title: tCommon("error"), description: err instanceof Error ? err.message : tCommon("loadError"), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const copyDiscohookUrl = async (embed: ServerEmbed) => {
    if (!embed.data) return;
    await navigator.clipboard.writeText(buildDiscohookUrl(embed.data));
    setCopiedName(embed.name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{tPage("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{tPage("description")}</p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />{t("newEmbed")}
          </Button>
        </div>

        {/* Embed list */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : embeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-muted-foreground gap-2">
            <FileText className="h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">{t("noEmbeds")}</p>
            <p className="text-xs">{t("noEmbedsHint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {embeds.map((embed) => {
              const preview = embed.data ? extractFirstEmbed(embed.data) : null;
              const isExpanded = expandedName === embed.name;
              return (
                <div key={embed.name} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setExpandedName(isExpanded ? null : embed.name)}
                      className={cn("flex items-center gap-2 flex-1 min-w-0 text-left", !preview && "cursor-default")}
                      disabled={!preview}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 font-medium text-sm truncate">{embed.name}</span>
                      {preview && (
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
                      )}
                    </button>
                    {!embed.data && (
                      <span className="text-xs text-muted-foreground italic hidden sm:block">{t("legacyEmbed")}</span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {embed.data && (
                        <>
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={t("openInDiscohook")}>
                            <a href={buildDiscohookUrl(embed.data)} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyDiscohookUrl(embed)} title={t("copyDiscohookUrl")}>
                            {copiedName === embed.name
                              ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                              : <Copy className="h-4 w-4" />}
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(embed)} title={t("editEmbed")}>
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(embed.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {preview && isExpanded && (
                    <div className="border-t border-border/60 px-4 py-3 bg-muted/20">
                      <DiscordEmbedPreview embed={preview} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 1: Name dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("newEmbed")}</DialogTitle>
            <DialogDescription>{tPage("nameHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>{t("embedName")}</Label>
            <Input
              value={pendingName}
              onChange={e => setPendingName(e.target.value)}
              placeholder={t("embedNamePlaceholder")}
              onKeyDown={e => e.key === "Enter" && confirmName()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialogOpen(false)}>{tCommon("cancel")}</Button>
            <Button onClick={confirmName} disabled={!pendingName.trim()}>{tCommon("next")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: Editor dialog */}
      <Dialog open={editorOpen} onOpenChange={open => { if (!open && !isSaving) setEditorOpen(false); }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
            <DialogTitle>
              {editingEmbed ? t("editEmbed") : t("newEmbed")}
              {" "}
              <span className="text-muted-foreground font-normal">— {editingEmbed?.name ?? pendingName}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <EmbedEditor
              initialData={editingEmbed?.data ?? null}
              onSave={handleSave}
              isSaving={isSaving}
              onCancel={() => setEditorOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("confirmDeleteEmbed", { name: deleteTarget ?? "" })}</DialogTitle>
            <DialogDescription>{t("confirmDeleteEmbedHint")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{tCommon("cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("deleteEmbed")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
