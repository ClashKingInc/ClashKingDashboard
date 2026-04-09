"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Shield, ClipboardList, Link, AlertCircle, RefreshCw } from "lucide-react";
import { apiCache } from "@/lib/api-cache";
import { apiClient } from "@/lib/api/client";

interface ServerStatsProps {
  guildId: string;
}

interface Stats {
  linkedPlayers: number;
  totalAccounts: number;
  clansConfigured: number;
  activeRosters: number;
}

export function ServerStats({ guildId }: ServerStatsProps) {
  const t = useTranslations("OverviewPage.stats");
  const tCommon = useTranslations("Common");
  const clansCacheKey = `overview-clans-${guildId}`;
  const rostersCacheKey = `overview-rosters-${guildId}`;
  const linksCacheKey = `overview-links-${guildId}`;
  const [stats, setStats] = useState<Stats>({
    linkedPlayers: 0,
    totalAccounts: 0,
    clansConfigured: 0,
    activeRosters: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchStats = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setHasError(false);

    if (forceRefresh) {
      apiCache.invalidate(clansCacheKey);
      apiCache.invalidate(rostersCacheKey);
      apiCache.invalidate(linksCacheKey);
    }

    try {
      const hasSession = localStorage.getItem("access_token") || localStorage.getItem("refresh_token");
      if (!hasSession) {
        setIsLoading(false);
        return;
      }

      const [clansRes, rostersRes, linksRes] = await Promise.all([
        apiCache.get(clansCacheKey, () => apiClient.servers.getServerClans(guildId)),
        apiCache.get(rostersCacheKey, () => apiClient.rosters.list(guildId)),
        apiCache.get(linksCacheKey, () => apiClient.servers.getServerLinks(guildId, { limit: 1, offset: 0 })),
      ]);

      let linkedPlayers = 0;
      let totalAccounts = 0;
      let clansConfigured = 0;
      let activeRosters = 0;

      if (clansRes.error) throw new Error(clansRes.error);
      if (rostersRes.error) throw new Error(rostersRes.error);
      if (linksRes.error) throw new Error(linksRes.error);

      const clansData = clansRes.data;
      const rostersData = rostersRes.data;
      const linksData = linksRes.data as
        | { members_with_links?: number; total_linked_accounts?: number }
        | undefined;

      clansConfigured = Array.isArray(clansData) ? clansData.length : 0;
      activeRosters = (rostersData?.items || (rostersData as { rosters?: unknown[] } | undefined)?.rosters || []).length;
      linkedPlayers = linksData?.members_with_links || 0;
      totalAccounts = linksData?.total_linked_accounts || 0;

      setStats({ linkedPlayers, totalAccounts, clansConfigured, activeRosters });
    } catch (err) {
      console.error('Failed to fetch server stats:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [clansCacheKey, guildId, linksCacheKey, rostersCacheKey]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const cards = [
    {
      title: t("linkedPlayers"),
      value: stats.linkedPlayers,
      desc: t("linkedPlayersDesc"),
      icon: <Users className="h-4 w-4 text-primary" />,
    },
    {
      title: t("totalAccounts"),
      value: stats.totalAccounts,
      desc: t("totalAccountsDesc"),
      icon: <Link className="h-4 w-4 text-primary" />,
    },
    {
      title: t("clansConfigured"),
      value: stats.clansConfigured,
      desc: t("clansConfiguredDesc"),
      icon: <Shield className="h-4 w-4 text-primary" />,
    },
    {
      title: t("activeRosters"),
      value: stats.activeRosters,
      desc: t("activeRostersDesc"),
      icon: <ClipboardList className="h-4 w-4 text-primary" />,
    },
  ];

  if (hasError) {
    return (
      <>
        {cards.map((card) => (
          <Card key={card.title} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">{card.title}</CardTitle>
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">{tCommon("loadError")}</p>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => fetchStats(true)}>
                <RefreshCw className="h-3 w-3 mr-1" />
                {tCommon("tryAgain")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  return (
    <>
      {cards.map((card) => (
        <Card key={card.title} className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">{card.title}</CardTitle>
            <div className="rounded-full bg-primary/10 p-2">{card.icon}</div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 animate-pulse mb-1" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {card.value.toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{card.desc}</p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
