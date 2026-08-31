"use client";

import { useGuildId } from "@/lib/dashboard-route";
import { dashboardHref } from "@/lib/dashboard-route";
import { getAccessToken } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/fetch";
import { clanBadgeUrl } from "@/lib/clash-asset-urls";


import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleCombobox } from "@/components/ui/role-combobox";
import { InfoPopover } from "@/components/ui/info-popover";
import { FolderIcon } from "@/components/ui/folder-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getClashClanProfileUrl } from "@/components/ui/clan-profile-popover";
import {
  Settings,
  Plus,
  Users,
  Trash2,
  Loader2,
  AlertCircle,
  Save,
  Search,
  ExternalLink,
  Info,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api/client";
import type { RoleMode, ServerRole } from "@/lib/api/types/roles";
import { isClanCategoriesResponse, type ClanCategory } from "@/lib/api/types/clan-categories";
import { normalizeDiscordRolesPayload } from "@/lib/dashboard-cache";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";
import { ClanCategoryManager } from "./clan-category-manager";

interface ClanSettings {
  category?: string | null;
  abbreviation?: string | null;
}

interface ClanRoleSelection {
  role_id: string | null;
  mode: RoleMode;
}

interface Clan {
  tag: string;
  clan_tag?: string;
  name: string;
  clan_name?: string;
  badge_url?: string | null;
  clan_badge_url?: string | null;
  level?: number | null;
  clanLevel?: number | null;
  member_count?: number | null;
  members?: number | null;
  added_at?: string | null;
  settings?: ClanSettings;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
}

function normalizeClansPayload(payload: unknown): Clan[] {
  if (Array.isArray(payload)) return payload as Clan[];
  if (payload && typeof payload === "object") {
    const maybeCollection = payload as { items?: unknown; clans?: unknown; data?: unknown };
    if (Array.isArray(maybeCollection.items)) return maybeCollection.items as Clan[];
    if (Array.isArray(maybeCollection.clans)) return maybeCollection.clans as Clan[];
    if (Array.isArray(maybeCollection.data)) return maybeCollection.data as Clan[];
  }
  return [];
}

export function formatClanAddedAt(value: string | null | undefined, locale: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const PREMADE_CLAN_CATEGORIES = [
  "Main",
  "Competitive",
  "Casual",
  "Development",
  "CWL",
  "Events",
] as const;

function RoleModeSelect({
  value,
  onChange,
  disabled = false,
}: {
  readonly value: RoleMode;
  readonly onChange: (mode: RoleMode) => void;
  readonly disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Role behavior</Label>
      <Select value={value} onValueChange={(mode) => onChange(mode as RoleMode)} disabled={disabled}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="both">Add and remove</SelectItem>
          <SelectItem value="add">Add only</SelectItem>
          <SelectItem value="remove">Remove only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ClansPage() {
  const guildId = useGuildId();
  const locale = useLocale();
  const { toast } = useToast();
  const t = useTranslations("ClansPage");
  const tCommon = useTranslations("Common");
  const queryClient = useQueryClient();


  const [clans, setClans] = useState<Clan[]>([]);
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clanToDelete, setClanToDelete] = useState<{ tag: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clanSearch, setClanSearch] = useState("");
  const [clanCategories, setClanCategories] = useState<ClanCategory[]>([]);
  const [categoryRefreshVersion, setCategoryRefreshVersion] = useState(0);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClanTag, setNewClanTag] = useState("");
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [clanSettings, setClanSettings] = useState<ClanSettings>({});
  const [clanServerRoles, setClanServerRoles] = useState<ServerRole[]>([]);
  const [memberRole, setMemberRole] = useState<ClanRoleSelection>({ role_id: null, mode: 'both' });
  const [leaderRole, setLeaderRole] = useState<ClanRoleSelection>({ role_id: null, mode: 'both' });

  const fetchClans = async (_accessToken: string, forceRefresh = false): Promise<Clan[]> => {
    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.clans(guildId), exact: true });
    }

    const cachedOrFetched = await queryClient.fetchQuery(dashboardQueryOptions.clans(guildId));

    // Normalize again to protect against stale cache entries written by older code paths.
    return normalizeClansPayload(cachedOrFetched);
  };

  const refreshClans = async (accessToken: string) => {
    const clansData = await fetchClans(accessToken, true);
    setClans(normalizeClansPayload(clansData));
  };

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clansResult, rolesResult, categoriesResult] = await Promise.allSettled([
          fetchClans(""),
          queryClient.fetchQuery(dashboardQueryOptions.roles(guildId)),
          apiClient.clanCategories.list(guildId),
        ]);

        if (clansResult.status === "rejected") throw clansResult.reason;
        setClans(normalizeClansPayload(clansResult.value));
        if (rolesResult.status === "fulfilled") {
          setDiscordRoles(normalizeDiscordRolesPayload(rolesResult.value));
        }
        if (categoriesResult.status === "fulfilled" && isClanCategoriesResponse(categoriesResult.value.data)) {
          setClanCategories(categoriesResult.value.data.items);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load clans");
        toast({
          title: tCommon("error"),
          description: t("toast.errorLoadingClans"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  // Add clan
  const handleAddClan = async () => {
    if (!newClanTag.trim()) {
      toast({
        title: tCommon("error"),
        description: t("toast.errorEmptyClanTag"),
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const accessToken = getAccessToken();

      const response = await apiFetch(`/v2/server/${guildId}/clans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tag: newClanTag }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("toast.errorAddingClan"));
      }

      toast({
        title: tCommon("success"),
        description: t("toast.clanAdded"),
      });

      await refreshClans(accessToken || "");

      setNewClanTag("");
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error("Error adding clan:", err);
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : t("toast.errorAddingClan"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete clan
  const handleDeleteClan = async (clanTag: string) => {
    try {
      setSaving(true);
      const accessToken = getAccessToken();
      const encodedTag = encodeURIComponent(clanTag);

      const response = await apiFetch(`/v2/server/${guildId}/clan/${encodedTag}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete clan');
      }

      toast({
        title: tCommon("success"),
        description: t("toast.clanRemoved"),
      });

      await refreshClans(accessToken || "");
      setIsSettingsDialogOpen(false);
      setSelectedClan(null);
    } catch (err) {
      console.error("Error deleting clan:", err);
      toast({
        title: tCommon("error"),
        description: t("toast.errorRemovingClan"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Open settings dialog
  const handleOpenSettings = async (clan: Clan) => {
    setSelectedClan(clan);
    setClanSettings(clan.settings || {});
    setIsSettingsDialogOpen(true);

    try {
      const clanTag = clan.tag || clan.clan_tag || '';
      const rulesResponse = await apiClient.roles.getServerRoles(guildId, { type: 'clan_role', clan_tag: clanTag });
      if (rulesResponse.error) throw new Error(rulesResponse.error);
      const roles = rulesResponse.data?.roles || [];
      setClanServerRoles(roles);
      const member = roles.find((role) => role.option === 'member');
      const leader = roles.find((role) => role.option === 'leader');
      setMemberRole({ role_id: member?.role_id || null, mode: member?.mode || 'both' });
      setLeaderRole({ role_id: leader?.role_id || null, mode: leader?.mode || 'both' });
    } catch (err) {
      console.error("Error loading clan settings:", err);
      setClanServerRoles([]);
      setMemberRole({ role_id: null, mode: 'both' });
      setLeaderRole({ role_id: null, mode: 'both' });
      toast({
        title: tCommon("error"),
        description: t("toast.errorLoadingSettings"),
        variant: "destructive",
      });
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!selectedClan) return;

    try {
      setSaving(true);
      const accessToken = getAccessToken();

      if (Object.keys(clanSettings).length > 0) {
        const settingsPayload = {
          ...clanSettings,
          ...(Object.hasOwn(clanSettings, 'category')
            ? { category: clanSettings.category ?? '' }
            : {}),
        };
        const response = await apiClient.servers.updateClanSettings(
          guildId,
          selectedClan.tag || selectedClan.clan_tag || "",
          settingsPayload,
        );
        if (response.error) throw new Error(response.error);
      }

      const clanTag = selectedClan.tag || selectedClan.clan_tag || '';
      const syncClanRole = async (option: 'member' | 'leader', selection: ClanRoleSelection) => {
        const current = clanServerRoles.find((role) => role.option === option);
        if (current && selection.role_id) {
          const result = await apiClient.roles.updateServerRole(guildId, current.id, {
            role_id: selection.role_id,
            mode: selection.mode,
          });
          if (result.error) throw new Error(result.error);
        } else if (current) {
          const result = await apiClient.roles.deleteServerRole(guildId, current.id);
          if (result.error) throw new Error(result.error);
        } else if (selection.role_id) {
          const result = await apiClient.roles.createServerRole(guildId, {
            clan_tag: clanTag,
            type: 'clan_role',
            option,
            role_id: selection.role_id,
            mode: selection.mode,
          });
          if (result.error) throw new Error(result.error);
        }
      };
      await Promise.all([syncClanRole('member', memberRole), syncClanRole('leader', leaderRole)]);

      toast({
        title: tCommon("success"),
        description: t("toast.settingsSaved"),
      });

      await refreshClans(accessToken || "");
      setCategoryRefreshVersion((current) => current + 1);

      setIsSettingsDialogOpen(false);
      setSelectedClan(null);
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : t("toast.errorSavingSettings"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredClans = useMemo(() => {
    const normalizedSearch = clanSearch.trim().toLowerCase();
    return clans.filter((clan) => {
      if (!normalizedSearch) return true;
      return (clan.name || clan.clan_name || "").toLowerCase().includes(normalizedSearch)
        || (clan.tag || clan.clan_tag || "").toLowerCase().includes(normalizedSearch)
        || (clan.settings?.category || "").toLowerCase().includes(normalizedSearch);
    });
  }, [clanSearch, clans]);

  const clanSections = useMemo(() => {
    const byCategory = new Map<string, Clan[]>();
    clanCategories.forEach((category) => byCategory.set(category.name, []));
    const uncategorized: Clan[] = [];

    filteredClans.forEach((clan) => {
      const category = clan.settings?.category?.trim();
      const categoryClans = category ? byCategory.get(category) : undefined;
      if (categoryClans) categoryClans.push(clan);
      else uncategorized.push(clan);
    });

    const sections = clanCategories
      .map((category) => ({ id: category.id, name: category.name, clans: byCategory.get(category.name) ?? [] }))
      .filter((section) => section.clans.length > 0 || !clanSearch.trim());

    if (uncategorized.length > 0) {
      sections.push({ id: "uncategorized", name: t("categories.uncategorized"), clans: uncategorized });
    }
    return sections;
  }, [clanCategories, clanSearch, filteredClans, t]);

  const totalMembers = clans.reduce((sum, clan) => sum + (clan.member_count || clan.members || 0), 0);
  const categoryOptions = useMemo(() => {
    const counts = new Map(clanCategories.map((category) => [category.name, category.clanCount]));
    const premade = PREMADE_CLAN_CATEGORIES.map((name) => ({ name, count: counts.get(name) || 0 }));
    const custom = clanCategories
      .filter(({ name }) => !PREMADE_CLAN_CATEGORIES.includes(name as typeof PREMADE_CLAN_CATEGORIES[number]))
      .map(({ name, clanCount }) => ({ name, count: clanCount }))
      .toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const current = clanSettings.category?.trim();
    if (current && !premade.some((item) => item.name === current) && !custom.some((item) => item.name === current)) {
      custom.unshift({ name: current, count: 0 });
    }
    return { premade, custom };
  }, [clanCategories, clanSettings.category]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">{tCommon("error")}</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => globalThis.window.location.reload()} className="w-full">
              {tCommon("retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted" onClick={() => setIsCategoryDialogOpen(true)}>
              <FolderIcon size={16} />
              {t("categories.manage")}
            </Button>
            <Button type="button" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("addClan")}
            </Button>
          </div>
        </header>

        <section className="space-y-4" aria-labelledby="clan-list-title">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <h2 id="clan-list-title" className="text-lg font-semibold">{t("listTitle")}</h2>
              {!loading && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/65 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {t("memberSummary", { count: totalMembers })}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex h-10 min-w-0 items-center gap-2 rounded-xl bg-muted/55 px-3 shadow-sm shadow-black/5 focus-within:ring-2 focus-within:ring-ring/35 sm:w-72">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  aria-label={t("searchLabel")}
                  placeholder={t("searchPlaceholder")}
                  value={clanSearch}
                  onChange={(event) => setClanSearch(event.target.value)}
                  className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full rounded-[24px]" />)}
            </div>
          ) : clans.length === 0 ? (
            <div className="rounded-[24px] bg-muted/45 px-5 py-10 text-center shadow-sm shadow-black/5">
              <h3 className="font-semibold">{t("noClansYet")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("getStartedAdding")}</p>
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {t("addFirstClan")}
              </Button>
            </div>
          ) : filteredClans.length === 0 ? (
            <div className="rounded-[24px] bg-muted/45 px-5 py-10 text-center text-sm text-muted-foreground">{t("noSearchResults")}</div>
          ) : (
            <div className="space-y-8">
              {clanSections.map((section) => (
                <div key={section.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <FolderIcon size={28} />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{section.name}</h3>
                      <p className="text-sm text-muted-foreground">{t("categories.sectionCount", { count: section.clans.length })}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {section.clans.map((clan) => {
                      const clanTag = clan.tag || clan.clan_tag || "";
                      const clanName = clan.name || clan.clan_name || t("unknownClan");
                      const addedAt = formatClanAddedAt(clan.added_at, locale);
                      return (
                        <div key={clanTag} className="relative flex min-h-40 flex-col items-center rounded-[20px] bg-card px-4 py-4 text-center shadow-sm shadow-black/5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2.5 top-2.5 h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={t("configureClanLabel", { name: clanName })}
                            onClick={() => void handleOpenSettings(clan)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Image
                            src={clanBadgeUrl(clanTag)}
                            alt={t("badgeAlt", { name: clanName })}
                            width={64}
                            height={64}
                            unoptimized
                            className="h-16 w-16 object-contain"
                          />
                          <h4 className="mt-1.5 max-w-full truncate text-sm font-semibold text-foreground">{clanName}</h4>
                          <div className="flex max-w-full items-center justify-center gap-1">
                            <p className="truncate text-sm text-muted-foreground">{clanTag}</p>
                            {addedAt && (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      aria-label={t("addedOnLabel", { name: clanName })}
                                    >
                                      <Info className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t("addedOn", { date: addedAt })}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/65 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              {t("memberCount", { count: clan.member_count ?? clan.members ?? 0 })}
                            </span>
                            <a
                              href={getClashClanProfileUrl(clanTag)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              {tCommon("openInGame")}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent variant="form" className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("addNewClan")}</DialogTitle>
              <DialogDescription>{t("addClanDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="clan-tag">{t("clanTag")}</Label>
              <Input id="clan-tag" placeholder="#ABCD1234" value={newClanTag} onChange={(event) => setNewClanTag(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void handleAddClan()} />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsAddDialogOpen(false)}>{tCommon("cancel")}</Button>
              <Button onClick={() => void handleAddClan()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("addClan")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent variant="form" className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("categories.title")}</DialogTitle>
              <DialogDescription>{t("categories.description")}</DialogDescription>
            </DialogHeader>
            <ClanCategoryManager
              serverId={guildId}
              refreshVersion={categoryRefreshVersion}
              onCategoriesChange={setClanCategories}
              onRefreshClans={async () => refreshClans(getAccessToken() || "")}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
          <DialogContent variant="form" className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="pr-8 text-base leading-tight sm:text-lg">
                {t("configureClan", {
                  name: selectedClan?.name || selectedClan?.clan_name || t("unknownClan"),
                  tag: selectedClan?.tag || selectedClan?.clan_tag || "—",
                })}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-1">
                  <div className="grid grid-cols-3 items-end gap-2">
                    <div className="col-span-2 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label>{t("memberRole")}</Label>
                        <InfoPopover content={t("fieldHelp.memberRole")} label={t("fieldHelp.infoButtonLabel")} />
                      </div>
                      <RoleCombobox
                        roles={discordRoles}
                        value={memberRole.role_id || 'disabled'}
                        onValueChange={(value) => setMemberRole({ ...memberRole, role_id: value === 'disabled' ? null : value })}
                        placeholder={t("selectRole")}
                      />
                    </div>
                    <RoleModeSelect
                      value={memberRole.mode}
                      onChange={(mode) => setMemberRole({ ...memberRole, mode })}
                      disabled={!memberRole.role_id}
                    />
                  </div>

                  <div className="grid grid-cols-3 items-end gap-2">
                    <div className="col-span-2 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label>{t("leaderRole")}</Label>
                        <InfoPopover content={t("fieldHelp.leaderRole")} label={t("fieldHelp.infoButtonLabel")} />
                      </div>
                      <RoleCombobox
                        roles={discordRoles}
                        value={leaderRole.role_id || 'disabled'}
                        onValueChange={(value) => setLeaderRole({ ...leaderRole, role_id: value === 'disabled' ? null : value })}
                        placeholder={t("selectRole")}
                      />
                    </div>
                    <RoleModeSelect
                      value={leaderRole.mode}
                      onChange={(mode) => setLeaderRole({ ...leaderRole, mode })}
                      disabled={!leaderRole.role_id}
                    />
                  </div>


                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>{t("category")}</Label>
                      <InfoPopover content={t("fieldHelp.category")} label={t("fieldHelp.infoButtonLabel")} />
                    </div>
                    <Select
                      value={clanSettings.category || "__none__"}
                      onValueChange={(value) => setClanSettings({ ...clanSettings, category: value === "__none__" ? null : value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder={t("categoryPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("categoryOptions.none")}</SelectItem>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>{t("categoryOptions.premade")}</SelectLabel>
                          {categoryOptions.premade.map((category) => (
                            <SelectItem key={category.name} value={category.name}>
                              {category.name}{category.count > 0 ? ` · ${t("categoryOptions.clanCount", { count: category.count })}` : ""}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        {categoryOptions.custom.length > 0 && (
                          <>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel>{t("categoryOptions.usedByServer")}</SelectLabel>
                              {categoryOptions.custom.map((category) => (
                                <SelectItem key={category.name} value={category.name}>
                                  {category.name} · {t("categoryOptions.clanCount", { count: category.count })}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>{t("clanAbbreviation")}</Label>
                      <InfoPopover
                        content={t.rich("fieldHelp.clanAbbreviation", {
                          familySettingsLink: (chunks) => ( // NOSONAR — framework-required inline render prop (next-intl rich / ReactMarkdown)
                            <Link href={dashboardHref("family-settings", guildId)} className="font-medium underline underline-offset-2">
                              {chunks}
                            </Link>
                          ),
                        })}
                        label={t("fieldHelp.infoButtonLabel")}
                      />
                    </div>
                    <Input
                      placeholder={t("abbreviationPlaceholder")}
                      value={clanSettings?.abbreviation || ''}
                      onChange={(e) => setClanSettings({...clanSettings, abbreviation: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                className="sm:mr-auto"
                disabled={saving || !selectedClan}
                onClick={() => {
                  if (!selectedClan) return;
                  setClanToDelete({
                    tag: selectedClan.tag || selectedClan.clan_tag || "",
                    name: selectedClan.name || selectedClan.clan_name || t("unknownClan"),
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t("deleteClan")}
              </Button>
              <Button variant="secondary" onClick={() => setIsSettingsDialogOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {t("saveChanges")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={!!clanToDelete} onOpenChange={(open) => !open && setClanToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{tCommon("confirm")}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("deleteConfirm", { name: clanToDelete?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!clanToDelete) return;
                void handleDeleteClan(clanToDelete.tag);
                setClanToDelete(null);
              }}
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
