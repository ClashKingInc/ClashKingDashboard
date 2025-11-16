"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  Bell,
  Swords,
  Castle,
  Trophy,
  UserX,
  Plus,
  Trash2,
  Loader2,
  Settings,
  Clock,
} from "lucide-react";
import { createApiClient } from "@/lib/api";

interface Reminder {
  id: string;
  type: string;
  clan_tag?: string;
  channel_id?: string;
  time: string;
  custom_text?: string;
  townhall_filter?: number[];
  roles?: string[];
  war_types?: string[];
  point_threshold?: number;
  attack_threshold?: number;
}

interface Channel {
  id: string;
  name: string;
}

export default function RemindersPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);

  const [warReminders, setWarReminders] = useState<Reminder[]>([]);
  const [capitalReminders, setCapitalReminders] = useState<Reminder[]>([]);
  const [clanGamesReminders, setClanGamesReminders] = useState<Reminder[]>([]);
  const [inactivityReminders, setInactivityReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const api = createApiClient();

        const [channelsRes, remindersRes] = await Promise.all([
          api.server.getChannels(Number(guildId)),
          fetch(`https://api.clashk.ing/v2/server/${guildId}/reminders`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          }).then(res => res.json())
        ]);

        if (channelsRes.data) {
          setChannels(channelsRes.data);
        }

        if (remindersRes) {
          setWarReminders(remindersRes.war_reminders || []);
          setCapitalReminders(remindersRes.capital_reminders || []);
          setClanGamesReminders(remindersRes.clan_games_reminders || []);
          setInactivityReminders(remindersRes.inactivity_reminders || []);
        }
      } catch (error) {
        console.error("Failed to fetch reminders:", error);
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
  }, [guildId]);

  const handleDeleteReminder = async (reminderId: string, type: string) => {
    try {
      const response = await fetch(`https://api.clashk.ing/v2/server/${guildId}/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        // Remove from local state
        if (type === "War") {
          setWarReminders(warReminders.filter(r => r.id !== reminderId));
        } else if (type === "Clan Capital") {
          setCapitalReminders(capitalReminders.filter(r => r.id !== reminderId));
        } else if (type === "Clan Games") {
          setClanGamesReminders(clanGamesReminders.filter(r => r.id !== reminderId));
        } else if (type === "Inactivity") {
          setInactivityReminders(inactivityReminders.filter(r => r.id !== reminderId));
        }
      }
    } catch (error) {
      console.error("Failed to delete reminder:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading reminders...</p>
        </div>
      </div>
    );
  }

  const ReminderCard = ({ reminder, onDelete }: { reminder: Reminder; onDelete: () => void }) => (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold text-foreground">{reminder.time} before event</p>
              <p className="text-sm text-muted-foreground">
                Channel: #{channels.find(c => c.id === reminder.channel_id)?.name || "Not set"}
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {reminder.custom_text && (
          <p className="text-sm text-muted-foreground mb-2">
            Message: {reminder.custom_text}
          </p>
        )}

        {reminder.war_types && (
          <div className="flex gap-2 flex-wrap">
            {reminder.war_types.map(type => (
              <Badge key={type} variant="secondary">{type}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Reminders</h1>
                <p className="text-muted-foreground mt-1">
                  Configure automatic reminders for wars, raids, and events
                </p>
              </div>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Reminder
          </Button>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-card border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">War Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-red-500">{warReminders.length}</div>
                <Swords className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Capital Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-yellow-500">{capitalReminders.length}</div>
                <Castle className="h-8 w-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clan Games</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-purple-500">{clanGamesReminders.length}</div>
                <Trophy className="h-8 w-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-orange-500/30 bg-orange-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactivity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-orange-500">{inactivityReminders.length}</div>
                <UserX className="h-8 w-8 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="war" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
            <TabsTrigger value="war">
              <Swords className="mr-2 h-4 w-4" />
              War
            </TabsTrigger>
            <TabsTrigger value="capital">
              <Castle className="mr-2 h-4 w-4" />
              Capital
            </TabsTrigger>
            <TabsTrigger value="clan-games">
              <Trophy className="mr-2 h-4 w-4" />
              Clan Games
            </TabsTrigger>
            <TabsTrigger value="inactivity">
              <UserX className="mr-2 h-4 w-4" />
              Inactivity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="war" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">War Reminders</CardTitle>
                <CardDescription>
                  Get notified before war attacks are due
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {warReminders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No war reminders configured
                  </p>
                ) : (
                  warReminders.map(reminder => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onDelete={() => handleDeleteReminder(reminder.id, "War")}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="capital" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Capital Raid Reminders</CardTitle>
                <CardDescription>
                  Get notified during raid weekends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {capitalReminders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No capital reminders configured
                  </p>
                ) : (
                  capitalReminders.map(reminder => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onDelete={() => handleDeleteReminder(reminder.id, "Clan Capital")}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clan-games" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Clan Games Reminders</CardTitle>
                <CardDescription>
                  Get notified about clan games progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {clanGamesReminders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No clan games reminders configured
                  </p>
                ) : (
                  clanGamesReminders.map(reminder => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onDelete={() => handleDeleteReminder(reminder.id, "Clan Games")}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inactivity" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Inactivity Reminders</CardTitle>
                <CardDescription>
                  Get notified about inactive clan members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {inactivityReminders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No inactivity reminders configured
                  </p>
                ) : (
                  inactivityReminders.map(reminder => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onDelete={() => handleDeleteReminder(reminder.id, "Inactivity")}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="mt-8 bg-card border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-foreground">About Reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">War Reminders:</strong> Get notified before war attacks are due. Configure different times and war types.
            </p>
            <p>
              <strong className="text-foreground">Capital Reminders:</strong> Reminders for raid weekend attacks and capital contributions.
            </p>
            <p>
              <strong className="text-foreground">Clan Games:</strong> Track clan games progress and remind members to reach point thresholds.
            </p>
            <p>
              <strong className="text-foreground">Inactivity:</strong> Monitor and notify about inactive clan members.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
