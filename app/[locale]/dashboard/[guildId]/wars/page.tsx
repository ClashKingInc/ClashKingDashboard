"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Trophy,
  Swords,
  Shield,
  Filter,
  Download,
  TrendingUp,
  Star,
  Loader2
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { darkTheme, clashKingColors } from "@/lib/theme";
import type { War, PlayerWarStats, WarSummary } from "@/lib/api/types/war";

interface Clan {
  tag: string;
  name: string;
  badge_url?: string | null;
}

interface ComputedClanStats {
  clan_tag: string;
  clan_name: string;
  total_wars: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  avg_stars: number;
  avg_destruction: number;
  current_war?: War | null;
  is_in_war: boolean;
  is_in_cwl: boolean;
}

interface DailyWarStats {
  date: string;
  wins: number;
  losses: number;
  draws: number;
}

interface THStats {
  th: string;
  success: number;
  failed: number;
}

export default function WarsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params?.guildId as string;
  const t = useTranslations("WarsPage");
  const tCommon = useTranslations("Common");

  const [loading, setLoading] = useState(true);
  const [clans, setClans] = useState<Clan[]>([]);
  const [warSummaries, setWarSummaries] = useState<WarSummary[]>([]);
  const [clanStats, setClanStats] = useState<ComputedClanStats[]>([]);
  const [topPerformers, setTopPerformers] = useState<PlayerWarStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyWarStats[]>([]);
  const [thStats, setTHStats] = useState<THStats[]>([]);

  const [filters, setFilters] = useState({
    clan: "all",
    user: "",
    townHall: "all",
    startDate: "",
    endDate: "",
  });

  // Fetch clans and war data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push(`/${params.locale}/login`);
          return;
        }

        // Fetch clans first
        const clansRes = await fetch(`/api/v2/server/${guildId}/clans`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!clansRes.ok) {
          if (clansRes.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            router.push(`/${params.locale}/login`);
            return;
          }
          throw new Error("Failed to fetch clans");
        }

        const clansData = await clansRes.json();
        console.log('Clans data received:', clansData);
        setClans(clansData || []);

        // If we have clans, fetch war data immediately
        if (clansData && clansData.length > 0) {
          await fetchWarDataForClans(clansData, accessToken);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load clans. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
  }, [guildId, router, toast]);

  const fetchWarDataForClans = async (clansList: Clan[], token: string) => {
    try {
      const clansToFetch = filters.clan === "all"
        ? clansList.map(c => c.tag).filter(tag => tag && tag.trim() !== '')
        : filters.clan && filters.clan !== "all" ? [filters.clan] : [];

      console.log('Clans:', clansList);
      console.log('Clans to fetch:', clansToFetch);

      // If no clans to fetch, return early
      if (clansToFetch.length === 0) {
        console.warn('No clans to fetch - clans data might be invalid');
        setLoading(false);
        return;
      }

      // Calculate timestamps (default: last 30 days)
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      const startTs = filters.startDate
        ? Math.floor(new Date(filters.startDate).getTime() / 1000)
        : Math.floor(thirtyDaysAgo / 1000);
      const endTs = filters.endDate
        ? Math.floor(new Date(filters.endDate).getTime() / 1000)
        : Math.floor(now / 1000);

      // Fetch war summaries (includes current war + CWL info) and player stats in parallel
      const [warSummaryRes, playerStatsRes, historicalWars] = await Promise.all([
        fetch('/api/v2/war/war-summary', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clan_tags: clansToFetch }),
        }).then(res => res.ok ? res.json() : { items: [] }),

        fetchPlayerStats(clansToFetch, token, startTs, endTs),

        // Fetch historical wars for statistics
        Promise.all(
          clansToFetch.map(tag =>
            fetch(`/api/v2/war/${encodeURIComponent(tag)}/previous?timestamp_start=${startTs}&timestamp_end=${endTs}&limit=100`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(res => res.ok ? res.json() : { items: [] })
          )
        )
      ]);

      const summaries: WarSummary[] = warSummaryRes.items || [];
      setWarSummaries(summaries);

      // Combine historical wars
      const allHistoricalWars: War[] = historicalWars.flatMap(result => result.items || []);

      // Calculate clan stats
      const statsMap = new Map<string, ComputedClanStats>();

      clansToFetch.forEach((clanTag, index) => {
        const summary = summaries.find(s => s.clan_tag === clanTag || s.war_info?.clan?.tag === clanTag);
        const clanWars = (historicalWars[index]?.items || []) as War[];
        const clanName = clansList.find(c => c.tag === clanTag)?.name || clanTag;

        let wins = 0, losses = 0, draws = 0;
        let totalStars = 0, totalDestruction = 0;

        // Calculate from historical wars
        clanWars.forEach(war => {
          if (war.state !== 'warEnded') return;

          const clanStars = war.clan.stars;
          const opponentStars = war.opponent.stars;

          totalStars += clanStars;
          totalDestruction += war.clan.destructionPercentage || war.clan.destruction || 0;

          if (clanStars > opponentStars) wins++;
          else if (clanStars < opponentStars) losses++;
          else draws++;
        });

        const totalWars = wins + losses + draws;

        statsMap.set(clanTag, {
          clan_tag: clanTag,
          clan_name: clanName,
          total_wars: totalWars,
          wins,
          losses,
          draws,
          win_rate: totalWars > 0 ? wins / totalWars : 0,
          avg_stars: totalWars > 0 ? totalStars / totalWars : 0,
          avg_destruction: totalWars > 0 ? totalDestruction / totalWars : 0,
          current_war: summary?.war_info || null,
          is_in_war: summary?.isInWar || false,
          is_in_cwl: summary?.isInCwl || false,
        });
      });

      setClanStats(Array.from(statsMap.values()));

      // Calculate daily stats from all historical wars
      calculateDailyStats(allHistoricalWars);

      // Set player stats
      setTopPerformers(playerStatsRes);

      // Calculate TH stats from player data
      calculateTHStats(playerStatsRes);

    } catch (error) {
      console.error("Error fetching war data:", error);
      toast({
        title: "Error",
        description: "Failed to load war data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerStats = async (clanTags: string[], token: string, startTs: number, endTs: number): Promise<PlayerWarStats[]> => {
    try {
      const params = new URLSearchParams();
      clanTags.forEach(tag => params.append('clan_tags', tag));
      params.append('timestamp_start', startTs.toString());
      params.append('timestamp_end', endTs.toString());

      if (filters.townHall !== "all") {
        params.append('townhall_filter', filters.townHall);
      }

      const res = await fetch(`/api/v2/war/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        // API returns items array of player stats
        return (data.items || [])
          .sort((a: PlayerWarStats, b: PlayerWarStats) => b.total_stars - a.total_stars)
          .slice(0, 10);
      }
    } catch (error) {
      console.error("Error fetching player stats:", error);
    }
    return [];
  };

  const calculateDailyStats = (allWars: War[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const dailyMap = new Map<string, DailyWarStats>();
    last7Days.forEach(date => {
      dailyMap.set(date, { date, wins: 0, losses: 0, draws: 0 });
    });

    allWars.forEach(war => {
      if (war.state !== 'warEnded' || !war.endTime && !war.end_time) return;

      const endDate = new Date(war.endTime || war.end_time!).toISOString().split('T')[0];
      const stats = dailyMap.get(endDate);

      if (stats) {
        const clanStars = war.clan.stars;
        const opponentStars = war.opponent.stars;

        if (clanStars > opponentStars) stats.wins++;
        else if (clanStars < opponentStars) stats.losses++;
        else stats.draws++;
      }
    });

    setDailyStats(Array.from(dailyMap.values()));
  };

  const calculateTHStats = (playerStats: PlayerWarStats[]) => {
    const thMap = new Map<number, { attacks: number, threeStars: number }>();

    playerStats.forEach(player => {
      if (!player.townhall_level) return;

      const existing = thMap.get(player.townhall_level) || { attacks: 0, threeStars: 0 };
      existing.attacks += player.total_attacks;
      existing.threeStars += player.three_star_count || 0;
      thMap.set(player.townhall_level, existing);
    });

    const thStatsArray = Array.from(thMap.entries())
      .map(([th, data]) => ({
        th: `TH${th}`,
        success: data.attacks > 0 ? Math.round((data.threeStars / data.attacks) * 100) : 0,
        failed: data.attacks > 0 ? Math.round(((data.attacks - data.threeStars) / data.attacks) * 100) : 0,
      }))
      .filter(stat => stat.success + stat.failed > 0)
      .sort((a, b) => parseInt(b.th.slice(2)) - parseInt(a.th.slice(2)))
      .slice(0, 5);

    setTHStats(thStatsArray);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleApplyFilters = async () => {
    if (clans.length === 0) {
      toast({
        title: "Error",
        description: "No clans available",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        await fetchWarDataForClans(clans, accessToken);
      }
    } catch (error) {
      console.error("Error applying filters:", error);
      toast({
        title: "Error",
        description: "Failed to apply filters. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const totalWins = clanStats.reduce((sum, stat) => sum + stat.wins, 0);
  const totalLosses = clanStats.reduce((sum, stat) => sum + stat.losses, 0);
  const totalDraws = clanStats.reduce((sum, stat) => sum + stat.draws, 0);
  const totalWars = clanStats.reduce((sum, stat) => sum + stat.total_wars, 0);
  const overallWinRate = totalWars > 0 ? ((totalWins / totalWars) * 100).toFixed(1) : "0.0";
  const avgStars = clanStats.length > 0
    ? (clanStats.reduce((sum, stat) => sum + stat.avg_stars, 0) / clanStats.length).toFixed(1)
    : "0.0";

  // Count active wars
  const activeWars = clanStats.filter(s => s.is_in_war).length;
  const activeCwl = clanStats.filter(s => s.is_in_cwl).length;

  // Prepare daily chart data
  const dailyChartData = dailyStats.map(day => ({
    name: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    wins: day.wins,
    losses: day.losses,
    draws: day.draws,
  }));

  // War type distribution (placeholder - would need API support)
  const warTypeDistribution = [
    { name: "CWL", value: 45, color: clashKingColors.primary },
    { name: "Random", value: 30, color: "#FAA81A" },
    { name: "Friendly", value: 25, color: "#3BA55D" },
  ];

  if (loading && clanStats.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-56 animate-pulse" />
                <Skeleton className="h-5 w-96 animate-pulse" />
              </div>
            </div>
            <Skeleton className="h-10 w-36 animate-pulse" />
          </div>

          {/* Filters Card Skeleton */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24 animate-pulse" />
                  <Skeleton className="h-4 w-80 animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-28 animate-pulse" />
                  <Skeleton className="h-9 w-32 animate-pulse" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20 animate-pulse" />
                    <Skeleton className="h-10 w-full animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats Skeleton */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-28 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-16 animate-pulse" />
                    <Skeleton className="h-8 w-8 rounded animate-pulse" />
                  </div>
                  <Skeleton className="h-3 w-32 mt-2 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row Skeleton */}
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader>
                  <Skeleton className="h-6 w-48 animate-pulse" />
                  <Skeleton className="h-4 w-64 mt-2 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tables Skeleton */}
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader>
                  <Skeleton className="h-6 w-40 animate-pulse" />
                  <Skeleton className="h-4 w-64 mt-2 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3 flex-1">
                          <Skeleton className="h-10 w-10 rounded-full animate-pulse" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-32 animate-pulse" />
                            <Skeleton className="h-3 w-24 animate-pulse" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-16 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <Swords className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">War Statistics</h1>
                <p className="text-muted-foreground mt-1">
                  Track war performance and analyze battle statistics
                </p>
              </div>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* WAR STATISTICS */}
        <div className="space-y-6">
            {/* Filters Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filters
                    </CardTitle>
                    <CardDescription>Filter war statistics by various criteria</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFilters({
                      clan: "all",
                      user: "",
                      townHall: "all",
                      startDate: "",
                      endDate: "",
                    })}>
                      Reset Filters
                    </Button>
                    <Button size="sm" onClick={handleApplyFilters} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-2">
                    <Label htmlFor="clan-filter">Clan</Label>
                    <Select value={filters.clan} onValueChange={(value) => handleFilterChange("clan", value)}>
                      <SelectTrigger id="clan-filter">
                        <SelectValue placeholder="Select clan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clans</SelectItem>
                        {clans.map((clan) => (
                          <SelectItem key={clan.tag} value={clan.tag}>
                            {clan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-filter">User</Label>
                    <Input
                      id="user-filter"
                      placeholder="Search user..."
                      value={filters.user}
                      onChange={(e) => handleFilterChange("user", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="th-filter">Town Hall</Label>
                    <Select value={filters.townHall} onValueChange={(value) => handleFilterChange("townHall", value)}>
                      <SelectTrigger id="th-filter">
                        <SelectValue placeholder="Select TH" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All TH Levels</SelectItem>
                        {[16, 15, 14, 13, 12, 11, 10, 9, 8].map((th) => (
                          <SelectItem key={th} value={th.toString()}>
                            TH {th}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Wins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-green-500">{totalWins}</div>
                    <Trophy className="h-8 w-8 text-green-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Out of {totalWars} total wars
                  </p>
                </CardContent>
              </Card>

              <Card className="border-red-500/30 bg-red-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Losses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-primary">{totalLosses}</div>
                    <Shield className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {totalDraws} draws
                  </p>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-yellow-500">{overallWinRate}%</div>
                    <TrendingUp className="h-8 w-8 text-yellow-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Overall performance
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Wars</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-blue-500">{activeWars}</div>
                    <Star className="h-8 w-8 text-blue-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {activeCwl} in CWL
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>War Performance (Last 7 Days)</CardTitle>
                  <CardDescription>Daily wins, losses, and draws</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkTheme.border.primary} />
                      <XAxis dataKey="name" stroke={darkTheme.text.secondary} />
                      <YAxis stroke={darkTheme.text.secondary} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkTheme.background.elevated,
                          border: `1px solid ${darkTheme.border.primary}`,
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="wins" fill="#3BA55D" name="Wins" />
                      <Bar dataKey="losses" fill="#ED4245" name="Losses" />
                      <Bar dataKey="draws" fill="#FAA81A" name="Draws" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Attack Success Rate by Town Hall</CardTitle>
                  <CardDescription>3-star rate per TH level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={thStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={darkTheme.border.primary} />
                      <XAxis type="number" stroke={darkTheme.text.secondary} />
                      <YAxis dataKey="th" type="category" stroke={darkTheme.text.secondary} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkTheme.background.elevated,
                          border: `1px solid ${darkTheme.border.primary}`,
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="success" fill="#3BA55D" name="3-Star %" stackId="a" />
                      <Bar dataKey="failed" fill="#ED4245" name="Other %" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>War Type Distribution</CardTitle>
                  <CardDescription>Breakdown of war types (Coming soon)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={warTypeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {warTypeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkTheme.background.elevated,
                          border: `1px solid ${darkTheme.border.primary}`,
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>Best warriors by total stars</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topPerformers.length > 0 ? (
                      topPerformers.slice(0, 5).map((player, index) => (
                        <div key={player.player_tag} className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                            index === 1 ? 'bg-gray-400/20 text-muted-foreground' :
                            index === 2 ? 'bg-orange-500/20 text-orange-500' :
                            'bg-gray-600/20 text-gray-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{player.player_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {player.total_attacks} attacks • {player.total_stars} stars
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30">
                            {player.avg_stars?.toFixed(2) || '0.00'}★
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No player data available. Try adjusting your filters.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clan Stats Table */}
            {clanStats.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Clan War Statistics</CardTitle>
                  <CardDescription>Detailed statistics for each clan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Clan</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Wars</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">W/L/D</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Win Rate</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Avg Stars</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Avg Destruction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clanStats.map((stat) => (
                          <tr key={stat.clan_tag} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">{stat.clan_name}</div>
                              <div className="text-xs text-muted-foreground">{stat.clan_tag}</div>
                            </td>
                            <td className="text-center py-3 px-4">
                              {stat.is_in_war && (
                                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                  In War
                                </Badge>
                              )}
                              {stat.is_in_cwl && !stat.is_in_war && (
                                <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                                  CWL
                                </Badge>
                              )}
                              {!stat.is_in_war && !stat.is_in_cwl && (
                                <Badge variant="secondary">
                                  Peace
                                </Badge>
                              )}
                            </td>
                            <td className="text-center py-3 px-4 text-foreground">{stat.total_wars}</td>
                            <td className="text-center py-3 px-4">
                              <span className="text-green-500">{stat.wins}</span>
                              <span className="text-muted-foreground"> / </span>
                              <span className="text-red-500">{stat.losses}</span>
                              <span className="text-muted-foreground"> / </span>
                              <span className="text-yellow-500">{stat.draws}</span>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge variant="secondary" className={
                                stat.win_rate >= 0.7 ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                                stat.win_rate >= 0.5 ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                                'bg-red-500/20 text-red-500 border-red-500/30'
                              }>
                                {(stat.win_rate * 100).toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-4 text-foreground">{stat.avg_stars.toFixed(2)}</td>
                            <td className="text-center py-3 px-4 text-foreground">{stat.avg_destruction.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
      </div>
    </div>
  );
}
