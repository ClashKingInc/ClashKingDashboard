"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, ClipboardList } from "lucide-react";

interface ServerStatsProps {
  guildId: string;
}

interface Stats {
  linkedPlayers: number;
  clansConfigured: number;
  activeRosters: number;
  recentWars: number;
}

export function ServerStats({ guildId }: ServerStatsProps) {
  const t = useTranslations("OverviewPage.stats");
  const [stats, setStats] = useState<Stats>({
    linkedPlayers: 0,
    clansConfigured: 0,
    activeRosters: 0,
    recentWars: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          console.log('No access token found');
          setIsLoading(false);
          return;
        }

        // Fetch all stats in parallel using the same endpoints as the pages
        const [clansRes, rostersRes, linksRes] = await Promise.all([
          fetch(`/api/v2/server/${guildId}/clans`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`/api/v2/roster/${guildId}/list`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`/api/v2/server/${guildId}/links?limit=1&offset=0`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
        ]);

        let linkedPlayers = 0;
        let clansConfigured = 0;
        let activeRosters = 0;

        // Parse clans
        if (clansRes.ok) {
          const clansData = await clansRes.json();
          clansConfigured = Array.isArray(clansData) ? clansData.length : 0;
          console.log('🏰 Clans configured:', clansConfigured);
        }

        // Parse rosters
        if (rostersRes.ok) {
          const rostersData = await rostersRes.json();
          activeRosters = (rostersData.items || rostersData.rosters || rostersData || []).length;
          console.log('📝 Active rosters:', activeRosters);
        }

        // Parse links
        if (linksRes.ok) {
          const linksData = await linksRes.json();
          linkedPlayers = linksData.total || 0;
          console.log('👥 Linked players:', linkedPlayers);
        }

        setStats({
          linkedPlayers,
          clansConfigured,
          activeRosters,
          recentWars: 0,
        });
      } catch (err) {
        console.error('Failed to fetch server stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [guildId]);

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">{t("linkedPlayers")}</CardTitle>
          <div className="rounded-full bg-primary/10 p-2">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20 animate-pulse mb-1" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {stats.linkedPlayers.toLocaleString()}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("linkedPlayersDesc")}</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">{t("clansConfigured")}</CardTitle>
          <div className="rounded-full bg-primary/10 p-2">
            <Shield className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20 animate-pulse mb-1" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {stats.clansConfigured.toLocaleString()}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("clansConfiguredDesc")}</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">{t("activeRosters")}</CardTitle>
          <div className="rounded-full bg-primary/10 p-2">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20 animate-pulse mb-1" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {stats.activeRosters.toLocaleString()}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("activeRostersDesc")}</p>
        </CardContent>
      </Card>
    </>
  );
}
