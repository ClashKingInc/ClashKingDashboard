"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardCapabilities, DashboardSection } from "@/lib/api/types/dashboard-access";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";

interface DashboardAccessContextValue {
  capabilities: DashboardCapabilities | null;
  loading: boolean;
  canView: (section: DashboardSection) => boolean;
  canManage: (section: DashboardSection) => boolean;
  refresh: () => Promise<void>;
}

const DashboardAccessContext = createContext<DashboardAccessContextValue | null>(null);
const CAPABILITIES_CACHE_TTL_MS = 60_000;

interface CachedCapabilities {
  capabilities: DashboardCapabilities;
  cachedAt: number;
}

function capabilitiesCacheKey(guildId: string) {
  return `dashboard-capabilities:${guildId}`;
}

function readCachedCapabilities(guildId: string): CachedCapabilities | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(capabilitiesCacheKey(guildId)) ?? "null") as CachedCapabilities | null;
    if (!cached || Date.now() - cached.cachedAt >= CAPABILITIES_CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCachedCapabilities(guildId: string, capabilities: DashboardCapabilities) {
  sessionStorage.setItem(capabilitiesCacheKey(guildId), JSON.stringify({ capabilities, cachedAt: Date.now() } satisfies CachedCapabilities));
}

const pathSections: Array<[string, DashboardSection]> = [
  ["/family-settings", "family_settings"], ["/logs", "logs"], ["/clans", "clans"],
  ["/rosters", "rosters"], ["/links", "links"], ["/bans-and-strikes", "moderation"],
  ["/roles", "roles"], ["/reminders", "reminders"], ["/autoboards", "autoboards"],
  ["/giveaways", "giveaways"], ["/panels", "logs"], ["/tickets", "tickets"],
  ["/embeds", "embeds"], ["/graphics", "embeds"], ["/general", "settings"],
];

export function DashboardAccessProvider({ guildId, children }: { guildId: string; children: React.ReactNode }) {
  const cached = useMemo(() => readCachedCapabilities(guildId), [guildId]);
  const capabilitiesQuery = useQuery({
    ...dashboardQueryOptions.capabilities(guildId),
    enabled: Boolean(guildId),
    initialData: cached?.capabilities,
    initialDataUpdatedAt: cached?.cachedAt,
  });
  const capabilities = capabilitiesQuery.data ?? null;
  const loading = capabilitiesQuery.isPending;

  const { refetch } = capabilitiesQuery;
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    if (capabilities) writeCachedCapabilities(guildId, capabilities);
  }, [capabilities, guildId]);

  const value = useMemo<DashboardAccessContextValue>(() => ({
    capabilities,
    loading,
    canView: (section) => capabilities?.full_access === true || Boolean(capabilities?.sections[section]),
    canManage: (section) => capabilities?.full_access === true || capabilities?.sections[section] === "manage",
    refresh,
  }), [capabilities, loading, refresh]);

  return <DashboardAccessContext.Provider value={value}>{children}</DashboardAccessContext.Provider>;
}

export function useDashboardAccess() {
  const value = useContext(DashboardAccessContext);
  if (!value) throw new Error("useDashboardAccess must be used inside DashboardAccessProvider");
  return value;
}

export function DashboardRouteAccess({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { capabilities, loading, canView } = useDashboardAccess();
  const section = pathSections.find(([path]) => pathname.includes(path))?.[1];
  const isFullAccessOnly = pathname.includes("/bases");
  const allowed = isFullAccessOnly ? capabilities?.full_access === true : !section || canView(section);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading dashboard access…</div>;
  if (allowed) return children;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto mb-4 h-9 w-9 text-primary" />
        <h1 className="text-xl font-semibold">You don&apos;t have access to this section</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ask a server manager to add one of your Discord roles to this dashboard section.</p>
        <Button asChild className="mt-5"><a href="/servers">Choose another server</a></Button>
      </div>
    </div>
  );
}
