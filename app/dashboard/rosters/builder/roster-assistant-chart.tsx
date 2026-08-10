"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { toBlob } from "html-to-image";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  Scatter,
  ScatterChart,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

export type RosterAssistantChartSpec = {
  title: string;
  description?: string;
  type: "bar" | "line" | "area" | "pie" | "scatter" | "radar" | "treemap";
  orientation?: "vertical" | "horizontal";
  stacked?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxisKey?: string;
  series: Array<{ key: string; label: string }>;
  data: Array<{ label: string; values: Record<string, number> }>;
};

const baseChartColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const;

function chartColor(index: number): string {
  return baseChartColors[index] ?? `oklch(0.68 0.17 ${(index * 47 + 18) % 360})`;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function shortLabel(value: unknown): string {
  const label = String(value ?? "");
  return label.length > 15 ? `${label.slice(0, 14)}…` : label;
}

function numericTick(value: unknown): string {
  if (typeof value !== "number") return String(value ?? "");
  return Intl.NumberFormat(undefined, { notation: Math.abs(value) >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function integerTick(value: unknown): string {
  if (typeof value !== "number") return String(value ?? "");
  return Intl.NumberFormat(undefined, { notation: Math.abs(value) >= 10_000 ? "compact" : "standard", maximumFractionDigits: 0 }).format(Math.round(value));
}

function chartData(spec: RosterAssistantChartSpec): Array<Record<string, string | number>> {
  return spec.data.map((point) => ({ label: point.label, ...point.values }));
}

function axisMaximum(spec: RosterAssistantChartSpec, keys = spec.series.map((series) => series.key)): number {
  const maximum = spec.data.reduce((currentMaximum, point) => {
    const values = keys.map((key) => point.values[key] ?? 0);
    const pointMaximum = spec.stacked
      ? values.reduce((total, value) => total + Math.max(0, value), 0)
      : Math.max(0, ...values);
    return Math.max(currentMaximum, pointMaximum);
  }, 0);
  return Math.max(5, Math.ceil(maximum / 5) * 5);
}

function axisLabel(value: string | undefined, position: "x" | "y") {
  if (!value) return undefined;
  return position === "x"
    ? { value, position: "insideBottom" as const, offset: -24, fill: "var(--color-foreground)", fontSize: 12, fontWeight: 600 }
    : { value, angle: -90, position: "insideLeft" as const, fill: "var(--color-foreground)", fontSize: 12, fontWeight: 600 };
}

export function RosterAssistantChart({ spec }: { readonly spec: RosterAssistantChartSpec }) {
  const reducedMotion = useReducedMotion();
  const figureRef = useRef<HTMLElement | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const gradientId = useId().replaceAll(":", "");
  const data = useMemo(() => chartData(spec), [spec]);
  const config = useMemo<ChartConfig>(() => Object.fromEntries(spec.series.map((series, index) => [
    series.key,
    { label: series.label, color: chartColor(index) },
  ])), [spec.series]);
  const showLegend = spec.series.length > 1;
  const chartHeight = Math.max(280, spec.type === "bar" && spec.orientation === "horizontal" ? spec.data.length * 36 + 64 : 300);
  const yMaximum = axisMaximum(spec);
  const animation = { isAnimationActive: !reducedMotion, animationDuration: 240, animationEasing: "ease-out" as const };
  const copyChart = async () => {
    if (!figureRef.current || copyState === "copying") return;
    setCopyState("copying");
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Image clipboard is unavailable");
      await document.fonts.ready;
      const blob = await toBlob(figureRef.current, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        cacheBust: true,
        pixelRatio: 2,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.chartCopyControl === "true"),
      });
      if (!blob) throw new Error("Chart image could not be created");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1_800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2_400);
    }
  };
  const legend = showLegend && spec.type !== "pie" && spec.type !== "treemap" ? (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-3 text-[11px] font-medium text-muted-foreground">
      {spec.series.map((series, index) => (
        <span key={series.key} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: chartColor(index) }} />
          {series.label}
        </span>
      ))}
    </div>
  ) : null;
  const header = (
    <figcaption className="flex items-center gap-3 border-b border-border/50 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-5 tracking-tight text-foreground">{spec.title}</p>
        {spec.description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{spec.description}</p>}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-chart-copy-control="true"
        className="-mr-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={copyState === "copied" ? "Chart copied" : copyState === "error" ? "Could not copy chart" : "Copy chart as image"}
        title={copyState === "copied" ? "Copied" : copyState === "error" ? "Could not copy chart" : "Copy chart as image"}
        disabled={copyState === "copying"}
        onClick={() => void copyChart()}
      >
        {copyState === "copying" && <Loader2 className="h-4 w-4 animate-spin" />}
        {copyState === "copied" && <Check className="h-4 w-4 text-success" />}
        {(copyState === "idle" || copyState === "error") && <Copy className="h-4 w-4" />}
      </Button>
    </figcaption>
  );

  if (spec.type === "pie" || spec.type === "treemap") {
    const series = spec.series[0];
    const pieData = spec.data.map((point, index) => ({
      label: point.label,
      value: point.values[series.key] ?? 0,
      fill: chartColor(index),
    }));
    const pieConfig: ChartConfig = { value: { label: series.label, color: chartColor(0) } };

    const visualization = spec.type === "pie" ? (
      <PieChart accessibilityLayer>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(value) => (
            <><span className="text-muted-foreground">{series.label}</span><span className="ml-auto font-mono font-medium text-foreground">{numericTick(value)}</span></>
          )} />}
        />
        <Pie data={pieData} dataKey="value" nameKey="label" innerRadius="56%" outerRadius="82%" paddingAngle={2} strokeWidth={0} {...animation}>
          {pieData.map((point) => <Cell key={point.label} fill={point.fill} />)}
        </Pie>
      </PieChart>
    ) : (
      <Treemap
        data={pieData.map((point) => ({ name: point.label, size: point.value, fill: point.fill }))}
        dataKey="size"
        nameKey="name"
        aspectRatio={4 / 3}
        stroke="var(--color-card)"
        {...animation}
      >
        <ChartTooltip
          content={<ChartTooltipContent formatter={(value) => (
            <><span className="text-muted-foreground">{series.label}</span><span className="ml-auto font-mono font-medium text-foreground">{numericTick(value)}</span></>
          )} />}
        />
      </Treemap>
    );

    return (
      <figure ref={figureRef} className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        {header}
        <div className="grid items-center gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.72fr)]">
          <ChartContainer config={pieConfig} className="mx-auto h-[260px] max-w-[320px]">
            {visualization}
          </ChartContainer>
          <div className="grid gap-2 text-xs">
            {pieData.map((point) => (
              <div key={point.label} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: point.fill }} />
                <span className="min-w-0 flex-1 truncate text-muted-foreground" title={point.label}>{point.label}</span>
                <span className="font-mono font-medium tabular-nums text-foreground">{numericTick(point.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </figure>
    );
  }

  const commonTooltip = (
    <ChartTooltip
      cursor={{ fill: "var(--color-muted)", fillOpacity: 0.45 }}
      content={<ChartTooltipContent />}
    />
  );
  const margin = { top: 12, right: 16, bottom: spec.xAxisLabel ? 46 : 12, left: spec.yAxisLabel ? 24 : 4 };
  const categoryTick = { fill: "var(--color-foreground)", fontSize: 12, fontWeight: 500 };
  const valueTick = { fill: "var(--color-muted-foreground)", fontSize: 12, fontWeight: 500 };

  let visualization;
  if (spec.type === "bar" && spec.orientation === "horizontal") {
    visualization = (
      <BarChart data={data} layout="vertical" margin={margin} accessibilityLayer>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" domain={[0, yMaximum]} tickCount={4} allowDecimals={false} tick={valueTick} tickLine={false} axisLine={false} tickFormatter={integerTick} label={axisLabel(spec.xAxisLabel, "x")} />
        <YAxis type="category" dataKey="label" width={112} tick={categoryTick} tickLine={false} axisLine={false} tickMargin={10} tickFormatter={shortLabel} label={axisLabel(spec.yAxisLabel, "y")} />
        {commonTooltip}
        {spec.series.map((series, index) => (
          <Bar key={series.key} dataKey={series.key} fill={`var(--color-${series.key})`} stackId={spec.stacked ? "values" : undefined} radius={spec.stacked ? 0 : [0, 5, 5, 0]} {...animation} />
        ))}
      </BarChart>
    );
  } else if (spec.type === "bar") {
    visualization = (
      <BarChart data={data} margin={margin} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tick={categoryTick} tickLine={false} axisLine={false} tickMargin={12} tickFormatter={shortLabel} label={axisLabel(spec.xAxisLabel, "x")} />
        <YAxis width={48} domain={[0, yMaximum]} tickCount={4} allowDecimals={false} tick={valueTick} tickLine={false} axisLine={false} tickFormatter={integerTick} label={axisLabel(spec.yAxisLabel, "y")} />
        {commonTooltip}
        {spec.series.map((series) => (
          <Bar key={series.key} dataKey={series.key} fill={`var(--color-${series.key})`} stackId={spec.stacked ? "values" : undefined} radius={spec.stacked ? 0 : [5, 5, 0, 0]} {...animation} />
        ))}
      </BarChart>
    );
  } else if (spec.type === "line") {
    visualization = (
      <LineChart data={data} margin={margin} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tick={categoryTick} tickLine={false} axisLine={false} tickMargin={12} tickFormatter={shortLabel} label={axisLabel(spec.xAxisLabel, "x")} />
        <YAxis width={48} domain={[0, yMaximum]} tickCount={4} allowDecimals={false} tick={valueTick} tickLine={false} axisLine={false} tickFormatter={integerTick} label={axisLabel(spec.yAxisLabel, "y")} />
        {commonTooltip}
        {spec.series.map((series) => (
          <Line key={series.key} type="monotone" dataKey={series.key} stroke={`var(--color-${series.key})`} strokeWidth={2.25} dot={data.length <= 16 ? { r: 3, strokeWidth: 0 } : false} activeDot={{ r: 4 }} {...animation} />
        ))}
      </LineChart>
    );
  } else if (spec.type === "area") {
    visualization = (
      <AreaChart data={data} margin={margin} accessibilityLayer>
        <defs>
          {spec.series.map((series, index) => (
            <linearGradient key={series.key} id={`${gradientId}-${series.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor(index)} stopOpacity={0.35} />
              <stop offset="95%" stopColor={chartColor(index)} stopOpacity={0.03} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tick={categoryTick} tickLine={false} axisLine={false} tickMargin={12} tickFormatter={shortLabel} label={axisLabel(spec.xAxisLabel, "x")} />
        <YAxis width={48} domain={[0, yMaximum]} tickCount={4} allowDecimals={false} tick={valueTick} tickLine={false} axisLine={false} tickFormatter={integerTick} label={axisLabel(spec.yAxisLabel, "y")} />
        {commonTooltip}
        {spec.series.map((series) => (
          <Area key={series.key} type="monotone" dataKey={series.key} stroke={`var(--color-${series.key})`} strokeWidth={2} fill={`url(#${gradientId}-${series.key})`} stackId={spec.stacked ? "values" : undefined} {...animation} />
        ))}
      </AreaChart>
    );
  } else if (spec.type === "scatter") {
    const xAxisKey = spec.xAxisKey ?? "x";
    const xMaximum = axisMaximum(spec, [xAxisKey]);
    visualization = (
      <ScatterChart margin={margin} accessibilityLayer>
        <CartesianGrid />
        <XAxis type="number" dataKey="x" name={spec.xAxisLabel ?? xAxisKey} domain={[0, xMaximum]} tickCount={4} allowDecimals={false} tick={valueTick} tickLine={false} axisLine={false} tickFormatter={integerTick} label={axisLabel(spec.xAxisLabel, "x")} />
        <YAxis type="number" dataKey="y" width={48} domain={[0, yMaximum]} tickCount={4} allowDecimals={false} tick={valueTick} tickLine={false} axisLine={false} tickFormatter={integerTick} label={axisLabel(spec.yAxisLabel, "y")} />
        {commonTooltip}
        {spec.series.map((series) => (
          <Scatter
            key={series.key}
            name={series.label}
            data={spec.data.map((point) => ({ label: point.label, x: point.values[xAxisKey], y: point.values[series.key] }))}
            fill={`var(--color-${series.key})`}
            {...animation}
          />
        ))}
      </ScatterChart>
    );
  } else {
    visualization = (
      <RadarChart data={data} outerRadius="72%" accessibilityLayer>
        <PolarGrid stroke="var(--color-border)" />
        <PolarAngleAxis dataKey="label" tick={categoryTick} tickFormatter={shortLabel} />
        <PolarRadiusAxis domain={[0, yMaximum]} tickCount={4} allowDecimals={false} tick={valueTick} tickFormatter={integerTick} axisLine={false} />
        {commonTooltip}
        {spec.series.map((series) => (
          <Radar key={series.key} name={series.label} dataKey={series.key} stroke={`var(--color-${series.key})`} fill={`var(--color-${series.key})`} fillOpacity={0.16} strokeWidth={2} {...animation} />
        ))}
      </RadarChart>
    );
  }

  return (
    <figure ref={figureRef} className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      {header}
      <div className="px-2 pb-4 pt-4 sm:px-4">
        <ChartContainer config={config} style={{ height: chartHeight }}>
          {visualization}
        </ChartContainer>
        {legend}
      </div>
    </figure>
  );
}
