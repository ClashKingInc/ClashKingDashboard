export type StatusCounts = {
  "2xx": number;
  "3xx": number;
  "4xx": number;
  "5xx": number;
};

export type StatsWindow = {
  requests: number;
  avg_rps: number;
  avg_latency_ms: number | null;
  status_counts: StatusCounts;
  proxy_failures: number;
};

export type SeriesPoint = {
  start: string;
  end: string;
  requests: number;
  avg_latency_ms: number | null;
  status_counts: StatusCounts;
  proxy_failures: number;
};

export type StatsSeriesInterval = "1m" | "5m" | "15m" | "30m" | "1h";

export type StatsLookback = "1h" | "6h" | "12h" | "24h" | "48h";

export type StatsSeries = {
  interval: StatsSeriesInterval;
  lookback: StatsLookback;
  points: SeriesPoint[];
};

export type EndpointCount = {
  endpoint: string;
  requests: number;
};

export type EndpointBreakdownWindow = "24h" | "7d";

export type EndpointBreakdown = {
  window: EndpointBreakdownWindow;
  limit: number;
  endpoints: EndpointCount[];
};

export type StatsResponse = {
  now: string;
  windows: Record<string, StatsWindow>;
  series_data?: StatsSeries;
  endpoint_breakdown?: EndpointBreakdown;
};

export type ProxyStatsQuery = {
  series?: StatsSeriesInterval;
  lookback?: StatsLookback;
  endpoints?: EndpointBreakdownWindow;
  limit?: number;
};
