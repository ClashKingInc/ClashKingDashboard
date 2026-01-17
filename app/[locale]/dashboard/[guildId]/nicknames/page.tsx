"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, AlertCircle, Loader2, User, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import ReactMarkdown from "react-markdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

export default function NicknamesPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const t = useTranslations("NicknamesPage");
  const tCommon = useTranslations("Common");

  // Placeholder descriptions from translations
  const PLACEHOLDERS = [
    { key: "{discord_name}", desc: t("placeholders.discordName"), example: "JohnDoe#1234" },
    { key: "{discord_display_name}", desc: t("placeholders.discordDisplayName"), example: "John" },
    { key: "{player_name}", desc: t("placeholders.playerName"), example: "Chief John" },
    { key: "{player_tag}", desc: t("placeholders.playerTag"), example: "#2PP" },
    { key: "{player_townhall}", desc: t("placeholders.playerTownhall"), example: "16" },
    { key: "{player_townhall_small}", desc: t("placeholders.playerTownhallSmall"), example: "¹⁶" },
    { key: "{player_warstars}", desc: t("placeholders.playerWarstars"), example: "1234" },
    { key: "{player_role}", desc: t("placeholders.playerRole"), example: "Leader" },
    { key: "{player_clan}", desc: t("placeholders.playerClan"), example: "RCS Clan" },
    { key: "{player_league}", desc: t("placeholders.playerLeague"), example: "Legend" },
    { key: "{player_clan_abbreviation}", desc: t("placeholders.playerClanAbbr"), example: "RCS" },
  ];

  const [settings, setSettings] = useState({
    change_nickname: true,
    nickname_rule: "[{player_clan_abbreviation}] {player_name}",
    non_family_nickname_rule: "{player_name}",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isFamilyPlaceholdersOpen, setIsFamilyPlaceholdersOpen] = useState(false);
  const [isNonFamilyPlaceholdersOpen, setIsNonFamilyPlaceholdersOpen] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
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
        };
        setSettings(newSettings);
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

      // Invalidate cache after saving
      apiCache.invalidate(`settings-${guildId}`);

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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-muted-foreground mt-1">
                {t("description")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 md:ml-auto">
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-border"
              size="sm"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {tCommon("refresh")}
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
                  {tCommon("loading")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {tCommon("save")}
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

        {/* Automatic Changes */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">{t("automaticChanges")}</CardTitle>
                <CardDescription className="text-xs">
                  {t("automaticChangesDesc")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{t("automaticChanges")}</p>
                <p className="text-xs text-muted-foreground">{t("automaticChangesDesc")}</p>
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
          </CardContent>
        </Card>

        {/* Nickname Management Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">{t("card.title")}</CardTitle>
                <CardDescription className="text-xs">
                  {t("card.description")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Family Convention */}
            <div className="space-y-3">
              <Label htmlFor="family-convention" className="text-sm font-medium">
                {t("familyFormat")}
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
                  <p className="text-xs font-medium text-primary">{t("preview")}</p>
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
                    <p className="text-xs font-medium text-[#DC2626]">{t("availablePlaceholders")}</p>
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
                {t("nonFamilyFormat")}
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
                  <p className="text-xs font-medium text-primary">{t("preview")}</p>
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
                  <p className="text-xs font-medium text-[#DC2626]">{t("availablePlaceholders")}</p>
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
      </div>
    </div>
  );
}
