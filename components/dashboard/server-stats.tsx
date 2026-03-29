"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, ClipboardList, Link } from "lucide-react";

interface ServerStatsProps {
  guildId: string;
}

interface Stats {
  linkedMembers: number;
  totalAccounts: number;
  clansConfigured: number;
  activeRosters: number;
}

export function ServerStats({ guildId }: ServerStatsProps) {
  const t = useTranslations("OverviewPage.stats");
  const [stats, setStats] = useState<Stats>({
    linkedMembers: 0,
    totalAccounts: 0,
    clansConfigured: 0,
    activeRosters: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          setIsLoading(false);
          return;
        }

        const [clansRes, rostersRes, linksRes] = await Promise.all([
          fetch(`/api/v2/server/${guildId}/clans`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`/api/v2/roster/${guildId}/list`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`/api/v2/server/${guildId}/links?limit=1&offset=0`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        let linkedMembers = 0;
        let totalAccounts = 0;
        let clansConfigured = 0;
        let activeRosters = 0;

        if (clansRes.ok) {
          const clansData = await clansRes.json();
          clansConfigured = Array.isArray(clansData) ? clansData.length : 0;
        }

        if (rostersRes.ok) {
          const rostersData = await rostersRes.json();
          activeRosters = (rostersData.items || rostersData.rosters || rostersData || []).length;
        }

        if (linksRes.ok) {
          const linksData = await linksRes.json();
          linkedMembers = linksData.members_with_links ?? 0;
          totalAccounts = linksData.total_linked_accounts ?? 0;
        }

        setStats({ linkedMembers, totalAccounts, clansConfigured, activeRosters });
      } catch (err) {
        console.error("Failed to fetch server stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [guildId]);

  const cards = [
    {
      label: t("linkedPlayers"),
      desc: t("linkedPlayersDesc"),
      value: stats.linkedMembers,
      icon: <Users className="h-4 w-4 text-primary" />,
    },
    {
      label: t("totalAccounts"),
      desc: t("totalAccountsDesc"),
      value: stats.totalAccounts,
      icon: <Link className="h-4 w-4 text-primary" />,
    },
    {
      label: t("clansConfigured"),
      desc: t("clansConfiguredDesc"),
      value: stats.clansConfigured,
      icon: <Shield className="h-4 w-4 text-primary" />,
    },
    {
      label: t("activeRosters"),
      desc: t("activeRostersDesc"),
      value: stats.activeRosters,
      icon: <ClipboardList className="h-4 w-4 text-primary" />,
    },
  ];

  return (
    <>
      {cards.map((card) => (
        <Card key={card.label} className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">{card.label}</CardTitle>
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
