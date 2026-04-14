"use client";

import * as React from "react";
import {
  Legend as RechartsLegend,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    color?: string;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("Chart components must be used within a ChartContainer.");
  }

  return context;
}

function getPayloadKey(payload: Record<string, unknown>): string | null {
  const dataKey = payload.dataKey;
  if (typeof dataKey === "string") {
    return dataKey;
  }

  const name = payload.name;
  if (typeof name === "string") {
    return name;
  }

  return null;
}

function getPayloadLabel(
  item: Record<string, unknown>,
  itemConfig: ChartConfig[string] | undefined,
  key: string | null
): React.ReactNode {
  if (itemConfig?.label) {
    return itemConfig.label;
  }

  if (typeof item.name === "string" || typeof item.name === "number") {
    return item.name;
  }

  return key ?? "Value";
}

export function ChartContainer({
  children,
  config,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
}) {
  const chartId = React.useId();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  const style = React.useMemo(() => {
    return Object.entries(config).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value.color) {
        acc[`--color-${key}`] = value.color;
      }
      return acc;
    }, {});
  }, [config]);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect();
      const roundedWidth = Math.max(0, Math.floor(width));
      const roundedHeight = Math.max(0, Math.floor(height));

      setSize((current) => {
        if (current.width === roundedWidth && current.height === roundedHeight) {
          return current;
        }

        return { width: roundedWidth, height: roundedHeight };
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const hasValidSize = size.width > 0 && size.height > 0;
  const chartWidth = Math.max(1, size.width);
  const chartHeight = Math.max(220, size.height);
  const chartChild = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      width: chartWidth,
      height: chartHeight,
    })
    : children;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={containerRef}
        data-chart={chartId}
        className={cn(
          "min-h-[220px] min-w-0 w-full",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line]:stroke-border/60",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-layer]:outline-none",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-accent/50",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          className
        )}
        style={style}
        {...props}
      >
        {hasValidSize ? (
          chartChild
        ) : (
          <div aria-hidden className="h-full w-full" />
        )}
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsTooltip;
export const ChartLegend = RechartsLegend;

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  className,
  hideLabel = false,
}: React.ComponentProps<"div"> & {
  active?: boolean;
  payload?: Array<Record<string, unknown>>;
  label?: React.ReactNode;
  labelFormatter?: (label: React.ReactNode, payload: Array<Record<string, unknown>>) => React.ReactNode;
  formatter?: (value: unknown, name: React.ReactNode, item: Record<string, unknown>, index: number) => React.ReactNode;
  hideLabel?: boolean;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  const resolvedLabel = hideLabel
    ? null
    : labelFormatter
      ? labelFormatter(label, payload)
      : label;

  return (
    <div className={cn("grid min-w-[10rem] gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl", className)}>
      {resolvedLabel ? <div className="font-medium text-foreground">{resolvedLabel}</div> : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = getPayloadKey(item);
          const itemConfig = key ? config[key] : undefined;
          const itemValue = item.value;
          const indicatorColor =
            typeof item.color === "string" ? item.color : itemConfig?.color ?? "var(--color-chart-1)";
          const itemName = getPayloadLabel(item, itemConfig, key);

          const formatted = formatter
            ? formatter(itemValue, itemName, item, index)
            : (
              <>
                <span className="text-muted-foreground">{itemName}</span>
                <span className="ml-auto font-mono font-medium text-foreground">{String(itemValue ?? "—")}</span>
              </>
            );

          return (
            <div key={`${key ?? "item"}-${index}`} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: indicatorColor }}
              />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {formatted}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegendContent({
  payload,
  className,
}: React.ComponentProps<"div"> & {
  payload?: Array<Record<string, unknown>>;
}) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground", className)}>
      {payload.map((item, index) => {
        const key = getPayloadKey(item);
        const itemConfig = key ? config[key] : undefined;
        const indicatorColor =
          typeof item.color === "string" ? item.color : itemConfig?.color ?? "var(--color-chart-1)";
        const itemName = getPayloadLabel(item, itemConfig, key);

        return (
          <div key={`${key ?? "legend"}-${index}`} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ backgroundColor: indicatorColor }}
            />
            <span>{itemName}</span>
          </div>
        );
      })}
    </div>
  );
}
