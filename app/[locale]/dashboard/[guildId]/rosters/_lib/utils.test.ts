import { describe, it, expect } from "vitest";
import {
  validatePlayerTag,
  normalizePlayerTag,
  parseBulkTags,
  formatThRestriction,
  buildOffsetSeconds,
  parseOffsetSeconds,
  getColumnLabel,
  getColumnInternal,
  getSortLabel,
  getSortInternal,
  calculateRosterStats,
} from "./utils";

// ─── validatePlayerTag ────────────────────────────────────────────────────────

describe("validatePlayerTag", () => {
  it("accepts valid tags", () => {
    expect(validatePlayerTag("#2PP")).toBe(true);
    expect(validatePlayerTag("#QLVPLQC")).toBe(true);
    expect(validatePlayerTag("#Y0G0GJL")).toBe(true);
  });

  it("rejects tags without #", () => {
    expect(validatePlayerTag("2PP")).toBe(false);
  });

  it("rejects tags with invalid characters", () => {
    expect(validatePlayerTag("#INVALID")).toBe(false);
    expect(validatePlayerTag("#ABC123")).toBe(false);
  });

  it("rejects tags that are too short", () => {
    expect(validatePlayerTag("#PP")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validatePlayerTag("")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(validatePlayerTag("#qlvplqc")).toBe(true);
  });
});

// ─── normalizePlayerTag ───────────────────────────────────────────────────────

describe("normalizePlayerTag", () => {
  it("uppercases the tag", () => {
    expect(normalizePlayerTag("#abc")).toBe("#ABC");
  });

  it("adds # prefix if missing", () => {
    expect(normalizePlayerTag("2PP")).toBe("#2PP");
  });

  it("trims whitespace", () => {
    expect(normalizePlayerTag("  #2PP  ")).toBe("#2PP");
  });

  it("does not double the # prefix", () => {
    expect(normalizePlayerTag("#2PP")).toBe("#2PP");
  });
});

// ─── parseBulkTags ────────────────────────────────────────────────────────────

describe("parseBulkTags", () => {
  it("parses newline-separated tags", () => {
    const { valid, invalid } = parseBulkTags("#2PP\n#QLVPLQC");
    expect(valid).toContain("#2PP");
    expect(valid).toContain("#QLVPLQC");
    expect(invalid).toHaveLength(0);
  });

  it("parses comma-separated tags", () => {
    const { valid } = parseBulkTags("#2PP,#QLVPLQC");
    expect(valid).toHaveLength(2);
  });

  it("adds missing # prefix", () => {
    const { valid } = parseBulkTags("2PP");
    expect(valid).toContain("#2PP");
  });

  it("deduplicates tags", () => {
    const { valid } = parseBulkTags("#2PP\n#2PP");
    expect(valid).toHaveLength(1);
  });

  it("separates invalid tags", () => {
    const { valid, invalid } = parseBulkTags("#2PP\n#BAD!");
    expect(valid).toContain("#2PP");
    expect(invalid).toContain("#BAD!");
  });

  it("handles empty input", () => {
    const { valid, invalid } = parseBulkTags("");
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(0);
  });
});

// ─── formatThRestriction ─────────────────────────────────────────────────────

describe("formatThRestriction", () => {
  it("returns range when min and max differ", () => {
    expect(formatThRestriction(10, 15)).toBe("TH10-15");
  });

  it("returns single level when min equals max", () => {
    expect(formatThRestriction(14, 14)).toBe("TH14");
  });

  it("returns min+ when only min is set", () => {
    expect(formatThRestriction(10, null)).toBe("TH10+");
  });

  it("returns max when only max is set", () => {
    expect(formatThRestriction(null, 15)).toBe("TH15 max");
  });

  it("returns All TH when neither is set", () => {
    expect(formatThRestriction(null, null)).toBe("All TH");
  });
});

// ─── buildOffsetSeconds / parseOffsetSeconds ─────────────────────────────────

describe("buildOffsetSeconds", () => {
  it("returns negative for before", () => {
    expect(buildOffsetSeconds("before", 2, "hours")).toBe(-7200);
  });

  it("returns positive for after", () => {
    expect(buildOffsetSeconds("after", 30, "minutes")).toBe(1800);
  });

  it("handles days", () => {
    expect(buildOffsetSeconds("before", 1, "days")).toBe(-86400);
  });
});

describe("parseOffsetSeconds", () => {
  it("parses negative seconds as before", () => {
    const result = parseOffsetSeconds(-7200);
    expect(result.dir).toBe("before");
    expect(result.val).toBe(2);
    expect(result.unit).toBe("hours");
  });

  it("parses positive seconds as after", () => {
    const result = parseOffsetSeconds(1800);
    expect(result.dir).toBe("after");
    expect(result.val).toBe(30);
    expect(result.unit).toBe("minutes");
  });

  it("parses days correctly", () => {
    const result = parseOffsetSeconds(-86400);
    expect(result.dir).toBe("before");
    expect(result.val).toBe(1);
    expect(result.unit).toBe("days");
  });

  it("is inverse of buildOffsetSeconds", () => {
    const original = buildOffsetSeconds("before", 3, "hours");
    const parsed = parseOffsetSeconds(original);
    expect(parsed.dir).toBe("before");
    expect(parsed.val).toBe(3);
    expect(parsed.unit).toBe("hours");
  });
});

// ─── getColumnLabel / getColumnInternal ──────────────────────────────────────

describe("column helpers", () => {
  it("getColumnLabel maps internal key to display label", () => {
    expect(getColumnLabel("townhall")).toBe("TH");
    expect(getColumnLabel("discord")).toBe("Discord");
    expect(getColumnLabel("hero_lvs")).toBe("Heroes");
  });

  it("getColumnLabel returns the key itself for unknown values", () => {
    expect(getColumnLabel("unknown_key")).toBe("unknown_key");
  });

  it("getColumnInternal maps display name to internal key", () => {
    expect(getColumnInternal("Town Hall")).toBe("townhall");
    expect(getColumnInternal("30 Day Hitrate")).toBe("hitrate");
    expect(getColumnInternal("Clan Tag")).toBe("current_clan_tag");
  });
});

// ─── getSortLabel / getSortInternal ──────────────────────────────────────────

describe("sort helpers", () => {
  it("getSortLabel maps sort key to label", () => {
    expect(getSortLabel("townhall_desc")).toBe("TH ↓");
    expect(getSortLabel("name_asc")).toBe("Name A-Z");
  });

  it("getSortInternal maps label to sort key", () => {
    expect(getSortInternal("TH (High to Low)")).toBe("townhall_desc");
    expect(getSortInternal("Recently Added")).toBe("added_at_desc");
  });
});

// ─── calculateRosterStats ────────────────────────────────────────────────────

describe("calculateRosterStats", () => {
  it("returns zero stats for empty members", () => {
    const stats = calculateRosterStats([]);
    expect(stats.totalMembers).toBe(0);
    expect(stats.avgTh).toBe(0);
  });

  it("calculates average TH correctly", () => {
    const members = [
      { name: "A", tag: "#AAA", townhall: 14 },
      { name: "B", tag: "#BBB", townhall: 16 },
    ];
    const stats = calculateRosterStats(members);
    expect(stats.avgTh).toBe(15);
    expect(stats.totalMembers).toBe(2);
  });

  it("counts subs correctly", () => {
    const members = [
      { name: "A", tag: "#AAA", townhall: 14, sub: true },
      { name: "B", tag: "#BBB", townhall: 14, sub: false },
    ];
    const stats = calculateRosterStats(members);
    expect(stats.subs).toBe(1);
  });

  it("categorises in-clan vs family vs external", () => {
    const members = [
      { name: "A", tag: "#AAA", townhall: 14, current_clan_tag: "#CLAN" },
      { name: "B", tag: "#BBB", townhall: 14, current_clan_tag: "#FAMILY" },
      { name: "C", tag: "#CCC", townhall: 14, current_clan_tag: "#OTHER" },
    ];
    const stats = calculateRosterStats(members, "#CLAN", ["#FAMILY"]);
    expect(stats.inClan).toBe(1);
    expect(stats.inFamily).toBe(1);
    expect(stats.external).toBe(1);
  });

  it("builds TH distribution", () => {
    const members = [
      { name: "A", tag: "#AAA", townhall: 14 },
      { name: "B", tag: "#BBB", townhall: 14 },
      { name: "C", tag: "#CCC", townhall: 16 },
    ];
    const stats = calculateRosterStats(members);
    expect(stats.thDistribution[14]).toBe(2);
    expect(stats.thDistribution[16]).toBe(1);
  });

  it("calculates average hitrate ignoring null values", () => {
    const members = [
      { name: "A", tag: "#AAA", townhall: 14, hitrate: 80 },
      { name: "B", tag: "#BBB", townhall: 14, hitrate: null },
      { name: "C", tag: "#CCC", townhall: 14, hitrate: 60 },
    ];
    const stats = calculateRosterStats(members);
    expect(stats.avgHitrate).toBe(70);
  });
});
