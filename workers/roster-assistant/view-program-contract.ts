import { z } from "zod";

export const rosterMemberFieldNames = [
  "playerName",
  "playerTag",
  "townhall",
  "trophies",
  "clanName",
  "clanTag",
  "leagueId",
  "leagueName",
  "heroLevelSum",
  "maxPercent",
  "warPreference",
  "lastOnline",
  "discordUsername",
  "signupAnswers",
] as const;

export const rosterMemberFieldsSchema = z.array(z.enum(rosterMemberFieldNames)).min(1).max(16);

export const rosterMembersOutputSchema = z.object({
  rows: z.array(z.object({
    rosterId: z.string(),
    playerTag: z.string(),
    playerName: z.string().optional(),
    townhall: z.number().int().nullable().optional(),
    trophies: z.number().int().nullable().optional(),
    clanName: z.string().nullable().optional(),
    clanTag: z.string().nullable().optional(),
    leagueId: z.number().int().nullable().optional(),
    leagueName: z.string().nullable().optional(),
    heroLevelSum: z.number().int().nullable().optional(),
    maxPercent: z.number().nullable().optional(),
    warPreference: z.boolean().nullable().optional(),
    lastOnline: z.string().nullable().optional(),
    discordUsername: z.string().nullable().optional(),
    signupAnswers: z.record(z.string(), z.unknown()).nullable().optional(),
  })),
});

export const savedViewProgramGuidance = [
  "The source runs later in an isolated worker and cannot use variables from the outer request, including rosterIds or selectedRosterIds.",
  "It must be one async arrow function and read the current selection inside that function.",
  'For computed views, use exactly this data shape: const { rows } = await codemode.getRosterMembers({ fields: ["playerName"] }); rows is an array whose records always have rosterId and playerTag, plus only the requested fields.',
  "Return { name, columns, rows, filters, sort, highlights, limit }.",
  "Each returned row must be { rosterId: member.rosterId, playerTag: member.playerTag, values: { ... } }.",
  'Use metricId "view.computed" for a novel calculated column.',
  'Example structure: async () => { const { rows } = await codemode.getRosterMembers({ fields: ["playerName"] }); return { name: "Player name lengths", columns: [{ id: "player_name", label: "Player", metricId: "player.name", format: "player" }, { id: "name_length", label: "Name length", metricId: "view.computed", format: "number" }], rows: rows.map((member) => { const playerName = member.playerName ?? member.playerTag; return { rosterId: member.rosterId, playerTag: member.playerTag, values: { player_name: playerName, name_length: [...playerName].length } }; }), filters: [], sort: [], highlights: [{ id: "long_name", target: "row", when: { columnId: "name_length", operator: "gt", value: 15 }, tone: "amber" }], limit: null }; }.',
  'For an emoji count, count grapheme clusters rather than UTF-16 characters: create an Intl.Segmenter with granularity "grapheme", then count segments matching /\\p{Extended_Pictographic}|\\p{Regional_Indicator}|[0-9#*]\\uFE0F?\\u20E3/u.',
  "Use a semantic highlights rule for a requested threshold; yellow or gold means the amber tone.",
].join(" ");

export function firstZodIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "unknown error";
  const path = issue.path.length > 0 ? issue.path.join(".") : "result";
  return `${path}: ${issue.message}`;
}
