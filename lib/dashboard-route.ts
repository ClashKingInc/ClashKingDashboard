"use client";

import { useSearchParams } from "next/navigation";

function useDashboardParam(name: string): string {
  const frameworkParams = useSearchParams();

  // Vinext's statically generated search-param snapshot can be empty during
  // hydration even when the browser URL already contains the selected guild.
  // The address bar is authoritative for these client-only dashboard routes.
  if (typeof window !== "undefined") {
    return new URLSearchParams(globalThis.location.search).get(name)
      ?? frameworkParams.get(name)
      ?? "";
  }

  return frameworkParams.get(name) ?? "";
}

export function useGuildId(): string {
  return useDashboardParam("guildId");
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
