"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { apiClient } from "@/lib/api/client";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SUPPORT_DISCORD_URL } from "@/lib/support";

export function ResourceLimits({ serverId }: { readonly serverId: string }) {
  const t = useTranslations("ManualLimits");
  const common = useTranslations("Common");
  const limits = useQuery({
    queryKey: dashboardQueryKeys.route("resource-limits", serverId),
    enabled: Boolean(serverId),
    queryFn: async () => {
      const result = await apiClient.servers.getResourceLimits(serverId);
      if (result.error || !result.data) throw new Error(result.error ?? t("title"));
      return result.data;
    },
  });

  return <section className="min-w-0 space-y-4" aria-labelledby="server-limits-title">
    <h2 id="server-limits-title" className="text-lg font-semibold">{t("title")}</h2>
    {limits.isPending ? <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-28 rounded-3xl" /></div>
      : limits.isError ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>{limits.error.message}</p><Button variant="secondary" onClick={() => void limits.refetch()}>{common("retry")}</Button></div>
      : <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
        <Limit label={t("autoboards")} current={limits.data.autoboardCount} maximum={limits.data.autoboardLimit} value={`${limits.data.autoboardCount} / ${limits.data.autoboardLimit}`} />
        <Limit label={t("ai")} current={limits.data.aiSpentUsd} maximum={limits.data.aiMonthlyLimitUsd} value={`$${limits.data.aiSpentUsd.toFixed(4)} / $${limits.data.aiMonthlyLimitUsd.toFixed(2)}`} detail={t("reserved", { amount: limits.data.aiReservedUsd.toFixed(4) })} />
      </dl>}
    <p className="text-sm text-muted-foreground">{t("raise")} <a className="font-medium text-primary underline underline-offset-4" href={SUPPORT_DISCORD_URL} target="_blank" rel="noopener noreferrer">{t("discord")}</a></p>
  </section>;
}

function Limit({ label, current, maximum, value, detail }: { readonly label: string; readonly current: number; readonly maximum: number; readonly value: string; readonly detail?: string }) {
  const progress = maximum > 0 ? Math.min(100, Math.max(0, current / maximum * 100)) : null;
  return <div className="min-w-0 space-y-3 rounded-3xl bg-card p-4 shadow-sm shadow-black/5 sm:p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><dt className="text-sm font-medium">{label}</dt><dd className="break-words text-sm font-semibold tabular-nums">{value}</dd></div>
    {progress !== null && <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>}
    {detail && <dd className="text-xs leading-relaxed text-muted-foreground">{detail}</dd>}
  </div>;
}
