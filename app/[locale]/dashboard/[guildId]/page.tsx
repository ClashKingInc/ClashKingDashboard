import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clashKingColors } from "@/lib/theme";
import {
  Users,
  Shield,
  Swords,
  Settings,
  Crown,
  UserPlus,
  Bell,
  CheckCircle2,
  ArrowRight,
  Activity,
  TrendingUp,
} from "lucide-react";

export default function OverviewPage() {
  // Mock data - Replace with actual API calls
  const stats = {
    clans: 8,
    members: 245,
    activeWars: 3,
    clanChange: "+2",
    memberChange: "+12",
    warChange: "+1",
  };

  const recentActivity = [
    {
      id: 1,
      type: "member_join",
      message: "15 new members linked their accounts",
      timestamp: "2 hours ago",
      icon: UserPlus,
    },
    {
      id: 2,
      type: "war_start",
      message: "Clan War League started for 3 clans",
      timestamp: "5 hours ago",
      icon: Swords,
    },
    {
      id: 3,
      type: "role_update",
      message: "Auto-roles updated for 42 members",
      timestamp: "1 day ago",
      icon: Crown,
    },
    {
      id: 4,
      type: "settings",
      message: "Nickname format updated",
      timestamp: "2 days ago",
      icon: Settings,
    },
  ];

  const quickActions = [
    {
      title: "Manage Clans",
      description: "Add and configure your clans",
      icon: Shield,
      href: "/clans",
      color: clashKingColors.primary,
    },
    {
      title: "Auto Roles",
      description: "Configure automatic role assignments",
      icon: Crown,
      href: "/roles",
      color: "#5B9FFF",
    },
    {
      title: "Commands",
      description: "Customize bot commands",
      icon: Activity,
      href: "/commands",
      color: "#3BA55D",
    },
    {
      title: "Settings",
      description: "General bot configuration",
      icon: Settings,
      href: "/settings",
      color: "#FAA81A",
    },
  ];

  // Check if this is a new server (mock logic)
  const isNewServer = stats.clans === 0;

  return (
    <div className="min-h-screen bg-[#0F0F0F] p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Monitor your server stats and manage your ClashKing bot
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Total Clans */}
          <Card className="bg-[#1A1A1A] border-[#2D2D2D] hover:border-[#3D3D3D] transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-400">
                Total Clans
              </CardTitle>
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${clashKingColors.primary}15` }}
              >
                <Shield
                  className="h-5 w-5"
                  style={{ color: clashKingColors.primary }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold text-white">{stats.clans}</div>
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3 text-[#3BA55D]" />
                <span className="text-[#3BA55D] font-medium">
                  {stats.clanChange}
                </span>
                <span className="text-gray-500">from last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Members */}
          <Card className="bg-[#1A1A1A] border-[#2D2D2D] hover:border-[#3D3D3D] transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-400">
                Linked Members
              </CardTitle>
              <div className="p-2 rounded-lg bg-[#5B9FFF15]">
                <Users className="h-5 w-5 text-[#5B9FFF]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold text-white">{stats.members}</div>
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3 text-[#3BA55D]" />
                <span className="text-[#3BA55D] font-medium">
                  {stats.memberChange}
                </span>
                <span className="text-gray-500">from last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Wars */}
          <Card className="bg-[#1A1A1A] border-[#2D2D2D] hover:border-[#3D3D3D] transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-400">
                Active Wars
              </CardTitle>
              <div className="p-2 rounded-lg bg-[#FAA81A15]">
                <Swords className="h-5 w-5 text-[#FAA81A]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold text-white">
                {stats.activeWars}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3 text-[#3BA55D]" />
                <span className="text-[#3BA55D] font-medium">
                  {stats.warChange}
                </span>
                <span className="text-gray-500">from last week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Section - Only show for new servers */}
        {isNewServer && (
          <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#242424] border-[#2D2D2D]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${clashKingColors.primary}15` }}
                >
                  <Bell
                    className="h-5 w-5"
                    style={{ color: clashKingColors.primary }}
                  />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">
                    Welcome to ClashKing!
                  </CardTitle>
                  <CardDescription className="text-gray-400 mt-1">
                    Let's get your server set up in just a few steps
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-4 group">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white"
                  style={{ backgroundColor: clashKingColors.primary }}
                >
                  1
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-semibold text-white text-base">
                    Add Your First Clan
                  </h3>
                  <p className="text-sm text-gray-400">
                    Connect your Clash of Clans clan by entering the clan tag. This will
                    allow the bot to track your members and wars.
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    style={{
                      backgroundColor: clashKingColors.primary,
                      color: "white",
                    }}
                  >
                    Add Clan
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2D2D2D] text-gray-400 font-bold">
                  2
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-semibold text-white text-base">
                    Configure Auto Roles
                  </h3>
                  <p className="text-sm text-gray-400">
                    Set up automatic role assignment based on Town Hall level, trophies,
                    clan membership, and more.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2D2D2D] text-gray-400 font-bold">
                  3
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-semibold text-white text-base">
                    Customize Settings
                  </h3>
                  <p className="text-sm text-gray-400">
                    Set up nickname formats, embed colors, logging channels, and other
                    preferences for your server.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="bg-[#1A1A1A] border-[#2D2D2D]">
            <CardHeader>
              <CardTitle className="text-xl text-white">Quick Actions</CardTitle>
              <CardDescription className="text-gray-400">
                Jump to the most common configuration sections
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  className="flex items-start gap-3 p-4 rounded-lg bg-[#242424] border border-[#2D2D2D] hover:border-[#3D3D3D] hover:bg-[#2F2F2F] transition-all group text-left"
                >
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <action.icon className="h-5 w-5" style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm group-hover:text-gray-100 transition-colors">
                      {action.title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-[#1A1A1A] border-[#2D2D2D]">
            <CardHeader>
              <CardTitle className="text-xl text-white">Recent Activity</CardTitle>
              <CardDescription className="text-gray-400">
                Latest events and updates from your server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[#242424] border border-[#2D2D2D] hover:border-[#3D3D3D] transition-colors"
                >
                  <div className="p-2 rounded-lg bg-[#2F2F2F] shrink-0">
                    <activity.icon className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                className="w-full mt-2 text-gray-400 hover:text-white hover:bg-[#242424]"
                size="sm"
              >
                View All Activity
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Status Bar */}
        <Card className="bg-[#1A1A1A] border-[#2D2D2D]">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-3 w-3 rounded-full bg-[#3BA55D] animate-pulse" />
                <div className="absolute inset-0 h-3 w-3 rounded-full bg-[#3BA55D] animate-ping opacity-75" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Bot Status: Online</p>
                <p className="text-xs text-gray-500">All systems operational</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#3BA55D]" />
                <span className="text-gray-400">API Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#3BA55D]" />
                <span className="text-gray-400">Database Synced</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
