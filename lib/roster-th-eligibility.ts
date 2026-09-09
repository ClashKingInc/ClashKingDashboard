interface Input {
  readonly townhall?: number | null;
  readonly minTownhall?: number | null;
  readonly maxTownhall?: number | null;
  readonly refreshedAt?: string | null;
  readonly now: number;
}
export const ROSTER_ELIGIBILITY_FRESHNESS_MS = 15 * 60 * 1000;
type Eligibility = { readonly status: "unknown" } | { readonly status: "eligible" } | { readonly status: "unrestricted" }
  | { readonly status: "below_minimum" | "above_maximum"; readonly townhall: number; readonly limit: number };

/** Display-only classification of a recent player snapshot against current
 * roster requirements. It never authorizes signup or removes a member.
 */
export function rosterTownhallEligibility(input: Input): Eligibility {
  const { townhall, minTownhall, maxTownhall, refreshedAt, now } = input;
  if (minTownhall == null && maxTownhall == null) return { status: "unrestricted" };
  const positiveInteger = (value: number | null | undefined): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
  if (!positiveInteger(townhall) || minTownhall != null && !positiveInteger(minTownhall)
    || maxTownhall != null && !positiveInteger(maxTownhall)
    || minTownhall != null && maxTownhall != null && minTownhall > maxTownhall) return { status: "unknown" };
  const refreshed = refreshedAt ? Date.parse(refreshedAt) : Number.NaN;
  if (!Number.isFinite(now) || !Number.isFinite(refreshed) || refreshed > now || now - refreshed > ROSTER_ELIGIBILITY_FRESHNESS_MS) return { status: "unknown" };
  if (minTownhall != null && townhall < minTownhall) return { status: "below_minimum", townhall, limit: minTownhall };
  if (maxTownhall != null && townhall > maxTownhall) return { status: "above_maximum", townhall, limit: maxTownhall };
  return { status: "eligible" };
}
