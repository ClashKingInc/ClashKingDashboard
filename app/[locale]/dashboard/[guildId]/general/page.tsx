"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, RotateCcw, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";

export default function GeneralSettingsPage() {
  const params = useParams();
  const guildId = parseInt(params.guildId as string);

  const [settings, setSettings] = useState({
    change_nickname: true,
    nickname_rule: "[{clan_abbr}] {player_name}",
    non_family_nickname_rule: "{player_name}",
    flair_non_family: false,
    embed_color: 14227209, // #D90709 as integer
    leadership_eval: true,
    api_token: true,
    banlist: undefined as number | undefined,
    strike_log: undefined as number | undefined,
    full_whitelist_role: undefined as number | undefined,
  });

  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadChannels();
  }, [guildId]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.server.getSettings(guildId);

      if (response.data) {
        setSettings({
          change_nickname: response.data.change_nickname ?? true,
          nickname_rule: response.data.nickname_rule ?? "[{clan_abbr}] {player_name}",
          non_family_nickname_rule: response.data.non_family_nickname_rule ?? "{player_name}",
          flair_non_family: response.data.flair_non_family ?? false,
          embed_color: response.data.embed_color ?? 14227209,
          leadership_eval: response.data.leadership_eval ?? true,
          api_token: response.data.api_token ?? true,
          banlist: response.data.banlist,
          strike_log: response.data.strike_log,
          full_whitelist_role: response.data.full_whitelist_role,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await apiClient.server.getChannels(guildId);
      if (response.data) {
        setChannels(response.data);
      }
    } catch (err) {
      console.error("Failed to load channels:", err);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      await apiClient.server.updateSettings(guildId, settings);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadSettings();
  };

  const hexToInt = (hex: string): number => {
    return parseInt(hex.replace("#", ""), 16);
  };

  const intToHex = (int: number): string => {
    return "#" + int.toString(16).padStart(6, "0").toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">General Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure core bot behavior and server-wide settings
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="border-border">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-500/30 bg-green-500/5">
            <AlertCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600">Settings saved successfully!</AlertDescription>
          </Alert>
        )}

        {/* Nickname Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Nickname Management</CardTitle>
            <CardDescription>
              Control how the bot manages member nicknames based on their Clash of Clans accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="change-nicknames">Automatic Nickname Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Allow bot to automatically update member nicknames
                </p>
              </div>
              <Switch
                id="change-nicknames"
                checked={settings.change_nickname}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, change_nickname: checked })
                }
              />
            </div>

            <Separator className="bg-border" />

            <div className="space-y-2">
              <Label htmlFor="family-convention">Family Nickname Convention</Label>
              <Input
                id="family-convention"
                value={settings.nickname_rule}
                onChange={(e) =>
                  setSettings({ ...settings, nickname_rule: e.target.value })
                }
                placeholder="[{clan_abbr}] {player_name}"
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">
                Available placeholders:{" "}
                <Badge variant="secondary" className="text-xs bg-secondary/50 text-foreground">
                  {"{player_name}"}
                </Badge>{" "}
                <Badge variant="secondary" className="text-xs bg-secondary/50 text-foreground">
                  {"{clan_abbr}"}
                </Badge>{" "}
                <Badge variant="secondary" className="text-xs bg-secondary/50 text-foreground">
                  {"{townhall}"}
                </Badge>{" "}
                <Badge variant="secondary" className="text-xs bg-secondary/50 text-foreground">
                  {"{trophies}"}
                </Badge>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="non-family-convention">Non-Family Nickname Convention</Label>
              <Input
                id="non-family-convention"
                value={settings.non_family_nickname_rule}
                onChange={(e) =>
                  setSettings({ ...settings, non_family_nickname_rule: e.target.value })
                }
                placeholder="{player_name}"
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">
                Convention for members not in your clan family
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="flair-non-family">Flair Roles for Non-Family</Label>
                <p className="text-sm text-muted-foreground">
                  Assign flair roles (TH, trophies) to non-family members
                </p>
              </div>
              <Switch
                id="flair-non-family"
                checked={settings.flair_non_family}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, flair_non_family: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Moderation Channels */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Moderation Channels</CardTitle>
            <CardDescription>
              Configure channels for moderation logs and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ban-log">Ban Log Channel</Label>
              <Select
                value={settings.banlist?.toString() || "none"}
                onValueChange={(value) =>
                  setSettings({ ...settings, banlist: value === "none" ? undefined : parseInt(value) })
                }
              >
                <SelectTrigger id="ban-log" className="bg-secondary border-border">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Channel</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      #{channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Channel where ban actions will be logged
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="strike-log">Strike Log Channel</Label>
              <Select
                value={settings.strike_log?.toString() || "none"}
                onValueChange={(value) =>
                  setSettings({ ...settings, strike_log: value === "none" ? undefined : parseInt(value) })
                }
              >
                <SelectTrigger id="strike-log" className="bg-secondary border-border">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Channel</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      #{channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Channel where strike/warning actions will be logged
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Appearance</CardTitle>
            <CardDescription>
              Customize how bot messages and embeds look in your server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="embed-color">Embed Color</Label>
              <div className="flex gap-2">
                <Input
                  id="embed-color"
                  type="color"
                  value={intToHex(settings.embed_color)}
                  onChange={(e) => setSettings({ ...settings, embed_color: hexToInt(e.target.value) })}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  value={intToHex(settings.embed_color)}
                  onChange={(e) => setSettings({ ...settings, embed_color: hexToInt(e.target.value) })}
                  placeholder="#D90709"
                  className="flex-1 bg-secondary border-border"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a color for bot embed messages (default: ClashKing red)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Features */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Advanced Features</CardTitle>
            <CardDescription>
              Enable advanced bot features and integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="leadership-eval">Leadership Evaluation</Label>
                <p className="text-sm text-muted-foreground">
                  Enable role evaluation for clan leadership positions
                </p>
              </div>
              <Switch
                id="leadership-eval"
                checked={settings.leadership_eval}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, leadership_eval: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="api-token">ClashKing API Token</Label>
                <p className="text-sm text-muted-foreground">
                  Use ClashKing API for enhanced features and faster data access
                </p>
              </div>
              <Switch
                id="api-token"
                checked={settings.api_token}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, api_token: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whitelist-role">Full Whitelist Role</Label>
              <Input
                id="whitelist-role"
                type="number"
                value={settings.full_whitelist_role || ""}
                onChange={(e) =>
                  setSettings({ ...settings, full_whitelist_role: e.target.value ? parseInt(e.target.value) : undefined })
                }
                placeholder="Role ID (e.g., 123456789)"
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">
                Role ID that has full access to all bot commands
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
