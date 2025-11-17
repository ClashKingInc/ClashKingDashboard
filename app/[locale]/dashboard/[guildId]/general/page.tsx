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
import { Save, RotateCcw, AlertCircle, Loader2, User, Palette, Shield, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";

export default function GeneralSettingsPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  const [settings, setSettings] = useState({
    change_nickname: true,
    nickname_rule: "[{clan_abbr}] {player_name}",
    non_family_nickname_rule: "{player_name}",
    flair_non_family: false,
    embed_color: 14227209, // #D90709 as integer
    leadership_eval: true,
    api_token: true,
    full_whitelist_role: undefined as string | undefined,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [guildId]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.servers.getSettings(guildId);

      if (response.data) {
        setSettings({
          change_nickname: response.data.change_nickname ?? true,
          nickname_rule: response.data.nickname_rule ?? "[{clan_abbr}] {player_name}",
          non_family_nickname_rule: response.data.non_family_nickname_rule ?? "{player_name}",
          flair_non_family: response.data.flair_non_family ?? false,
          embed_color: response.data.embed_color ?? 14227209,
          leadership_eval: response.data.leadership_eval ?? true,
          api_token: response.data.api_token ?? true,
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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      await apiClient.servers.updateSettings(guildId, settings);

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
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">General Settings</h1>
            <p className="text-muted-foreground">
              Configure server-wide bot behavior and appearance
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-border"
              size="sm"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
              size="sm"
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
            <AlertDescription className="text-green-600">
              Settings saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Info Banner */}
        <Card className="bg-blue-500/5 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Looking for clan-specific settings?
                </p>
                <p className="text-xs text-muted-foreground">
                  Ban/Strike logs, war channels, and other clan-specific configurations are managed in the{" "}
                  <strong>Clans</strong> page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid Layout for Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Nickname Management */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-foreground">Nickname Management</CardTitle>
                  <CardDescription className="text-xs">
                    Control how nicknames are formatted
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable Nickname Changes */}
              <div className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-3">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="change-nicknames" className="text-sm font-medium">
                    Automatic Changes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow bot to update member nicknames
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

              {/* Family Convention */}
              <div className="space-y-2">
                <Label htmlFor="family-convention" className="text-sm font-medium">
                  Family Members Format
                </Label>
                <Input
                  id="family-convention"
                  value={settings.nickname_rule}
                  onChange={(e) =>
                    setSettings({ ...settings, nickname_rule: e.target.value })
                  }
                  placeholder="[{clan_abbr}] {player_name}"
                  className="bg-secondary border-border font-mono text-sm"
                />
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs font-mono">
                    {"{player_name}"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {"{clan_abbr}"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {"{townhall}"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {"{trophies}"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Example: <span className="font-medium">[RCS] JohnDoe</span>
                </p>
              </div>

              {/* Non-Family Convention */}
              <div className="space-y-2">
                <Label htmlFor="non-family-convention" className="text-sm font-medium">
                  Non-Family Members Format
                </Label>
                <Input
                  id="non-family-convention"
                  value={settings.non_family_nickname_rule}
                  onChange={(e) =>
                    setSettings({ ...settings, non_family_nickname_rule: e.target.value })
                  }
                  placeholder="{player_name}"
                  className="bg-secondary border-border font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Format for members not in your clan family
                </p>
              </div>

              {/* Flair Non-Family */}
              <div className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-3">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="flair-non-family" className="text-sm font-medium">
                    Flair Non-Family
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Assign TH/trophy roles to non-family members
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

          {/* Appearance */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Palette className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground">Appearance</CardTitle>
                  <CardDescription className="text-xs">
                    Customize bot messages and embeds
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="embed-color" className="text-sm font-medium">
                  Embed Color
                </Label>
                <div className="flex gap-3">
                  <div className="relative">
                    <Input
                      id="embed-color"
                      type="color"
                      value={intToHex(settings.embed_color)}
                      onChange={(e) => setSettings({ ...settings, embed_color: hexToInt(e.target.value) })}
                      className="w-16 h-16 cursor-pointer border-2 rounded-lg"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={intToHex(settings.embed_color)}
                      onChange={(e) => setSettings({ ...settings, embed_color: hexToInt(e.target.value) })}
                      placeholder="#D90709"
                      className="bg-secondary border-border font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: <span className="font-medium">#D90709</span> (ClashKing Red)
                    </p>
                  </div>
                </div>

                {/* Color Preview */}
                <div
                  className="rounded-lg p-4 border-l-4 bg-secondary/50"
                  style={{ borderLeftColor: intToHex(settings.embed_color) }}
                >
                  <p className="text-sm font-medium mb-1">Embed Preview</p>
                  <p className="text-xs text-muted-foreground">
                    This is how bot embeds will appear in your server
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Features - Full Width */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Sparkles className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-foreground">Advanced Features</CardTitle>
                <CardDescription className="text-xs">
                  Enable advanced bot capabilities
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {/* Leadership Evaluation */}
              <div className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="leadership-eval" className="text-sm font-medium">
                    Leadership Evaluation
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-assign roles for clan leaders and co-leaders
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

              {/* API Token */}
              <div className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="api-token" className="text-sm font-medium">
                    ClashKing API
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use ClashKing API for enhanced features
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
            </div>

            <Separator className="my-4" />

            {/* Whitelist Role */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="whitelist-role" className="text-sm font-medium">
                  Full Whitelist Role
                </Label>
              </div>
              <Input
                id="whitelist-role"
                type="text"
                value={settings.full_whitelist_role || ""}
                onChange={(e) =>
                  setSettings({ ...settings, full_whitelist_role: e.target.value || undefined })
                }
                placeholder="Role ID (e.g., 1234567890123456789)"
                className="bg-secondary border-border font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Discord role ID with full access to all bot commands. Right-click a role → Copy ID (Developer Mode required)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
