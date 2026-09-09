"use client";

import { AlertCircle, Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { rosterTownhallEligibility } from "@/lib/roster-th-eligibility";

type Props = Parameters<typeof rosterTownhallEligibility>[0];

/** Shared by staff and public viewers; this status never changes membership. */
export function RosterTownhallStatus(props: Props) {
  const t = useTranslations("RostersPage.members");
  const eligibility = rosterTownhallEligibility(props);
  if (eligibility.status === "eligible" || eligibility.status === "unrestricted") return null;
  if (eligibility.status === "unknown") return (
    <span role="note" className="mt-1 inline-flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
      <Clock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {t("thEligibilityUnknown")}
    </span>
  );
  return (
    <Badge role="note" variant="destructive" className="mt-1 gap-1.5 border-0 text-left font-medium leading-relaxed">
      <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {t(eligibility.status === "below_minimum" ? "thBelowMinimum" : "thAboveMaximum", { townhall: eligibility.townhall, limit: eligibility.limit })}
    </Badge>
  );
}
