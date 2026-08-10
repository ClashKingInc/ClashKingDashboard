"use client";

import type { LanguageModelUsage } from "ai";
import type { ComponentProps } from "react";
import { createContext, useContext, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const PERCENT_MAX = 100;
const ICON_RADIUS = 10;
const ICON_VIEWBOX = 24;
const ICON_CENTER = 12;
const ICON_STROKE_WIDTH = 2;

interface ContextSchema {
  usedTokens: number;
  maxTokens: number;
  usage?: LanguageModelUsage;
  modelId?: string;
}

const ContextValue = createContext<ContextSchema | null>(null);

function useContextValue(): ContextSchema {
  const value = useContext(ContextValue);
  if (!value) throw new Error("Context components must be used within Context");
  return value;
}

export type ContextProps = ComponentProps<typeof HoverCard> & ContextSchema;

export const Context = ({ usedTokens, maxTokens, usage, modelId, ...props }: ContextProps) => {
  const value = useMemo(
    () => ({ usedTokens, maxTokens, usage, modelId }),
    [usedTokens, maxTokens, usage, modelId],
  );
  return (
    <ContextValue.Provider value={value}>
      <HoverCard closeDelay={0} openDelay={100} {...props} />
    </ContextValue.Provider>
  );
};

function ContextIcon() {
  const { usedTokens, maxTokens } = useContextValue();
  const circumference = 2 * Math.PI * ICON_RADIUS;
  const usedPercent = Math.min(1, Math.max(0, usedTokens / maxTokens));
  const dashOffset = circumference * (1 - usedPercent);
  return (
    <svg aria-label="Model context usage" height="18" role="img" viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`} width="18">
      <circle cx={ICON_CENTER} cy={ICON_CENTER} fill="none" opacity="0.25" r={ICON_RADIUS} stroke="currentColor" strokeWidth={ICON_STROKE_WIDTH} />
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.7"
        r={ICON_RADIUS}
        stroke="currentColor"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        strokeWidth={ICON_STROKE_WIDTH}
        style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
      />
    </svg>
  );
}

export type ContextTriggerProps = ComponentProps<typeof Button>;

export const ContextTrigger = ({ children, ...props }: ContextTriggerProps) => {
  const { usedTokens, maxTokens } = useContextValue();
  const renderedPercent = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(usedTokens / maxTokens);
  return (
    <HoverCardTrigger asChild>
      {children ?? (
        <Button type="button" variant="ghost" {...props}>
          <span className="font-medium text-muted-foreground">{renderedPercent}</span>
          <ContextIcon />
        </Button>
      )}
    </HoverCardTrigger>
  );
};

export type ContextContentProps = ComponentProps<typeof HoverCardContent>;

export const ContextContent = ({ className, ...props }: ContextContentProps) => (
  <HoverCardContent className={cn("min-w-64 divide-y overflow-hidden p-0", className)} {...props} />
);

export type ContextContentHeaderProps = ComponentProps<"div">;

export const ContextContentHeader = ({ children, className, ...props }: ContextContentHeaderProps) => {
  const { usedTokens, maxTokens } = useContextValue();
  const usedPercent = usedTokens / maxTokens;
  return (
    <div className={cn("w-full space-y-2 p-3", className)} {...props}>
      {children ?? (
        <>
          <div className="flex items-center justify-between gap-3 text-xs">
            <p>{new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" }).format(usedPercent)}</p>
            <p className="font-mono text-muted-foreground">
              {new Intl.NumberFormat("en-US", { notation: "compact" }).format(usedTokens)} / {new Intl.NumberFormat("en-US", { notation: "compact" }).format(maxTokens)}
            </p>
          </div>
          <Progress className="bg-muted" value={Math.min(PERCENT_MAX, usedPercent * PERCENT_MAX)} />
        </>
      )}
    </div>
  );
};

export type ContextContentBodyProps = ComponentProps<"div">;

export const ContextContentBody = ({ children, className, ...props }: ContextContentBodyProps) => (
  <div className={cn("w-full p-3", className)} {...props}>{children}</div>
);

