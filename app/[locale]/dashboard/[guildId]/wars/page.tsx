"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Swords,
  Shield,
  Filter,
  Download,
  TrendingUp,
  Star
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

// Mock data for war statistics
const warStatsData = [
  { name: "Mon", wins: 4, losses: 1, draws: 0 },
  { name: "Tue", wins: 3, losses: 2, draws: 1 },
  { name: "Wed", wins: 5, losses: 0, draws: 0 },
  { name: "Thu", wins: 2, losses: 3, draws: 0 },
  { name: "Fri", wins: 4, losses: 1, draws: 1 },
  { name: "Sat", wins: 6, losses: 0, draws: 0 },
  { name: "Sun", wins: 3, losses: 2, draws: 0 },
];

const attackSuccessData = [
  { th: "TH16", success: 85, failed: 15 },
  { th: "TH15", success: 78, failed: 22 },
  { th: "TH14", success: 82, failed: 18 },
  { th: "TH13", success: 90, failed: 10 },
  { th: "TH12", success: 88, failed: 12 },
];

const warTypeDistribution = [
  { name: "CWL", value: 45, color: clashKingColors.primary },
  { name: "Random", value: 30, color: "#FAA81A" },
  { name: "Friendly", value: 25, color: "#3BA55D" },
];

const topPerformers = [
  { name: "Player1", attacks: 156, stars: 450, destruction: 92.5 },
  { name: "Player2", attacks: 148, stars: 432, destruction: 90.2 },
  { name: "Player3", attacks: 142, stars: 418, destruction: 89.7 },
  { name: "Player4", attacks: 139, stars: 410, destruction: 88.9 },
  { name: "Player5", attacks: 135, stars: 398, destruction: 87.5 },
];

const mockClans = [
  { tag: "#CLAN123", name: "Elite Warriors" },
  { tag: "#CLAN456", name: "Training Ground" },
  { tag: "#CLAN789", name: "War Masters" },
];

export default function WarsPage() {
  const [filters, setFilters] = useState({
    clan: "all",
    user: "",
    townHall: "all",
    startDate: "",
    endDate: "",
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

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
                  <Button variant="outline" size="sm" onClick={() => setFilters({
                    clan: "all",
                    user: "",
                    townHall: "all",
                    startDate: "",
                    endDate: "",
                  })}>
                    Reset Filters
                  </Button>
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
                        {mockClans.map((clan) => (
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
                    <div className="text-3xl font-bold text-green-500">127</div>
                    <Trophy className="h-8 w-8 text-green-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="text-green-500">+12%</span> from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="border-red-500/30 bg-red-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Losses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-primary">34</div>
                    <Shield className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="text-primary">-8%</span> from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-yellow-500">78.9%</div>
                    <TrendingUp className="h-8 w-8 text-yellow-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="text-green-500">+3.2%</span> improvement
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Stars</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-blue-500">2.7</div>
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
                    <BarChart data={warStatsData}>
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
                    {topPerformers.map((player, index) => (
                      <div key={player.name} className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                          index === 1 ? 'bg-gray-400/20 text-muted-foreground' :
                          index === 2 ? 'bg-orange-500/20 text-orange-500' :
                          'bg-gray-600/20 text-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{player.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {player.attacks} attacks • {player.stars} stars
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30">
                          {player.destruction}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
      </div>
    </div>
  );
}
