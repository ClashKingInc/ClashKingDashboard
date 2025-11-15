"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState({
    changeNicknames: true,
    familyNicknameConvention: "[{clan_abbr}] {player_name}",
    nonFamilyNicknameConvention: "{player_name}",
    flairNonFamily: false,
    embedColor: "#5865F2",
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

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">General Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure core bot behavior and server-wide settings
          </p>
        </div>

        {/* Nickname Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nickname Management</CardTitle>
            <CardDescription>
              Control how the bot manages member nicknames based on their Clash of Clans accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
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

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="family-convention">Family Nickname Convention</Label>
              <Input
                id="family-convention"
                value={settings.familyNicknameConvention}
                onChange={(e) =>
                  setSettings({ ...settings, familyNicknameConvention: e.target.value })
                }
                placeholder="[{clan_abbr}] {player_name}"
              />
              <p className="text-xs text-muted-foreground">
                Available placeholders: <Badge variant="secondary" className="text-xs">{"{player_name}"}</Badge>{" "}
                <Badge variant="secondary" className="text-xs">{"{clan_abbr}"}</Badge>{" "}
                <Badge variant="secondary" className="text-xs">{"{townhall}"}</Badge>{" "}
                <Badge variant="secondary" className="text-xs">{"{trophies}"}</Badge>
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
              />
              <p className="text-xs text-muted-foreground">
                Convention for members not in your clan family
              </p>
            </div>

            <div className="flex items-center justify-between">
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
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
                  className="w-20 h-10"
                />
                <Input
                  value={settings.embedColor}
                  onChange={(e) => setSettings({ ...settings, embedColor: e.target.value })}
                  placeholder="#5865F2"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a color for bot embed messages
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Features */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Advanced Features</CardTitle>
            <CardDescription>
              Enable advanced bot features and integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
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

            <Separator />

            <div className="flex items-center justify-between">
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

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline">Reset Changes</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
