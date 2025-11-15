"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  Calendar,
  Trophy,
  Swords,
  Users,
  Bell,
  Settings,
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

  const [reminders, setReminders] = useState({
    randomWar: {
      enabled: true,
      time: "6",
      role: "@WarTeam",
    },
    friendlyWar: {
      enabled: true,
      time: "3",
      role: "@Members",
    },
    cwl: {
      enabled: true,
      time: "12",
      role: "@CWLRoster",
    },
  });

  const [warLogs, setWarLogs] = useState({
    enabled: true,
    channel: "#war-logs",
    includeAttacks: true,
    includeDefenses: true,
    pingOnLoss: true,
    celebrateWin: true,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30">
                <Swords className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">War Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Track statistics, configure reminders, and manage war logs
                </p>
              </div>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>

        <Tabs defaultValue="statistics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="statistics">
              <Trophy className="mr-2 h-4 w-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="reminders">
              <Bell className="mr-2 h-4 w-4" />
              Reminders
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Settings className="mr-2 h-4 w-4" />
              War Logs
            </TabsTrigger>
          </TabsList>

          {/* WAR STATISTICS TAB */}
          <TabsContent value="statistics" className="space-y-6">
            {/* Filters Card */}
            <Card>
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
                    <div className="text-3xl font-bold text-red-500">34</div>
                    <Shield className="h-8 w-8 text-red-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="text-red-500">-8%</span> from last month
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
              <Card>
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

              <Card>
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
              <Card>
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

              <Card>
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
                          index === 1 ? 'bg-gray-400/20 text-gray-400' :
                          index === 2 ? 'bg-orange-500/20 text-orange-500' :
                          'bg-gray-600/20 text-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-white">{player.name}</div>
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
          </TabsContent>

          {/* WAR REMINDERS TAB */}
          <TabsContent value="reminders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-red-500" />
                  <div>
                    <CardTitle>War Reminders Configuration</CardTitle>
                    <CardDescription>
                      Set up automatic reminders for different war types
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Random War Reminders */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                        <Target className="h-5 w-5 text-red-500" />
                        Random War
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Reminders for regular clan wars
                      </p>
                    </div>
                    <Switch
                      checked={reminders.randomWar.enabled}
                      onCheckedChange={(checked) =>
                        setReminders({
                          ...reminders,
                          randomWar: { ...reminders.randomWar, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {reminders.randomWar.enabled && (
                    <div className="ml-7 space-y-4 p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="random-time">Reminder Time (hours before)</Label>
                          <Input
                            id="random-time"
                            type="number"
                            min="1"
                            max="24"
                            value={reminders.randomWar.time}
                            onChange={(e) =>
                              setReminders({
                                ...reminders,
                                randomWar: { ...reminders.randomWar, time: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="random-role">Ping Role</Label>
                          <Input
                            id="random-role"
                            placeholder="@WarTeam"
                            value={reminders.randomWar.role}
                            onChange={(e) =>
                              setReminders({
                                ...reminders,
                                randomWar: { ...reminders.randomWar, role: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Friendly War Reminders */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-500" />
                        Friendly War
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Reminders for friendly wars
                      </p>
                    </div>
                    <Switch
                      checked={reminders.friendlyWar.enabled}
                      onCheckedChange={(checked) =>
                        setReminders({
                          ...reminders,
                          friendlyWar: { ...reminders.friendlyWar, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {reminders.friendlyWar.enabled && (
                    <div className="ml-7 space-y-4 p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="friendly-time">Reminder Time (hours before)</Label>
                          <Input
                            id="friendly-time"
                            type="number"
                            min="1"
                            max="24"
                            value={reminders.friendlyWar.time}
                            onChange={(e) =>
                              setReminders({
                                ...reminders,
                                friendlyWar: { ...reminders.friendlyWar, time: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="friendly-role">Ping Role</Label>
                          <Input
                            id="friendly-role"
                            placeholder="@Members"
                            value={reminders.friendlyWar.role}
                            onChange={(e) =>
                              setReminders({
                                ...reminders,
                                friendlyWar: { ...reminders.friendlyWar, role: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* CWL Reminders */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Clan War League (CWL)
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Reminders for Clan War League battles
                      </p>
                    </div>
                    <Switch
                      checked={reminders.cwl.enabled}
                      onCheckedChange={(checked) =>
                        setReminders({
                          ...reminders,
                          cwl: { ...reminders.cwl, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {reminders.cwl.enabled && (
                    <div className="ml-7 space-y-4 p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="cwl-time">Reminder Time (hours before)</Label>
                          <Input
                            id="cwl-time"
                            type="number"
                            min="1"
                            max="24"
                            value={reminders.cwl.time}
                            onChange={(e) =>
                              setReminders({
                                ...reminders,
                                cwl: { ...reminders.cwl, time: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cwl-role">Ping Role</Label>
                          <Input
                            id="cwl-role"
                            placeholder="@CWLRoster"
                            value={reminders.cwl.role}
                            onChange={(e) =>
                              setReminders({
                                ...reminders,
                                cwl: { ...reminders.cwl, role: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <Button variant="outline">Reset to Default</Button>
              <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
                Save Reminder Settings
              </Button>
            </div>
          </TabsContent>

          {/* WAR LOGS TAB */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-red-500" />
                  <div>
                    <CardTitle>War Logs Configuration</CardTitle>
                    <CardDescription>
                      Configure how war logs are displayed in your Discord server
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Main Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="logs-enabled" className="text-base font-semibold">Enable War Logs</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically post war results and stats to a designated channel
                    </p>
                  </div>
                  <Switch
                    id="logs-enabled"
                    checked={warLogs.enabled}
                    onCheckedChange={(checked) =>
                      setWarLogs({ ...warLogs, enabled: checked })
                    }
                  />
                </div>

                {warLogs.enabled && (
                  <>
                    <Separator />

                    {/* Channel Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="log-channel">War Logs Channel</Label>
                      <Select value={warLogs.channel} onValueChange={(value) => setWarLogs({ ...warLogs, channel: value })}>
                        <SelectTrigger id="log-channel">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="#war-logs">#war-logs</SelectItem>
                          <SelectItem value="#clan-updates">#clan-updates</SelectItem>
                          <SelectItem value="#general">#general</SelectItem>
                          <SelectItem value="#announcements">#announcements</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose where war logs should be posted
                      </p>
                    </div>

                    <Separator />

                    {/* Log Options */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-white">Log Details</h3>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="include-attacks">Include Attack Details</Label>
                          <p className="text-sm text-muted-foreground">
                            Show individual attack information in war logs
                          </p>
                        </div>
                        <Switch
                          id="include-attacks"
                          checked={warLogs.includeAttacks}
                          onCheckedChange={(checked) =>
                            setWarLogs({ ...warLogs, includeAttacks: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="include-defenses">Include Defense Details</Label>
                          <p className="text-sm text-muted-foreground">
                            Show defensive performance in war logs
                          </p>
                        </div>
                        <Switch
                          id="include-defenses"
                          checked={warLogs.includeDefenses}
                          onCheckedChange={(checked) =>
                            setWarLogs({ ...warLogs, includeDefenses: checked })
                          }
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Notification Options */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-white">Notifications</h3>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="ping-loss">Ping on Loss</Label>
                          <p className="text-sm text-muted-foreground">
                            Notify leadership when war is lost
                          </p>
                        </div>
                        <Switch
                          id="ping-loss"
                          checked={warLogs.pingOnLoss}
                          onCheckedChange={(checked) =>
                            setWarLogs({ ...warLogs, pingOnLoss: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="celebrate-win">Celebrate Wins</Label>
                          <p className="text-sm text-muted-foreground">
                            Post special celebration message when war is won
                          </p>
                        </div>
                        <Switch
                          id="celebrate-win"
                          checked={warLogs.celebrateWin}
                          onCheckedChange={(checked) =>
                            setWarLogs({ ...warLogs, celebrateWin: checked })
                          }
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Preview */}
                    <div className="space-y-2">
                      <Label>Log Preview</Label>
                      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center">
                            <Swords className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">War Result: Victory!</div>
                            <div className="text-xs text-gray-400">Elite Warriors vs Enemy Clan</div>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Stars:</span>
                            <span className="text-white font-medium">45 / 50</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Destruction:</span>
                            <span className="text-white font-medium">94.5%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Attacks Used:</span>
                            <span className="text-white font-medium">50 / 50</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Additional Settings Card */}
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="text-blue-400">💡 Pro Tip</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-blue-300">
                <p>
                  <strong>Customize your logs:</strong> Use the settings above to control what information appears in your war logs.
                </p>
                <p>
                  <strong>Performance tracking:</strong> War logs help you identify top performers and areas for improvement.
                </p>
                <p>
                  <strong>Historical data:</strong> All war logs are saved and can be used for generating statistics over time.
                </p>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <Button variant="outline">Reset to Default</Button>
              <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
                Save War Logs Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
