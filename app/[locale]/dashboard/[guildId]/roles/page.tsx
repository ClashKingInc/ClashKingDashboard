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
  Shield,
  Trophy,
  Star,
  Users,
  Hammer,
  Plus,
  Trash2,
  Settings,
  Crown,
  Zap,
  Award,
  TrendingUp,
  BarChart3,
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

// Mock data for role distribution
const roleDistributionData = [
  { name: "TH16", members: 12, color: "#D90709" },
  { name: "TH15", members: 18, color: "#FF3333" },
  { name: "TH14", members: 24, color: "#FF6666" },
  { name: "TH13", members: 15, color: "#FF9999" },
  { name: "TH12", members: 10, color: "#FFCCCC" },
  { name: "Other", members: 21, color: "#808080" },
];

const builderRoleData = [
  { name: "BH10", value: 35 },
  { name: "BH9", value: 28 },
  { name: "BH8", value: 22 },
  { name: "BH7-", value: 15 },
];

const achievementData = [
  { name: "3-Star", members: 45 },
  { name: "Donations", members: 38 },
  { name: "Wars Won", members: 52 },
  { name: "CWL Master", members: 15 },
];

export default function RolesPage() {
  // Town Hall Roles state
  const [thRoles, setThRoles] = useState({
    enabled: true,
    roles: [
      { level: 16, roleId: "@TH16", roleName: "TH16" },
      { level: 15, roleId: "@TH15", roleName: "TH15" },
      { level: 14, roleId: "@TH14", roleName: "TH14" },
      { level: 13, roleId: "@TH13", roleName: "TH13" },
      { level: 12, roleId: "@TH12", roleName: "TH12" },
      { level: 11, roleId: "@TH11", roleName: "TH11" },
    ],
  });

  // Legend League Roles state
  const [legendRoles, setLegendRoles] = useState({
    enabled: true,
    roles: [
      { minTrophies: 5500, roleId: "@Legend Elite", roleName: "Legend Elite" },
      { minTrophies: 5200, roleId: "@Legend Master", roleName: "Legend Master" },
      { minTrophies: 5000, roleId: "@Legend", roleName: "Legend League" },
    ],
  });

  // Achievement Roles state
  const [achievementRoles, setAchievementRoles] = useState({
    enabled: true,
    roles: [
      { achievement: "3star_specialist", name: "3-Star Specialist", criteria: "80%+ 3-star rate", roleId: "@3StarPro" },
      { achievement: "donation_king", name: "Donation King", criteria: "10,000+ donations/season", roleId: "@DonationKing" },
      { achievement: "war_hero", name: "War Hero", criteria: "100+ war stars", roleId: "@WarHero" },
      { achievement: "cwl_champion", name: "CWL Champion", criteria: "Champion League I", roleId: "@CWLChamp" },
    ],
  });

  // Family Roles state
  const [familyRoles, setFamilyRoles] = useState({
    enabled: true,
    autoAssign: true,
    removeOnLeave: true,
    roles: [
      { clanTag: "#CLAN123", roleName: "Elite Warriors", roleId: "@EliteWarriors" },
      { clanTag: "#CLAN456", roleName: "Training Ground", roleId: "@TrainingGround" },
      { clanTag: "#CLAN789", roleName: "War Masters", roleId: "@WarMasters" },
    ],
  });

  // Builder Roles state
  const [builderRoles, setBuilderRoles] = useState({
    enabled: true,
    roles: [
      { level: 10, roleId: "@BH10", roleName: "BH10" },
      { level: 9, roleId: "@BH9", roleName: "BH9" },
      { level: 8, roleId: "@BH8", roleName: "BH8" },
      { level: 7, roleId: "@BH7", roleName: "BH7" },
    ],
  });

  const addThRole = () => {
    setThRoles({
      ...thRoles,
      roles: [...thRoles.roles, { level: 10, roleId: "", roleName: "" }],
    });
  };

  const removeThRole = (index: number) => {
    setThRoles({
      ...thRoles,
      roles: thRoles.roles.filter((_, i) => i !== index),
    });
  };

  const addLegendRole = () => {
    setLegendRoles({
      ...legendRoles,
      roles: [...legendRoles.roles, { minTrophies: 5000, roleId: "", roleName: "" }],
    });
  };

  const removeLegendRole = (index: number) => {
    setLegendRoles({
      ...legendRoles,
      roles: legendRoles.roles.filter((_, i) => i !== index),
    });
  };

  const addAchievementRole = () => {
    setAchievementRoles({
      ...achievementRoles,
      roles: [...achievementRoles.roles, { achievement: "", name: "", criteria: "", roleId: "" }],
    });
  };

  const removeAchievementRole = (index: number) => {
    setAchievementRoles({
      ...achievementRoles,
      roles: achievementRoles.roles.filter((_, i) => i !== index),
    });
  };

  const addFamilyRole = () => {
    setFamilyRoles({
      ...familyRoles,
      roles: [...familyRoles.roles, { clanTag: "", roleName: "", roleId: "" }],
    });
  };

  const removeFamilyRole = (index: number) => {
    setFamilyRoles({
      ...familyRoles,
      roles: familyRoles.roles.filter((_, i) => i !== index),
    });
  };

  const addBuilderRole = () => {
    setBuilderRoles({
      ...builderRoles,
      roles: [...builderRoles.roles, { level: 6, roleId: "", roleName: "" }],
    });
  };

  const removeBuilderRole = (index: number) => {
    setBuilderRoles({
      ...builderRoles,
      roles: builderRoles.roles.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30">
                <Shield className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Role Management</h1>
                <p className="text-muted-foreground mt-1">
                  Configure automatic role assignment based on player progress
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
            <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
              <Settings className="mr-2 h-4 w-4" />
              Sync Roles Now
            </Button>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-blue-500">24</div>
                <Shield className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Across all categories
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Members with Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-500">187</div>
                <Users className="h-8 w-8 text-green-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-green-500">+12</span> this week
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-yellow-500">5m</div>
                <Zap className="h-8 w-8 text-yellow-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Auto-sync enabled
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Role Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-purple-500">43</div>
                <TrendingUp className="h-8 w-8 text-purple-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                In the last 24 hours
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="townhall" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[800px]">
            <TabsTrigger value="townhall">
              <Crown className="mr-2 h-4 w-4" />
              Town Hall
            </TabsTrigger>
            <TabsTrigger value="legend">
              <Trophy className="mr-2 h-4 w-4" />
              Legend
            </TabsTrigger>
            <TabsTrigger value="achievement">
              <Award className="mr-2 h-4 w-4" />
              Achievement
            </TabsTrigger>
            <TabsTrigger value="family">
              <Users className="mr-2 h-4 w-4" />
              Family
            </TabsTrigger>
            <TabsTrigger value="builder">
              <Hammer className="mr-2 h-4 w-4" />
              Builder
            </TabsTrigger>
          </TabsList>

          {/* TOWN HALL ROLES TAB */}
          <TabsContent value="townhall" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-red-500" />
                        <div>
                          <CardTitle>Town Hall Roles</CardTitle>
                          <CardDescription>
                            Automatically assign roles based on player Town Hall level
                          </CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={thRoles.enabled}
                        onCheckedChange={(checked) => setThRoles({ ...thRoles, enabled: checked })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {thRoles.enabled && (
                      <>
                        <div className="space-y-3">
                          {thRoles.roles.map((role, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                              <div className="flex-shrink-0 w-20">
                                <Label className="text-xs text-muted-foreground">Level</Label>
                                <Select
                                  value={role.level.toString()}
                                  onValueChange={(value) => {
                                    const newRoles = [...thRoles.roles];
                                    newRoles[index].level = parseInt(value);
                                    setThRoles({ ...thRoles, roles: newRoles });
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[16, 15, 14, 13, 12, 11, 10, 9, 8].map((th) => (
                                      <SelectItem key={th} value={th.toString()}>
                                        TH {th}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">Discord Role</Label>
                                <Input
                                  placeholder="@TH16"
                                  value={role.roleId}
                                  onChange={(e) => {
                                    const newRoles = [...thRoles.roles];
                                    newRoles[index].roleId = e.target.value;
                                    setThRoles({ ...thRoles, roles: newRoles });
                                  }}
                                  className="h-8"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeThRole(index)}
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={addThRole}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Town Hall Role
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardHeader>
                    <CardTitle className="text-blue-400">ℹ️ How it works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-blue-300">
                    <p>
                      <strong>Automatic assignment:</strong> Roles are automatically assigned when members link their accounts or upgrade their Town Hall.
                    </p>
                    <p>
                      <strong>Role removal:</strong> When a player upgrades, their previous TH role is removed automatically.
                    </p>
                    <p>
                      <strong>Sync frequency:</strong> Roles are checked and updated every 15 minutes.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Town Hall Distribution</CardTitle>
                    <CardDescription>Current member breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={roleDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, members }) => `${name}: ${members}`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="members"
                        >
                          {roleDistributionData.map((entry, index) => (
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
                    <CardTitle className="text-base">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Highest TH</span>
                      <Badge className="bg-red-500/20 text-red-500 border-red-500/30">TH16</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Most Common</span>
                      <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">TH14</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Average TH</span>
                      <Badge variant="secondary">13.2</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* LEGEND LEAGUE ROLES TAB */}
          <TabsContent value="legend" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <div>
                          <CardTitle>Legend League Roles</CardTitle>
                          <CardDescription>
                            Reward players who reach Legend League with exclusive roles
                          </CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={legendRoles.enabled}
                        onCheckedChange={(checked) => setLegendRoles({ ...legendRoles, enabled: checked })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {legendRoles.enabled && (
                      <>
                        <div className="space-y-3">
                          {legendRoles.roles.map((role, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                              <div className="flex-shrink-0 w-32">
                                <Label className="text-xs text-muted-foreground">Min Trophies</Label>
                                <Input
                                  type="number"
                                  placeholder="5000"
                                  value={role.minTrophies}
                                  onChange={(e) => {
                                    const newRoles = [...legendRoles.roles];
                                    newRoles[index].minTrophies = parseInt(e.target.value);
                                    setLegendRoles({ ...legendRoles, roles: newRoles });
                                  }}
                                  className="h-8"
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">Discord Role</Label>
                                <Input
                                  placeholder="@Legend"
                                  value={role.roleId}
                                  onChange={(e) => {
                                    const newRoles = [...legendRoles.roles];
                                    newRoles[index].roleId = e.target.value;
                                    setLegendRoles({ ...legendRoles, roles: newRoles });
                                  }}
                                  className="h-8"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLegendRole(index)}
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={addLegendRole}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Legend Role Tier
                        </Button>

                        <Separator />

                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <div className="flex items-start gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-yellow-200">Trophy-based Role Assignment</p>
                              <p className="text-xs text-yellow-300/80">
                                Roles are assigned based on current trophy count. Players will receive the highest role tier they qualify for.
                                Roles are updated daily during the sync cycle.
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Legend Statistics</CardTitle>
                    <CardDescription>Current season data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-500/10">
                        <span className="text-sm text-muted-foreground">In Legend</span>
                        <span className="text-2xl font-bold text-yellow-500">47</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-gray-900/50">
                        <span className="text-sm text-muted-foreground">Highest Trophy</span>
                        <span className="text-lg font-bold text-foreground">5,843</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-gray-900/50">
                        <span className="text-sm text-muted-foreground">Avg Trophies</span>
                        <span className="text-lg font-bold text-foreground">5,234</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ACHIEVEMENT ROLES TAB */}
          <TabsContent value="achievement" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-purple-500" />
                        <div>
                          <CardTitle>Achievement Roles</CardTitle>
                          <CardDescription>
                            Reward players for exceptional performance and milestones
                          </CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={achievementRoles.enabled}
                        onCheckedChange={(checked) => setAchievementRoles({ ...achievementRoles, enabled: checked })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {achievementRoles.enabled && (
                      <>
                        <div className="space-y-3">
                          {achievementRoles.roles.map((role, index) => (
                            <div key={index} className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
                              <div className="flex items-center justify-between">
                                <Input
                                  placeholder="Achievement Name"
                                  value={role.name}
                                  onChange={(e) => {
                                    const newRoles = [...achievementRoles.roles];
                                    newRoles[index].name = e.target.value;
                                    setAchievementRoles({ ...achievementRoles, roles: newRoles });
                                  }}
                                  className="max-w-xs font-medium"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAchievementRole(index)}
                                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Criteria</Label>
                                  <Input
                                    placeholder="e.g., 80%+ 3-star rate"
                                    value={role.criteria}
                                    onChange={(e) => {
                                      const newRoles = [...achievementRoles.roles];
                                      newRoles[index].criteria = e.target.value;
                                      setAchievementRoles({ ...achievementRoles, roles: newRoles });
                                    }}
                                    className="h-8 mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Discord Role</Label>
                                  <Input
                                    placeholder="@AchievementRole"
                                    value={role.roleId}
                                    onChange={(e) => {
                                      const newRoles = [...achievementRoles.roles];
                                      newRoles[index].roleId = e.target.value;
                                      setAchievementRoles({ ...achievementRoles, roles: newRoles });
                                    }}
                                    className="h-8 mt-1"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={addAchievementRole}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Achievement Role
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-purple-500/30 bg-purple-500/5">
                  <CardHeader>
                    <CardTitle className="text-purple-400">💎 Popular Achievements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-purple-300">
                    <p><strong>3-Star Specialist:</strong> 80%+ 3-star rate in wars (last 30 attacks)</p>
                    <p><strong>Donation King:</strong> 10,000+ donations in current season</p>
                    <p><strong>War Hero:</strong> 100+ war stars earned</p>
                    <p><strong>CWL Champion:</strong> Reached Champion League I or higher</p>
                    <p><strong>Clan Games Master:</strong> Max points in last 3 clan games</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Achievement Stats</CardTitle>
                    <CardDescription>Members with achievements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={achievementData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkTheme.border.primary} />
                        <XAxis dataKey="name" stroke={darkTheme.text.secondary} fontSize={12} />
                        <YAxis stroke={darkTheme.text.secondary} fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkTheme.background.elevated,
                            border: `1px solid ${darkTheme.border.primary}`,
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="members" fill="#9333EA" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* FAMILY ROLES TAB */}
          <TabsContent value="family" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-500" />
                        <div>
                          <CardTitle>Family Roles</CardTitle>
                          <CardDescription>
                            Assign roles to members based on their clan membership
                          </CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={familyRoles.enabled}
                        onCheckedChange={(checked) => setFamilyRoles({ ...familyRoles, enabled: checked })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {familyRoles.enabled && (
                      <>
                        <div className="grid gap-4 md:grid-cols-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="auto-assign">Auto-assign on Join</Label>
                              <p className="text-xs text-muted-foreground">
                                Automatically assign role when member joins clan
                              </p>
                            </div>
                            <Switch
                              id="auto-assign"
                              checked={familyRoles.autoAssign}
                              onCheckedChange={(checked) =>
                                setFamilyRoles({ ...familyRoles, autoAssign: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="remove-leave">Remove on Leave</Label>
                              <p className="text-xs text-muted-foreground">
                                Remove role when member leaves clan
                              </p>
                            </div>
                            <Switch
                              id="remove-leave"
                              checked={familyRoles.removeOnLeave}
                              onCheckedChange={(checked) =>
                                setFamilyRoles({ ...familyRoles, removeOnLeave: checked })
                              }
                            />
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          {familyRoles.roles.map((role, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                              <div className="flex-shrink-0 w-32">
                                <Label className="text-xs text-muted-foreground">Clan Tag</Label>
                                <Input
                                  placeholder="#CLAN123"
                                  value={role.clanTag}
                                  onChange={(e) => {
                                    const newRoles = [...familyRoles.roles];
                                    newRoles[index].clanTag = e.target.value;
                                    setFamilyRoles({ ...familyRoles, roles: newRoles });
                                  }}
                                  className="h-8 font-mono"
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">Clan Name</Label>
                                <Input
                                  placeholder="Elite Warriors"
                                  value={role.roleName}
                                  onChange={(e) => {
                                    const newRoles = [...familyRoles.roles];
                                    newRoles[index].roleName = e.target.value;
                                    setFamilyRoles({ ...familyRoles, roles: newRoles });
                                  }}
                                  className="h-8"
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">Discord Role</Label>
                                <Input
                                  placeholder="@ClanRole"
                                  value={role.roleId}
                                  onChange={(e) => {
                                    const newRoles = [...familyRoles.roles];
                                    newRoles[index].roleId = e.target.value;
                                    setFamilyRoles({ ...familyRoles, roles: newRoles });
                                  }}
                                  className="h-8"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFamilyRole(index)}
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={addFamilyRole}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Clan Role
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="text-green-400">🏰 Family Role Benefits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-green-300">
                    <p>
                      <strong>Clan identity:</strong> Members can represent their clan with a dedicated role color and name.
                    </p>
                    <p>
                      <strong>Easy management:</strong> Automatically sync roles when members join or leave clans.
                    </p>
                    <p>
                      <strong>Multi-clan support:</strong> Perfect for clan families with multiple clans in one Discord server.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Clan Overview</CardTitle>
                    <CardDescription>Members per clan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {familyRoles.roles.map((role, index) => (
                        <div key={index} className="p-3 rounded-lg bg-secondary/50 border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm text-foreground">{role.roleName || "Unnamed Clan"}</span>
                            <Badge variant="secondary">{Math.floor(Math.random() * 30 + 20)}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{role.clanTag || "No tag"}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* BUILDER ROLES TAB */}
          <TabsContent value="builder" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hammer className="h-5 w-5 text-orange-500" />
                        <div>
                          <CardTitle>Builder Base Roles</CardTitle>
                          <CardDescription>
                            Assign roles based on Builder Hall level
                          </CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={builderRoles.enabled}
                        onCheckedChange={(checked) => setBuilderRoles({ ...builderRoles, enabled: checked })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {builderRoles.enabled && (
                      <>
                        <div className="space-y-3">
                          {builderRoles.roles.map((role, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                              <div className="flex-shrink-0 w-20">
                                <Label className="text-xs text-muted-foreground">Level</Label>
                                <Select
                                  value={role.level.toString()}
                                  onValueChange={(value) => {
                                    const newRoles = [...builderRoles.roles];
                                    newRoles[index].level = parseInt(value);
                                    setBuilderRoles({ ...builderRoles, roles: newRoles });
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[10, 9, 8, 7, 6, 5, 4].map((bh) => (
                                      <SelectItem key={bh} value={bh.toString()}>
                                        BH {bh}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">Discord Role</Label>
                                <Input
                                  placeholder="@BH10"
                                  value={role.roleId}
                                  onChange={(e) => {
                                    const newRoles = [...builderRoles.roles];
                                    newRoles[index].roleId = e.target.value;
                                    setBuilderRoles({ ...builderRoles, roles: newRoles });
                                  }}
                                  className="h-8"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBuilderRole(index)}
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={addBuilderRole}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Builder Hall Role
                        </Button>

                        <Separator />

                        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                          <div className="flex items-start gap-2">
                            <Hammer className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-orange-200">Builder Base Support</p>
                              <p className="text-xs text-orange-300/80">
                                Roles are assigned based on the player's Builder Hall level. These roles sync alongside Town Hall roles.
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-orange-500/30 bg-orange-500/5">
                  <CardHeader>
                    <CardTitle className="text-orange-400">🔨 Builder Base Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-orange-300">
                    <p>
                      <strong>Dual progression:</strong> Members can have both Town Hall and Builder Hall roles.
                    </p>
                    <p>
                      <strong>Independent tracking:</strong> Builder Base progression is tracked separately from main village.
                    </p>
                    <p>
                      <strong>Optional feature:</strong> You can disable Builder roles if your server doesn't focus on Builder Base.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Builder Distribution</CardTitle>
                    <CardDescription>Current breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={builderRoleData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}%`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {builderRoleData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={["#FB923C", "#FDBA74", "#FED7AA", "#FEE2C5"][index]} />
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
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-4 mt-8">
          <Button variant="outline">Reset All Changes</Button>
          <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
            Save All Role Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
