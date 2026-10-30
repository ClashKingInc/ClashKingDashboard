"use client";

import { useLocale, useTranslations } from "use-intl";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import Image from "@/components/app-image";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { contributorCount, farmingGroups, graphNumber, totalLoot, metricColors, resourceArtwork, type AnalyticsReport, type ActivityMetric } from "./analytics-model";

export function FarmingPanel({ data, metric, onMetricChange }: {
  data: AnalyticsReport;
  metric: ActivityMetric;
  onMetricChange: (metric: ActivityMetric) => void;
}) {
  const t = useTranslations("analytics"), locale = useLocale();
  const group = metric === "attacks" ? "attacks" : metric === "donated" || metric === "received" ? "donations" : ["active", "capital", "clanGames", "upgrades"].includes(metric) ? "activity" : "loot";
  const keys = farmingGroups[group];
  const selected = metric === "totalLoot" ? "totalLoot" : keys.find(key => key === metric) ?? keys[0];
  const compact = (value: number) => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 2 }).format(value);
  const number = (value: number) => graphNumber(value, locale);
  const chartMetric = selected === "totalLoot" ? "gold" : selected;
  const chartLabel = selected === "totalLoot" ? t("totalLoot") : t(`metrics.${selected}`);
  const date = (value: string) => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  const options = [
    { key: "loot", label: t("tabs.farming"), metric: "totalLoot" },
    { key: "attacks", label: t("metrics.attacks"), metric: "attacks" },
    { key: "donations", label: t("metrics.donated"), metric: "donated" },
    { key: "activity", label: t("tabs.activity"), metric: "active" },
  ] as const;
  return <section className="min-w-0 rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{t("tabs.farming")}</h2>
      <span className="text-xs text-muted-foreground">{date(data.start)} — {date(new Date(Date.parse(data.end) - 86_400_000).toISOString().slice(0, 10))}</span>
    </div>
    <div className="mb-6 grid grid-cols-1 gap-2 @xl/dashboard:grid-cols-2 @3xl/dashboard:grid-cols-4" role="group" aria-label={t("tabs.farming")}>
      {options.map(option => <Button key={option.key} variant="ghost" aria-pressed={group === option.key}
        onClick={() => onMetricChange(option.metric)}
        className={cn("relative h-12 justify-center gap-3 rounded-2xl bg-muted/35", group === option.key ? "bg-muted text-foreground shadow-sm after:absolute after:bottom-1 after:h-0.5 after:w-7 after:rounded-full after:bg-primary" : "text-muted-foreground")}>
        <Image src={resourceArtwork[option.metric === "totalLoot" ? "gold" : option.metric]!} alt="" width={28} height={28} className="h-7 w-7 object-contain" />{option.label}
      </Button>)}
    </div>
    <div className="grid min-w-0 items-center gap-6 @3xl/dashboard:grid-cols-[minmax(0,0.7fr)_minmax(0,1.6fr)]">
      <div className="min-w-0 space-y-3">
        {group === "loot" && <Button variant="ghost" aria-pressed={selected === "totalLoot"} onClick={() => onMetricChange("totalLoot")} className={cn("w-full justify-start rounded-2xl", selected === "totalLoot" && "bg-muted/45")}>{t("totalLoot")} · {compact(totalLoot(data.totals))}</Button>}
        {keys.map(key => <button key={key} aria-pressed={selected === key} onClick={() => onMetricChange(key)}
          className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected === key ? "bg-muted/45" : "hover:bg-muted/30")}>
          <Image src={resourceArtwork[key]!} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0"><div className="text-3xl font-semibold tabular-nums" title={number(data.totals[key])}>{compact(data.totals[key])}</div><p className="mt-1 text-xs text-muted-foreground">{t(`metrics.${key}`)}</p></div>
        </button>)}
        <p className="px-3 text-sm text-muted-foreground">{t("memberCount", { count: contributorCount(data.players, keys) })}</p>
      </div>
      <div className="min-w-0">
        <ChartContainer config={{ value: { label: chartLabel, color: metricColors[chartMetric] } }} className="h-60 w-full min-w-0">
          <AreaChart accessibilityLayer data={data.days.map(day => ({ day: day.day, value: selected === "totalLoot" ? totalLoot(day.metrics) : day.metrics[selected] }))} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <XAxis dataKey="day" tickFormatter={date} tickLine={false} axisLine={false} minTickGap={40} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={value => date(String(value))} formatter={value => <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1"><span className="text-muted-foreground">{chartLabel}</span><span className="font-semibold tabular-nums">{number(Number(value))}</span></div>} />} />
            <Area type="linear" dataKey="value" stroke={metricColors[chartMetric]} fill={metricColors[chartMetric]} fillOpacity={0.08} strokeWidth={2.5} isAnimationActive={false} />
          </AreaChart>
        </ChartContainer>
        <p className="mt-3 text-xs text-muted-foreground">{t("dailyUtc")}</p>
      </div>
    </div>
  </section>;
}
