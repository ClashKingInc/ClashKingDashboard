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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleCombobox } from "@/components/ui/role-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RotateCcw, AlertCircle, Palette, Lock, Pencil, Shield, Clock, Plus, Trash2, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import {
  dashboardCacheKeys,
  normalizeAllRolesPayload,
  normalizeDiscordRolesPayload,
  normalizeServerSettingsPayload,
} from "@/lib/dashboard-cache";
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

const hexToInt = (hex: string): number => {
  return Number.parseInt(hex.replace("#", ""), 16);
};

const intToHex = (int: number): string => {
  return "#" + int.toString(16).padStart(6, "0").toUpperCase();
};

export default function GeneralSettingsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const t = useTranslations("GeneralPage");
  const tCommon = useTranslations("Common");

  const [settings, setSettings] = useState({
    embed_color: 14223113, // #D90709 as integer
    api_token: true,
    full_whitelist_role: undefined as string | undefined,
  });

  const [discordRoles, setDiscordRoles] = useState<Array<{ id: string; name: string; color?: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempColor, setTempColor] = useState(settings.embed_color);
  const [tempHex, setTempHex] = useState(intToHex(settings.embed_color));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Discord Tenure Roles state
  const [tenureRoles, setTenureRoles] = useState<Array<{ id: string; months: number; role_id?: string }>>([]);
  const [isLoadingTenureRoles, setIsLoadingTenureRoles] = useState(true);
  const [isTenureDialogOpen, setIsTenureDialogOpen] = useState(false);
  const [newTenureRole, setNewTenureRole] = useState<{ months?: number; id?: string }>({});
  const settingsCacheKey = dashboardCacheKeys.settings(guildId);
  const discordRolesCacheKey = dashboardCacheKeys.discordRoles(guildId);
  const allRolesCacheKey = dashboardCacheKeys.allRoles(guildId);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadDiscordRoles();
    loadTenureRoles();
  }, [guildId]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No access token found. Please log in again.");
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
        const newSettings = {
          embed_color: settingsData.embed_color ?? 14223113,
          api_token: settingsData.api_token ?? true,
          full_whitelist_role: settingsData.full_whitelist_role?.toString(),
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
      const token = localStorage.getItem("access_token");
      if (!token) return;

      // Use cache to prevent duplicate requests
      const rolesPayload = await apiCache.get(discordRolesCacheKey, async () => {
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

  const loadTenureRoles = async () => {
    try {
      setIsLoadingTenureRoles(true);
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const allRolesPayload = await apiCache.get(allRolesCacheKey, async () => {
        const response = await apiClient.roles.getAllRoles(guildId);
        if (response.error) {
          throw new Error(response.error);
        }
        return response.data;
      });
      const allRolesData = normalizeAllRolesPayload(allRolesPayload);

      if (allRolesData?.roles?.status) {
        const normalizedRoles = allRolesData.roles.status.map((r: any) => ({
          id: String(r.role || r.id),
          months: r.months,
          role_id: String(r.role || r.id),
        }));
        setTenureRoles(normalizedRoles);
      }
    } catch (err) {
      console.error("Failed to load tenure roles:", err);
    } finally {
      setIsLoadingTenureRoles(false);
    }
  };

  const handleAddTenureRole = async () => {
    try {
      setError(null);

      if (!newTenureRole.months || !newTenureRole.id) {
        setError("Please fill in all fields");
        return;
      }

      const token = localStorage.getItem("access_token");
      if (!token) return;

      await apiClient.roles.createRole(guildId, "status", {
        months: newTenureRole.months,
        id: newTenureRole.id,
      });

      apiCache.invalidate(allRolesCacheKey);
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

  const handleDeleteTenureRole = async (roleId: string) => {
    try {
      setError(null);

      const token = localStorage.getItem("access_token");
      if (!token) return;

      await apiClient.roles.deleteRole(guildId, "status", roleId);

      apiCache.invalidate(allRolesCacheKey);
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
    nextSettings: typeof settings,
    previousSettings?: typeof settings
  ) => {
    try {
      setIsSaving(true);
      setError(null);

      await apiClient.servers.updateSettings(guildId, nextSettings);

      // Invalidate cache after saving
      apiCache.invalidate(settingsCacheKey);

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
    if (isSaving) {
      return;
    }

    const previousSettings = settings;
    const nextSettings = { ...settings, ...updatedFields };

    setSettings(nextSettings);
    await saveSettings(nextSettings, previousSettings);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-muted-foreground mt-1">
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
                      p: ({ children }) => <span>{children}</span>, // NOSONAR — framework-required inline render prop (next-intl rich / ReactMarkdown)
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>, // NOSONAR — framework-required inline render prop (next-intl rich / ReactMarkdown)
                    }}
                  >
                    {t("infoBanner.description")}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid Layout for smaller cards */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
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
                        <DialogContent className="sm:max-w-md bg-card border-border">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">{t("appearance.editColor")}</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
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
                                  className="w-20 h-20 cursor-pointer border-2 rounded-lg p-1 bg-background"
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
                                  className="bg-background border-border font-mono text-lg uppercase"
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
                              variant="outline"
                              onClick={() => setIsDialogOpen(false)}
                              className="border-border"
                            >
                              {tCommon("cancel")}
                            </Button>
                            <Button 
                              onClick={() => {
                                void applySettingsChange({ embed_color: tempColor });
                                setIsDialogOpen(false);
                              }}
                              disabled={!/^#[0-9A-F]{6}$/i.test(tempHex) || isSaving}
                              className="bg-primary hover:bg-primary/90"
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
                  disabled={isSaving}
                  onCheckedChange={(checked) => {
                    void applySettingsChange({ api_token: checked });
                  }}
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
                  onValueChange={(value) => {
                    void applySettingsChange({ full_whitelist_role: value === "none" ? undefined : value });
                  }}
                >
                  <SelectTrigger id="whitelist-role" className="bg-secondary border-border" disabled={isSaving}>
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

        {/* Discord Tenure Roles */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-foreground">{t("tenureRoles.title")}</CardTitle>
                <CardDescription className="text-xs">
                  {t("tenureRoles.description")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog open={isTenureDialogOpen} onOpenChange={setIsTenureDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 w-full md:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("tenureRoles.addRole")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
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
            </Dialog>

            {isLoadingTenureRoles ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("tenureRoles.discordRole")}</TableHead>
                      <TableHead>{t("tenureRoles.months")}</TableHead>
                      <TableHead className="text-right">{t("tenureRoles.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-3 w-3 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-8 w-20 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : tenureRoles.length === 0 ? ( // NOSONAR — JSX nested ternary for multi-branch display state
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("tenureRoles.noRolesConfigured")}</p>
                <p className="text-sm mt-2">{t("tenureRoles.addRoleToStart")}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("tenureRoles.discordRole")}</TableHead>
                    <TableHead>{t("tenureRoles.months")}</TableHead>
                    <TableHead className="text-right">{t("tenureRoles.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenureRoles.map((role) => {
                    const discordRole = discordRoles.find((r) => r.id === role.id);
                    return (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: discordRole?.color
                                  ? `#${discordRole.color.toString(16).padStart(6, "0")}`
                                  : "#99AAB5"
                              }}
                            />
                            <span>{discordRole?.name || t("tenureRoles.unknownRole")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {role.months} {role.months === 1 ? t("tenureRoles.month") : t("tenureRoles.months")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTenureRole(role.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t("tenureRoles.remove")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

