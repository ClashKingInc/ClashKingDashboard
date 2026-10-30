import type { RosterAutomation } from "./types";

export function automationEditPayload(original: RosterAutomation, edited: RosterAutomation): Partial<RosterAutomation> {
  const offsetChanged = (original.event_offset_days ?? null) !== (edited.event_offset_days ?? null);
  return {
    action_type: edited.action_type,
    discord_channel_id: edited.discord_channel_id,
    options: edited.options,
    active: edited.active,
    // The edit form only changes event-relative timing. Sending scheduled_at for
    // an unrelated edit would turn an absolute legacy schedule into a new rule.
    ...(offsetChanged && edited.event_offset_days != null ? { event_offset_days: edited.event_offset_days } : {}),
  };
}
