"use client";

import { useLocale } from "next-intl";
import { useGuildId } from "@/lib/dashboard-route";
import { apiFetch } from "@/lib/api/fetch";


import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    return `${days} · ${item.schedule.timeOfDay} · ${item.schedule.timezone}`;
  }
  if (item.schedule.kind === "day_of_month") {
    return `${item.schedule.dayOfMonth} · ${item.schedule.timeOfDay} · ${item.schedule.timezone}`;
  }
  return `${item.schedule.timeOfDay} · ${item.schedule.timezone}`;
}

export default function AutoboardsPage() {
  const guildId = useGuildId();
  const locale = useLocale();
  const t = useTranslations("AutoboardsPage");
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AutoboardsResponse | null>(null);
  const [capabilities, setCapabilities] = useState<AutoboardBoardTypeCapability[]>([]);
  const [channels, setChannels] = useState<DiscordDestinationChannel[]>([]);
  const [threads, setThreads] = useState<DiscordDestinationThread[]>([]);
  const [filter, setFilter] = useState<BoardFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AutoboardItem | null>(null);
  const [form, setForm] = useState<AutoboardFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutoboardItem | null>(null);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
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
      const [boardsPayload, capabilityPayload, channelsPayload, threadsPayload] = await Promise.all([
        request(`/v2/server/${guildId}/autoboards`),
        request(`/v2/server/${guildId}/autoboards/capabilities`),
        request(`/v2/server/${guildId}/channels`),
        request(`/v2/server/${guildId}/threads`),
      ]);
      setData(boardsPayload as AutoboardsResponse);
      setCapabilities(parseAutoboardCapabilities(capabilityPayload).boardTypes);
      setChannels(normalizeDestinationChannels(channelsPayload));
      setThreads(normalizeDestinationThreads(threadsPayload));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("errors.load"));
    } finally {
      setLoading(false);
    }
  }, [guildId, request, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    const nextForm = createInitialAutoboardForm(capabilities[0], timezone);
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
    const next = createInitialAutoboardForm(capability, timezone);
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
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((value) => <Skeleton key={value} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("description")}</p>
          </div>
          <Button className="shrink-0 self-start" onClick={openCreate} disabled={capabilities.length === 0}>
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

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard icon={CalendarClock} label={t("metrics.total")} value={`${data?.total ?? 0} / ${data?.limit ?? 0}`} />
          <MetricCard icon={RefreshCw} label={t("metrics.refresh")} value={data?.refreshCount ?? 0} />
          <MetricCard icon={Send} label={t("metrics.send")} value={data?.sendCount ?? 0} />
        </div>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("list.title")}</CardTitle>
              <CardDescription>{t("list.description")}</CardDescription>
            </div>
            <Tabs value={filter} onValueChange={(value) => setFilter(value as BoardFilter)}>
              <TabsList>
                <TabsTrigger value="all">{t("filters.all")}</TabsTrigger>
                <TabsTrigger value="refresh">{t("modes.refresh")}</TabsTrigger>
                <TabsTrigger value="send">{t("modes.send")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
          {filteredItems.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
              <CalendarClock className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
              <p className="font-medium">{t("list.empty")}</p>
              <p className="text-sm text-muted-foreground">{t("list.emptyDescription")}</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredItems.map((item) => {
                const channel = channels.find((candidate) => candidate.id === item.channelId);
                const thread = threads.find((candidate) => candidate.id === item.threadId);
                const capabilityAvailable = capabilities.some(
                  (capability) => capability.boardType === item.boardType,
                );
                return (
                  <div key={item.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold">{item.boardType}</h3>
                          <Badge variant={item.deliveryMode === "refresh" ? "secondary" : "outline"}>
                            {t(`modes.${item.deliveryMode}`)}
                          </Badge>
                          {!item.enabled && <Badge variant="destructive">{t("status.disabled")}</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("targets.kind", { kind: formatTargetKind(item.targetKind) })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t("actions.edit")}
                          disabled={!capabilityAvailable}
                          onClick={() => openEdit(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t("actions.delete")}
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <Detail icon={Target} label={t("targets.scope")}>
                        {item.targetScope === "family"
                          ? t("targets.family")
                          : item.targets.join(", ")}
                      </Detail>
                      <Detail icon={Hash} label={t("destination.label")}>
                        {item.channelDeleted || !channel
                          ? t("destination.deleted")
                          : `#${channel.name}${thread ? ` / ${thread.name}` : ""}`}
                      </Detail>
                      <Detail icon={Clock3} label={t("schedule.label")}>
                        {formatSchedule(item, weekdayLabels)}
                      </Detail>
                      <Detail icon={CalendarClock} label={t("schedule.nextRun")}>
                        {formatDate(item.nextRunAt, locale)}
                      </Detail>
                    </dl>

                    {item.deliveryMode === "refresh" && item.messageId && (
                      <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        {t("status.messageId", { id: item.messageId })}
                      </div>
                    )}
                    {!capabilityAvailable && (
                      <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                        {t("registry.typeUnavailable")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </CardContent>
        </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                  <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">
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
                          variant="outline"
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
                      variant="outline"
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

              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

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
                <div className="space-y-4 rounded-lg border p-4">
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
                          <label key={day} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
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
                    <Field label={t("schedule.timezone")}>
                      <Input
                        value={form.timezone}
                        onChange={(event) => setForm({ ...form, timezone: event.target.value })}
                        placeholder="America/Chicago"
                      />
                    </Field>
                    <Field label={t("schedule.timeOfDay")}>
                      <Input
                        type="time"
                        value={form.timeOfDay}
                        onChange={(event) => setForm({ ...form, timeOfDay: event.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-4">
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("actions.cancel")}</Button>
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

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <div className="flex min-h-24 items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
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
