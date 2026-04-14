"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { ServersHeader } from "@/components/servers-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api/client";
import type { UserInfo } from "@/lib/api/types/auth";
import type {
  EndpointBreakdownWindow,
  ProxyStatsQuery,
  StatsLookback,
  StatsResponse,
  StatsSeriesInterval,
  StatsWindow,
} from "@/lib/api/types/internal-stats";
import { logout } from "@/lib/auth/logout";
import { isDeveloperUserId } from "@/lib/internal/developer-access";

const DEFAULT_QUERY: ProxyStatsQuery = {
  series: "5m",
  lookback: "24h",
  endpoints: "24h",
  limit: 25,
};

const LIVE_QUERY: ProxyStatsQuery = {
  series: "1m",
  lookback: "1h",
  endpoints: "24h",
  limit: 25,
};

const SERIES_OPTIONS: StatsSeriesInterval[] = ["1m", "5m", "15m", "30m", "1h"];
const LOOKBACK_OPTIONS: StatsLookback[] = ["1h", "6h", "12h", "24h", "48h"];
const ENDPOINT_WINDOW_OPTIONS: EndpointBreakdownWindow[] = ["24h", "7d"];
const WINDOW_ORDER = ["10s", "1m", "5m", "15m", "1h", "6h", "12h", "24h"];
const DEFAULT_REFRESH_MS = 60000;
const LIVE_REFRESH_MS = 10000;
const LOADING_CARD_KEYS = [
  "requests",
  "avg-rps",
  "latency",
  "server-errors",
  "proxy-failures",
] as const;
const WINDOW_SKELETON_KEYS = ["w1", "w2", "w3", "w4", "w5", "w6"] as const;
const ENDPOINT_SKELETON_KEYS = ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"] as const;

const trafficChartConfig = {
  requests: {
    label: "Requests",
    color: "var(--color-chart-4)",
  },
} satisfies ChartConfig;

const latencyChartConfig = {
  latency: {
    label: "Latency",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig;

const errorChartConfig = {
  errors4xx: {
    label: "4xx",
    color: "var(--color-chart-4)",
  },
  errors5xx: {
    label: "5xx",
    color: "var(--color-chart-5)",
  },
  proxyFailures: {
    label: "Proxy failures",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

function parseStoredUser(): UserInfo | null {
  const rawUser = globalThis.localStorage.getItem("user");
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as UserInfo;
  } catch (error) {
    console.error("Failed to parse user from localStorage", error);
    return null;
  }
}

function durationToMinutes(value: string): number {
  if (value.endsWith("m")) {
    return Number.parseInt(value.slice(0, -1), 10);
  }

  if (value.endsWith("h")) {
    return Number.parseInt(value.slice(0, -1), 10) * 60;
  }

  if (value.endsWith("d")) {
    return Number.parseInt(value.slice(0, -1), 10) * 24 * 60;
  }

  return 0;
}

function isDivisibleLookback(series: StatsSeriesInterval, lookback: StatsLookback): boolean {
  const seriesMinutes = durationToMinutes(series);
  const lookbackMinutes = durationToMinutes(lookback);

  return seriesMinutes > 0 && lookbackMinutes > 0 && lookbackMinutes % seriesMinutes === 0;
}

function formatInteger(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatLatency(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "—";
  }

  return `${formatDecimal(value, 1)} ms`;
}

function normalizeTooltipNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatAxisLabel(value: string, interval: StatsSeriesInterval | undefined): string {
  const date = new Date(value);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: interval === "1h" ? "short" : undefined,
    day: interval === "1h" ? "numeric" : undefined,
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getWindowValue(stats: StatsResponse | null, windowKey: string): StatsWindow | null {
  return stats?.windows?.[windowKey] ?? null;
}

function getTooltipFullLabel(payload: unknown, fallback: React.ReactNode): React.ReactNode {
  if (!Array.isArray(payload) || payload.length === 0) {
    return fallback;
  }

  const firstPayload = payload[0] as { payload?: { fullLabel?: React.ReactNode } };
  return firstPayload.payload?.fullLabel ?? fallback;
}

function formatCompactAxisNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRequestsTooltipValue(value: unknown): React.ReactNode {
  return (
    <>
      <span className="text-muted-foreground">Requests</span>
      <span className="ml-auto font-mono font-medium text-foreground">
        {formatInteger(normalizeTooltipNumber(value))}
      </span>
    </>
  );
}

function formatLatencyTooltipValue(value: unknown): React.ReactNode {
  return (
    <>
      <span className="text-muted-foreground">Latency</span>
      <span className="ml-auto font-mono font-medium text-foreground">
        {formatLatency(normalizeTooltipNumber(value))}
      </span>
    </>
  );
}

function LoadingCards() {
  return (
    <>
      {LOADING_CARD_KEYS.map((key) => (
        <Card key={`internal-loading-card-${key}`} className="border-border bg-card/95">
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

type SummaryCard = {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type SeriesPoint = {
  label: string;
  fullLabel: string;
  requests: number;
  latency: number | null;
  errors4xx: number;
  errors5xx: number;
  proxyFailures: number;
};

type InternalMetricsSectionsProps = {
  hasSeriesData: boolean;
  isLoading: boolean;
  oneMinuteWindow: StatsWindow | null;
  seriesPoints: SeriesPoint[];
  summaryCards: SummaryCard[];
  stats: StatsResponse | null;
};

function InternalMetricsSections({
  hasSeriesData,
  isLoading,
  oneMinuteWindow,
  seriesPoints,
  summaryCards,
  stats,
}: InternalMetricsSectionsProps) {
  const endpointRows = stats?.endpoint_breakdown?.endpoints ?? [];
  const hasEndpointRows = endpointRows.length > 0;

  let endpointContent: React.ReactNode;
  if (isLoading && !stats) {
    endpointContent = (
      <div className="space-y-3">
        {ENDPOINT_SKELETON_KEYS.map((key) => (
          <Skeleton key={`endpoint-skeleton-${key}`} className="h-10 w-full" />
        ))}
      </div>
    );
  } else if (hasEndpointRows) {
    endpointContent = (
      <div className="space-y-2">
        {endpointRows.map((endpoint) => (
          <div
            key={endpoint.endpoint}
            className="grid grid-cols-[minmax(0,1fr)_72px] items-start gap-3 rounded-xl border border-border bg-background/60 px-4 py-3"
          >
            <p className="break-words font-mono text-xs text-foreground sm:text-sm">
              {endpoint.endpoint}
            </p>
            <p className="text-right text-sm font-semibold text-foreground">
              {formatInteger(endpoint.requests)}
            </p>
          </div>
        ))}
      </div>
    );
  } else {
    endpointContent = (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        No endpoint breakdown returned for the current query.
      </div>
    );
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {isLoading && !stats ? (
          <LoadingCards />
        ) : (
          summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <Card key={card.title} className="border-border bg-card/95">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </div>
                  <div className="rounded-full bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tracking-tight text-foreground">{card.value}</div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="border-border bg-card/95">
          <CardHeader>
            <CardTitle>Summary Windows</CardTitle>
            <CardDescription>Rolling request, latency, and error windows always returned by the stats API.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !stats ? (
              <div className="space-y-3">
                {WINDOW_SKELETON_KEYS.map((key) => (
                  <Skeleton key={`window-skeleton-${key}`} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="hidden grid-cols-[96px_repeat(6,minmax(0,1fr))] gap-3 border-b border-border pb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground lg:grid">
                  <div>Window</div>
                  <div className="text-right">Requests</div>
                  <div className="text-right">Avg RPS</div>
                  <div className="text-right">Latency</div>
                  <div className="text-right">4xx</div>
                  <div className="text-right">5xx</div>
                  <div className="text-right">Proxy Failures</div>
                </div>
                {WINDOW_ORDER.map((windowKey) => {
                  const windowStats = getWindowValue(stats, windowKey);

                  return (
                    <div
                      key={windowKey}
                      className="rounded-xl border border-border bg-background/60 p-4"
                    >
                      <div className="grid gap-3 lg:grid-cols-[96px_repeat(6,minmax(0,1fr))] lg:items-center">
                        <div className="text-sm font-semibold text-foreground">{windowKey}</div>
                        <div className="grid grid-cols-2 gap-3 text-sm lg:contents">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground lg:hidden">Requests</p>
                            <p className="text-right text-foreground">{formatInteger(windowStats?.requests)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground lg:hidden">Avg RPS</p>
                            <p className="text-right text-foreground">{formatDecimal(windowStats?.avg_rps, 2)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground lg:hidden">Latency</p>
                            <p className="text-right text-foreground">{formatLatency(windowStats?.avg_latency_ms)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground lg:hidden">4xx</p>
                            <p className="text-right text-foreground">{formatInteger(windowStats?.status_counts["4xx"])}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground lg:hidden">5xx</p>
                            <p className="text-right text-foreground">{formatInteger(windowStats?.status_counts["5xx"])}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground lg:hidden">Proxy Failures</p>
                            <p className="text-right text-foreground">{formatInteger(windowStats?.proxy_failures)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/95">
          <CardHeader>
            <CardTitle>Request Mix</CardTitle>
            <CardDescription>Current one minute HTTP class totals and proxy failure count.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "2xx", value: oneMinuteWindow?.status_counts["2xx"], tone: "text-emerald-500" },
              { label: "3xx", value: oneMinuteWindow?.status_counts["3xx"], tone: "text-sky-500" },
              { label: "4xx", value: oneMinuteWindow?.status_counts["4xx"], tone: "text-amber-500" },
              { label: "5xx", value: oneMinuteWindow?.status_counts["5xx"], tone: "text-rose-500" },
              { label: "Proxy failures", value: oneMinuteWindow?.proxy_failures, tone: "text-violet-500" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                <p className={`mt-3 text-3xl font-semibold ${item.tone}`}>{formatInteger(item.value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border bg-card/95">
          <CardHeader>
            <CardTitle>Traffic</CardTitle>
            <CardDescription>Request volume from <code>series_data.points[].requests</code>.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasSeriesData ? (
              <ChartContainer config={trafficChartConfig} className="h-[320px] w-full">
                <AreaChart accessibilityLayer data={seriesPoints} margin={{ left: 4, right: 12, top: 8 }}>
                  <defs>
                    <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-requests)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-requests)" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={56} tickFormatter={formatCompactAxisNumber} />
                  <ChartTooltip
                    cursor={false}
                    content={(
                      <ChartTooltipContent
                        formatter={formatRequestsTooltipValue}
                        labelFormatter={(label, payload) => getTooltipFullLabel(payload, label)}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="var(--color-requests)"
                    fill="url(#trafficFill)"
                    strokeWidth={2}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                No series data returned for the current query.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/95">
          <CardHeader>
            <CardTitle>Latency</CardTitle>
            <CardDescription>Average latency from <code>series_data.points[].avg_latency_ms</code>.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasSeriesData ? (
              <ChartContainer config={latencyChartConfig} className="h-[320px] w-full">
                <AreaChart accessibilityLayer data={seriesPoints} margin={{ left: 4, right: 12, top: 8 }}>
                  <defs>
                    <linearGradient id="latencyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-latency)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-latency)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={56} tickFormatter={formatCompactAxisNumber} />
                  <ChartTooltip
                    cursor={false}
                    content={(
                      <ChartTooltipContent
                        formatter={formatLatencyTooltipValue}
                        labelFormatter={(label, payload) => getTooltipFullLabel(payload, label)}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="var(--color-latency)"
                    fill="url(#latencyFill)"
                    strokeWidth={2}
                    connectNulls={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                No series data returned for the current query.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="border-border bg-card/95">
          <CardHeader>
            <CardTitle>Error Profile</CardTitle>
            <CardDescription>
              Stacked 4xx and 5xx counts with proxy failures overlaid from the selected series query.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasSeriesData ? (
              <ChartContainer config={errorChartConfig} className="h-[340px] w-full">
                <ComposedChart accessibilityLayer data={seriesPoints} margin={{ left: 4, right: 12, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={56} tickFormatter={formatCompactAxisNumber} />
                  <ChartTooltip
                    content={(
                      <ChartTooltipContent
                        labelFormatter={(label, payload) => getTooltipFullLabel(payload, label)}
                      />
                    )}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="errors4xx" stackId="errors" fill="var(--color-errors4xx)" name="errors4xx" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="errors5xx" stackId="errors" fill="var(--color-errors5xx)" name="errors5xx" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="proxyFailures"
                    stroke="var(--color-proxyFailures)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="proxyFailures"
                  />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <div className="flex min-h-[340px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                No series data returned for the current query.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/95">
          <CardHeader>
            <CardTitle>Normalized Top Endpoints</CardTitle>
            <CardDescription>
              Normalized endpoint counts from <code>endpoint_breakdown.endpoints</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>{endpointContent}</CardContent>
        </Card>
      </section>
    </>
  );
}

export function InternalDashboard() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const [query, setQuery] = useState<ProxyStatsQuery>(DEFAULT_QUERY);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [storedUser, setStoredUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [liveMode, setLiveMode] = useState(false);
  const hasLoadedStatsRef = useRef(false);
  const seriesSelectId = "internal-series";
  const lookbackSelectId = "internal-lookback";
  const endpointWindowSelectId = "internal-endpoints-window";
  const endpointLimitId = "internal-endpoint-limit";

  useEffect(() => {
    const accessToken = globalThis.localStorage.getItem("access_token");
    if (!accessToken) {
      router.push(`/${locale}/login`);
      return;
    }

    setStoredUser(parseStoredUser());
  }, [locale, router]);

  useEffect(() => {
    const intervalId = globalThis.setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, liveMode ? LIVE_REFRESH_MS : DEFAULT_REFRESH_MS);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [liveMode]);

  useEffect(() => {
    const accessToken = globalThis.localStorage.getItem("access_token");
    if (!accessToken) {
      return;
    }

    const user = parseStoredUser();
    if (user) {
      setStoredUser(user);
      if (!isDeveloperUserId(user.user_id)) {
        setIsForbidden(true);
        setIsLoading(false);
        setIsRefreshing(false);
        setError(null);
        setStats(null);
        return;
      }
    }

    let isCancelled = false;

    const loadStats = async () => {
      if (!isCancelled) {
        setError(null);
        setIsForbidden(false);
        setIsLoading(!hasLoadedStatsRef.current);
        setIsRefreshing(hasLoadedStatsRef.current);
      }

      const response = await apiClient.servers.getProxyStats(query);

      if (isCancelled) {
        return;
      }

      if (response.status === 401) {
        logout();
        router.push(`/${locale}/login`);
        return;
      }

      if (response.status === 403) {
        setIsForbidden(true);
        setStats(null);
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (response.error || !response.data) {
        setError(response.error || "Failed to load proxy stats");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      hasLoadedStatsRef.current = true;
      setStats(response.data);
      setIsLoading(false);
      setIsRefreshing(false);
    };

    loadStats();

    return () => {
      isCancelled = true;
    };
  }, [locale, query, refreshTick, router]);

  const validLookbacks = LOOKBACK_OPTIONS.filter((value) =>
    isDivisibleLookback((query.series ?? DEFAULT_QUERY.series) as StatsSeriesInterval, value)
  );

  const oneMinuteWindow = getWindowValue(stats, "1m");
  const seriesPoints = useMemo(() => {
    return (stats?.series_data?.points ?? []).map((point) => ({
      label: formatAxisLabel(point.start, stats?.series_data?.interval),
      fullLabel: formatDateTime(point.start),
      requests: point.requests,
      latency: point.avg_latency_ms,
      errors4xx: point.status_counts["4xx"],
      errors5xx: point.status_counts["5xx"],
      proxyFailures: point.proxy_failures,
    }));
  }, [stats?.series_data?.interval, stats?.series_data?.points]);

  const hasSeriesData = seriesPoints.length > 0;

  const summaryCards = [
    {
      title: "1m requests",
      value: formatInteger(oneMinuteWindow?.requests),
      description: "Rolling one minute volume",
      icon: BarChart3,
    },
    {
      title: "1m avg_rps",
      value: typeof oneMinuteWindow?.avg_rps === "number" ? formatDecimal(oneMinuteWindow.avg_rps, 2) : "—",
      description: "Average requests per second",
      icon: Activity,
    },
    {
      title: "1m avg_latency_ms",
      value: formatLatency(oneMinuteWindow?.avg_latency_ms),
      description: "Average latency across the window",
      icon: Clock3,
    },
    {
      title: "1m 5xx",
      value: formatInteger(oneMinuteWindow?.status_counts["5xx"]),
      description: "Server-side error count",
      icon: ShieldAlert,
    },
    {
      title: "1m proxy_failures",
      value: formatInteger(oneMinuteWindow?.proxy_failures),
      description: "Upstream/internal failures",
      icon: Workflow,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ServersHeader />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-8 pt-24 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/95 p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Internal Proxy Dashboard</h1>
                <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Developer Only</Badge>
                {storedUser && isDeveloperUserId(storedUser.user_id) ? (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
                    Access granted for {storedUser.username}
                  </Badge>
                ) : null}
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Live operational view of the ClashKing proxy at <span className="font-medium text-foreground">proxy.clashk.ing</span>.
                This page reads rolling windows, time series, and normalized endpoint volume from the internal stats endpoint.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setLiveMode(false);
                  setQuery(DEFAULT_QUERY);
                }}
                className="border-border"
              >
                Default 24h
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setLiveMode(true);
                  setQuery(LIVE_QUERY);
                }}
                className="border-border"
              >
                Live 1h
              </Button>
              <Button
                onClick={() => setRefreshTick((value) => value + 1)}
                className="min-w-28"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label htmlFor={seriesSelectId} className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Series
              </label>
              <Select
                value={query.series}
                onValueChange={(value) => {
                  const nextSeries = value as StatsSeriesInterval;
                  const nextLookback = isDivisibleLookback(nextSeries, query.lookback as StatsLookback)
                    ? query.lookback
                    : LOOKBACK_OPTIONS.find((option) => isDivisibleLookback(nextSeries, option)) ?? DEFAULT_QUERY.lookback;

                  setQuery((current) => ({
                    ...current,
                    series: nextSeries,
                    lookback: nextLookback,
                  }));
                }}
              >
                <SelectTrigger id={seriesSelectId} className="border-border bg-background">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  {SERIES_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor={lookbackSelectId} className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Lookback
              </label>
              <Select
                value={query.lookback}
                onValueChange={(value) =>
                  setQuery((current) => ({ ...current, lookback: value as StatsLookback }))
                }
              >
                <SelectTrigger id={lookbackSelectId} className="border-border bg-background">
                  <SelectValue placeholder="Select lookback" />
                </SelectTrigger>
                <SelectContent>
                  {validLookbacks.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor={endpointWindowSelectId} className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Endpoints Window
              </label>
              <Select
                value={query.endpoints}
                onValueChange={(value) =>
                  setQuery((current) => ({ ...current, endpoints: value as EndpointBreakdownWindow }))
                }
              >
                <SelectTrigger id={endpointWindowSelectId} className="border-border bg-background">
                  <SelectValue placeholder="Select window" />
                </SelectTrigger>
                <SelectContent>
                  {ENDPOINT_WINDOW_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor={endpointLimitId} className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Endpoint Limit
              </label>
              <Input
                id={endpointLimitId}
                type="number"
                min={1}
                max={100}
                value={query.limit ?? DEFAULT_QUERY.limit}
                onChange={(event) => {
                  const nextLimit = Number.parseInt(event.target.value, 10);
                  setQuery((current) => ({
                    ...current,
                    limit: Number.isFinite(nextLimit) ? Math.min(100, Math.max(1, nextLimit)) : DEFAULT_QUERY.limit,
                  }));
                }}
                className="border-border bg-background"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
              <Switch
                checked={liveMode}
                onCheckedChange={setLiveMode}
                aria-label="Enable live mode"
              />
              <span>
                Live mode {liveMode ? `on, refresh every ${LIVE_REFRESH_MS / 1000}s` : `off, refresh every ${DEFAULT_REFRESH_MS / 1000}s`}
              </span>
            </div>
            {stats?.now ? <span>Last payload time: {formatDateTime(stats.now)}</span> : null}
            {stats?.series_data ? (
              <span>
                Series: {stats.series_data.interval} over {stats.series_data.lookback}
              </span>
            ) : null}
          </div>
        </div>

        {isForbidden ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access denied</AlertTitle>
            <AlertDescription>
              This internal dashboard is restricted to the two approved developer Discord accounts.
            </AlertDescription>
          </Alert>
        ) : null}

        {!isForbidden && error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed to load stats</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => setRefreshTick((value) => value + 1)}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {isForbidden ? null : (
          <InternalMetricsSections
            hasSeriesData={hasSeriesData}
            isLoading={isLoading}
            oneMinuteWindow={oneMinuteWindow}
            seriesPoints={seriesPoints}
            summaryCards={summaryCards}
            stats={stats}
          />
        )}
      </div>
    </div>
  );
}
