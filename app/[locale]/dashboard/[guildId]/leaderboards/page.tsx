"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Trophy, TrendingUp, Award, Target } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/api";

const LEADERBOARD_TYPES = {
  capital: {
    player: [
      { value: "capital_looted", label: "Capital Looted" }
    ],
    clan: [
      { value: "capitalTotalLoot", label: "Total Loot" },
      { value: "raidsCompleted", label: "Raids Completed" },
      { value: "enemyDistrictsDestroyed", label: "Districts Destroyed" },
      { value: "medals", label: "Medals" }
    ]
  }
};

const LEAGUES = ["All", "Legend League", "Titan League I", "Titan League II", "Titan League III"];

export default function LeaderboardsPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const t = useTranslations("LeaderboardsPage");
  const tCommon = useTranslations("Common");

  const [loading, setLoading] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState<"player" | "clan">("player");
  const [selectedMetric, setSelectedMetric] = useState("capital_looted");
  const [selectedLeague, setSelectedLeague] = useState("All");
  const [selectedWeekend, setSelectedWeekend] = useState(() => {
    // Get last weekend (Friday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToFriday = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
    const lastFriday = new Date(now);
    lastFriday.setDate(now.getDate() - daysToFriday - 7);
    return lastFriday.toISOString().split('T')[0];
  });
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = {
        weekend: selectedWeekend,
        type: selectedMetric,
        league: selectedLeague,
        lower: "1",
        upper: "50"
      };

      const response = leaderboardType === "player"
        ? await apiClient.leaderboards.getPlayerCapitalLeaderboard(params)
        : await apiClient.leaderboards.getClanCapitalLeaderboard(params);

      if (response.error) {
        console.error('Error fetching leaderboard:', response.error);
        setLeaderboardData([]);
      } else {
        setLeaderboardData(response.data?.items || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType, selectedMetric, selectedLeague, selectedWeekend]);

  // Update metric when switching between player/clan
  useEffect(() => {
    if (leaderboardType === "player") {
      setSelectedMetric("capital_looted");
    } else {
      setSelectedMetric("capitalTotalLoot");
    }
  }, [leaderboardType]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-700";
    return "text-foreground";
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) return <Trophy className="w-5 h-5" />;
    return <Award className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 animate-pulse" />
          <Skeleton className="h-5 w-96 animate-pulse" />
        </div>

        {/* Statistics Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-28 animate-pulse" />
                <Skeleton className="h-4 w-4 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card className="bg-card border-border">
          <CardHeader>
            <Skeleton className="h-6 w-24 animate-pulse" />
            <Skeleton className="h-4 w-64 mt-2 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-16 animate-pulse" />
                  <Skeleton className="h-10 w-full animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Table Skeleton */}
        <Card className="bg-card border-border">
          <CardHeader>
            <Skeleton className="h-6 w-32 animate-pulse" />
            <Skeleton className="h-4 w-80 mt-2 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Skeleton className="h-8 w-16 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48 animate-pulse" />
                      <Skeleton className="h-4 w-32 animate-pulse" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Leaderboards</h1>
        <p className="text-muted-foreground">
          Global leaderboards for Clan Capital and more
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Entries</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{leaderboardData.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Type</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground capitalize">{leaderboardType}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">League</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground">{selectedLeague}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Weekend</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground">{selectedWeekend}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Filters</CardTitle>
          <CardDescription className="text-muted-foreground">
            Customize your leaderboard view
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Type</label>
              <Tabs value={leaderboardType} onValueChange={(val) => setLeaderboardType(val as "player" | "clan")}>
                <TabsList className="grid w-full grid-cols-2 bg-secondary">
                  <TabsTrigger value="player">Players</TabsTrigger>
                  <TabsTrigger value="clan">Clans</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Metric</label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {LEADERBOARD_TYPES.capital[leaderboardType].map((metric) => (
                    <SelectItem key={metric.value} value={metric.value}>
                      {metric.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">League</label>
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {LEAGUES.map((league) => (
                    <SelectItem key={league} value={league}>
                      {league}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Weekend</label>
              <input
                type="date"
                value={selectedWeekend}
                onChange={(e) => setSelectedWeekend(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Rankings</CardTitle>
          <CardDescription className="text-muted-foreground">
            Top {leaderboardData.length} {leaderboardType === "player" ? "players" : "clans"} for {selectedWeekend}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboardData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No data available</p>
              <p className="text-sm">Try selecting a different weekend or league</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboardData.map((entry) => (
                <div
                  key={entry.tag}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`flex items-center gap-2 min-w-[60px] ${getRankColor(entry.rank)}`}>
                      {getRankIcon(entry.rank)}
                      <span className="text-xl font-bold">#{entry.rank}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{entry.name}</h3>
                      <p className="text-sm text-muted-foreground">{entry.tag}</p>
                      {entry.clan_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.clan_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{entry.value.toLocaleString()}</div>
                    {entry.league && (
                      <Badge variant="secondary" className="mt-1 bg-secondary text-foreground">
                        {entry.league}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
