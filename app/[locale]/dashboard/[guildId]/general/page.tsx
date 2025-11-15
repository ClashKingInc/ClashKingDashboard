"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, RotateCcw } from "lucide-react";

/**
 * Form data interface for general settings
 */
interface GeneralSettings {
  // Nickname Management
  changeNicknames: boolean;
  familyNicknameConvention: string;
  nonFamilyNicknameConvention: string;
  flairNonFamily: boolean;

  // Server Appearance
  embedColor: string;

  // Advanced Features
  leadershipEval: boolean;
  apiToken: boolean;
  apiTokenValue: string;

  // Bot Behavior
  autoGreetings: boolean;
  greetingChannel: string;
  autoRoleAssignment: boolean;
  autoModeration: boolean;
  commandPrefix: string;
}

/**
 * Default settings values
 */
const DEFAULT_SETTINGS: GeneralSettings = {
  changeNicknames: true,
  familyNicknameConvention: "[{clan_abbr}] {player_name}",
  nonFamilyNicknameConvention: "{player_name}",
  flairNonFamily: false,
  embedColor: "#D90709",
  leadershipEval: true,
  apiToken: false,
  apiTokenValue: "",
  autoGreetings: true,
  greetingChannel: "",
  autoRoleAssignment: true,
  autoModeration: false,
  commandPrefix: "/",
};

/**
 * Available placeholder tokens for nickname conventions
 */
const NICKNAME_PLACEHOLDERS = [
  { token: "{player_name}", description: "Player's in-game name" },
  { token: "{clan_abbr}", description: "Clan abbreviation" },
  { token: "{clan_name}", description: "Full clan name" },
  { token: "{townhall}", description: "Town Hall level (e.g., TH15)" },
  { token: "{trophies}", description: "Trophy count" },
  { token: "{war_stars}", description: "War stars earned" },
];

/**
 * General Settings Page Component
 * Manages server-wide bot configuration including nicknames, appearance, and behavior
 */
export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  /**
   * Update a specific setting value
   */
  const updateSetting = <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  /**
   * Validate hex color format
   */
  const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(color);
  };

  /**
   * Validate form data before saving
   */
  const validateSettings = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!isValidHexColor(settings.embedColor)) {
      errors.push("Embed color must be a valid hex color (e.g., #D90709)");
    }

    if (settings.familyNicknameConvention.trim().length === 0) {
      errors.push("Family nickname convention cannot be empty");
    }

    if (settings.nonFamilyNicknameConvention.trim().length === 0) {
      errors.push("Non-family nickname convention cannot be empty");
    }

    if (settings.apiToken && settings.apiTokenValue.trim().length === 0) {
      errors.push("API token value is required when API token is enabled");
    }

    if (settings.commandPrefix.trim().length === 0) {
      errors.push("Command prefix cannot be empty");
    }

    return { isValid: errors.length === 0, errors };
  };

  /**
   * Handle save button click
   */
  const handleSave = async () => {
    const validation = validateSettings();

    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Implement API call to save settings
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: "Settings Saved",
        description: "Your general settings have been updated successfully.",
      });

      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Reset settings to defaults
   */
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(false);
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults.",
    });
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            General Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure core bot behavior and server-wide settings
          </p>
        </div>

        {/* Section 1: Nickname Management */}
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">Nickname Management</CardTitle>
            <CardDescription>
              Control how the bot manages member nicknames based on their Clash of Clans accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Automatic Nickname Changes Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="change-nicknames" className="text-base font-medium">
                  Automatic Nickname Changes
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow bot to automatically update member nicknames when they link accounts
                </p>
              </div>
              <Switch
                id="change-nicknames"
                checked={settings.changeNicknames}
                onCheckedChange={(checked) => updateSetting("changeNicknames", checked)}
              />
            </div>

            <Separator />

            {/* Family Nickname Convention */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="family-convention" className="text-base font-medium">
                  Family Nickname Convention
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Format for members in your registered clan family
                </p>
              </div>
              <Input
                id="family-convention"
                value={settings.familyNicknameConvention}
                onChange={(e) => updateSetting("familyNicknameConvention", e.target.value)}
                placeholder="[{clan_abbr}] {player_name}"
                className="font-mono"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {NICKNAME_PLACEHOLDERS.map((placeholder) => (
                  <Badge
                    key={placeholder.token}
                    variant="secondary"
                    className="text-xs cursor-help"
                    title={placeholder.description}
                  >
                    {placeholder.token}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click on a placeholder badge to see its description
              </p>
            </div>

            {/* Non-Family Nickname Convention */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="non-family-convention" className="text-base font-medium">
                  Non-Family Nickname Convention
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Format for members not in your registered clan family
                </p>
              </div>
              <Input
                id="non-family-convention"
                value={settings.nonFamilyNicknameConvention}
                onChange={(e) => updateSetting("nonFamilyNicknameConvention", e.target.value)}
                placeholder="{player_name}"
                className="font-mono"
              />
            </div>

            <Separator />

            {/* Flair Roles for Non-Family */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="flair-non-family" className="text-base font-medium">
                  Flair Roles for Non-Family
                </Label>
                <p className="text-sm text-muted-foreground">
                  Assign Town Hall and trophy flair roles to non-family members
                </p>
              </div>
              <Switch
                id="flair-non-family"
                checked={settings.flairNonFamily}
                onCheckedChange={(checked) => updateSetting("flairNonFamily", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Server Appearance */}
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">Server Appearance</CardTitle>
            <CardDescription>
              Customize how bot messages and embeds look in your server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Embed Color */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="embed-color" className="text-base font-medium">
                  Embed Color
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a color for bot embed messages (hex format)
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <Input
                  id="embed-color"
                  type="color"
                  value={settings.embedColor}
                  onChange={(e) => updateSetting("embedColor", e.target.value)}
                  className="w-24 h-12 cursor-pointer"
                />
                <Input
                  value={settings.embedColor}
                  onChange={(e) => updateSetting("embedColor", e.target.value)}
                  placeholder="#D90709"
                  className="flex-1 font-mono uppercase"
                  maxLength={7}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Default ClashKing red:</span>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => updateSetting("embedColor", "#D90709")}
                >
                  #D90709
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Advanced Features */}
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">Advanced Features</CardTitle>
            <CardDescription>
              Enable advanced bot features and integrations for enhanced functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Leadership Evaluation */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="leadership-eval" className="text-base font-medium">
                  Leadership Evaluation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign roles based on clan leadership positions (Leader, Co-Leader, Elder)
                </p>
              </div>
              <Switch
                id="leadership-eval"
                checked={settings.leadershipEval}
                onCheckedChange={(checked) => updateSetting("leadershipEval", checked)}
              />
            </div>

            <Separator />

            {/* ClashKing API Token */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="api-token" className="text-base font-medium">
                    ClashKing API Token
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use ClashKing API for enhanced features, faster data access, and premium statistics
                  </p>
                </div>
                <Switch
                  id="api-token"
                  checked={settings.apiToken}
                  onCheckedChange={(checked) => updateSetting("apiToken", checked)}
                />
              </div>

              {/* API Token Input (shown only when enabled) */}
              {settings.apiToken && (
                <div className="ml-0 space-y-2 pt-2">
                  <Label htmlFor="api-token-value" className="text-sm">
                    API Token Value
                  </Label>
                  <Input
                    id="api-token-value"
                    type="password"
                    value={settings.apiTokenValue}
                    onChange={(e) => updateSetting("apiTokenValue", e.target.value)}
                    placeholder="Enter your ClashKing API token"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API token from{" "}
                    <a
                      href="https://clashking.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D90709] hover:underline"
                    >
                      clashking.xyz
                    </a>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Bot Behavior */}
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">Bot Behavior</CardTitle>
            <CardDescription>
              Configure how the bot interacts with members and moderates your server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto Greetings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="auto-greetings" className="text-base font-medium">
                    Auto Greetings
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send welcome messages when new members join the server
                  </p>
                </div>
                <Switch
                  id="auto-greetings"
                  checked={settings.autoGreetings}
                  onCheckedChange={(checked) => updateSetting("autoGreetings", checked)}
                />
              </div>

              {/* Greeting Channel Selector (shown only when enabled) */}
              {settings.autoGreetings && (
                <div className="ml-0 space-y-2 pt-2">
                  <Label htmlFor="greeting-channel" className="text-sm">
                    Greeting Channel
                  </Label>
                  <Select
                    value={settings.greetingChannel}
                    onValueChange={(value) => updateSetting("greetingChannel", value)}
                  >
                    <SelectTrigger id="greeting-channel">
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">#general</SelectItem>
                      <SelectItem value="welcome">#welcome</SelectItem>
                      <SelectItem value="announcements">#announcements</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose where welcome messages will be sent
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Auto Role Assignment */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="auto-role-assignment" className="text-base font-medium">
                  Auto Role Assignment
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign roles based on linked Clash of Clans accounts
                </p>
              </div>
              <Switch
                id="auto-role-assignment"
                checked={settings.autoRoleAssignment}
                onCheckedChange={(checked) => updateSetting("autoRoleAssignment", checked)}
              />
            </div>

            <Separator />

            {/* Auto Moderation */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="auto-moderation" className="text-base font-medium">
                  Auto Moderation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable automatic moderation for spam, profanity, and inappropriate content
                </p>
              </div>
              <Switch
                id="auto-moderation"
                checked={settings.autoModeration}
                onCheckedChange={(checked) => updateSetting("autoModeration", checked)}
              />
            </div>

            <Separator />

            {/* Command Prefix */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="command-prefix" className="text-base font-medium">
                  Command Prefix
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Character(s) used to trigger bot commands
                </p>
              </div>
              <Input
                id="command-prefix"
                value={settings.commandPrefix}
                onChange={(e) => updateSetting("commandPrefix", e.target.value)}
                placeholder="/"
                maxLength={3}
                className="w-32 font-mono text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Example: With prefix "/", commands will be /link, /profile, etc.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 pb-8">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving || !hasChanges}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Changes
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="gap-2 bg-[#D90709] hover:bg-[#BF0000] text-white"
          >
            {isSaving ? (
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
    </div>
  );
}
