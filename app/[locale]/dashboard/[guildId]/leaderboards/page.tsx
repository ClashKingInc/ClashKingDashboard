"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, TrendingUp, Award, Target } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Type definitions
interface LeaderboardEntry {
  tag: string;
  name: string;
  value: number;
  rank: number;
  clan_tag?: string;
  clan_name?: string;
  league?: string;
  trophies?: number;
}

interface LeaderboardData {
  items: LeaderboardEntry[];
}

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
      const endpoint = leaderboardType === "player"
        ? `/api/v1/leaderboard/players/capital`
        : `/api/v1/leaderboard/clans/capital`;

      const params = new URLSearchParams({
        weekend: selectedWeekend,
        type: selectedMetric,
        league: selectedLeague,
        lower: "1",
        upper: "50"
      });

      const response = await fetch(`${endpoint}?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data: LeaderboardData = await response.json();
      setLeaderboardData(data.items || []);
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : leaderboardData.length === 0 ? (
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
