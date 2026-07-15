import { describe, it, expect } from "vitest";
import {
  DEFAULT_TOWNHALL_REQUIREMENT_FIELDS,
  createTownhallRequirementRow,
  getChannelTypeToken,
  getTicketDiscordUrl,
  getTranscriptUrl,
  isCategoryChannel,
  isTextLikeChannel,
  normalizeOptionalText,
  normalizePlayerTag,
  normalizeTicketChannels,
  normalizeTicketEmbeds,
  normalizeTownhallRequirementFields,
  pickFirstNonEmptyText,
  stripTrailingSlashes,
  toEmbedDataRecord,
} from "./utils";
import type { OpenTicket } from "@/lib/api/types/tickets";

describe("stripTrailingSlashes", () => {
  it("removes any number of trailing slashes", () => {
    expect(stripTrailingSlashes("https://cdn.clashk.ing///")).toBe("https://cdn.clashk.ing");
    expect(stripTrailingSlashes("no-slash")).toBe("no-slash");
  });
});

describe("channel type helpers", () => {
  it("detects category channels by numeric type or name", () => {
    expect(isCategoryChannel({ id: "1", name: "a", type: 4 })).toBe(true);
    expect(isCategoryChannel({ id: "1", name: "a", type: "GUILD_CATEGORY" })).toBe(true);
    expect(isCategoryChannel({ id: "1", name: "a", type: 0 })).toBe(false);
  });

  it("detects text-like channels including threads and news", () => {
    expect(isTextLikeChannel({ id: "1", name: "a", type: 0 })).toBe(true);
    expect(isTextLikeChannel({ id: "1", name: "a", type: 11 })).toBe(true);
    expect(isTextLikeChannel({ id: "1", name: "a", type: "news" })).toBe(true);
    expect(isTextLikeChannel({ id: "1", name: "a", type: 4 })).toBe(false);
  });

  it("prefers channel_type over type when present", () => {
    const channel = { id: "1", name: "a", type: 0, channel_type: 4 } as never;
    expect(getChannelTypeToken(channel)).toBe("4");
  });
});

describe("normalizeTicketChannels", () => {
  it("unwraps channels arrays and falls back to items/results", () => {
    const channels = [{ id: "1", name: "general", type: "0" }];
    expect(normalizeTicketChannels({ channels })).toHaveLength(1);
    expect(normalizeTicketChannels({ items: channels })).toHaveLength(1);
    expect(normalizeTicketChannels({ results: channels })).toHaveLength(1);
    expect(normalizeTicketChannels(null)).toEqual([]);
  });
});

describe("normalizeTicketEmbeds", () => {
  it("accepts plain arrays and items wrappers", () => {
    const embeds = [{ name: "welcome" }];
    expect(normalizeTicketEmbeds(embeds)).toHaveLength(1);
    expect(normalizeTicketEmbeds({ items: embeds })).toHaveLength(1);
    expect(normalizeTicketEmbeds({ data: { items: embeds } })).toHaveLength(1);
    expect(normalizeTicketEmbeds("nope")).toEqual([]);
  });
});

describe("toEmbedDataRecord", () => {
  it("parses JSON strings and passes through objects", () => {
    expect(toEmbedDataRecord('{"title":"hi"}')).toEqual({ title: "hi" });
    expect(toEmbedDataRecord({ title: "hi" })).toEqual({ title: "hi" });
    expect(toEmbedDataRecord("not json")).toBeNull();
    expect(toEmbedDataRecord(null)).toBeNull();
  });
});

describe("ticket URLs", () => {
  const ticket = { server: "123", channel: "456" } as unknown as OpenTicket;

  it("builds the Discord channel URL", () => {
    expect(getTicketDiscordUrl(ticket)).toBe("https://discord.com/channels/123/456");
  });

  it("builds the transcript URL", () => {
    expect(getTranscriptUrl(ticket)).toContain("/transcript-456.html");
  });
});

describe("text helpers", () => {
  it("normalizes optional text to trimmed non-empty strings or null", () => {
    expect(normalizeOptionalText("  hi  ")).toBe("hi");
    expect(normalizeOptionalText("   ")).toBeNull();
    expect(normalizeOptionalText(undefined)).toBeNull();
  });

  it("picks the first non-empty text", () => {
    expect(pickFirstNonEmptyText(null, "  ", "a", "b")).toBe("a");
    expect(pickFirstNonEmptyText(null, undefined)).toBeNull();
  });
});

describe("normalizePlayerTag", () => {
  it("upper-cases and ensures a single # prefix", () => {
    expect(normalizePlayerTag(" #abc123 ")).toBe("#ABC123");
    expect(normalizePlayerTag("abc123")).toBe("#ABC123");
  });
});

describe("townhall requirements", () => {
  it("falls back to the default fields when empty", () => {
    expect(normalizeTownhallRequirementFields(null)).toEqual(DEFAULT_TOWNHALL_REQUIREMENT_FIELDS);
    expect(normalizeTownhallRequirementFields(["", " "])).toEqual(DEFAULT_TOWNHALL_REQUIREMENT_FIELDS);
    expect(normalizeTownhallRequirementFields(["BK"])).toEqual(["BK"]);
  });

  it("creates a requirement row with all fields at 0", () => {
    expect(createTownhallRequirementRow("15", ["BK", "AQ"])).toEqual({ TH: 15, BK: 0, AQ: 0 });
  });
});
