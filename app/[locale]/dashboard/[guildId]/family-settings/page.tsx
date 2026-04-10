"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, AlertCircle, Loader2, User, Shield, Eye, ChevronDown, ChevronRight, Trash2, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import {
  dashboardCacheKeys,
  normalizeDiscordRolesPayload,
  normalizeServerSettingsPayload,
} from "@/lib/dashboard-cache";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleCombobox } from "@/components/ui/role-combobox";
import { useToast } from "@/components/ui/use-toast";
import type { FamilyRolesResponse, FamilyRoleType } from "@/lib/api/types/family-roles";

interface NicknameSettings {
  change_nickname: boolean;
  nickname_rule: string;
  non_family_nickname_rule: string;
}

// Color classes for role type cards
const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
  red: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/30" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/30" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/30" },
  gray: { bg: "bg-gray-500/10", text: "text-gray-500", border: "border-gray-500/30" },
};

// FamilyRoleCard component - supports multiple roles per type
interface FamilyRoleCardProps {
  readonly roleTypeKey: FamilyRoleType;
  readonly label: string;
  readonly description: string;
  readonly roleIds: string[];
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly color: string;
  readonly discordRoles: Array<{ id: string; name: string; color?: number }>;
  readonly isRoleDataLoading: boolean;
  readonly isLoading: boolean;
  readonly onAdd: (roleId: string) => Promise<void>;
  readonly onRemove: (roleId: string) => Promise<void>;
  readonly t: (key: string) => string;
}

function intToHexColor(color: number): string {
  if (!color) return "#99AAB5"; // Discord default gray
  return `#${color.toString(16).padStart(6, "0")}`;
}

function FamilyRoleCard({
  roleTypeKey,
  label,
  description,
  roleIds,
  icon: Icon,
  color,
  discordRoles,
  isRoleDataLoading,
  isLoading,
  onAdd,
  onRemove,
  t,
}: FamilyRoleCardProps) {
  const colors = colorClasses[color] || colorClasses.gray;
  const hasRoles = !isRoleDataLoading && roleIds.length > 0;

  // Get role details with existence check
  const assignedRoles = roleIds.map((roleId) => {
    const discordRole = discordRoles.find((r) => r.id === roleId);
    return {
      id: roleId,
      name: discordRole?.name || null,
      color: discordRole?.color || 0,
      exists: discordRole !== undefined,
    };
  });

  const hasDeletedRoles = assignedRoles.some((r) => !r.exists);

  return (
    <div className={`rounded-lg border ${hasRoles ? colors.border : "border-border"} ${hasRoles ? colors.bg : "bg-secondary/20"} transition-all`}>
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Icon className={`h-4 w-4 ${colors.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{label}</p>
              {hasRoles && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                  {roleIds.length}
                </span>
              )}
              {hasDeletedRoles && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/10">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Content */}
      <div className="px-3 pb-3 space-y-3">
        {isRoleDataLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            {/* Role Combobox to add */}
            <RoleCombobox
              roles={discordRoles}
              mode="add"
              excludeRoleIds={roleIds}
              onAdd={onAdd}
              addPlaceholder={t("familyRoles.addRole")}
              disabled={isLoading}
              showDisabled={false}
            />

            {/* Assigned roles list */}
            {hasRoles && (
              <div className="space-y-1.5">
                {assignedRoles.map((role) => (
                  <div
                    key={role.id}
                    className={`flex items-center justify-between p-2 rounded-md ${
                      role.exists ? "bg-background/60" : "bg-orange-500/5 border border-orange-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: role.exists ? intToHexColor(role.color) : "#f97316" }}
                      />
                      <span className={`text-sm truncate ${!role.exists ? "text-orange-600" : "text-foreground"}`}>
                        {role.exists ? `@${role.name}` : t("familyRoles.deletedRole")}
                      </span>
                      {!role.exists && (
                        <span className="text-xs text-orange-500">({role.id})</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(role.id)}
                      disabled={isLoading}
                      className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!hasRoles && (
              <p className="text-xs text-muted-foreground text-center py-1">
                {t("familyRoles.noRolesConfigured")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function FamilySettingsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const t = useTranslations("FamilySettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();

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

  const [settings, setSettings] = useState<NicknameSettings>({
    change_nickname: true,
    nickname_rule: "[{player_clan_abbreviation}] {player_name}",
    non_family_nickname_rule: "{player_name}",
  });
  const [initialSettings, setInitialSettings] = useState<NicknameSettings | null>(null);

  const [discordRoles, setDiscordRoles] = useState<Array<{ id: string; name: string; color?: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFamilyPlaceholdersOpen, setIsFamilyPlaceholdersOpen] = useState(false);
  const [isNonFamilyPlaceholdersOpen, setIsNonFamilyPlaceholdersOpen] = useState(false);

  // Family Roles state
  const [familyRoles, setFamilyRoles] = useState<FamilyRolesResponse | null>(null);
  const [isLoadingFamilyRoles, setIsLoadingFamilyRoles] = useState(true);
  const [familyRolesLoading, setFamilyRolesLoading] = useState(false);

  const settingsCacheKey = dashboardCacheKeys.settings(guildId);
  const rolesCacheKey = dashboardCacheKeys.discordRoles(guildId);
  const familyRolesCacheKey = `family-roles-${guildId}`;

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadDiscordRoles();
    loadFamilyRoles();
  }, [guildId]);

  const loadSettings = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No access token found. Please log in again.");
      }

      if (forceRefresh) {
        apiCache.invalidate(settingsCacheKey);
      }

      const settingsPayload = await apiCache.get(settingsCacheKey, async () => {
        const response = await apiClient.servers.getSettings(guildId);

        if (response.error) {
          throw new Error(response.error);
        }

        return response.data;
      });
      const settingsData = normalizeServerSettingsPayload(settingsPayload);

      if (settingsData) {
        const loadedSettings = {
          change_nickname: settingsData.change_nickname ?? true,
          nickname_rule: settingsData.nickname_rule ?? "[{player_clan_abbreviation}] {player_name}",
          non_family_nickname_rule: settingsData.non_family_nickname_rule ?? "{player_name}",
        };

        setSettings(loadedSettings);
        setInitialSettings(loadedSettings);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDiscordRoles = async (forceRefresh = false) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      if (forceRefresh) {
        apiCache.invalidate(rolesCacheKey);
      }

      // Use cache to prevent duplicate requests
      const rolesPayload = await apiCache.get(rolesCacheKey, async () => {
        const response = await apiClient.roles.getDiscordRoles(guildId);
        if (response.error) {
          throw new Error(response.error);
        }
        return response.data;
      });
      setDiscordRoles(normalizeDiscordRolesPayload(rolesPayload));
    } catch (err) {
      console.error("Failed to load Discord roles:", err);
    }
  };

  const loadFamilyRoles = async (forceRefresh = false) => {
    try {
      setIsLoadingFamilyRoles(true);
      const token = localStorage.getItem("access_token");
      if (!token) return;

      if (forceRefresh) {
        apiCache.invalidate(familyRolesCacheKey);
      }

      const familyRolesData = await apiCache.get(familyRolesCacheKey, async () => {
        const response = await apiClient.familyRoles.getFamilyRoles(guildId);

        if (response.error) {
          throw new Error(response.error);
        }

        return response.data;
      });

      if (familyRolesData) {
        setFamilyRoles(familyRolesData);
      }
    } catch (err) {
      console.error("Failed to load family roles:", err);
    } finally {
      setIsLoadingFamilyRoles(false);
    }
  };

  const handleAddFamilyRole = async (roleType: FamilyRoleType, roleId: string) => {
    if (!roleId || !roleType) return;

    try {
      setFamilyRolesLoading(true);
      setError(null);

      const token = localStorage.getItem("access_token");
      if (!token) return;

      const response = await apiClient.familyRoles.addFamilyRole(guildId, {
        role: roleId,
        type: roleType,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      // Refresh family roles after update
      await loadFamilyRoles(true);

      toast({
        title: tCommon("success"),
        description: t("settingsSaved"),
      });
    } catch (err: any) {
      setError(err.message || "Failed to add family role");
    } finally {
      setFamilyRolesLoading(false);
    }
  };

  const handleRemoveFamilyRole = async (roleType: FamilyRoleType, roleId: string) => {
    try {
      setFamilyRolesLoading(true);
      setError(null);

      const token = localStorage.getItem("access_token");
      if (!token) return;

      const response = await apiClient.familyRoles.removeFamilyRole(guildId, roleType, roleId);

      if (response.error) {
        setError(response.error);
        return;
      }

      // Refresh family roles after update
      await loadFamilyRoles(true);

      toast({
        title: tCommon("success"),
        description: t("settingsSaved"),
      });
    } catch (err: any) {
      setError(err.message || "Failed to remove family role");
    } finally {
      setFamilyRolesLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!isSettingsDirty) return;

      setIsSaving(true);
      setError(null);

      await apiClient.servers.updateSettings(guildId, {
        change_nickname: settings.change_nickname,
        nickname_rule: settings.nickname_rule,
        non_family_nickname_rule: settings.non_family_nickname_rule,
      });

      // Invalidate cache after saving
      apiCache.invalidate(settingsCacheKey);

      setInitialSettings(settings);

      toast({
        title: tCommon("success"),
        description: t("settingsSaved"),
      });
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadSettings(true);
  };

  const isSettingsDirty =
    initialSettings !== null &&
    (settings.change_nickname !== initialSettings.change_nickname ||
      settings.nickname_rule !== initialSettings.nickname_rule ||
      settings.non_family_nickname_rule !== initialSettings.non_family_nickname_rule);

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
      preview = preview.replaceAll(new RegExp(key, "g"), value);
    });

    return preview;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Full-width cards (Nickname + Family Roles) */}
        <div className="space-y-6">
          {/* Nickname Management */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
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
                {isSettingsDirty && (
                  <div className="flex items-center gap-2">
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
                )}
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

          {/* Family Roles */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground">{t("familyRoles.title")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("familyRoles.description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Role Type Cards - Similar to LogCards */}
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {[
                  { key: "family", label: t("familyRoles.types.family"), description: t("familyRoles.descriptions.family"), roles: familyRoles?.family_roles || [], icon: Users, color: "green" },
                  { key: "not_family", label: t("familyRoles.types.notFamily"), description: t("familyRoles.descriptions.notFamily"), roles: familyRoles?.not_family_roles || [], icon: Users, color: "red" },
                  { key: "only_family", label: t("familyRoles.types.onlyFamily"), description: t("familyRoles.descriptions.onlyFamily"), roles: familyRoles?.only_family_roles || [], icon: Users, color: "blue" },
                  { key: "family_member", label: t("familyRoles.types.member"), description: t("familyRoles.descriptions.member"), roles: familyRoles?.family_member_roles || [], icon: Shield, color: "gray" },
                  { key: "family_elder", label: t("familyRoles.types.elder"), description: t("familyRoles.descriptions.elder"), roles: familyRoles?.family_elder_roles || [], icon: Shield, color: "yellow" },
                  { key: "family_coleader", label: t("familyRoles.types.coLeader"), description: t("familyRoles.descriptions.coLeader"), roles: familyRoles?.family_coleader_roles || [], icon: Shield, color: "orange" },
                  { key: "family_leader", label: t("familyRoles.types.leader"), description: t("familyRoles.descriptions.leader"), roles: familyRoles?.family_leader_roles || [], icon: Shield, color: "purple" },
                  { key: "ignored", label: t("familyRoles.types.ignored"), description: t("familyRoles.descriptions.ignored"), roles: familyRoles?.ignored_roles || [], icon: Eye, color: "gray" },
                ].map((roleType) => (
                  <FamilyRoleCard
                    key={roleType.key}
                    roleTypeKey={roleType.key as FamilyRoleType}
                    label={roleType.label}
                    description={roleType.description}
                    roleIds={roleType.roles}
                    icon={roleType.icon}
                    color={roleType.color}
                    discordRoles={discordRoles}
                    isRoleDataLoading={isLoadingFamilyRoles}
                    isLoading={familyRolesLoading}
                    onAdd={(roleId) => handleAddFamilyRole(roleType.key as FamilyRoleType, roleId)}
                    onRemove={(roleId) => handleRemoveFamilyRole(roleType.key as FamilyRoleType, roleId)}
                    t={t}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
