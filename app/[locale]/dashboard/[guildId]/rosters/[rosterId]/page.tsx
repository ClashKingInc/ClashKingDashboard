"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Settings, Users, Zap, FolderTree, Eye, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface RosterMember {
  name: string;
  tag: string;
  townhall: number;
  discord?: string;
  current_clan?: string;
  current_clan_tag?: string;
  war_pref?: boolean;
  trophies?: number;
  signup_group?: string;
  hitrate?: number;
  last_online?: number;
  current_league?: string;
  hero_lvs?: number;
  sub?: boolean;
}

interface Roster {
  custom_id: string;
  alias: string;
  description?: string;
  roster_type: "clan" | "family";
  signup_scope: "clan-only" | "family-wide";
  clan_tag?: string;
  clan_name?: string;
  clan_badge?: string;
  server_id: number;
  group_id?: string;
  roster_size?: number;
  max_accounts_per_user?: number;
  min_th?: number;
  max_th?: number;
  th_restriction?: string;
  allowed_signup_categories?: string[];
  members?: RosterMember[];
  columns?: string[];
  sort?: string[];
  created_at?: string;
  updated_at?: string;
  event_start_time?: number;
}

export default function RosterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const guildId = params.guildId as string;
  const rosterId = params.rosterId as string;
  const locale = params.locale as string;

  const [roster, setRoster] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("members");
  const [refreshing, setRefreshing] = useState(false);

  // Load roster data
  useEffect(() => {
    loadRoster();
  }, [rosterId]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(`/api/v2/roster/${rosterId}?server_id=${guildId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load roster");
      }

      const data = await response.json();
      const rosterData = data.roster || data;
      setRoster(rosterData);
    } catch (error) {
      console.error("Error loading roster:", error);
      toast({
        title: "Error",
        description: "Failed to load roster data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(`/api/v2/roster/refresh?roster_id=${rosterId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to refresh roster");
      }

      await loadRoster();
      toast({
        title: "Success",
        description: "Roster data refreshed successfully!",
      });
    } catch (error) {
      console.error("Error refreshing roster:", error);
      toast({
        title: "Error",
        description: "Failed to refresh roster data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!roster) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground mb-4">Roster not found</p>
        <Button onClick={() => router.push(`/${locale}/dashboard/${guildId}/rosters`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rosters
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${locale}/dashboard/${guildId}/rosters`)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{roster.alias}</h1>
              <p className="text-sm text-muted-foreground">
                {roster.clan_name && `${roster.clan_name} • `}
                {roster.members?.length || 0} members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={roster.roster_type === "clan" ? "default" : "secondary"}
              className={`${
                roster.roster_type === "clan"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0"
                  : "bg-gradient-to-r from-orange-600 to-amber-600 text-white border-0"
              }`}
            >
              {roster.roster_type.toUpperCase()}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-border"
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              Groups
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Roster Members</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage members, categories, and assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Members management UI coming soon...</p>
                  <p className="text-sm mt-2">Will include drag & drop, categories, and comparison mode</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Roster Settings</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Configure roster properties, columns, and sort order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Settings UI coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Automation</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Set up automated reminders and actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Automation coming in a future update...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Groups & Categories</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage signup groups and member categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Groups management coming in a future update...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
