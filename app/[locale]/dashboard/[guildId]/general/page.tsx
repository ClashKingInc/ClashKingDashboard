"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, RotateCcw, AlertCircle, Loader2, User, Palette, Shield, Eye, Lock, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import ReactMarkdown from "react-markdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Placeholder descriptions will be fetched from translations dynamically

const hexToInt = (hex: string): number => {
  return parseInt(hex.replace("#", ""), 16);
};

const intToHex = (int: number): string => {
  return "#" + int.toString(16).padStart(6, "0").toUpperCase();
};

export default function GeneralSettingsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const t = useTranslations("GeneralPage");
  const tCommon = useTranslations("Common");

  // Placeholder descriptions from translations
  const PLACEHOLDERS = [
    { key: "{discord_name}", desc: t("nickname.placeholders.discordName"), example: "JohnDoe#1234" },
    { key: "{discord_display_name}", desc: t("nickname.placeholders.discordDisplayName"), example: "John" },
    { key: "{player_name}", desc: t("nickname.placeholders.playerName"), example: "Chief John" },
    { key: "{player_tag}", desc: t("nickname.placeholders.playerTag"), example: "#2PP" },
    { key: "{player_townhall}", desc: t("nickname.placeholders.playerTownhall"), example: "16" },
    { key: "{player_townhall_small}", desc: t("nickname.placeholders.playerTownhallSmall"), example: "¹⁶" },
    { key: "{player_warstars}", desc: t("nickname.placeholders.playerWarstars"), example: "1234" },
    { key: "{player_role}", desc: t("nickname.placeholders.playerRole"), example: "Leader" },
    { key: "{player_clan}", desc: t("nickname.placeholders.playerClan"), example: "RCS Clan" },
    { key: "{player_league}", desc: t("nickname.placeholders.playerLeague"), example: "Legend" },
    { key: "{player_clan_abbreviation}", desc: t("nickname.placeholders.playerClanAbbr"), example: "RCS" },
  ];

  const [settings, setSettings] = useState({
    change_nickname: true,
    nickname_rule: "[{player_clan_abbreviation}] {player_name}",
    non_family_nickname_rule: "{player_name}",
    embed_color: 14223113, // #D90709 as integer
    api_token: true,
    full_whitelist_role: undefined as string | undefined,
  });

  const [discordRoles, setDiscordRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isFamilyPlaceholdersOpen, setIsFamilyPlaceholdersOpen] = useState(false);
  const [isNonFamilyPlaceholdersOpen, setIsNonFamilyPlaceholdersOpen] = useState(false);
  const [tempColor, setTempColor] = useState(settings.embed_color);
  const [tempHex, setTempHex] = useState(intToHex(settings.embed_color));
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadDiscordRoles();
  }, [guildId]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No access token found. Please log in again.");
      }

      apiClient.setAccessToken(token);
      const response = await apiClient.servers.getSettings(guildId);

      console.log("Settings response:", response);

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const newSettings = {
          change_nickname: response.data.change_nickname ?? true,
          nickname_rule: response.data.nickname_rule ?? "[{player_clan_abbreviation}] {player_name}",
          non_family_nickname_rule: response.data.non_family_nickname_rule ?? "{player_name}",
          embed_color: response.data.embed_color ?? 14223113,
          api_token: response.data.api_token ?? true,
          full_whitelist_role: response.data.full_whitelist_role?.toString(),
        };
        setSettings(newSettings);
        setTempColor(newSettings.embed_color);
        setTempHex(intToHex(newSettings.embed_color));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDiscordRoles = async () => {
    try {
      const response = await apiClient.roles.getDiscordRoles(guildId);
      if (response.data) {
        setDiscordRoles(response.data.roles);
      }
    } catch (err) {
      console.error("Failed to load Discord roles:", err);
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

  // Generate preview of nickname format
  const generatePreview = (format: string): string => {
    const examples: Record<string, string> = {
      "{discord_name}": "JohnDoe#1234",
      "{discord_display_name}": "John",
      "{player_name}": "Chief John",
      "{player_tag}": "#2PP",
      "{player_townhall}": "16",
      "{player_townhall_small}": "¹⁶",
      "{player_warstars}": "1234",
      "{player_role}": "Leader",
      "{player_clan}": "RCS Clan",
      "{player_league}": "Legend",
      "{player_clan_abbreviation}": "RCS",
      "{clan_abbr}": "RCS", // Legacy support
    };

    let preview = format;
    Object.entries(examples).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(key, "g"), value);
    });

    return preview;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("description")}
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
              {t("reset")}
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
                  {t("saving")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("saveChanges")}
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
              {t("settingsSaved")}
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
                  {t("infoBanner.title")}
                </p>
                <div className="text-xs text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <span>{children}</span>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    }}
                  >
                    {t("infoBanner.description")}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid Layout for Cards */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Nickname Management */}
          <Card className="bg-card border-border lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-foreground">{t("nickname.title")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("nickname.description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable Nickname Changes */}
              <div className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-3">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="change-nicknames" className="text-sm font-medium">
                    {t("nickname.automaticChanges")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("nickname.automaticChangesDesc")}
                  </p>
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-11 rounded-full animate-pulse" />
                ) : (
                  <Switch
                    id="change-nicknames"
                    checked={settings.change_nickname}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, change_nickname: checked })
                    }
                  />
                )}
              </div>

              <Separator className="bg-border" />

              {/* Family Convention */}
              <div className="space-y-3">
                <Label htmlFor="family-convention" className="text-sm font-medium">
                  {t("nickname.familyFormat")}
                </Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full animate-pulse" />
                ) : (
                  <Input
                    id="family-convention"
                    value={settings.nickname_rule}
                    onChange={(e) =>
                      setSettings({ ...settings, nickname_rule: e.target.value })
                    }
                    placeholder="[{player_clan_abbreviation}] {player_name}"
                    className="bg-secondary border-border font-mono text-sm"
                  />
                )}

                {/* Live Preview */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-primary">{t("nickname.preview")}</p>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-9 w-full animate-pulse" />
                  ) : (
                    <p className="text-sm font-mono bg-background/50 border border-border rounded px-3 py-2">
                      {generatePreview(settings.nickname_rule)}
                    </p>
                  )}
                </div>
              </div>

              {/* Available Placeholders */}
              <Collapsible open={isFamilyPlaceholdersOpen} onOpenChange={setIsFamilyPlaceholdersOpen}>
                <CollapsibleTrigger className="w-full text-left">
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-[#DC2626]">{t("nickname.availablePlaceholders")}</p>
                      {isFamilyPlaceholdersOpen ? (
                        <ChevronDown className="h-4 w-4 text-[#DC2626] transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#DC2626] transition-transform duration-200" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 bg-secondary/30 border border-border rounded-lg p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PLACEHOLDERS.map((p) => (
                        <div key={p.key} className="flex items-start gap-2">
                          <Badge
                            variant="secondary"
                            className="text-xs font-mono cursor-pointer hover:bg-primary/20"
                            onClick={() => {
                              const input = document.getElementById("family-convention") as HTMLInputElement;
                              if (input) {
                                const start = input.selectionStart || 0;
                                const end = input.selectionEnd || 0;
                                const newValue =
                                  settings.nickname_rule.substring(0, start) +
                                  p.key +
                                  settings.nickname_rule.substring(end);
                                setSettings({ ...settings, nickname_rule: newValue });
                                setTimeout(() => {
                                  input.focus();
                                  input.setSelectionRange(start + p.key.length, start + p.key.length);
                                }, 0);
                              }
                            }}
                          >
                            {p.key}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{p.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Non-Family Convention */}
              <div className="space-y-3">
                <Label htmlFor="non-family-convention" className="text-sm font-medium">
                  {t("nickname.nonFamilyFormat")}
                </Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full animate-pulse" />
                ) : (
                  <Input
                    id="non-family-convention"
                    value={settings.non_family_nickname_rule}
                    onChange={(e) =>
                      setSettings({ ...settings, non_family_nickname_rule: e.target.value })
                    }
                    placeholder="{player_name}"
                    className="bg-secondary border-border font-mono text-sm"
                  />
                )}

                {/* Live Preview */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-primary">{t("nickname.preview")}</p>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-9 w-full animate-pulse" />
                  ) : (
                    <p className="text-sm font-mono bg-background/50 border border-border rounded px-3 py-2">
                      {generatePreview(settings.non_family_nickname_rule)}
                    </p>
                  )}
                </div>
              </div>

              {/* Available Placeholders */}
              <Collapsible open={isNonFamilyPlaceholdersOpen} onOpenChange={setIsNonFamilyPlaceholdersOpen}>
                <CollapsibleTrigger className="w-full text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-[#DC2626]">{t("nickname.availablePlaceholders")}</p>
                    {isNonFamilyPlaceholdersOpen ? (
                      <ChevronDown className="h-4 w-4 text-[#DC2626] transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#DC2626] transition-transform duration-200" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 bg-secondary/30 border border-border rounded-lg p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PLACEHOLDERS.map((p) => (
                        <div key={p.key} className="flex items-start gap-2">
                          <Badge
                            variant="secondary"
                            className="text-xs font-mono cursor-pointer hover:bg-primary/20"
                            onClick={() => {
                              const input = document.getElementById("non-family-convention") as HTMLInputElement;
                              if (input) {
                                const start = input.selectionStart || 0;
                                const end = input.selectionEnd || 0;
                                const newValue =
                                  settings.non_family_nickname_rule.substring(0, start) +
                                  p.key +
                                  settings.non_family_nickname_rule.substring(end);
                                setSettings({ ...settings, non_family_nickname_rule: newValue });
                                setTimeout(() => {
                                  input.focus();
                                  input.setSelectionRange(start + p.key.length, start + p.key.length);
                                }, 0);
                              }
                            }}
                          >
                            {p.key}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{p.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

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
                  <CardTitle className="text-foreground">{t("appearance.title")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("appearance.description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="embed-color" className="text-sm font-medium">
                  {t("appearance.embedColor")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("appearance.embedColorDesc")}
                </p>
                {isLoading ? (
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-10 w-full animate-pulse" />
                      <Skeleton className="h-4 w-48 animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-16 h-16 p-1 border-2 relative group flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-all hover:scale-105 active:scale-95"
                            style={{ backgroundColor: intToHex(settings.embed_color) }}
                            onClick={() => {
                              setTempColor(settings.embed_color);
                              setTempHex(intToHex(settings.embed_color));
                            }}
                          >
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Pencil className="h-7 w-7 text-white" strokeWidth={3} />
                            </div>
                            <Pencil className="h-6 w-6 text-white drop-shadow-md opacity-90" strokeWidth={2.5} />
                          </Button>
                        </DialogTrigger>
                        <div className="flex-1 space-y-1">
                          <p className="text-base font-mono font-medium">{intToHex(settings.embed_color)}</p>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            <ReactMarkdown>{t("appearance.embedColorDefault")}</ReactMarkdown>
                          </div>
                        </div>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>{t("appearance.editColor")}</DialogTitle>
                            <DialogDescription>
                              {t("appearance.embedColorDesc")}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex flex-col gap-4 py-4">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <Input
                                  type="color"
                                  value={intToHex(tempColor)}
                                  onChange={(e) => {
                                    const newColor = hexToInt(e.target.value);
                                    setTempColor(newColor);
                                    setTempHex(intToHex(newColor));
                                  }}
                                  className="w-20 h-20 cursor-pointer border-2 rounded-lg p-1"
                                />
                              </div>
                              <div className="flex-1 space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">Hex Code</Label>
                                <Input
                                  value={tempHex}
                                  onChange={(e) => {
                                    const hex = e.target.value.toUpperCase();
                                    if (hex.length <= 7) {
                                      setTempHex(hex);
                                      if (/^#[0-9A-F]{6}$/i.test(hex)) {
                                        setTempColor(hexToInt(hex));
                                      }
                                    }
                                  }}
                                  placeholder="#D90709"
                                  className="bg-secondary border-border font-mono text-lg uppercase"
                                />
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-fit text-xs text-muted-foreground hover:text-primary"
                              onClick={() => {
                                setTempColor(14223113);
                                setTempHex("#D90709");
                              }}
                            >
                              <RotateCcw className="mr-2 h-3 w-3" />
                              {t("appearance.resetToDefault")}
                            </Button>
                          </div>
                          <DialogFooter className="flex sm:justify-between gap-2">
                            <Button 
                              variant="ghost" 
                              onClick={() => setIsDialogOpen(false)}
                            >
                              {tCommon("cancel")}
                            </Button>
                            <Button 
                              onClick={() => {
                                setSettings({ ...settings, embed_color: tempColor });
                                setIsDialogOpen(false);
                              }}
                              disabled={!/^#[0-9A-F]{6}$/i.test(tempHex)}
                            >
                              {t("appearance.apply")}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}

                {/* Color Preview */}
                {isLoading ? (
                  <Skeleton className="h-20 w-full animate-pulse" />
                ) : (
                  <div
                    className="rounded-lg p-4 border-l-4 bg-secondary/50"
                    style={{ borderLeftColor: intToHex(settings.embed_color) }}
                  >
                    <p className="text-sm font-medium mb-1">{t("appearance.embedPreview")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("appearance.embedPreviewDesc")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security & Permissions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Lock className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground">{t("security.title")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("security.description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Token Requirement */}
              <div className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="api-token" className="text-sm font-medium">
                    {t("security.requireApiToken")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("security.requireApiTokenDesc")}
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

              <Separator className="my-2" />

              {/* Whitelist Role */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="whitelist-role" className="text-sm font-medium">
                    {t("security.fullWhitelistRole")}
                  </Label>
                </div>
                <Select
                  value={settings.full_whitelist_role || "none"}
                  onValueChange={(value) =>
                    setSettings({ ...settings, full_whitelist_role: value === "none" ? undefined : value })
                  }
                >
                  <SelectTrigger id="whitelist-role" className="bg-secondary border-border">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("security.noRole")}</SelectItem>
                    {discordRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("security.fullWhitelistRoleDesc")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
