export type AutoboardTargetScope = "family" | "custom";
export type AutoboardDeliveryMode = "refresh" | "send";
export type AutoboardScheduleKind = "daily" | "weekdays" | "day_of_month";

export interface AutoboardRefreshIntervalCapability {
  minMinutes: number;
  maxMinutes: number;
  defaultMinutes: number;
}

export interface AutoboardBoardTypeCapability {
  boardType: string;
  label: string;
  targetKind: string;
  minTargets: number;
  maxTargets: number;
  allowedScopes: AutoboardTargetScope[];
  allowedModes: AutoboardDeliveryMode[];
  refreshInterval: AutoboardRefreshIntervalCapability | null;
  uiCapabilities: string[];
}

export interface AutoboardCapabilitiesResponse {
  boardTypes: AutoboardBoardTypeCapability[];
}

export interface AutoboardSchedule {
  kind: AutoboardScheduleKind;
  timezone: string;
  timeOfDay: string;
  weekdays: number[] | null;
  dayOfMonth: number | null;
}

export interface AutoboardItem {
  id: string;
  boardType: string;
  targetKind: string;
  targetScope: AutoboardTargetScope;
  targets: string[];
  deliveryMode: AutoboardDeliveryMode;
  channelId: string | null;
  channelDeleted: boolean;
  threadId: string | null;
  messageId: string | null;
  enabled: boolean;
  intervalMinutes: number | null;
  schedule: AutoboardSchedule | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutoboardsResponse {
  items: AutoboardItem[];
  total: number;
  refreshCount: number;
  sendCount: number;
  limit: number;
}

export interface AutoboardWriteRequest {
  boardType: string;
  targetScope: AutoboardTargetScope;
  targets: string[];
  deliveryMode: AutoboardDeliveryMode;
  channelId: string;
  threadId: string | null;
  enabled: boolean;
  intervalMinutes: number | null;
  schedule: AutoboardSchedule | null;
}

export interface AutoboardFormState {
  boardType: string;
  targetScope: AutoboardTargetScope;
  targets: string[];
  deliveryMode: AutoboardDeliveryMode;
  channelId: string;
  threadId: string;
  enabled: boolean;
  intervalMinutes: string;
  scheduleKind: AutoboardScheduleKind;
  timezone: string;
  timeOfDay: string;
  weekdays: number[];
  dayOfMonth: string;
}

export interface AutoboardValidationIssue {
  field: string;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

export function parseAutoboardCapabilities(payload: unknown): AutoboardCapabilitiesResponse {
  if (!isRecord(payload) || !Array.isArray(payload.boardTypes)) {
    throw new Error("Invalid autoboard capabilities response");
  }

  const boardTypes = payload.boardTypes.map((raw) => {
    if (
      !isRecord(raw) ||
      typeof raw.boardType !== "string" ||
      typeof raw.label !== "string" ||
      typeof raw.targetKind !== "string" ||
      !isInteger(raw.minTargets) ||
      !isInteger(raw.maxTargets) ||
      !Array.isArray(raw.allowedScopes) ||
      !raw.allowedScopes.every((scope) => isOneOf(scope, ["family", "custom"] as const)) ||
      !Array.isArray(raw.allowedModes) ||
      !raw.allowedModes.every((mode) => isOneOf(mode, ["refresh", "send"] as const)) ||
      !isStringArray(raw.uiCapabilities)
    ) {
      throw new Error("Invalid autoboard board type capability");
    }

    let refreshInterval: AutoboardRefreshIntervalCapability | null = null;
    if (raw.refreshInterval !== null) {
      if (
        !isRecord(raw.refreshInterval) ||
        !isInteger(raw.refreshInterval.minMinutes) ||
        !isInteger(raw.refreshInterval.maxMinutes) ||
        !isInteger(raw.refreshInterval.defaultMinutes)
      ) {
        throw new Error("Invalid autoboard refresh interval capability");
      }
      refreshInterval = {
        minMinutes: raw.refreshInterval.minMinutes,
        maxMinutes: raw.refreshInterval.maxMinutes,
        defaultMinutes: raw.refreshInterval.defaultMinutes,
      };
    }

    return {
      boardType: raw.boardType,
      label: raw.label,
      targetKind: raw.targetKind,
      minTargets: raw.minTargets,
      maxTargets: raw.maxTargets,
      allowedScopes: raw.allowedScopes as AutoboardTargetScope[],
      allowedModes: raw.allowedModes as AutoboardDeliveryMode[],
      refreshInterval,
      uiCapabilities: raw.uiCapabilities,
    };
  });

  return { boardTypes };
}

export function createInitialAutoboardForm(
  capability: AutoboardBoardTypeCapability | undefined,
  timezone: string,
): AutoboardFormState {
  const targetScope = capability?.allowedScopes[0] ?? "family";
  const deliveryMode = capability?.allowedModes[0] ?? "refresh";
  const targetCount = targetScope === "custom" ? Math.max(1, capability?.minTargets ?? 1) : 0;

  return {
    boardType: capability?.boardType ?? "",
    targetScope,
    targets: Array.from({ length: targetCount }, () => ""),
    deliveryMode,
    channelId: "",
    threadId: "",
    enabled: true,
    intervalMinutes: capability?.refreshInterval?.defaultMinutes.toString() ?? "",
    scheduleKind: "daily",
    timezone,
    timeOfDay: "09:00",
    weekdays: [],
    dayOfMonth: "1",
  };
}

export function createEditAutoboardForm(item: AutoboardItem): AutoboardFormState {
  return {
    boardType: item.boardType,
    targetScope: item.targetScope,
    targets: [...item.targets],
    deliveryMode: item.deliveryMode,
    channelId: item.channelId ?? "",
    threadId: item.threadId ?? "",
    enabled: item.enabled,
    intervalMinutes: item.intervalMinutes?.toString() ?? "",
    scheduleKind: item.schedule?.kind ?? "daily",
    timezone: item.schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeOfDay: item.schedule?.timeOfDay ?? "09:00",
    weekdays: item.schedule?.weekdays ?? [],
    dayOfMonth: item.schedule?.dayOfMonth?.toString() ?? "1",
  };
}

export function validateAutoboardForm(
  form: AutoboardFormState,
  capability: AutoboardBoardTypeCapability | undefined,
  destinationValid: boolean,
): AutoboardValidationIssue[] {
  const issues: AutoboardValidationIssue[] = [];
  if (!capability || capability.boardType !== form.boardType) {
    issues.push({ field: "boardType", message: "boardType" });
    return issues;
  }
  if (!capability.allowedScopes.includes(form.targetScope)) {
    issues.push({ field: "targetScope", message: "targetScope" });
  }
  const normalizedTargets = form.targets.map((target) => target.trim()).filter(Boolean);
  if (form.targetScope === "family" && normalizedTargets.length > 0) {
    issues.push({ field: "targets", message: "familyTargets" });
  }
  if (
    form.targetScope === "custom" &&
    (normalizedTargets.length < capability.minTargets || normalizedTargets.length > capability.maxTargets)
  ) {
    issues.push({ field: "targets", message: "targetCount" });
  }
  if (!capability.allowedModes.includes(form.deliveryMode)) {
    issues.push({ field: "deliveryMode", message: "deliveryMode" });
  }
  if (!destinationValid) {
    issues.push({ field: "channelId", message: "destination" });
  }

  if (form.deliveryMode === "refresh") {
    const interval = Number(form.intervalMinutes);
    const bounds = capability.refreshInterval;
    if (
      !bounds ||
      !Number.isInteger(interval) ||
      interval < bounds.minMinutes ||
      interval > bounds.maxMinutes
    ) {
      issues.push({ field: "intervalMinutes", message: "refreshInterval" });
    }
  } else {
    if (!form.timezone.trim()) issues.push({ field: "schedule.timezone", message: "timezone" });
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.timeOfDay)) {
      issues.push({ field: "schedule.timeOfDay", message: "timeOfDay" });
    }
    if (form.scheduleKind === "weekdays" && form.weekdays.length === 0) {
      issues.push({ field: "schedule.weekdays", message: "weekdays" });
    }
    const day = Number(form.dayOfMonth);
    if (form.scheduleKind === "day_of_month" && (!Number.isInteger(day) || day < 1 || day > 31)) {
      issues.push({ field: "schedule.dayOfMonth", message: "dayOfMonth" });
    }
  }

  return issues;
}

export function buildAutoboardRequest(form: AutoboardFormState): AutoboardWriteRequest {
  const schedule: AutoboardSchedule | null = form.deliveryMode === "send"
    ? {
        kind: form.scheduleKind,
        timezone: form.timezone.trim(),
        timeOfDay: form.timeOfDay,
        weekdays: form.scheduleKind === "weekdays" ? [...form.weekdays].sort((a, b) => a - b) : null,
        dayOfMonth: form.scheduleKind === "day_of_month" ? Number(form.dayOfMonth) : null,
      }
    : null;

  return {
    boardType: form.boardType,
    targetScope: form.targetScope,
    targets: form.targetScope === "custom"
      ? form.targets.map((target) => target.trim()).filter(Boolean)
      : [],
    deliveryMode: form.deliveryMode,
    channelId: form.channelId,
    threadId: form.threadId || null,
    enabled: form.enabled,
    intervalMinutes: form.deliveryMode === "refresh" ? Number(form.intervalMinutes) : null,
    schedule,
  };
}

export function extractApiError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.message === "string" && payload.message) return payload.message;
  if (typeof payload.detail === "string" && payload.detail) return payload.detail;
  return fallback;
}
