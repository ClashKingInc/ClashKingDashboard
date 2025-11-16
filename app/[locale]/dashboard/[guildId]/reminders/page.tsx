"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Target,
  Users,
  Trophy,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Loader2,
  Castle,
  UserX
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// API types based on ClashKingAPI reminders endpoints
interface ReminderConfig {
  id: string;
  type: "War" | "Clan Capital" | "Clan Games" | "Inactivity" | "roster";
  clan_tag?: string;
  channel_id?: string;
  time: string;
  custom_text?: string;
  townhall_filter?: number[];
  roles?: string[];
  war_types?: string[];
  point_threshold?: number;
  attack_threshold?: number;
  roster_id?: string;
  ping_type?: string;
}

interface ServerRemindersResponse {
  war_reminders: ReminderConfig[];
  capital_reminders: ReminderConfig[];
  clan_games_reminders: ReminderConfig[];
  inactivity_reminders: ReminderConfig[];
  roster_reminders: ReminderConfig[];
}

interface CreateReminderRequest {
  type: string;
  clan_tag?: string;
  channel_id: string;
  time: string;
  custom_text?: string;
  townhall_filter?: number[];
  roles?: string[];
  war_types?: string[];
  point_threshold?: number;
  attack_threshold?: number;
  roster_id?: string;
  ping_type?: string;
}

const reminderTypes = [
  { value: "War", label: "War Reminders", icon: Target, color: "text-red-500" },
  { value: "Clan Capital", label: "Clan Capital", icon: Castle, color: "text-purple-500" },
  { value: "Clan Games", label: "Clan Games", icon: Calendar, color: "text-green-500" },
  { value: "Inactivity", label: "Inactivity", icon: UserX, color: "text-orange-500" },
  { value: "roster", label: "Roster", icon: Users, color: "text-blue-500" },
];

export default function RemindersPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params.guildId as string;

  const [allReminders, setAllReminders] = useState<ReminderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reminders from API
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push("/login");
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          throw new Error("API URL is not configured");
        }

        const response = await fetch(`${apiUrl}/v2/server/${guildId}/reminders`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            router.push("/login");
            return;
          }
          throw new Error(`Failed to fetch reminders: ${response.statusText}`);
        }

        const data: ServerRemindersResponse = await response.json();

        // Flatten all reminders into a single array
        const allRemindersArray = [
          ...data.war_reminders,
          ...data.capital_reminders,
          ...data.clan_games_reminders,
          ...data.inactivity_reminders,
          ...data.roster_reminders,
        ];

        setAllReminders(allRemindersArray);
      } catch (err) {
        console.error("Error fetching reminders:", err);
        setError(err instanceof Error ? err.message : "Failed to load reminders");
        toast({
          title: "Error",
          description: "Failed to load reminders. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchReminders();
    }
  }, [guildId, router, toast]);

  // Add a new reminder (locally, to be saved later)
  const addReminder = () => {
    const newReminder: ReminderConfig = {
      id: `temp-${Date.now()}`, // Temporary ID for new reminders
      type: "War",
      channel_id: "",
      time: "6h",
      custom_text: "",
      clan_tag: "",
      war_types: ["Random", "Friendly", "CWL"],
      townhall_filter: [],
      roles: [],
    };
    setAllReminders([...allReminders, newReminder]);
  };

  // Update a reminder
  const updateReminder = (index: number, field: keyof ReminderConfig, value: any) => {
    const updatedReminders = [...allReminders];
    updatedReminders[index] = {
      ...updatedReminders[index],
      [field]: value,
    };
    setAllReminders(updatedReminders);
  };

  // Delete a reminder
  const deleteReminder = async (index: number) => {
    const reminder = allReminders[index];

    // If reminder has a real ID (not temporary), delete it from the API
    if (!reminder.id.startsWith('temp-')) {
      try {
        setSaving(true);
        const accessToken = localStorage.getItem("access_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        const response = await fetch(`${apiUrl}/v2/server/${guildId}/reminders/${reminder.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete reminder');
        }

        toast({
          title: "Success",
          description: "Reminder deleted successfully",
        });
      } catch (err) {
        console.error("Error deleting reminder:", err);
        toast({
          title: "Error",
          description: "Failed to delete reminder",
          variant: "destructive",
        });
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    // Remove from local state
    const updatedReminders = allReminders.filter((_, i) => i !== index);
    setAllReminders(updatedReminders);
  };

  // Save a single reminder
  const saveReminder = async (reminder: ReminderConfig) => {
    const accessToken = localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      throw new Error("API URL is not configured");
    }

    const isNew = reminder.id.startsWith('temp-');

    if (isNew) {
      // Create new reminder
      const createRequest: CreateReminderRequest = {
        type: reminder.type,
        clan_tag: reminder.clan_tag,
        channel_id: reminder.channel_id || "",
        time: reminder.time,
        custom_text: reminder.custom_text,
        townhall_filter: reminder.townhall_filter,
        roles: reminder.roles,
        war_types: reminder.war_types,
        point_threshold: reminder.point_threshold,
        attack_threshold: reminder.attack_threshold,
        roster_id: reminder.roster_id,
        ping_type: reminder.ping_type,
      };

      const response = await fetch(`${apiUrl}/v2/server/${guildId}/reminders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to create reminder: ${response.statusText}`);
      }

      return await response.json();
    } else {
      // Update existing reminder
      const updateRequest = {
        channel_id: reminder.channel_id,
        time: reminder.time,
        custom_text: reminder.custom_text,
        townhall_filter: reminder.townhall_filter,
        roles: reminder.roles,
        war_types: reminder.war_types,
        point_threshold: reminder.point_threshold,
        attack_threshold: reminder.attack_threshold,
        ping_type: reminder.ping_type,
      };

      const response = await fetch(`${apiUrl}/v2/server/${guildId}/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to update reminder: ${response.statusText}`);
      }

      return await response.json();
    }
  };

  // Save all reminders
  const saveAllReminders = async () => {
    try {
      setSaving(true);

      // Save each reminder
      for (const reminder of allReminders) {
        await saveReminder(reminder);
      }

      toast({
        title: "Success",
        description: "All reminders saved successfully",
      });

      // Refresh reminders from API
      const accessToken = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/v2/server/${guildId}/reminders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: ServerRemindersResponse = await response.json();
        const allRemindersArray = [
          ...data.war_reminders,
          ...data.capital_reminders,
          ...data.clan_games_reminders,
          ...data.inactivity_reminders,
          ...data.roster_reminders,
        ];
        setAllReminders(allRemindersArray);
      }
    } catch (err) {
      console.error("Error saving reminders:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save reminders",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading reminders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Error</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
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
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Reminders</h1>
                <p className="text-muted-foreground mt-1">
                  Configure automatic reminders for wars, raids, clan games, and more
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={addReminder}
              variant="outline"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Reminder
            </Button>
            <Button
              onClick={saveAllReminders}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-blue-400 text-sm">💡 How Reminders Work</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-300 space-y-1">
            <p>
              <strong>War Reminders:</strong> Get notified before war attacks are due
            </p>
            <p>
              <strong>Clan Capital:</strong> Reminders for raid weekend attacks
            </p>
            <p>
              <strong>Clan Games:</strong> Track member progress and send reminders
            </p>
            <p>
              <strong>Inactivity:</strong> Monitor and notify about inactive members
            </p>
          </CardContent>
        </Card>

        {/* Reminders List */}
        <div className="space-y-4">
          {allReminders.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Reminders Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first reminder
                </p>
                <Button onClick={addReminder} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Reminder
                </Button>
              </CardContent>
            </Card>
          ) : (
            allReminders.map((reminder, index) => {
              const typeInfo = reminderTypes.find(t => t.value === reminder.type);
              const TypeIcon = typeInfo?.icon || Bell;

              return (
                <Card key={reminder.id} className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-secondary ${typeInfo?.color}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {typeInfo?.label || reminder.type}
                          </CardTitle>
                          <CardDescription>
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                              {reminder.time} before
                            </Badge>
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteReminder(index)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`type-${index}`}>Reminder Type</Label>
                        <Select
                          value={reminder.type}
                          onValueChange={(value) => updateReminder(index, "type", value)}
                        >
                          <SelectTrigger id={`type-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {reminderTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`time-${index}`}>
                          <Clock className="h-4 w-4 inline mr-1" />
                          Time Before (e.g., "6h", "30m")
                        </Label>
                        <Input
                          id={`time-${index}`}
                          placeholder="6h"
                          value={reminder.time}
                          onChange={(e) => updateReminder(index, "time", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`channel-${index}`}>Channel ID</Label>
                        <Input
                          id={`channel-${index}`}
                          placeholder="123456789012345678"
                          value={reminder.channel_id || ""}
                          onChange={(e) => updateReminder(index, "channel_id", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`clan-${index}`}>Clan Tag (Optional)</Label>
                        <Input
                          id={`clan-${index}`}
                          placeholder="#CLAN123"
                          value={reminder.clan_tag || ""}
                          onChange={(e) => updateReminder(index, "clan_tag", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`message-${index}`}>Custom Message (Optional)</Label>
                      <Input
                        id={`message-${index}`}
                        placeholder="Don't forget to use your attacks!"
                        value={reminder.custom_text || ""}
                        onChange={(e) => updateReminder(index, "custom_text", e.target.value)}
                      />
                    </div>

                    {/* Type-specific fields */}
                    {reminder.type === "War" && (
                      <div className="space-y-2">
                        <Label>War Types</Label>
                        <div className="flex gap-2">
                          {["Random", "Friendly", "CWL"].map((type) => (
                            <Badge
                              key={type}
                              variant={reminder.war_types?.includes(type) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const current = reminder.war_types || [];
                                const updated = current.includes(type)
                                  ? current.filter((t) => t !== type)
                                  : [...current, type];
                                updateReminder(index, "war_types", updated);
                              }}
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {reminder.type === "Clan Games" && (
                      <div className="space-y-2">
                        <Label htmlFor={`points-${index}`}>Point Threshold</Label>
                        <Input
                          id={`points-${index}`}
                          type="number"
                          placeholder="4000"
                          value={reminder.point_threshold || 4000}
                          onChange={(e) => updateReminder(index, "point_threshold", parseInt(e.target.value) || 4000)}
                        />
                      </div>
                    )}

                    {reminder.type === "Clan Capital" && (
                      <div className="space-y-2">
                        <Label htmlFor={`attacks-${index}`}>Attack Threshold</Label>
                        <Input
                          id={`attacks-${index}`}
                          type="number"
                          placeholder="1"
                          value={reminder.attack_threshold || 1}
                          onChange={(e) => updateReminder(index, "attack_threshold", parseInt(e.target.value) || 1)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Save Button (Bottom) */}
        {allReminders.length > 0 && (
          <div className="flex justify-end gap-4 pt-4">
            <Button
              onClick={saveAllReminders}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save All Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
