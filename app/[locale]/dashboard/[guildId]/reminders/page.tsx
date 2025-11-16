"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// API types based on ClashKingAPI reminders endpoints
interface Reminder {
  id?: string;
  guild_id: string;
  reminder_type: "war" | "cwl" | "raid" | "games" | "custom";
  enabled: boolean;
  time_before_hours: number;
  channel_id?: string;
  role_id?: string;
  message?: string;
  created_at?: string;
  updated_at?: string;
}

interface RemindersResponse {
  reminders: Reminder[];
}

const reminderTypes = [
  { value: "war", label: "Regular War", icon: Target, color: "text-red-500" },
  { value: "cwl", label: "Clan War League", icon: Trophy, color: "text-yellow-500" },
  { value: "raid", label: "Raid Weekend", icon: Users, color: "text-blue-500" },
  { value: "games", label: "Clan Games", icon: Calendar, color: "text-green-500" },
  { value: "custom", label: "Custom Reminder", icon: Bell, color: "text-purple-500" },
];

export default function RemindersPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params.guildId as string;

  const [reminders, setReminders] = useState<Reminder[]>([]);
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

        const response = await fetch(`${apiUrl}/v2/reminders/${guildId}`, {
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

        const data: RemindersResponse = await response.json();
        setReminders(data.reminders || []);
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

  // Add a new reminder
  const addReminder = () => {
    const newReminder: Reminder = {
      guild_id: guildId,
      reminder_type: "war",
      enabled: true,
      time_before_hours: 6,
      channel_id: "",
      role_id: "",
      message: "",
    };
    setReminders([...reminders, newReminder]);
  };

  // Update a reminder
  const updateReminder = (index: number, field: keyof Reminder, value: any) => {
    const updatedReminders = [...reminders];
    updatedReminders[index] = {
      ...updatedReminders[index],
      [field]: value,
    };
    setReminders(updatedReminders);
  };

  // Delete a reminder
  const deleteReminder = async (index: number) => {
    const reminder = reminders[index];

    // If reminder has an ID, delete it from the API
    if (reminder.id) {
      try {
        setSaving(true);
        const accessToken = localStorage.getItem("access_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        const response = await fetch(`${apiUrl}/v2/reminders/${reminder.id}`, {
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
    const updatedReminders = reminders.filter((_, i) => i !== index);
    setReminders(updatedReminders);
  };

  // Save all reminders
  const saveReminders = async () => {
    try {
      setSaving(true);
      const accessToken = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error("API URL is not configured");
      }

      // Save or update each reminder
      for (const reminder of reminders) {
        const method = reminder.id ? 'PUT' : 'POST';
        const url = reminder.id
          ? `${apiUrl}/v2/reminders/${reminder.id}`
          : `${apiUrl}/v2/reminders`;

        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reminder),
        });

        if (!response.ok) {
          throw new Error(`Failed to save reminder: ${response.statusText}`);
        }
      }

      toast({
        title: "Success",
        description: "Reminders saved successfully",
      });

      // Refresh reminders from API
      const response = await fetch(`${apiUrl}/v2/reminders/${guildId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: RemindersResponse = await response.json();
        setReminders(data.reminders || []);
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
                  Configure automatic reminders for wars, raids, and events
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
              onClick={saveReminders}
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
              <strong>Automatic Notifications:</strong> Set up reminders to ping roles before important events
            </p>
            <p>
              <strong>Flexible Timing:</strong> Choose how many hours before an event the reminder should be sent
            </p>
            <p>
              <strong>Custom Messages:</strong> Personalize reminder messages for your server
            </p>
          </CardContent>
        </Card>

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.length === 0 ? (
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
            reminders.map((reminder, index) => {
              const typeInfo = reminderTypes.find(t => t.value === reminder.reminder_type);
              const TypeIcon = typeInfo?.icon || Bell;

              return (
                <Card key={index} className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-secondary ${typeInfo?.color}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {typeInfo?.label || reminder.reminder_type}
                          </CardTitle>
                          <CardDescription>
                            {reminder.enabled ? (
                              <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-500/20 text-gray-500 border-gray-500/30">
                                Disabled
                              </Badge>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reminder.enabled}
                          onCheckedChange={(checked) => updateReminder(index, "enabled", checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteReminder(index)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`type-${index}`}>Reminder Type</Label>
                        <Select
                          value={reminder.reminder_type}
                          onValueChange={(value) => updateReminder(index, "reminder_type", value)}
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
                          Hours Before Event
                        </Label>
                        <Input
                          id={`time-${index}`}
                          type="number"
                          min="1"
                          max="72"
                          value={reminder.time_before_hours}
                          onChange={(e) => updateReminder(index, "time_before_hours", parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`channel-${index}`}>Channel ID (Optional)</Label>
                        <Input
                          id={`channel-${index}`}
                          placeholder="123456789012345678"
                          value={reminder.channel_id || ""}
                          onChange={(e) => updateReminder(index, "channel_id", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`role-${index}`}>Role ID (Optional)</Label>
                        <Input
                          id={`role-${index}`}
                          placeholder="123456789012345678"
                          value={reminder.role_id || ""}
                          onChange={(e) => updateReminder(index, "role_id", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`message-${index}`}>Custom Message (Optional)</Label>
                      <Input
                        id={`message-${index}`}
                        placeholder="Don't forget to use your attacks!"
                        value={reminder.message || ""}
                        onChange={(e) => updateReminder(index, "message", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Save Button (Bottom) */}
        {reminders.length > 0 && (
          <div className="flex justify-end gap-4 pt-4">
            <Button
              onClick={saveReminders}
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
