"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  LineChart,
  Line,
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

interface Clan {
  tag: string;
  name: string;
  badge_url?: string | null;
}

interface ClanWarStats {
  clan_tag: string;
  clan_name: string;
  total_wars: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  total_stars: number;
  total_destruction: number;
  avg_stars: number;
  avg_destruction: number;
  attacks_per_war?: number;
  war_streak?: number;
}

interface PlayerWarStats {
  player_tag: string;
  player_name: string;
  total_attacks: number;
  total_stars: number;
  total_destruction: number;
  avg_stars: number;
  avg_destruction: number;
  three_star_count?: number;
  three_star_rate?: number;
  townhall_level?: number;
}

export default function WarsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params?.guildId as string;

  const [loading, setLoading] = useState(true);
  const [clans, setClans] = useState<Clan[]>([]);
  const [warStats, setWarStats] = useState<ClanWarStats[]>([]);
  const [topPerformers, setTopPerformers] = useState<PlayerWarStats[]>([]);

  const [filters, setFilters] = useState({
    clan: "all",
    user: "",
    townHall: "all",
    startDate: "",
    endDate: "",
  });

  // Fetch clans and war stats
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push("/login");
          return;
        }

        // Fetch clans
        const clansRes = await fetch(`/api/v2/server/${guildId}/clans`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!clansRes.ok) {
          if (clansRes.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch clans");
        }

        const clansData = await clansRes.json();
        setClans(clansData || []);

        // Fetch war stats for all clans or filtered clan
        if (clansData && clansData.length > 0) {
          await fetchWarStats(clansData, accessToken);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load war data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
  }, [guildId, router, toast]);

  const fetchWarStats = async (clansList: Clan[], token: string) => {
    try {
      // Determine which clans to fetch stats for
      const clansToFetch = filters.clan === "all"
        ? clansList.map(c => c.tag)
        : [filters.clan];

      // Build query parameters
      const params = new URLSearchParams();
      clansToFetch.forEach(tag => params.append('clan_tags', tag));

      if (filters.startDate) {
        const startTimestamp = Math.floor(new Date(filters.startDate).getTime() / 1000);
        params.append('timestamp_start', startTimestamp.toString());
      }

      if (filters.endDate) {
        const endTimestamp = Math.floor(new Date(filters.endDate).getTime() / 1000);
        params.append('timestamp_end', endTimestamp.toString());
      }

      if (filters.townHall !== "all") {
        params.append('townhall_filter', filters.townHall);
      }

      const statsRes = await fetch(`/api/v2/war/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setWarStats(statsData.clans || statsData || []);
        setTopPerformers(statsData.top_performers || statsData.players || []);
      }
    } catch (error) {
      console.error("Error fetching war stats:", error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleApplyFilters = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      if (accessToken && clans.length > 0) {
        await fetchWarStats(clans, accessToken);
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

  // Calculate summary stats from war stats
  const totalWins = warStats.reduce((sum, stat) => sum + stat.wins, 0);
  const totalLosses = warStats.reduce((sum, stat) => sum + stat.losses, 0);
  const totalDraws = warStats.reduce((sum, stat) => sum + stat.draws, 0);
  const totalWars = warStats.reduce((sum, stat) => sum + stat.total_wars, 0);
  const overallWinRate = totalWars > 0 ? ((totalWins / totalWars) * 100).toFixed(1) : "0.0";
  const avgStars = warStats.length > 0
    ? (warStats.reduce((sum, stat) => sum + stat.avg_stars, 0) / warStats.length).toFixed(1)
    : "0.0";

  // Prepare chart data - last 7 days (mock for now, would need historical endpoint)
  const last7DaysData = [
    { name: "Mon", wins: 4, losses: 1, draws: 0 },
    { name: "Tue", wins: 3, losses: 2, draws: 1 },
    { name: "Wed", wins: 5, losses: 0, draws: 0 },
    { name: "Thu", wins: 2, losses: 3, draws: 0 },
    { name: "Fri", wins: 4, losses: 1, draws: 1 },
    { name: "Sat", wins: 6, losses: 0, draws: 0 },
    { name: "Sun", wins: 3, losses: 2, draws: 0 },
  ];

  // Attack success by TH (mock for now)
  const attackSuccessData = [
    { th: "TH16", success: 85, failed: 15 },
    { th: "TH15", success: 78, failed: 22 },
    { th: "TH14", success: 82, failed: 18 },
    { th: "TH13", success: 90, failed: 10 },
    { th: "TH12", success: 88, failed: 12 },
  ];

  // War type distribution (would need type tracking)
  const warTypeDistribution = [
    { name: "CWL", value: 45, color: clashKingColors.primary },
    { name: "Random", value: 30, color: "#FAA81A" },
    { name: "Friendly", value: 25, color: "#3BA55D" },
  ];

  if (loading && warStats.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading war statistics...</p>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Stars</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-blue-500">{avgStars}</div>
                    <Star className="h-8 w-8 text-blue-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Per attack average
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
                    <BarChart data={last7DaysData}>
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
                  <CardDescription>Success vs failed attacks per TH level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attackSuccessData} layout="vertical">
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
                      <Bar dataKey="success" fill="#3BA55D" name="Success %" stackId="a" />
                      <Bar dataKey="failed" fill="#ED4245" name="Failed %" stackId="a" />
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
                  <CardDescription>Breakdown of war types in the last 30 days</CardDescription>
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
                  <CardDescription>Best warriors in the last 30 days</CardDescription>
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
                            {player.avg_destruction?.toFixed(1) || player.total_destruction?.toFixed(1) || 0}%
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
            {warStats.length > 0 && (
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
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Wars</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">W/L/D</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Win Rate</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Avg Stars</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Avg Destruction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warStats.map((stat) => (
                          <tr key={stat.clan_tag} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">{stat.clan_name}</div>
                              <div className="text-xs text-muted-foreground">{stat.clan_tag}</div>
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
                                stat.win_rate >= 70 ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                                stat.win_rate >= 50 ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
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
