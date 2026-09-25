"use client";

import { useGuildId } from "@/lib/dashboard-route";


import React, { useState, useEffect, useEffectEvent } from "react";
import { useTranslations } from "use-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleCombobox } from "@/components/ui/role-combobox";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api/client";
import {
  normalizeDiscordRolesPayload,
  normalizeServerSettingsPayload,
} from "@/lib/dashboard-cache";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";
import ReactMarkdown from "react-markdown";
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
import { EmbedColorPicker, embedColorHex as intToHex } from "@/components/dashboard/embed-color-picker";
import { BotProfileCard } from "@/components/dashboard/bot-profile-card";
import { DashboardAccessSettings } from "@/components/dashboard/dashboard-access-settings";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";

export default function GeneralSettingsPage() {
  const guildId = useGuildId();
  const t = useTranslations("GeneralPage");
  const tCommon = useTranslations("Common");
  const { capabilities, canManage } = useDashboardAccess();
  const queryClient = useQueryClient();
  const editable = canManage("settings");
  const fullAccess = capabilities?.full_access === true;

  const [settings, setSettings] = useState({
    embed_color: 14223113, // #D90709 as integer
    full_whitelist_role: undefined as string | undefined,
  });

  const [discordRoles, setDiscordRoles] = useState<Array<{ id: string; name: string; color?: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Discord Tenure Roles state
  const [tenureRoles, setTenureRoles] = useState<Array<{ id: string; rule_id: string; months: number }>>([]);
  const [isLoadingTenureRoles, setIsLoadingTenureRoles] = useState(true);
  const [isTenureDialogOpen, setIsTenureDialogOpen] = useState(false);
  const [newTenureRole, setNewTenureRole] = useState<{ months?: number; id?: string }>({});
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setHasLoadedSettings(false);
      setError(null);

      const settingsPayload = await queryClient.fetchQuery(dashboardQueryOptions.settings(guildId));
      const settingsData = normalizeServerSettingsPayload(settingsPayload);

      if (settingsData) {
        const parsedEmbedColor = Number(settingsData.embed_color ?? 14223113);
        const embedColor = Number.isFinite(parsedEmbedColor) ? parsedEmbedColor : 14223113;
        const newSettings = {
          embed_color: embedColor,
          full_whitelist_role: settingsData.full_whitelist_role?.toString(),
        };
        setSettings(newSettings);
        setHasLoadedSettings(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDiscordRoles() {
    try {
      // Use cache to prevent duplicate requests
      const rolesPayload = await queryClient.fetchQuery(dashboardQueryOptions.roles(guildId));
      setDiscordRoles([...normalizeDiscordRolesPayload(rolesPayload)]);
    } catch (err) {
      console.error("Failed to load Discord roles:", err);
    }
  }

  async function loadTenureRoles() {
    try {
      setIsLoadingTenureRoles(true);
      const allRolesPayload = await queryClient.fetchQuery({
        queryKey: dashboardQueryKeys.route("server-roles", guildId, "status"),
        queryFn: async () => {
          const response = await apiClient.roles.getServerRoles(guildId, { type: 'status' });
          if (response.error || !response.data) throw new Error(response.error || "Failed to load tenure roles");
          return response.data;
        },
      });
      if (allRolesPayload?.roles) {
        const normalizedRoles = allRolesPayload.roles.map((role) => ({
          id: role.role_id,
          rule_id: role.id,
          months: Number(role.option),
        }));
        setTenureRoles(normalizedRoles);
      }
    } catch (err) {
      console.error("Failed to load tenure roles:", err);
    } finally {
      setIsLoadingTenureRoles(false);
    }
  }

  const loadInitialData = useEffectEvent(() => {
    void loadSettings();
    void loadDiscordRoles();
    void loadTenureRoles();
  });

  useEffect(() => { loadInitialData(); }, [guildId]);

  const handleAddTenureRole = async () => {
    try {
      setError(null);

      if (!newTenureRole.months || !newTenureRole.id) {
        setError("Please fill in all fields");
        return;
      }

      const response = await apiClient.roles.createServerRole(guildId, {
        type: 'status',
        option: String(newTenureRole.months),
        role_id: newTenureRole.id,
        mode: 'both',
      });
      if (response.error) throw new Error(response.error);

      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("server-roles", guildId, "status"), exact: true });
      await loadTenureRoles();
      setIsTenureDialogOpen(false);
      setNewTenureRole({});
      toast({
        title: tCommon("success"),
        description: t("settingsSaved"),
      });
    } catch (err: any) {
      setError(err.message || "Failed to add tenure role");
    }
  };

  const handleDeleteTenureRole = async (ruleId: string) => {
    try {
      setError(null);

      const response = await apiClient.roles.deleteServerRole(guildId, ruleId);
      if (response.error) throw new Error(response.error);

      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("server-roles", guildId, "status"), exact: true });
      await loadTenureRoles();
      toast({
        title: tCommon("success"),
        description: t("settingsSaved"),
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete tenure role");
    }
  };


  const saveSettings = async (
    updatedFields: Partial<typeof settings>,
    previousSettings?: typeof settings
  ) => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await apiClient.servers.updateSettings(guildId, updatedFields);
      if (response.error) throw new Error(response.error);

      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.settings(guildId), exact: true });

      toast({
        title: tCommon("success"),
        description: t("settingsSaved"),
      });
    } catch (err: any) {
      if (previousSettings) {
        setSettings(previousSettings);
      }
      setError(err.message || "Failed to save settings");
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const applySettingsChange = async (updatedFields: Partial<typeof settings>) => {
    if (isSaving || isLoading || !hasLoadedSettings || !editable) {
      return;
    }

    const previousSettings = settings;
    const nextSettings = { ...settings, ...updatedFields };

    setSettings(nextSettings);
    await saveSettings(updatedFields, previousSettings);
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background p-4 md:p-6">
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
          <BotProfileCard guildId={guildId} />

          <section className="min-w-0 space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{t("appearance.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("appearance.description")}</p>
          </div>
          {isLoading ? <Skeleton className="h-24 rounded-[24px]" /> : (
            <div className="space-y-4 rounded-[24px] bg-card p-4 shadow-sm shadow-black/5 sm:p-5">
              <div className="flex items-center gap-4">
                <EmbedColorPicker value={settings.embed_color} disabled={!editable || isSaving} onChange={embed_color => { void applySettingsChange({ embed_color }); }} />
                <div className="min-w-0"><Label className="text-sm font-medium">{t("appearance.embedColor")}</Label><p className="mt-0.5 font-mono text-sm">{intToHex(settings.embed_color)}</p><div className="mt-0.5 text-xs text-muted-foreground"><ReactMarkdown>{t("appearance.embedColorDefault")}</ReactMarkdown></div></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-muted/45 px-4 py-3">
                <span className="h-10 w-1 shrink-0 rounded-full ring-1 ring-border" style={{ backgroundColor: intToHex(settings.embed_color) }} />
                <div><p className="text-sm font-medium">{t("appearance.embedPreview")}</p><p className="text-xs text-muted-foreground">{t("appearance.embedPreviewDesc")}</p></div>
              </div>
            </div>
          )}
          </section>
        </div>

        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
          <section className="min-w-0 space-y-3">
            <div className="lg:min-h-[4.5rem]"><h2 className="text-lg font-semibold">{t("security.title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("security.description")}</p></div>
            <div className="space-y-4 rounded-[24px] bg-card p-4 shadow-sm shadow-black/5 sm:p-5">
              <div><Label htmlFor="whitelist-role" className="text-sm font-medium">{t("security.fullWhitelistRole")}</Label><p className="mt-1 text-xs text-muted-foreground">{t("security.fullWhitelistRoleDesc")}</p></div>
              <Select value={settings.full_whitelist_role || "none"} onValueChange={(value) => void applySettingsChange({ full_whitelist_role: value === "none" ? undefined : value })}>
                <SelectTrigger id="whitelist-role" className="border-0 bg-muted/55 shadow-sm shadow-black/5" disabled={!editable || isSaving}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">{t("security.noRole")}</SelectItem>{discordRoles.map((role) => <SelectItem key={role.id} value={role.id}><span style={{ color: role.color ? intToHex(role.color) : "#99AAB5" }}>@{role.name}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
          </section>
          {fullAccess && <DashboardAccessSettings guildId={guildId} />}
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-lg font-semibold">{t("tenureRoles.title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("tenureRoles.description")}</p></div>
            {editable && <Dialog open={isTenureDialogOpen} onOpenChange={setIsTenureDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />{t("tenureRoles.addRole")}</Button></DialogTrigger>
              <DialogContent variant="form" className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{t("tenureRoles.addDialogTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("tenureRoles.addDialogDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="months">{t("tenureRoles.monthsInServer")}</Label>
                    <Input
                      id="months"
                      type="number"
                      min="1"
                      value={newTenureRole.months || ""}
                      onChange={(e) => setNewTenureRole({ ...newTenureRole, months: Number.parseInt(e.target.value) || undefined })}
                      placeholder="6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">{t("tenureRoles.discordRole")}</Label>
                    <RoleCombobox
                      roles={discordRoles}
                      value={newTenureRole.id?.toString() || ""}
                      onValueChange={(value) => setNewTenureRole({ ...newTenureRole, id: value })}
                      placeholder={t("tenureRoles.selectRole")}
                      showDisabled={false}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTenureDialogOpen(false)}>
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={handleAddTenureRole}
                    disabled={!newTenureRole.months || !newTenureRole.id}
                  >
                    {t("tenureRoles.addRole")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>}
          </div>

          {isLoadingTenureRoles ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-[20px] bg-card px-4 py-3 shadow-sm shadow-black/5 sm:px-5">
                    <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="ml-auto h-7 w-20 rounded-full" />
                    <Skeleton className="h-9 w-9 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : tenureRoles.length === 0 ? ( // NOSONAR — JSX nested ternary for multi-branch display state
              <div className="rounded-[24px] bg-card px-5 py-8 text-center text-muted-foreground shadow-sm shadow-black/5">
                <p>{t("tenureRoles.noRolesConfigured")}</p>
                <p className="text-sm mt-2">{t("tenureRoles.addRoleToStart")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tenureRoles.map((role) => {
                  const discordRole = discordRoles.find((candidate) => candidate.id === role.id);
                  return (
                    <div key={role.rule_id} className="flex items-center gap-3 rounded-[20px] bg-card px-4 py-3 shadow-sm shadow-black/5 sm:px-5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: discordRole?.color ? `#${discordRole.color.toString(16).padStart(6, "0")}` : "#99AAB5" }}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{discordRole?.name || t("tenureRoles.unknownRole")}</span>
                      <span className="shrink-0 rounded-full bg-muted/65 px-3 py-1 text-xs font-medium text-muted-foreground">
                        {role.months} {role.months === 1 ? t("tenureRoles.month") : t("tenureRoles.months")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTenureRole(role.rule_id)}
                        className="h-9 w-9 shrink-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={!editable}
                        aria-label={`${t("tenureRoles.remove")} ${discordRole?.name || t("tenureRoles.unknownRole")}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
        </section>
      </div>
    </div>
  );
}
