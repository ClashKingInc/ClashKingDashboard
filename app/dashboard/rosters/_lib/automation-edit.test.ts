import { describe, expect, it } from "vitest";
import { automationEditPayload } from "./automation-edit";
import type { RosterAutomation } from "./types";

const legacyRule: RosterAutomation = {
  automation_id: "automation-1",
  server_id: "server-1",
  roster_id: "roster-1",
  action_type: "roster_clear",
  scheduled_at: "2026-10-01T12:00:00.000Z",
  event_offset_days: null,
  active: true,
  executed: false,
};

describe("automationEditPayload", () => {
  it("preserves a legacy absolute schedule during unrelated edits", () => {
    const payload = automationEditPayload(legacyRule, { ...legacyRule, active: false });
    expect(payload).toMatchObject({ action_type: "roster_clear", active: false });
    expect(payload).not.toHaveProperty("scheduled_at");
    expect(payload).not.toHaveProperty("event_offset_days");
  });

  it("sends an event offset only after the operator changes relative timing", () => {
    expect(automationEditPayload(legacyRule, { ...legacyRule, event_offset_days: 0 }))
      .toHaveProperty("event_offset_days", 0);
    const relative = { ...legacyRule, event_offset_days: -2 };
    expect(automationEditPayload(relative, { ...relative, active: false })).not.toHaveProperty("event_offset_days");
    expect(automationEditPayload(relative, { ...relative, event_offset_days: 3 }))
      .toHaveProperty("event_offset_days", 3);
  });
});
