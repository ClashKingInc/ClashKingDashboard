"use client";

import { useLocale } from "next-intl";
import { useGuildId } from "@/lib/dashboard-route";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileImage,
  Hash,
  ImagePlus,
  Loader2,
  Map,
  MessageSquareText,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import { dashboardCacheKeys, normalizeChannelsPayload } from "@/lib/dashboard-cache";
import {
  isBaseCreateFailure,
  isBaseDeleteFailure,
  type Base,
  type BaseDownloader,
  type DiscordMessageCreateCleanup,
} from "@/lib/api/types/bases";
import {
  BASES_PAGE_SIZE,
  MAX_BASE_DESCRIPTION_LENGTH,
  MAX_BASE_IMAGES,
  type BaseDraft,
  validateBaseDraft,
} from "./bases-utils";

const EMPTY_DRAFT: BaseDraft = {
  channelId: "",
  baseLink: "",
  description: "",
  images: [],
};

interface DiscordChannel {
  id: string;
  name: string;
  parent_name?: string;
}

type DownloaderState =
  | { status: "loading" }
  | { status: "resolved"; data: BaseDownloader }
  | { status: "error"; message: string };

interface DeleteFeedback {
  title: string;
  message: string;
  retryable?: boolean;
  code?: string;
  requestId?: string;
  cleanup?: "deleted" | "alreadyMissing" | "failed";
  status?: number;
}

interface CreateFeedback {
  title: string;
  message: string;
  retryable: boolean;
  code: string;
  requestId: string;
  cleanup: DiscordMessageCreateCleanup;
  discordMessageCreated: boolean;
  discordMessageId?: string;
  status: number;
}

function BasesLoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <Card key={item} className="overflow-hidden rounded-2xl">
          <Skeleton className="aspect-[16/7] w-full rounded-none" />
          <CardContent className="space-y-3 pt-5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function BasesPage() {
  const guildId = useGuildId();
  const locale = useLocale();
  const t = useTranslations("BasesPage");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bases, setBases] = useState<Base[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<BaseDraft>(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [createFeedback, setCreateFeedback] = useState<CreateFeedback | null>(null);
  const [expandedBases, setExpandedBases] = useState<Set<string>>(new Set());
  const [downloaders, setDownloaders] = useState<Record<string, DownloaderState>>({});
  const [deleteTarget, setDeleteTarget] = useState<Base | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<DeleteFeedback | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<DeleteFeedback | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  const page = Math.floor(offset / BASES_PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / BASES_PAGE_SIZE));
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  const loadBases = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await apiClient.bases.list(guildId, BASES_PAGE_SIZE, offset);
    if (response.error || !response.data) {
      setError(response.error || t("errors.load"));
      setLoading(false);
      return;
    }
    setBases(response.data.items);
    setTotal(response.data.total);
    setLoading(false);
  }, [guildId, offset, t]);

  useEffect(() => {
    void loadBases();
  }, [loadBases]);

  const loadChannels = useCallback(async (forceRefresh = false) => {
    setChannelsLoading(true);
    setChannelsError(null);
    const cacheKey = dashboardCacheKeys.channels(guildId);
    if (forceRefresh) apiCache.invalidate(cacheKey);
    try {
      const payload = await apiCache.get(cacheKey, async () => {
        const response = await apiClient.servers.getChannels(guildId);
        if (response.error) throw new Error(response.error);
        return response.data;
      });
      setChannels(normalizeChannelsPayload(payload));
    } catch (caught) {
      setChannelsError(caught instanceof Error ? caught.message : t("errors.channels"));
    } finally {
      setChannelsLoading(false);
    }
  }, [guildId, t]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  const setDraftField = (field: keyof Omit<BaseDraft, "images">, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDraftError(null);
    setCreateFeedback(null);
  };

  const selectImages = (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (selected.length > MAX_BASE_IMAGES) {
      setDraftError(t("errors.tooManyImages"));
      setCreateFeedback(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setDraft((current) => ({ ...current, images: selected }));
    setDraftError(null);
    setCreateFeedback(null);
  };

  const closeCreate = (force = false) => {
    if (creating && !force) return;
    setCreateOpen(false);
    setDraft(EMPTY_DRAFT);
    setDraftError(null);
    setCreateFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createBase = async () => {
    const validationError = validateBaseDraft(draft);
    if (validationError) {
      setDraftError(t(`errors.${validationError}`));
      return;
    }

    setCreating(true);
    setDraftError(null);
    setCreateFeedback(null);
    try {
      const uploads = await Promise.all(draft.images.map(async (file) => {
        const response = await apiClient.bases.uploadImage(guildId, file);
        if (response.error || !response.data) throw new Error(response.error || t("errors.upload"));
        return response.data.url;
      }));
      const response = await apiClient.bases.create(guildId, {
        channelId: draft.channelId.trim(),
        baseLink: draft.baseLink.trim(),
        images: uploads,
        description: draft.description.trim(),
      });
      if (response.error || !response.data) {
        if (isBaseCreateFailure(response.errorData)) {
          const cleanupCompleted = ["deleted", "alreadyMissing"].includes(
            response.errorData.discordMessageCleanup,
          );
          setCreateFeedback({
            title: response.errorData.discordMessageCleanup === "failed"
              ? t("form.createCleanupFailedTitle")
              : cleanupCompleted
                ? t("form.createCleanupCompleteTitle")
                : t("form.createRejectedTitle"),
            message: response.errorData.message,
            retryable: response.errorData.retryable,
            code: response.errorData.code,
            requestId: response.errorData.requestId,
            cleanup: response.errorData.discordMessageCleanup,
            discordMessageCreated: response.errorData.discordMessageCreated,
            discordMessageId: response.errorData.discordMessageId,
            status: response.status,
          });
          return;
        }
        throw new Error(response.error || t("errors.create"));
      }
      closeCreate(true);
      if (offset === 0) await loadBases();
      else setOffset(0);
    } catch (caught) {
      setDraftError(caught instanceof Error ? caught.message : t("errors.create"));
    } finally {
      setCreating(false);
    }
  };

  const resolveDownloader = async (baseId: string, userId: string) => {
    const key = `${baseId}:${userId}`;
    if (downloaders[key]?.status === "loading" || downloaders[key]?.status === "resolved") return;
    setDownloaders((current) => ({ ...current, [key]: { status: "loading" } }));
    const response = await apiClient.bases.getDownloader(guildId, baseId, userId);
    if (response.error || !response.data) {
      setDownloaders((current) => ({
        ...current,
        [key]: { status: "error", message: response.error || t("errors.downloader") },
      }));
      return;
    }
    const downloader = response.data;
    setDownloaders((current) => ({
      ...current,
      [key]: { status: "resolved", data: downloader },
    }));
  };

  const toggleDownloaders = (baseId: string) => {
    setExpandedBases((current) => {
      const next = new Set(current);
      if (next.has(baseId)) next.delete(baseId);
      else next.add(baseId);
      return next;
    });
  };

  const openDeleteConfirmation = (base: Base) => {
    setDeleteError(null);
    setDeleteTarget(base);
  };

  const deleteBase = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const response = await apiClient.bases.delete(guildId, deleteTarget.id);

    if (response.data?.databaseDeleted) {
      setDeleteNotice({
        title: t("delete.successTitle"),
        message: response.data.discordMessageCleanup === "deleted"
          ? t("delete.successDeleted")
          : t("delete.successAlreadyMissing"),
      });
      const deletedLastVisibleBase = bases.length === 1 && offset > 0;
      setDeleteTarget(null);
      if (deletedLastVisibleBase) {
        setOffset((current) => Math.max(0, current - BASES_PAGE_SIZE));
      } else {
        await loadBases();
      }
      setDeleting(false);
      return;
    }

    if (isBaseDeleteFailure(response.errorData)) {
      const cleanupCompleted = response.errorData.discordMessageCleanup !== "failed";
      setDeleteError({
        title: cleanupCompleted
          ? t("delete.cleanupCompleteTitle")
          : t("delete.cleanupFailedTitle"),
        message: response.errorData.message,
        retryable: response.errorData.retryable,
        code: response.errorData.code,
        requestId: response.errorData.requestId,
        cleanup: response.errorData.discordMessageCleanup,
        status: response.status,
      });
    } else {
      setDeleteError({
        title: t("delete.failureTitle"),
        message: response.error || t("delete.failureFallback"),
        status: response.status,
      });
    }
    setDeleting(false);
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-7">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Map className="h-4 w-4" />
              {t("eyebrow")}
            </div>
            <h1 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" onClick={() => void loadBases()} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
              {t("refresh")}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              {t("create")}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{t("summary.total")}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{total}</div>
          </Card>
          <Card className="rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{t("summary.page")}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{page}</div>
          </Card>
          <Card className="rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{t("summary.visible")}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{bases.length}</div>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{t("errors.title")}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => void loadBases()}>{t("retry")}</Button>
            </AlertDescription>
          </Alert>
        )}

        {deleteNotice && (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>{deleteNotice.title}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{deleteNotice.message}</span>
              <Button size="sm" variant="ghost" onClick={() => setDeleteNotice(null)}>
                {t("dismiss")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading ? <BasesLoadingState /> : bases.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
                <Map className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{t("empty.title")}</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("empty.description")}</p>
              <Button className="mt-5" onClick={() => setCreateOpen(true)}>
                <Plus />
                {t("create")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {bases.map((base) => {
              const expanded = expandedBases.has(base.id);
              const created = new Date(base.createdAt);
              return (
                <Card key={base.id} className="overflow-hidden rounded-2xl">
                  {base.images.length > 0 ? (
                    <div className={`grid gap-px bg-border ${base.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {base.images.slice(0, MAX_BASE_IMAGES).map((image, index) => (
                        <div
                          key={image}
                          className={`relative bg-muted ${base.images.length === 1 ? "aspect-[16/7]" : "aspect-[16/9]"} ${base.images.length === 3 && index === 0 ? "col-span-2 aspect-[16/7]" : ""}`}
                        >
                          <Image
                            src={image}
                            alt={t("imageAlt", { index: index + 1 })}
                            fill
                            unoptimized
                            sizes="(min-width: 1024px) 40vw, 90vw"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex aspect-[16/5] items-center justify-center bg-muted/50 text-muted-foreground">
                      <FileImage className="h-7 w-7" />
                    </div>
                  )}

                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Hash className="h-4 w-4 text-primary" />
                          <span className="truncate">{base.channelId}</span>
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Number.isNaN(created.getTime()) ? base.createdAt : formatter.format(created)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 font-mono">{base.id}</Badge>
                    </div>
                    {base.description ? (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/85">{base.description}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">{t("noDescription")}</p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-secondary/35">
                      <div className="p-3 text-center">
                        <div className="text-lg font-semibold tabular-nums">{base.downloadCount}</div>
                        <div className="text-[11px] text-muted-foreground">{t("counts.downloads")}</div>
                      </div>
                      <div className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-lg font-semibold tabular-nums">
                          <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />{base.upvotes}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{t("counts.upvotes")}</div>
                      </div>
                      <div className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-lg font-semibold tabular-nums">
                          <ArrowDown className="h-3.5 w-3.5 text-destructive" />{base.downvotes}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{t("counts.downvotes")}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm">
                        <a href={base.baseLink} target="_blank" rel="noreferrer">
                          <ExternalLink />{t("openLayout")}
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a href={base.discordMessageUrl} target="_blank" rel="noreferrer">
                          <MessageSquareText />{t("openMessage")}
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto text-destructive hover:border-destructive/40 hover:text-destructive"
                        onClick={() => openDeleteConfirmation(base)}
                      >
                        <Trash2 />
                        {t("delete.action")}
                      </Button>
                    </div>

                    <Collapsible open={expanded} onOpenChange={() => toggleDownloaders(base.id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between px-3">
                          <span className="flex items-center gap-2">
                            <Users />
                            {t("history.title", { count: base.downloaders.length })}
                          </span>
                          <ChevronDown className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        {base.downloaders.length === 0 ? (
                          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                            {t("history.empty")}
                          </p>
                        ) : (
                          <div className="space-y-1 rounded-xl border border-border p-2">
                            {base.downloaders.map((userId) => {
                              const key = `${base.id}:${userId}`;
                              const state = downloaders[key];
                              const profile = state?.status === "resolved" ? state.data : null;
                              return (
                                <button
                                  key={userId}
                                  type="button"
                                  onClick={() => void resolveDownloader(base.id, userId)}
                                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={profile?.avatarUrl || undefined} alt="" />
                                    <AvatarFallback className="text-xs">
                                      {profile?.displayName?.slice(0, 1).toUpperCase() || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">{profile?.displayName || userId}</div>
                                    {profile && <div className="truncate font-mono text-[11px] text-muted-foreground">{userId}</div>}
                                    {state?.status === "error" && <div className="text-[11px] text-destructive">{state.message}</div>}
                                  </div>
                                  {state?.status === "loading" ? (
                                    <Loader2 className="animate-spin text-muted-foreground" />
                                  ) : !profile ? (
                                    <span className="text-[11px] text-muted-foreground">{t("history.resolve")}</span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && total > BASES_PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">{t("pagination", { page, total: pageCount })}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset((current) => Math.max(0, current - BASES_PAGE_SIZE))}
              >
                <ChevronLeft />{t("previous")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={offset + BASES_PAGE_SIZE >= total}
                onClick={() => setOffset((current) => current + BASES_PAGE_SIZE)}
              >
                {t("next")}<ChevronRight />
              </Button>
            </div>
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={(open) => open ? setCreateOpen(true) : closeCreate()}>
          <DialogContent variant="form" className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("form.title")}</DialogTitle>
              <DialogDescription>{t("form.description")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("form.channel")}</Label>
                <ChannelCombobox
                  channels={channels}
                  value={draft.channelId}
                  onValueChange={(value) => setDraftField("channelId", value)}
                  placeholder={channelsLoading ? t("form.channelsLoading") : t("form.channelPlaceholder")}
                  searchPlaceholder={t("form.channelSearch")}
                  disabled={channelsLoading || creating}
                  showDisabled={false}
                />
                {channelsError && (
                  <Alert variant="destructive" className="py-3">
                    <AlertCircle />
                    <AlertDescription className="flex items-center justify-between gap-3">
                      <span>{channelsError}</span>
                      <Button size="sm" variant="outline" onClick={() => void loadChannels(true)}>
                        {t("retry")}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="base-link">{t("form.baseLink")}</Label>
                <Input
                  id="base-link"
                  value={draft.baseLink}
                  onChange={(event) => setDraftField("baseLink", event.target.value)}
                  placeholder="https://link.clashofclans.com/..."
                  disabled={creating}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="base-description">{t("form.descriptionLabel")}</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {draft.description.length}/{MAX_BASE_DESCRIPTION_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="base-description"
                  value={draft.description}
                  onChange={(event) => setDraftField("description", event.target.value)}
                  maxLength={MAX_BASE_DESCRIPTION_LENGTH}
                  rows={5}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="base-images">{t("form.images")}</Label>
                <label
                  htmlFor="base-images"
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed border-input bg-secondary/25 p-4 transition-colors hover:border-primary/50 hover:bg-secondary/50"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary">
                      <ImagePlus className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{t("form.chooseImages")}</span>
                      <span className="block text-xs text-muted-foreground">{t("form.imageLimit")}</span>
                    </span>
                  </span>
                  <Badge variant="secondary">{draft.images.length}/{MAX_BASE_IMAGES}</Badge>
                </label>
                <input
                  ref={fileInputRef}
                  id="base-images"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => selectImages(event.target.files)}
                  disabled={creating}
                />
                {draft.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {draft.images.map((file) => (
                      <Badge key={`${file.name}:${file.size}`} variant="outline" className="max-w-full truncate">
                        {file.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {draftError && (
              <Alert variant="destructive" className="py-3">
                <AlertCircle />
                <AlertDescription>{draftError}</AlertDescription>
              </Alert>
            )}
            {createFeedback && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{createFeedback.title}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{createFeedback.message}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={createFeedback.retryable ? "secondary" : "outline"}>
                      {createFeedback.retryable
                        ? t("form.retryable")
                        : t("form.notRetryable")}
                    </Badge>
                    <Badge variant="outline">
                      {t(`form.cleanup.${createFeedback.cleanup}`)}
                    </Badge>
                    <Badge variant="outline">{t("form.databaseNotInserted")}</Badge>
                    {createFeedback.discordMessageCreated && (
                      <Badge variant="outline">{t("form.discordMessageCreated")}</Badge>
                    )}
                  </div>
                  {createFeedback.discordMessageId && (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {t("form.discordMessageId")}: {createFeedback.discordMessageId}
                    </p>
                  )}
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {[
                      `HTTP ${createFeedback.status}`,
                      createFeedback.code,
                      createFeedback.requestId
                        ? `request ${createFeedback.requestId}`
                        : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => closeCreate()} disabled={creating}>{t("cancel")}</Button>
              <Button onClick={() => void createBase()} disabled={creating}>
                {creating ? <Loader2 className="animate-spin" /> : <Plus />}
                {creating ? t("form.creating") : t("form.submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open && !deleting) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("delete.confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("delete.confirmDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {deleteTarget && (
              <div className="rounded-xl border border-border bg-secondary/35 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t("delete.baseId")}</span>
                  <span className="truncate font-mono text-xs">{deleteTarget.id}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t("delete.discordSource")}</span>
                  <span className="truncate font-mono text-xs">
                    {deleteTarget.channelId}/{deleteTarget.messageId}
                  </span>
                </div>
              </div>
            )}

            {deleteError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{deleteError.title}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{deleteError.message}</p>
                  {deleteError.retryable !== undefined && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={deleteError.retryable ? "secondary" : "outline"}>
                        {deleteError.retryable ? t("delete.retryable") : t("delete.notRetryable")}
                      </Badge>
                      {deleteError.cleanup && (
                        <Badge variant="outline">
                          {t(`delete.cleanup.${deleteError.cleanup}`)}
                        </Badge>
                      )}
                    </div>
                  )}
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {[
                      deleteError.status ? `HTTP ${deleteError.status}` : null,
                      deleteError.code || null,
                      deleteError.requestId ? `request ${deleteError.requestId}` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
              <Button variant="destructive" onClick={() => void deleteBase()} disabled={deleting}>
                {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                {deleting ? t("delete.deleting") : t("delete.confirmAction")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
