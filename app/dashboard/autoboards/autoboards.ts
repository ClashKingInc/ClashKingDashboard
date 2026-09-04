import { AutoboardCapabilitiesEndpoint, type AutoBoardCapability, type AutoBoardSchedule, type AutoBoardWrite, type ServerAutoboardsEndpoint, type EndpointResponse } from "@clashking/api-contracts";
import { Schema } from "effect";

export type AutoboardsResponse = EndpointResponse<typeof ServerAutoboardsEndpoint>;
export type AutoboardItem = AutoboardsResponse["items"][number];
export type AutoboardTargetScope = AutoboardItem["targetScope"];
export type AutoboardDeliveryMode = AutoboardItem["deliveryMode"];
export type AutoboardSchedule = typeof AutoBoardSchedule.Type;
export type AutoboardScheduleKind = AutoboardSchedule["kind"];
export type AutoboardBoardTypeCapability = typeof AutoBoardCapability.Type;
export type AutoboardWriteRequest = typeof AutoBoardWrite.Type;

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
  timeOfDay: string;
  weekdays: number[];
  dayOfMonth: string;
}

export interface AutoboardValidationIssue {
  field: string;
  message: string;
}

const AUTOBOARD_ARTWORK_BASE_URL = "https://assets.clashk.ing";

export function autoboardArtworkUrl(boardType: string, targetKind: string): string {
  const concept = `${boardType} ${targetKind}`.toLowerCase();
  if (concept.includes("donat")) return `${AUTOBOARD_ARTWORK_BASE_URL}/clan_labels/donations.webp`;
  if (concept.includes("war")) return `${AUTOBOARD_ARTWORK_BASE_URL}/icons/Icon_HV_Clan_War.png`;
  if (concept.includes("legend") || concept.includes("player") || concept.includes("location")) {
    return `${AUTOBOARD_ARTWORK_BASE_URL}/icons/Icon_HV_League_Legend_3_No_Padding.png`;
  }
  if (concept.includes("clan") || concept.includes("family")) {
    return `${AUTOBOARD_ARTWORK_BASE_URL}/icons/Clan_Badge_Border_2.png`;
  }
  return `${AUTOBOARD_ARTWORK_BASE_URL}/bot/icons/clock.png`;
}

export const parseAutoboardCapabilities = Schema.decodeUnknownSync(AutoboardCapabilitiesEndpoint.response);

export function createInitialAutoboardForm(
  capability: AutoboardBoardTypeCapability | undefined,
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
    timeOfDay: item.schedule?.timeOfDay ?? "09:00",
    weekdays: [...(item.schedule?.weekdays ?? [])],
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
