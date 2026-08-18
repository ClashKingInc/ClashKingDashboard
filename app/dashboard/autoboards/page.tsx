"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { useGuildId } from "@/lib/dashboard-route";
import { apiFetch } from "@/lib/api/fetch";


import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  Clock3,
  Edit2,
  Hash,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Target,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ChannelCombobox } from "@/components/ui/channel-combobox";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  destinationNeedsThread,
  isDestinationValid,
  normalizeDestinationChannels,
  normalizeDestinationThreads,
  type DiscordDestinationChannel,
  type DiscordDestinationThread,
} from "@/lib/discord-destinations";
import {
  buildAutoboardRequest,
  autoboardArtworkUrl,
  createEditAutoboardForm,
  createInitialAutoboardForm,
  extractApiError,
  parseAutoboardCapabilities,
  validateAutoboardForm,
  type AutoboardBoardTypeCapability,
  type AutoboardDeliveryMode,
  type AutoboardFormState,
  type AutoboardItem,
  type AutoboardsResponse,
  type AutoboardTargetScope,
} from "./autoboards";
import {
  AUTOBOARD_FREE_LIMIT,
  AUTOBOARD_SUBSCRIBER_LIMIT,
} from "@/lib/subscription-entitlements";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";

type BoardFilter = "all" | AutoboardDeliveryMode;

const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTargetKind(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatSchedule(item: AutoboardItem, weekdayLabels: string[]): string {
  if (item.deliveryMode === "refresh") {
    return item.intervalMinutes === null ? "—" : `${item.intervalMinutes} min`;
  }
  if (!item.schedule) return "—";
  if (item.schedule.kind === "weekdays") {
    const days = (item.schedule.weekdays ?? []).map((day) => weekdayLabels[day - 1]).join(", ");
    return `${days} · ${item.schedule.timeOfDay} UTC`;
  }
  if (item.schedule.kind === "day_of_month") {
    return `${item.schedule.dayOfMonth} · ${item.schedule.timeOfDay} UTC`;
  }
  return `${item.schedule.timeOfDay} UTC`;
}

export default function AutoboardsPage() {
  const guildId = useGuildId();
  const locale = useLocale();
  const t = useTranslations("AutoboardsPage");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AutoboardsResponse | null>(null);
  const [capabilities, setCapabilities] = useState<AutoboardBoardTypeCapability[]>([]);
  const [channels, setChannels] = useState<DiscordDestinationChannel[]>([]);
  const [threads, setThreads] = useState<DiscordDestinationThread[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(true);
  const [filter, setFilter] = useState<BoardFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AutoboardItem | null>(null);
  const [form, setForm] = useState<AutoboardFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutoboardItem | null>(null);

  const weekdayLabels = useMemo(
    () => ISO_WEEKDAYS.map((day) => t(`weekdays.${day}` as never)),
    [t],
  );

  const selectedCapability = useMemo(
    () => capabilities.find((capability) => capability.boardType === form?.boardType),
    [capabilities, form?.boardType],
  );
  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === form?.channelId),
    [channels, form?.channelId],
  );
  const availableThreads = useMemo(
    () => threads.filter((thread) => thread.parent_channel_id === form?.channelId),
    [threads, form?.channelId],
  );
  const requiresThread = destinationNeedsThread(form?.channelId, channels);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await apiFetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(extractApiError(payload, t("errors.request")));
    return payload;
  }, [t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [boardsPayload, capabilityPayload] = await Promise.all([
        request(`/v2/server/${guildId}/autoboards`),
        request(`/v2/server/${guildId}/autoboards/capabilities`),
      ]);
      setData(boardsPayload as AutoboardsResponse);
      setCapabilities(parseAutoboardCapabilities(capabilityPayload).boardTypes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("errors.load"));
    } finally {
      setLoading(false);
    }
  }, [guildId, request, t]);

  const loadDestinations = useCallback(async () => {
    setDestinationsLoading(true);
    try {
      const [channelsPayload, threadsPayload] = await Promise.all([
        queryClient.fetchQuery(dashboardQueryOptions.channels(guildId)),
        queryClient.fetchQuery(dashboardQueryOptions.threads(guildId)),
      ]);
      setChannels(normalizeDestinationChannels(channelsPayload));
      setThreads(normalizeDestinationThreads(threadsPayload));
    } catch (destinationError) {
      console.error("Failed to load Discord destinations:", destinationError);
    } finally {
      setDestinationsLoading(false);
    }
  }, [guildId, queryClient]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || !data) return;
    void loadDestinations();
  }, [data, loadDestinations, loading]);

  const openCreate = () => {
    const nextForm = createInitialAutoboardForm(capabilities[0]);
    setEditing(null);
    setForm(nextForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: AutoboardItem) => {
    setEditing(item);
    setForm(createEditAutoboardForm(item));
    setFormError(null);
    setDialogOpen(true);
  };

  const changeBoardType = (boardType: string) => {
    const capability = capabilities.find((candidate) => candidate.boardType === boardType);
    const next = createInitialAutoboardForm(capability);
    setForm((current) => ({
      ...next,
      channelId: current?.channelId ?? "",
      threadId: current?.threadId ?? "",
      enabled: current?.enabled ?? true,
    }));
  };

  const changeTargetScope = (scope: AutoboardTargetScope) => {
    setForm((current) => {
      if (!current) return current;
      const count = scope === "custom" ? Math.max(1, selectedCapability?.minTargets ?? 1) : 0;
      return {
        ...current,
        targetScope: scope,
        targets: scope === "custom"
          ? Array.from({ length: count }, (_, index) => current.targets[index] ?? "")
          : [],
      };
    });
  };

  const changeDeliveryMode = (mode: AutoboardDeliveryMode) => {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        deliveryMode: mode,
        intervalMinutes: mode === "refresh"
          ? selectedCapability?.refreshInterval?.defaultMinutes.toString() ?? ""
          : "",
      };
    });
  };

  const updateTarget = (index: number, value: string) => {
    setForm((current) => {
      if (!current) return current;
      const targets = [...current.targets];
      targets[index] = value;
      return { ...current, targets };
    });
  };

  const addTarget = () => {
    setForm((current) => current ? { ...current, targets: [...current.targets, ""] } : current);
  };

  const removeTarget = (index: number) => {
    setForm((current) => current
      ? { ...current, targets: current.targets.filter((_, targetIndex) => targetIndex !== index) }
      : current);
  };

  const save = async () => {
    if (!form) return;
    const destinationValid = isDestinationValid(
      form.channelId,
      form.threadId || undefined,
      channels,
      threads,
    );
    const issues = validateAutoboardForm(form, selectedCapability, destinationValid);
    if (issues.length > 0) {
      setFormError((t as (key: string, values?: Record<string, number>) => string)(
        `validation.${issues[0].message}`,
        {
        min: selectedCapability?.minTargets ?? 0,
        max: selectedCapability?.maxTargets ?? 0,
        minimum: selectedCapability?.refreshInterval?.minMinutes ?? 0,
        maximum: selectedCapability?.refreshInterval?.maxMinutes ?? 0,
        },
      ));
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const path = editing
        ? `/v2/server/${guildId}/autoboards/${editing.id}`
        : `/v2/server/${guildId}/autoboards`;
      await request(path, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(buildAutoboardRequest(form)),
      });
      setDialogOpen(false);
      toast({
        title: editing ? t("feedback.updated") : t("feedback.created"),
      });
      await load();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : t("errors.save"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await request(`/v2/server/${guildId}/autoboards/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      toast({ title: t("feedback.deleted") });
      await load();
    } catch (deleteError) {
      setDeleteTarget(null);
      setError(deleteError instanceof Error ? deleteError.message : t("errors.delete"));
    } finally {
      setDeleting(false);
    }
  };

  const filteredItems = useMemo(
    () => (data?.items ?? []).filter((item) => filter === "all" || item.deliveryMode === filter),
    [data?.items, filter],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-7">
          <div className="space-y-2">
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          <Skeleton className="h-36 rounded-3xl" />
          <div className="grid gap-4 xl:grid-cols-2">
            {[0, 1, 2, 3].map((value) => <Skeleton key={value} className="h-48 rounded-3xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const limit = data?.limit ?? AUTOBOARD_FREE_LIMIT;
  const remaining = Math.max(0, limit - total);
  const usagePercent = limit > 0 ? Math.min(100, (total / limit) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{t("description")}</p>
          </div>
          <Button className="shrink-0 self-start rounded-xl" onClick={openCreate} disabled={capabilities.length === 0 || total >= limit}>
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.create")}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("errors.title")}</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button className="shrink-0" variant="outline" size="sm" onClick={() => void load()}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                {t("actions.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!error && capabilities.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("registry.emptyTitle")}</AlertTitle>
            <AlertDescription>{t("registry.emptyDescription")}</AlertDescription>
          </Alert>
        )}

        <section className="rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-6" aria-labelledby="autoboard-usage-title">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <Image src="https://assets.clashk.ing/bot/icons/clock.png" alt="" fill sizes="64px" className="object-contain drop-shadow-md" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="autoboard-usage-title" className="font-semibold">{t("metrics.total")}</h2>
                  <p className="text-sm font-semibold tabular-nums">{total} / {limit}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={total}>
                  <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${usagePercent}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{remaining} {t("metrics.remaining")} · {t("entitlement.current", { limit })}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <MetricPill icon={RefreshCw} label={t("metrics.refresh")} value={data?.refreshCount ?? 0} />
              <MetricPill icon={Send} label={t("metrics.send")} value={data?.sendCount ?? 0} />
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t("entitlement.title", { freeLimit: AUTOBOARD_FREE_LIMIT })}</p>
            <p className="mt-1 leading-6">{t("entitlement.description", { paidLimit: AUTOBOARD_SUBSCRIBER_LIMIT })}</p>
          </div>
        </section>

        <section aria-labelledby="autoboard-list-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="autoboard-list-title" className="text-xl font-semibold">{t("list.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("list.description")}</p>
            </div>
            <Tabs className="w-full sm:w-auto" value={filter} onValueChange={(value) => setFilter(value as BoardFilter)}>
              <DashboardTabsList className="grid-cols-3 sm:w-[360px]">
                <DashboardTabTrigger value="all" count={data?.total ?? 0}>{t("filters.all")}</DashboardTabTrigger>
                <DashboardTabTrigger value="refresh" count={data?.refreshCount ?? 0}>{t("modes.refresh")}</DashboardTabTrigger>
                <DashboardTabTrigger value="send" count={data?.sendCount ?? 0}>{t("modes.send")}</DashboardTabTrigger>
              </DashboardTabsList>
            </Tabs>
          </div>

          {filteredItems.length === 0 ? (
            <div className="mt-5 flex min-h-44 items-center gap-4 rounded-3xl bg-muted/45 px-6 py-10 shadow-sm shadow-black/5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/70 text-muted-foreground">
                <CalendarClock className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold">{t("list.empty")}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("list.emptyDescription")}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {filteredItems.map((item) => {
                const channel = channels.find((candidate) => candidate.id === item.channelId);
                const thread = threads.find((candidate) => candidate.id === item.threadId);
                const capability = capabilities.find((candidate) => candidate.boardType === item.boardType);
                const capabilityAvailable = Boolean(capability);
                return (
                  <article key={item.id} className="rounded-3xl bg-card p-5 shadow-sm shadow-black/5">
                    <div className="flex items-start gap-3">
                      <div className="relative h-12 w-12 shrink-0 rounded-2xl bg-muted/55 p-1.5">
                        <Image src={autoboardArtworkUrl(item.boardType, item.targetKind)} alt="" fill sizes="48px" className="object-contain p-1.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold">{capability?.label ?? formatTargetKind(item.boardType)}</h3>
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{t(`modes.${item.deliveryMode}`)}</span>
                          <span className={item.enabled ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300" : "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive"}>
                            {t(`status.${item.enabled ? "enabled" : "disabled"}`)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{t("targets.kind", { kind: formatTargetKind(item.targetKind) })}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" className="rounded-xl" aria-label={t("actions.edit")} disabled={!capabilityAvailable} onClick={() => openEdit(item)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="rounded-xl" aria-label={t("actions.delete")} onClick={() => setDeleteTarget(item)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-x-4 gap-y-3 rounded-2xl bg-muted/45 p-4 text-sm sm:grid-cols-2">
                      <Detail icon={Target} label={t("targets.scope")}>{item.targetScope === "family" ? t("targets.family") : item.targets.join(", ")}</Detail>
                      <Detail icon={Hash} label={t("destination.label")}>{destinationsLoading ? "—" : item.channelDeleted || !channel ? t("destination.deleted") : `#${channel.name}${thread ? ` / ${thread.name}` : ""}`}</Detail>
                      <Detail icon={Clock3} label={t("schedule.label")}>{formatSchedule(item, weekdayLabels)}</Detail>
                      <Detail icon={CalendarClock} label={t("schedule.nextRun")}>{formatDate(item.nextRunAt, locale)}</Detail>
                    </dl>

                    {item.deliveryMode === "refresh" && item.messageId && <p className="mt-3 truncate px-1 text-xs text-muted-foreground">{t("status.messageId", { id: item.messageId })}</p>}
                    {!capabilityAvailable && <p className="mt-3 px-1 text-xs text-amber-600 dark:text-amber-400">{t("registry.typeUnavailable")}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent variant="form" className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("dialog.editTitle") : t("dialog.createTitle")}</DialogTitle>
            <DialogDescription>{t("dialog.description")}</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-5 py-2">
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("boardType.label")} description={t("boardType.description")}>
                  <Select value={form.boardType} onValueChange={changeBoardType} disabled={Boolean(editing)}>
                    <SelectTrigger><SelectValue placeholder={t("boardType.placeholder")} /></SelectTrigger>
                    <SelectContent>
                      {capabilities.map((capability) => (
                        <SelectItem key={capability.boardType} value={capability.boardType}>
                          {capability.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label={t("targets.kind", {
                    kind: formatTargetKind(selectedCapability?.targetKind ?? "—"),
                  })}
                  description={t("targets.kindDescription")}
                >
                  <div className="flex h-10 items-center rounded-xl bg-muted/55 px-3 text-sm shadow-sm shadow-black/5">
                    {formatTargetKind(selectedCapability?.targetKind ?? "—")}
                  </div>
                </Field>
              </div>

              <Field label={t("targets.scope")} description={t("targets.scopeDescription")}>
                <Select
                  value={form.targetScope}
                  onValueChange={(value) => changeTargetScope(value as AutoboardTargetScope)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectedCapability?.allowedScopes.map((scope) => (
                      <SelectItem key={scope} value={scope}>{t(`targets.${scope}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {form.targetScope === "custom" && selectedCapability && (
                <Field
                  label={t("targets.values")}
                  description={t("targets.count", {
                    min: selectedCapability.minTargets,
                    max: selectedCapability.maxTargets,
                  })}
                >
                  <div className="space-y-2">
                    {form.targets.map((target, index) => (
                      <div key={`${index}-${form.targets.length}`} className="flex gap-2">
                        <Input
                          value={target}
                          onChange={(event) => updateTarget(index, event.target.value)}
                          placeholder={t("targets.placeholder", {
                            kind: formatTargetKind(selectedCapability.targetKind),
                          })}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          aria-label={t("targets.remove")}
                          disabled={form.targets.length <= selectedCapability.minTargets}
                          onClick={() => removeTarget(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={form.targets.length >= selectedCapability.maxTargets}
                      onClick={addTarget}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t("targets.add")}
                    </Button>
                  </div>
                </Field>
              )}

              <Field label={t("modes.label")} description={t("modes.description")}>
                <Select
                  value={form.deliveryMode}
                  onValueChange={(value) => changeDeliveryMode(value as AutoboardDeliveryMode)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectedCapability?.allowedModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>{t(`modes.${mode}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {destinationsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
              ) : <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("destination.channel")} description={t("destination.channelDescription")}>
                  <ChannelCombobox
                    channels={channels}
                    value={form.channelId}
                    showDisabled={false}
                    placeholder={t("destination.selectChannel")}
                    onValueChange={(channelId) => setForm({ ...form, channelId, threadId: "" })}
                  />
                </Field>
                <Field
                  label={t("destination.thread")}
                  description={requiresThread
                    ? t("destination.forumRequired")
                    : t("destination.threadOptional")}
                >
                  <Select
                    value={form.threadId || "direct"}
                    disabled={!selectedChannel}
                    onValueChange={(threadId) => setForm({
                      ...form,
                      threadId: threadId === "direct" ? "" : threadId,
                    })}
                  >
                    <SelectTrigger><SelectValue placeholder={t("destination.selectThread")} /></SelectTrigger>
                    <SelectContent>
                      {!requiresThread && <SelectItem value="direct">{t("destination.direct")}</SelectItem>}
                      {availableThreads.map((thread) => (
                        <SelectItem key={thread.id} value={thread.id}>{thread.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>}

              {form.deliveryMode === "refresh" && selectedCapability?.refreshInterval && (
                <Field
                  label={t("refresh.interval")}
                  description={t("refresh.intervalDescription", {
                    minimum: selectedCapability.refreshInterval.minMinutes,
                    maximum: selectedCapability.refreshInterval.maxMinutes,
                  })}
                >
                  <Input
                    type="number"
                    min={selectedCapability.refreshInterval.minMinutes}
                    max={selectedCapability.refreshInterval.maxMinutes}
                    value={form.intervalMinutes}
                    onChange={(event) => setForm({ ...form, intervalMinutes: event.target.value })}
                  />
                </Field>
              )}

              {form.deliveryMode === "send" && (
                <div className="space-y-4 rounded-2xl bg-muted/45 p-4">
                  <Field label={t("schedule.kind")} description={t("schedule.kindDescription")}>
                    <Select
                      value={form.scheduleKind}
                      onValueChange={(scheduleKind) => setForm({
                        ...form,
                        scheduleKind: scheduleKind as AutoboardFormState["scheduleKind"],
                      })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t("schedule.daily")}</SelectItem>
                        <SelectItem value="weekdays">{t("schedule.weekdays")}</SelectItem>
                        <SelectItem value="day_of_month">{t("schedule.dayOfMonth")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {form.scheduleKind === "weekdays" && (
                    <Field label={t("schedule.selectWeekdays")}>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {ISO_WEEKDAYS.map((day, index) => (
                          <label key={day} className="flex items-center gap-2 rounded-xl bg-background/70 px-3 py-2 text-sm shadow-sm shadow-black/5">
                            <Checkbox
                              checked={form.weekdays.includes(day)}
                              onCheckedChange={(checked) => setForm({
                                ...form,
                                weekdays: checked
                                  ? [...form.weekdays, day]
                                  : form.weekdays.filter((value) => value !== day),
                              })}
                            />
                            {weekdayLabels[index]}
                          </label>
                        ))}
                      </div>
                    </Field>
                  )}

                  {form.scheduleKind === "day_of_month" && (
                    <Field label={t("schedule.monthDay")} description={t("schedule.monthDayDescription")}>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={form.dayOfMonth}
                        onChange={(event) => setForm({ ...form, dayOfMonth: event.target.value })}
                      />
                    </Field>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={`${t("schedule.timeOfDay")} (UTC)`}>
                      <Input
                        type="time"
                        value={form.timeOfDay}
                        onChange={(event) => setForm({ ...form, timeOfDay: event.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl bg-muted/45 p-4">
                <div>
                  <Label htmlFor="autoboard-enabled">{t("status.enabled")}</Label>
                  <p className="text-sm text-muted-foreground">{t("status.enabledDescription")}</p>
                </div>
                <Switch
                  id="autoboard-enabled"
                  checked={form.enabled}
                  onCheckedChange={(enabled) => setForm({ ...form, enabled })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t("actions.cancel")}</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? t("actions.save") : t("actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-muted/65 px-3 py-2 text-sm shadow-sm shadow-black/5">
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Target;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1 truncate font-medium">{children}</dd>
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
