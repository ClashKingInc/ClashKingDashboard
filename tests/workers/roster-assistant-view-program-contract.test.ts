import { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  firstZodIssueMessage,
  rosterMembersOutputSchema,
  savedViewProgramGuidance,
} from "../../workers/roster-assistant/view-program-contract";

describe("saved roster view program contract", () => {
  it("matches the roster members API response used by computed views", () => {
    expect(rosterMembersOutputSchema.parse({
      rows: [{
        rosterId: "roster-1",
        playerTag: "#PLAYER",
        playerName: "Chief 👑",
        clanName: null,
      }],
    })).toEqual({
      rows: [{
        rosterId: "roster-1",
        playerTag: "#PLAYER",
        playerName: "Chief 👑",
        clanName: null,
      }],
    });
  });

  it("documents isolated computed rows and semantic yellow highlighting", () => {
    expect(savedViewProgramGuidance).toContain("const { rows }");
    expect(savedViewProgramGuidance).toContain('metricId "view.computed"');
    expect(savedViewProgramGuidance).toContain("yellow or gold means the amber tone");
    expect(savedViewProgramGuidance).toContain("cannot use variables from the outer request");
    expect(savedViewProgramGuidance).toContain('Intl.Segmenter with granularity "grapheme"');
  });

  it("reports the invalid field path instead of only the schema message", () => {
    const parsed = z.object({ rows: z.array(z.object({ playerTag: z.string() })) }).safeParse({ rows: [{}] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(firstZodIssueMessage(parsed.error)).toContain("rows.0.playerTag:");
    }
  });
});
