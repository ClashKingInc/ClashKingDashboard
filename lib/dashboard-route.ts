"use client";

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

const DashboardRouteContext = createContext<{ guildId?: string }>({});

export function DashboardRouteProvider({ guildId, children }: { readonly guildId: string; readonly children: ReactNode }) {
  return createElement(DashboardRouteContext.Provider, { value: { guildId } }, children);
}

function useDashboardParam(name: string): string {
  const frameworkParams = useSearchParams();
  const frameworkValue = frameworkParams.get(name) ?? "";
  const [value, setValue] = useState("");

  useEffect(() => {
    // Keep the server render and first browser render identical. Vinext's
    // static snapshot can omit query params, so read the authoritative URL
    // only after hydration has completed.
    setValue(new URLSearchParams(globalThis.location.search).get(name) ?? frameworkValue);
  }, [frameworkValue, name]);

  return value;
}

export function useGuildId(): string {
  const context = useContext(DashboardRouteContext);
  const routeGuildId = useDashboardParam("guildId");
  const [storedGuildId, setStoredGuildId] = useState("");

  useEffect(() => {
    if (context.guildId || routeGuildId) return;
    try {
      const stored = JSON.parse(sessionStorage.getItem("selected_guild") ?? "null") as { id?: string } | null;
      setStoredGuildId(stored?.id ?? "");
    } catch {
      setStoredGuildId("");
    }
  }, [context.guildId, routeGuildId]);

  return context.guildId ?? (routeGuildId || storedGuildId);
}

export function useRosterId(): string {
  return useDashboardParam("rosterId");
}

export function dashboardHref(path: string, guildId: string, extra?: URLSearchParams): string {
  const params = new URLSearchParams(extra);
  params.set("guildId", guildId);
  const normalized = path ? `/dashboard/${path.replace(/^\/+/, "")}` : "/dashboard";
  return `${normalized}?${params.toString()}`;
}
