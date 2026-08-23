"use client";

import { useGuildId } from "@/lib/dashboard-route";


import React, { useRef, useState, useEffect, useEffectEvent } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, AlertCircle, Loader2, Shield, Trash2, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import {
  normalizeDiscordRolesPayload,
  normalizeServerSettingsPayload,
} from "@/lib/dashboard-cache";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleCombobox } from "@/components/ui/role-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import type { FamilyRole, FamilyRolesResponse, FamilyRoleType } from "@/lib/api/types/family-roles";
import type { RoleMode } from "@/lib/api/types/roles";
import { NicknameFormatInput } from "./nickname-format-input";
import type { PlaceholderOption } from "./nickname-format";
import { InfoPopover } from "@/components/ui/info-popover";
import { presentFamilyRoles } from "./family-role-presentation";

interface NicknameSettings {
  change_nickname: boolean;
  nickname_rule: string;
  non_family_nickname_rule: string;
}

// Color classes for role type cards
const colorClasses: Record<string, { bg: string; text: string }> = {
  green: { bg: "bg-green-500/10", text: "text-green-500" },
  red: { bg: "bg-red-500/10", text: "text-red-500" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-500" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-500" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-500" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-500" },
  gray: { bg: "bg-gray-500/10", text: "text-gray-500" },
};

// FamilyRoleCard component - supports multiple roles per type
interface FamilyRoleCardProps {
  readonly label: string;
  readonly description: string;
  readonly roles: FamilyRole[];
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly color: string;
  readonly discordRoles: Array<{ id: string; name: string; color?: number }>;
  readonly isRoleDataLoading: boolean;
  readonly isLoading: boolean;
  readonly removeLabel: string;
  readonly onAdd: (roleId: string) => Promise<void>;
  readonly onRemove: (id: string, roleId: string) => Promise<void>;
  readonly onModeChange: (id: string, mode: RoleMode) => Promise<void>;
  readonly t: (key: string) => string;
}

function intToHexColor(color: number): string {
  if (!color) return "#99AAB5"; // Discord default gray
  return `#${color.toString(16).padStart(6, "0")}`;
}

function FamilyRoleCard({
  label,
  description,
  roles,
  icon: Icon,
  color,
  discordRoles,
  isRoleDataLoading,
  isLoading,
  removeLabel,
  onAdd,
  onRemove,
  onModeChange,
  t,
}: FamilyRoleCardProps) {
  const colors = colorClasses[color] || colorClasses.gray;
  const hasRoles = !isRoleDataLoading && roles.length > 0;

  const assignedRoles = presentFamilyRoles(roles, discordRoles, t("familyRoles.deletedRole"));

  const hasDeletedRoles = assignedRoles.some((r) => !r.exists);

  return (
    <div className="rounded-[22px] bg-card shadow-sm shadow-black/5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${colors.bg}`}>
            <Icon className={`h-4 w-4 ${colors.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{label}</p>
              {hasRoles && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                  {roles.length}
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
      <div className="space-y-3 px-4 pb-4">
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
              excludeRoleIds={roles.map((role) => role.role_id)}
              onAdd={onAdd}
              addPlaceholder={t("familyRoles.addRole")}
              disabled={isLoading}
              showDisabled={false}
              className="h-10 rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5 hover:bg-muted"
            />

            {/* Assigned roles list */}
            {hasRoles && (
              <div className="space-y-1.5">
                {assignedRoles.map((role) => (
                  <div
                    key={role.id}
                    data-slot="family-role-row"
                    className={`flex min-w-0 flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-2.5 ${
                      role.exists ? "bg-muted/45" : "bg-orange-500/10"
                    }`}
                  >
                    <div className="flex min-w-0 w-full items-center gap-2 sm:flex-1">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: role.exists ? intToHexColor(role.color) : "#f97316" }}
                      />
                      <span className={`min-w-0 flex-1 truncate text-sm ${role.exists ? "text-foreground" : "text-orange-600"}`}>
                        {role.displayName}
                      </span>
                    </div>
                    <div data-slot="family-role-actions" className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:shrink-0 sm:gap-1.5">
                      <Select value={role.mode} onValueChange={(mode) => void onModeChange(role.id, mode as RoleMode)} disabled={isLoading}>
                        <SelectTrigger className="h-10 min-w-0 flex-1 border-0 bg-background/70 text-xs shadow-sm shadow-black/5 sm:h-8 sm:w-[8.5rem] sm:flex-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">{t("familyRoles.modes.both")}</SelectItem>
                          <SelectItem value="add">{t("familyRoles.modes.add")}</SelectItem>
                          <SelectItem value="remove">{t("familyRoles.modes.remove")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => onRemove(role.id, role.role_id)}
                        disabled={isLoading}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8 sm:rounded-lg"
                        aria-label={`${removeLabel} ${role.displayName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const t = useTranslations("FamilySettingsPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();

  const placeholders: PlaceholderOption[] = [
    { key: "{discord_name}", description: t("nickname.placeholders.discordName"), example: "JohnDoe#1234" },
    { key: "{discord_display_name}", description: t("nickname.placeholders.discordDisplayName"), example: "John" },
    { key: "{player_name}", description: t("nickname.placeholders.playerName"), example: "Chief John" },
    { key: "{player_tag}", description: t("nickname.placeholders.playerTag"), example: "#2PP" },
    { key: "{player_townhall}", description: t("nickname.placeholders.playerTownhall"), example: "16" },
    { key: "{player_townhall_small}", description: t("nickname.placeholders.playerTownhallSmall"), example: "¹⁶" },
    { key: "{player_warstars}", description: t("nickname.placeholders.playerWarstars"), example: "1234" },
    { key: "{player_role}", description: t("nickname.placeholders.playerRole"), example: "Leader" },
    { key: "{player_clan}", description: t("nickname.placeholders.playerClan"), example: "RCS Clan" },
    { key: "{player_league}", description: t("nickname.placeholders.playerLeague"), example: "Legend" },
    { key: "{player_clan_abbreviation}", description: t("nickname.placeholders.playerClanAbbr"), example: "RCS" },
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
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settingsRef = useRef(settings);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Family Roles state
  const [familyRoles, setFamilyRoles] = useState<FamilyRolesResponse | null>(null);
  const [isLoadingFamilyRoles, setIsLoadingFamilyRoles] = useState(true);
  const [familyRolesLoading, setFamilyRolesLoading] = useState(false);

  const loadSettings = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.settings(guildId), exact: true });
      }

      const settingsPayload = await queryClient.fetchQuery(dashboardQueryOptions.settings(guildId));
      const settingsData = normalizeServerSettingsPayload(settingsPayload);

      if (settingsData) {
        const loadedSettings = {
          change_nickname: settingsData.change_nickname ?? true,
          nickname_rule: settingsData.nickname_rule ?? "[{player_clan_abbreviation}] {player_name}",
          non_family_nickname_rule: settingsData.non_family_nickname_rule ?? "{player_name}",
        };

        settingsRef.current = loadedSettings;
        setSettings(loadedSettings);
        setInitialSettings(loadedSettings);
        setShowSaved(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDiscordRoles(forceRefresh = false) {
    try {
      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.roles(guildId), exact: true });
      }

      const rolesPayload = await queryClient.fetchQuery(dashboardQueryOptions.roles(guildId));
      setDiscordRoles(normalizeDiscordRolesPayload(rolesPayload));
    } catch (err) {
      console.error("Failed to load Discord roles:", err);
    }
  }

  async function loadFamilyRoles(forceRefresh = false) {
    try {
      setIsLoadingFamilyRoles(true);
      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("family-roles", guildId), exact: true });
      }

      const familyRolesData = await queryClient.fetchQuery({
        queryKey: dashboardQueryKeys.route("family-roles", guildId),
        queryFn: async () => {
          const response = await apiClient.familyRoles.getFamilyRoles(guildId);
          if (response.error || !response.data) throw new Error(response.error || "Failed to load family roles");
          return response.data;
        },
      });

      if (familyRolesData) {
        setFamilyRoles(familyRolesData);
      }
    } catch (err) {
      console.error("Failed to load family roles:", err);
    } finally {
      setIsLoadingFamilyRoles(false);
    }
  }

  const loadInitialData = useEffectEvent(() => {
    void loadSettings();
    void loadDiscordRoles();
    void loadFamilyRoles();
  });

  useEffect(() => {
    loadInitialData();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
    };
  }, [guildId]);

  const handleAddFamilyRole = async (roleType: FamilyRoleType, roleId: string) => {
    if (!roleId || !roleType) return;

    try {
      setFamilyRolesLoading(true);
      setError(null);

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

  const handleRemoveFamilyRole = async (roleType: FamilyRoleType, id: string, roleId: string) => {
    try {
      setFamilyRolesLoading(true);
      setError(null);

      const response = await apiClient.familyRoles.removeFamilyRole(guildId, roleType, id, roleId);

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

  const handleFamilyRoleModeChange = async (id: string, mode: RoleMode) => {
    try {
      setFamilyRolesLoading(true);
      setError(null);
      const response = await apiClient.familyRoles.updateFamilyRoleMode(guildId, id, mode);
      if (response.error) {
        setError(response.error);
        return;
      }
      await loadFamilyRoles(true);
    } catch (err: any) {
      setError(err.message || "Failed to update family role behavior");
    } finally {
      setFamilyRolesLoading(false);
    }
  };

  const persistSettings = (nextSettings: NicknameSettings) => {
    saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(async () => {
      try {
        setIsSaving(true);
        setShowSaved(false);
        setError(null);
        const response = await apiClient.servers.updateSettings(guildId, nextSettings);
        if (response.error) throw new Error(response.error);

        await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.settings(guildId), exact: true });
        setInitialSettings(nextSettings);
        setShowSaved(true);
        if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
        savedIndicatorTimerRef.current = setTimeout(() => setShowSaved(false), 2400);
      } catch (err: any) {
        setError(err.message || "Failed to save settings");
        console.error("Failed to save settings:", err);
      } finally {
        setIsSaving(false);
      }
    });

    return saveQueueRef.current;
  };

  const cancelPendingSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  };

  const updateNicknameFormat = (
    field: "nickname_rule" | "non_family_nickname_rule",
    value: string,
  ) => {
    const nextSettings = { ...settingsRef.current, [field]: value };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    setShowSaved(false);
    cancelPendingSave();
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persistSettings(settingsRef.current);
    }, 700);
  };

  const commitNicknameFormats = () => {
    if (!saveTimerRef.current) return;
    cancelPendingSave();
    void persistSettings(settingsRef.current);
  };

  const handleNicknameToggle = (checked: boolean) => {
    cancelPendingSave();
    const nextSettings = { ...settingsRef.current, change_nickname: checked };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    setShowSaved(false);
    void persistSettings(nextSettings);
  };

  const handleReset = async () => {
    cancelPendingSave();
    setShowSaved(false);
    await saveQueueRef.current;
    await loadSettings(true);
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
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("description")}</p>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="space-y-4" aria-labelledby="nickname-settings-heading">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="nickname-settings-heading" className="text-lg font-semibold text-foreground">
                {t("nickname.title")}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("nickname.description")}</p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between md:w-auto md:justify-end">
              <div className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl bg-muted/45 px-3 py-2 sm:w-auto">
                <div className="flex min-w-0 items-center gap-1.5">
                  <label htmlFor="change-nicknames" className="truncate text-sm font-medium">
                    {t("nickname.automaticChanges")}
                  </label>
                  <InfoPopover content={t("nickname.automaticChangesDesc")} label={t("nickname.automaticChangesDesc")} />
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-11 rounded-full" />
                ) : (
                  <Switch
                    id="change-nicknames"
                    checked={settings.change_nickname}
                    disabled={isSaving}
                    onCheckedChange={handleNicknameToggle}
                  />
                )}
              </div>

              <div className="flex min-h-11 items-center justify-end gap-2">
                {(isSaving || isSettingsDirty || showSaved) && <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground" aria-live="polite">
                  {isSaving ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("saving")}</>
                  ) : isSettingsDirty ? (
                    t("nickname.pending")
                  ) : showSaved ? (
                    <><Check className="h-3.5 w-3.5 text-green-500" />{t("nickname.saved")}</>
                  ) : null}
                </span>}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isLoading || isSaving}
                  onClick={() => void handleReset()}
                  className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("reset")}
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-36 rounded-[22px]" />
              <Skeleton className="h-36 rounded-[22px]" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <NicknameFormatInput
                id="family-convention"
                label={t("nickname.familyFormat")}
                value={settings.nickname_rule}
                preview={generatePreview(settings.nickname_rule)}
                previewLabel={t("nickname.preview")}
                autocompleteHint={t("nickname.autocompleteHint")}
                placeholders={placeholders}
                onChange={(value) => updateNicknameFormat("nickname_rule", value)}
                onCommit={commitNicknameFormats}
              />
              <NicknameFormatInput
                id="non-family-convention"
                label={t("nickname.nonFamilyFormat")}
                value={settings.non_family_nickname_rule}
                preview={generatePreview(settings.non_family_nickname_rule)}
                previewLabel={t("nickname.preview")}
                autocompleteHint={t("nickname.autocompleteHint")}
                placeholders={placeholders}
                onChange={(value) => updateNicknameFormat("non_family_nickname_rule", value)}
                onCommit={commitNicknameFormats}
              />
            </div>
          )}

          <details className="group rounded-2xl bg-muted/35 px-4 py-3">
            <summary className="cursor-pointer select-none text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t("nickname.availablePlaceholders")}
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {placeholders.map((placeholder) => (
                <div key={placeholder.key} className="flex min-w-0 items-center gap-2 rounded-xl bg-background/55 px-3 py-2">
                  <code className="shrink-0 text-xs font-semibold text-primary">{placeholder.key}</code>
                  <span className="truncate text-xs text-muted-foreground">{placeholder.description}</span>
                </div>
              ))}
            </div>
          </details>
        </section>

        <section className="space-y-4" aria-labelledby="family-roles-heading">
          <div>
            <h2 id="family-roles-heading" className="text-lg font-semibold text-foreground">
              {t("familyRoles.title")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("familyRoles.description")}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[
              { key: "family", label: t("familyRoles.types.family"), description: t("familyRoles.descriptions.family"), roles: familyRoles?.family_roles || [], icon: Users, color: "green" },
              { key: "not_family", label: t("familyRoles.types.notFamily"), description: t("familyRoles.descriptions.notFamily"), roles: familyRoles?.not_family_roles || [], icon: Users, color: "red" },
              { key: "family_elder", label: t("familyRoles.types.elder"), description: t("familyRoles.descriptions.elder"), roles: familyRoles?.family_elder_roles || [], icon: Shield, color: "yellow" },
              { key: "family_coleader", label: t("familyRoles.types.coLeader"), description: t("familyRoles.descriptions.coLeader"), roles: familyRoles?.family_coleader_roles || [], icon: Shield, color: "orange" },
              { key: "family_leader", label: t("familyRoles.types.leader"), description: t("familyRoles.descriptions.leader"), roles: familyRoles?.family_leader_roles || [], icon: Shield, color: "purple" },
            ].map((roleType) => (
              <FamilyRoleCard
                key={roleType.key}
                label={roleType.label}
                description={roleType.description}
                roles={roleType.roles}
                icon={roleType.icon}
                color={roleType.color}
                discordRoles={discordRoles}
                isRoleDataLoading={isLoadingFamilyRoles}
                isLoading={familyRolesLoading}
                removeLabel={tCommon("remove")}
                onAdd={(roleId) => handleAddFamilyRole(roleType.key as FamilyRoleType, roleId)}
                onRemove={(id, roleId) => handleRemoveFamilyRole(roleType.key as FamilyRoleType, id, roleId)}
                onModeChange={handleFamilyRoleModeChange}
                t={t}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
