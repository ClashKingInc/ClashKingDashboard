"use client";

import { useSearchParams } from "next/navigation";

export function useGuildId(): string {
  return useSearchParams().get("guildId") ?? "";
}

export function useRosterId(): string {
  return useSearchParams().get("rosterId") ?? "";
}

export function dashboardHref(path: string, guildId: string, extra?: URLSearchParams): string {
  const params = new URLSearchParams(extra);
  params.set("guildId", guildId);
  const normalized = path ? `/dashboard/${path.replace(/^\/+/, "")}` : "/dashboard";
  return `${normalized}?${params.toString()}`;
}
