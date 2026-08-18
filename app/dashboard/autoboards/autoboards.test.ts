import { describe, expect, it } from "vitest";
import {
  buildAutoboardRequest,
  autoboardArtworkUrl,
  createInitialAutoboardForm,
  parseAutoboardCapabilities,
  validateAutoboardForm,
  type AutoboardBoardTypeCapability,
} from "./autoboards";

const capability: AutoboardBoardTypeCapability = {
  boardType: "registry-board",
  label: "Registry board",
  targetKind: "location",
  minTargets: 1,
  maxTargets: 1,
  allowedScopes: ["family", "custom"],
  allowedModes: ["refresh", "send"],
  refreshInterval: {
    minMinutes: 15,
    maxMinutes: 120,
    defaultMinutes: 30,
  },
  uiCapabilities: ["location-picker"],
};

describe("autoboard contract helpers", () => {
  it("maps board concepts to verified Clash artwork", () => {
    expect(autoboardArtworkUrl("donations", "clan")).toContain("clan_labels/donations.webp");
    expect(autoboardArtworkUrl("legend-leaderboard", "player")).toContain("Icon_HV_League_Legend_3_No_Padding.png");
    expect(autoboardArtworkUrl("clan-info", "clan")).toContain("Clan_Badge_Border_2.png");
    expect(autoboardArtworkUrl("scheduled-summary", "custom")).toContain("bot/icons/clock.png");
  });

  it("parses the exact capability contract and permits an empty registry", () => {
    expect(parseAutoboardCapabilities({ boardTypes: [] })).toEqual({ boardTypes: [] });
    expect(parseAutoboardCapabilities({ boardTypes: [capability] }).boardTypes[0]).toEqual(capability);
    expect(() => parseAutoboardCapabilities({ items: [capability] })).toThrow();
  });

  it("builds a family refresh request with no targets and no send schedule", () => {
    const form = createInitialAutoboardForm(capability);
    form.channelId = "123";
    expect(buildAutoboardRequest(form)).toEqual({
      boardType: "registry-board",
      targetScope: "family",
      targets: [],
      deliveryMode: "refresh",
      channelId: "123",
      threadId: null,
      enabled: true,
      intervalMinutes: 30,
      schedule: null,
    });
  });

  it("builds typed send schedules without a refresh interval or message id", () => {
    const form = createInitialAutoboardForm(capability);
    Object.assign(form, {
      targetScope: "custom",
      targets: [" location:32000007 "],
      deliveryMode: "send",
      channelId: "123",
      threadId: "456",
      scheduleKind: "weekdays",
      weekdays: [5, 1],
    });

    const request = buildAutoboardRequest(form);
    expect(request).toMatchObject({
      targetScope: "custom",
      targets: ["location:32000007"],
      intervalMinutes: null,
      threadId: "456",
      schedule: {
        kind: "weekdays",
        weekdays: [1, 5],
        dayOfMonth: null,
        timeOfDay: "09:00",
      },
    });
    expect(request).not.toHaveProperty("messageId");
  });

  it("enforces registry target cardinality, refresh bounds, and typed schedule selectors", () => {
    const form = createInitialAutoboardForm(capability);
    form.targetScope = "custom";
    form.targets = [];
    form.channelId = "123";
    form.intervalMinutes = "10";
    expect(validateAutoboardForm(form, capability, true).map((issue) => issue.message))
      .toEqual(expect.arrayContaining(["targetCount", "refreshInterval"]));

    form.targets = ["location:32000007"];
    form.deliveryMode = "send";
    form.scheduleKind = "weekdays";
    form.weekdays = [];
    expect(validateAutoboardForm(form, capability, true).map((issue) => issue.message))
      .toContain("weekdays");
  });
});
