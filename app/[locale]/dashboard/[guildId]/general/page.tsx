"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw } from "lucide-react";

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState({
    changeNicknames: true,
    familyNicknameConvention: "[{clan_abbr}] {player_name}",
    nonFamilyNicknameConvention: "{player_name}",
    flairNonFamily: false,
    embedColor: "#D90709",
    leadershipEval: true,
    apiToken: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement API call to save settings
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleReset = () => {
    setSettings({
      changeNicknames: true,
      familyNicknameConvention: "[{clan_abbr}] {player_name}",
      nonFamilyNicknameConvention: "{player_name}",
      flairNonFamily: false,
      embedColor: "#D90709",
      leadershipEval: true,
      apiToken: true,
    });
  };

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
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

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
                checked={settings.changeNicknames}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, changeNicknames: checked })
                }
              />
            </div>

            <Separator className="bg-border" />

            <div className="space-y-2">
              <Label htmlFor="family-convention">Family Nickname Convention</Label>
              <Input
                id="family-convention"
                value={settings.familyNicknameConvention}
                onChange={(e) =>
                  setSettings({ ...settings, familyNicknameConvention: e.target.value })
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
                value={settings.nonFamilyNicknameConvention}
                onChange={(e) =>
                  setSettings({ ...settings, nonFamilyNicknameConvention: e.target.value })
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
                checked={settings.flairNonFamily}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, flairNonFamily: checked })
                }
              />
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
                  value={settings.embedColor}
                  onChange={(e) => setSettings({ ...settings, embedColor: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  value={settings.embedColor}
                  onChange={(e) => setSettings({ ...settings, embedColor: e.target.value })}
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
                checked={settings.leadershipEval}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, leadershipEval: checked })
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
                checked={settings.apiToken}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, apiToken: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
