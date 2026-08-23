"use client";

import { useGuildId } from "@/lib/dashboard-route";
import { apiFetch } from "@/lib/api/fetch";
import Image from "next/image";
import { useState, useEffect, useEffectEvent, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { InfoPopover } from "@/components/ui/info-popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import { RoleCombobox } from "@/components/ui/role-combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Save,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Tags,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api/client";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";
import type {
  RoleType,
  DiscordRole,
  RoleMode,
  RoleSettings,
} from "@/lib/api/types/roles";
import { playerLeagueImageUrl, townHallImageUrl } from "@/lib/theme";
import {
  builderHallImageUrl,
  builderLeagueImageUrl,
  parseRoleLevel,
  roleCriteriaImageUrl,
  roleTypeImageUrl,
} from "./role-assets";

const ROLE_TYPES_CONFIG: RoleType[] = ["townhall", "league", "builderhall", "builder_league", "clan_category"];

const BUILDER_LEAGUE_TIERS = [
  { id: "diamond", apiName: "Diamond", range: null },
  { id: "ruby", apiName: "Ruby", range: [1, 3] },
  { id: "emerald", apiName: "Emerald", range: [1, 3] },
  { id: "platinum", apiName: "Platinum", range: [1, 3] },
  { id: "titanium", apiName: "Titanium", range: [1, 3] },
  { id: "steel", apiName: "Steel", range: [1, 3] },
  { id: "iron", apiName: "Iron", range: [1, 3] },
  { id: "brass", apiName: "Brass", range: [1, 3] },
  { id: "copper", apiName: "Copper", range: [1, 5] },
  { id: "stone", apiName: "Stone", range: [1, 5] },
  { id: "clay", apiName: "Clay", range: [1, 5] },
  { id: "wood", apiName: "Wood", range: [1, 5] },
];

/**
 * Denormalize league name from snake_case to display format
 * @param snakeCaseName - League name in snake_case (e.g., "legend_league", "titan_league_i")
 * @returns Formatted league name (e.g., "Legend League", "Titan League I")
 */
const denormalizeLeagueName = (snakeCaseName: string): string => {
  return snakeCaseName
    .split('_')
    .map(word => {
      // Keep roman numerals uppercase (i, ii, iii, iv, v)
      if (['i', 'ii', 'iii', 'iv', 'v'].includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V"] as const;

function SortIcon({ col, sortCol, sortDir }: { readonly col: "role" | "criteria"; readonly sortCol: string | null; readonly sortDir: string }) {
  if (sortCol !== col) return <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="ml-1 h-3 w-3 inline" />
    : <ChevronDown className="ml-1 h-3 w-3 inline" />;
}

export default function RolesPage() { // NOSONAR — complexity comes from aggregate role-type handling, not a single logic unit
  const guildId = useGuildId();
  const locale = useLocale();
  const t = useTranslations("RolesPage");
  const tCommon = useTranslations("Common");
  const queryClient = useQueryClient();
  const staticOptionsRequested = useRef(false);

  const roleTypes = ROLE_TYPES_CONFIG.map((value) => ({
    value,
    label: t(`roleTypes.${value.replaceAll(/_([a-z])/g, (g) => g[1].toUpperCase())}`),
  }));

  const builderLeagues = BUILDER_LEAGUE_TIERS.flatMap((tier) => {
    const tierName = t(`builderLeagues.${tier.id}`);
    if (!tier.range) {
      return [{ value: tier.apiName, label: tierName }];
    }
    const leaguesInTier = [];
    for (let i = tier.range[0]; i <= tier.range[1]; i++) {
      const roman = ROMAN_NUMERALS[i - 1];
      leaguesInTier.push({
        value: `${tier.apiName} ${roman}`,
        label: `${tierName} ${roman}`,
      });
    }
    return leaguesInTier;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [roleSettings, setRoleSettings] = useState<RoleSettings>({
    server_id: Number(guildId),
    auto_eval_status: false,
    auto_eval_nickname: false,
    autoeval_triggers: [],
    autoeval_log: undefined,
  });
  const [originalRoleSettings, setOriginalRoleSettings] = useState<RoleSettings>({
    server_id: Number(guildId),
    auto_eval_status: false,
    auto_eval_nickname: false,
    autoeval_triggers: [],
    autoeval_log: undefined,
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [allRoles, setAllRoles] = useState<Record<string, any[]>>({
    townhall: [],
    league: [],
    builderhall: [],
    builder_league: [],
    clan_category: [],
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentRoleType, setCurrentRoleType] = useState<RoleType>("townhall");
  const [newRole, setNewRole] = useState<any>({ mode: 'both' });
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<"role" | "criteria" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Dynamic league data loaded from API
  const [availableLeagues, setAvailableLeagues] = useState<Array<{ value: string; label: string }>>([]);

  // Max levels for Town Hall and Builder Hall
  const [townHallMaxLevel, setTownHallMaxLevel] = useState<number>(18); // Fallback — update when new TH is released
  const [builderHallMaxLevel, setBuilderHallMaxLevel] = useState<number>(10); // Fallback — update when new BH is released

  // Get building prefixes from translations
  const thPrefix = t("addRoleDialog.thPrefix");
  const bhPrefix = t("addRoleDialog.bhPrefix");

  const loadMaxLevels = async () => {
    try {
      const thEncoded = encodeURIComponent('Town Hall');
      const thUrl = `/v2/static/buildings/${thEncoded}/max-level`;
      const bhEncoded = encodeURIComponent('Builder Hall');
      const bhUrl = `/v2/static/buildings/${bhEncoded}/max-level`;
      const [thResponse, bhResponse] = await Promise.all([
        apiFetch(thUrl, { cache: "force-cache" }),
        apiFetch(bhUrl, { cache: "force-cache" }),
      ]);
      if (thResponse.ok) {
        const thData = await thResponse.json() as { max_level: number };
        setTownHallMaxLevel(thData.max_level);
      } else {
        const errorText = await thResponse.text();
        console.error('Failed to load Town Hall max level:', thResponse.status, thResponse.statusText, errorText);
      }

      if (bhResponse.ok) {
        const bhData = await bhResponse.json() as { max_level: number };
        setBuilderHallMaxLevel(bhData.max_level);
      } else {
        const errorText = await bhResponse.text();
        console.error('Failed to load Builder Hall max level:', bhResponse.status, bhResponse.statusText, errorText);
      }
    } catch (err) {
      console.error("Failed to load max levels:", err);
      // Keep fallback values
    }
  }

  async function loadLeagues() {
    try {
      // Map next-intl locale codes to CoC API locale codes
      const localeMap: Record<string, string> = {
        'en': 'EN',
        'fr': 'FR',
        'de': 'DE',
        'es': 'ES',
        'it': 'IT',
        'pt': 'PT',
        'ru': 'RU',
        'ja': 'JP',
        'ko': 'KR',
        'zh': 'CN',
        'ar': 'AR',
        'tr': 'TR',
        'pl': 'PL',
        'nl': 'NL',
        'th': 'TH',
        'vi': 'VI',
        'fi': 'FI',
        'no': 'NO',
        'id': 'ID',
        'ms': 'MS',
      };

      const apiLocale = localeMap[locale] || 'EN';

      // Load league tiers from static data API via Next.js proxy with locale
      const response = await apiFetch(`/v2/static/league_tiers/names?locale=${apiLocale}`, { cache: "force-cache" });
      if (response.ok) {
        const leagueNames: string[] = await response.json();
        // Transform to {value, label} format for the select
        setAvailableLeagues(leagueNames.map(name => ({ value: name, label: name })));
      }
    } catch (err) {
      console.error("Failed to load leagues from static data:", err);
      // Keep empty array if loading fails, will show empty dropdown
    }
  }

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      const [rolesData, settingsData, discordRolesData, clansData] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: dashboardQueryKeys.route("server-roles", guildId, "all"),
          queryFn: async () => {
            const response = await apiClient.roles.getServerRoles(guildId);
            if (response.error || !response.data) throw new Error(response.error || "Failed to load server roles");
            return response.data;
          },
        }),
        queryClient.fetchQuery({
          queryKey: dashboardQueryKeys.route("role-settings", guildId),
          queryFn: async () => {
            const response = await apiClient.roles.getRoleSettings(guildId);
            if (response.error || !response.data) throw new Error(response.error || "Failed to load role settings");
            return response.data;
          },
        }),
        queryClient.fetchQuery(dashboardQueryOptions.roles(guildId)),
        queryClient.fetchQuery(dashboardQueryOptions.clans(guildId)),
      ]);

      if (rolesData) {
        const rules = rolesData.roles;
        const normalizedRoles = {
          townhall: rules.filter((r) => !r.clan_tag && r.type === 'townhall').map((r) => ({ rule_id: r.id, role_id: r.role_id, th: parseRoleLevel(r.option), mode: r.mode })),
          league: rules.filter((r) => !r.clan_tag && r.type === 'league').map((r) => ({ rule_id: r.id, role_id: r.role_id, type: r.option, mode: r.mode })),
          builderhall: rules.filter((r) => !r.clan_tag && r.type === 'builderhall').map((r) => ({ rule_id: r.id, role_id: r.role_id, bh: parseRoleLevel(r.option), mode: r.mode })),
          builder_league: rules.filter((r) => !r.clan_tag && r.type === 'builder_league').map((r) => ({ rule_id: r.id, role_id: r.role_id, type: r.option, mode: r.mode })),
          clan_category: rules.filter((r) => !r.clan_tag && r.type === 'clan_category').map((r) => ({ rule_id: r.id, role_id: r.role_id, category: r.option, mode: r.mode })),
        };
        setAllRoles(normalizedRoles);
      }

      if (settingsData) {
        setRoleSettings(settingsData);
        setOriginalRoleSettings(settingsData);
      }

      if (discordRolesData) {
        setDiscordRoles(discordRolesData.roles);
      }

      if (clansData) {
        const clans = Array.isArray(clansData) ? clansData : (clansData as any).items || [];
        const cats = Array.from(new Set(
          clans
            .map((c: any) => c.settings?.category)
            .filter((cat: any): cat is string => typeof cat === "string" && cat.trim() !== "")
        )) as string[];
        setAvailableCategories(cats.toSorted((a, b) => a.localeCompare(b)));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load roles");
      console.error("Failed to load roles:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const loadInitialData = useEffectEvent(() => {
    void loadData();
  });

  useEffect(() => { loadInitialData(); }, [guildId, locale]);

  const handleSaveSettings = async () => {
    try {
      setSaveStatus('saving');
      setError(null);

      await apiClient.roles.updateRoleSettings(guildId, {
        auto_eval_status: roleSettings.auto_eval_status,
        auto_eval_nickname: roleSettings.auto_eval_nickname,
        autoeval_triggers: roleSettings.autoeval_triggers,
        autoeval_log: roleSettings.autoeval_log,
      });
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("role-settings", guildId), exact: true });

      setOriginalRoleSettings({ ...roleSettings });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
      setSaveStatus('idle');
    }
  };

  const handleAddRole = async () => {
    try {
      setError(null);
      setDialogError(null);

      // Duplicate check before hitting the API
      const { matchesCriterion, matchesExact } = getRoleDuplicateState();

      if (matchesExact) {
        setDialogError(t("addRoleDialog.errorDuplicateExact"));
        return;
      }
      if (matchesCriterion) {
        setDialogError(t("addRoleDialog.errorDuplicateCriterion"));
        return;
      }

      const option = currentRoleType === 'townhall'
        ? String(newRole.th)
        : currentRoleType === 'builderhall'
          ? String(newRole.bh)
          : currentRoleType === 'league'
            ? newRole.league
            : currentRoleType === 'builder_league'
              ? newRole.builder_league
              : newRole.category;
      const result = await apiClient.roles.createServerRole(guildId, {
        type: currentRoleType,
        option,
        role_id: String(newRole.role_id),
        mode: newRole.mode as RoleMode,
      });

      if (result.error) {
        setDialogError(result.error);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("server-roles", guildId, "all"), exact: true });
      await loadData();
      setIsAddDialogOpen(false);
      setNewRole({ mode: 'both' });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add role");
    }
  };

  const handleDeleteRole = async (_roleType: RoleType, ruleId: string) => {
    try {
      setError(null);

      const result = await apiClient.roles.deleteServerRole(guildId, ruleId);
      if (result.error) throw new Error(result.error);

      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("server-roles", guildId, "all"), exact: true });
      await loadData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete role");
    }
  };

  const handleUpdateRoleMode = async (ruleId: string, mode: RoleMode) => {
    try {
      setError(null);
      const result = await apiClient.roles.updateServerRole(guildId, ruleId, { mode });
      if (result.error) throw new Error(result.error);
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("server-roles", guildId, "all"), exact: true });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update role mode");
    }
  };

  const renderRoleForm = () => {
    const duplicateExactSelected = duplicateState.matchesExact;
    switch (currentRoleType) {
      case "townhall":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="th">{t("addRoleDialog.townHallLevel")}<span className="ml-1 text-destructive">*</span></Label>
              <Select
                value={newRole.th !== undefined && newRole.th !== null ? newRole.th.toString() : ""}
                onValueChange={(value) => setNewRole({ ...newRole, th: Number.parseInt(value) })}
              >
                <SelectTrigger id="th">
                  <SelectValue placeholder={t("addRoleDialog.selectThLevel")} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {Array.from({ length: townHallMaxLevel }, (_, i) => townHallMaxLevel - i).map((th) => (
                    <SelectItem key={th} value={th.toString()}>
                      <span className="flex items-center gap-2">
                        <Image src={townHallImageUrl(th)} alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain" />
                        {thPrefix} {th}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("addRoleDialog.discordRole")}<span className="ml-1 text-destructive">*</span></Label>
              <RoleCombobox
                roles={discordRoles}
                value={newRole.role_id?.toString() || ""}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
                placeholder={t("addRoleDialog.selectRole")}
                showDisabled={false}
              />
              {duplicateExactSelected && (
                <p className="text-xs text-destructive">{t("addRoleDialog.errorDuplicateExact")}</p>
              )}
            </div>
          </>
        );

      case "league":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="league">{t("addRoleDialog.league")}<span className="ml-1 text-destructive">*</span></Label>
              <Select
                value={newRole.league ?? ""}
                onValueChange={(value) => setNewRole({ ...newRole, league: value })}
              >
                <SelectTrigger id="league">
                  <SelectValue placeholder={t("addRoleDialog.selectLeague")} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {availableLeagues.map((league) => (
                    <SelectItem key={league.value} value={league.value}>
                      <span className="flex items-center gap-2">
                        <Image src={playerLeagueImageUrl(league.value)} alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain" />
                        {league.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("addRoleDialog.discordRole")}<span className="ml-1 text-destructive">*</span></Label>
              <RoleCombobox
                roles={discordRoles}
                value={newRole.role_id?.toString() || ""}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
                placeholder={t("addRoleDialog.selectRole")}
                showDisabled={false}
              />
              {duplicateExactSelected && (
                <p className="text-xs text-destructive">{t("addRoleDialog.errorDuplicateExact")}</p>
              )}
            </div>
          </>
        );

      case "builderhall":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="bh">{t("addRoleDialog.builderHallLevel")}<span className="ml-1 text-destructive">*</span></Label>
              <Select
                value={newRole.bh !== undefined && newRole.bh !== null ? newRole.bh.toString() : ""}
                onValueChange={(value) => setNewRole({ ...newRole, bh: Number.parseInt(value) })}
              >
                <SelectTrigger id="bh">
                  <SelectValue placeholder={t("addRoleDialog.selectBhLevel")} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {Array.from({ length: builderHallMaxLevel }, (_, i) => builderHallMaxLevel - i).map((bh) => (
                    <SelectItem key={bh} value={bh.toString()}>
                      <span className="flex items-center gap-2">
                        <Image src={builderHallImageUrl(bh)} alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain" />
                        {bhPrefix} {bh}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("addRoleDialog.discordRole")}<span className="ml-1 text-destructive">*</span></Label>
              <RoleCombobox
                roles={discordRoles}
                value={newRole.role_id?.toString() || ""}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
                placeholder={t("addRoleDialog.selectRole")}
                showDisabled={false}
              />
              {duplicateExactSelected && (
                <p className="text-xs text-destructive">{t("addRoleDialog.errorDuplicateExact")}</p>
              )}
            </div>
          </>
        );

      case "builder_league":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="builder_league">{t("addRoleDialog.builderLeague")}<span className="ml-1 text-destructive">*</span></Label>
              <Select
                value={newRole.builder_league ?? ""}
                onValueChange={(value) => setNewRole({ ...newRole, builder_league: value })}
              >
                <SelectTrigger id="builder_league">
                  <SelectValue placeholder={t("addRoleDialog.selectBuilderLeague")} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {builderLeagues.map((league) => (
                    <SelectItem key={league.value} value={league.value}>
                      <span className="flex items-center gap-2">
                        <Image src={builderLeagueImageUrl(league.value)} alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain" />
                        {league.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("addRoleDialog.discordRole")}<span className="ml-1 text-destructive">*</span></Label>
              <RoleCombobox
                roles={discordRoles}
                value={newRole.role_id?.toString() || ""}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
                placeholder={t("addRoleDialog.selectRole")}
                showDisabled={false}
              />
              {duplicateExactSelected && (
                <p className="text-xs text-destructive">{t("addRoleDialog.errorDuplicateExact")}</p>
              )}
            </div>
          </>
        );

      case "clan_category":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="clan-category">{t("categoryRoles.categoryName")}<span className="ml-1 text-destructive">*</span></Label>
              <Select
                value={newRole.category ?? ""}
                onValueChange={(value) => setNewRole({ ...newRole, category: value })}
              >
                <SelectTrigger id="clan-category">
                  <SelectValue placeholder={t("categoryRoles.categoryNamePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories
                    .filter((category) => !allRoles.clan_category.some((role) => role.category === category))
                    .map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("addRoleDialog.discordRole")}<span className="ml-1 text-destructive">*</span></Label>
              <RoleCombobox
                roles={discordRoles}
                value={newRole.role_id?.toString() || ""}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
                placeholder={t("addRoleDialog.selectRole")}
                showDisabled={false}
              />
              {duplicateExactSelected && (
                <p className="text-xs text-destructive">{t("addRoleDialog.errorDuplicateExact")}</p>
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const handleSortClick = (col: "role" | "criteria") => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const renderRolesList = (roleType: RoleType) => {
    const raw = allRoles[roleType] || [];
    const normNum = (v: any) => typeof v === "string" ? Number.parseInt(v.replace(/^\D+/i, "")) : Number(v);

    const getCriteriaLabel = (role: any): string => {
      switch (roleType) {
        case "townhall": {
          const level = parseRoleLevel(role.th ?? role.option);
          return level ? `TH ${level}` : "";
        }
        case "league": return role.type ? denormalizeLeagueName(role.type) : "";
        case "builderhall": {
          const level = parseRoleLevel(role.bh ?? role.option);
          return level ? `BH ${level}` : "";
        }
        case "builder_league": return role.type ? denormalizeLeagueName(role.type) : "";
        case "clan_category": return role.category ?? role.option ?? "";
        default: return "";
      }
    };

    const roles = [...raw].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortCol === "role") {
        const nameA = discordRoles.find((r) => r.id === (a.role_id || a.id))?.name ?? "";
        const nameB = discordRoles.find((r) => r.id === (b.role_id || b.id))?.name ?? "";
        return nameA.localeCompare(nameB) * dir;
      }
      if (sortCol === "criteria") {
        const labelA = getCriteriaLabel(a);
        const labelB = getCriteriaLabel(b);
        if (roleType === "townhall") return (normNum(a.th) - normNum(b.th)) * dir;
        if (roleType === "builderhall") return (normNum(a.bh) - normNum(b.bh)) * dir;
        return labelA.localeCompare(labelB) * dir;
      }
      // Default: criteria ascending
      if (roleType === "townhall") return normNum(a.th) - normNum(b.th);
      if (roleType === "builderhall") return normNum(a.bh) - normNum(b.bh);
      return getCriteriaLabel(a).localeCompare(getCriteriaLabel(b));
    });

    if (roles.length === 0) {
      return (
        <div className="rounded-[24px] bg-card px-5 py-8 text-center text-muted-foreground shadow-sm shadow-black/5">
          <p>{t("configuredRoles.noRolesConfigured", { roleType: roleType.replace("_", " ") })}</p>
          <p className="mt-1 text-sm">{t("configuredRoles.addRoleToStart")}</p>
        </div>
      );
    }

    return (
      <>
      <div className="space-y-2 md:hidden">
        {roles.map((role: any, index: number) => {
          const roleId = role.role_id || role.id;
          const discordRole = discordRoles.find((candidate) => candidate.id === roleId);
          const criteria = getCriteriaLabel(role);
          const criteriaValue = roleType === "townhall"
            ? role.th ?? role.option
            : roleType === "builderhall"
              ? role.bh ?? role.option
              : role.type ?? role.category ?? role.option;
          const criteriaImage = roleCriteriaImageUrl(roleType, criteriaValue);

          return (
            <article key={`${roleId}-${index}`} className="rounded-2xl bg-card p-4 shadow-sm shadow-black/5">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: discordRole && discordRole.color !== 0 ? `#${discordRole.color.toString(16).padStart(6, "0")}` : "#99AAB5" }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{discordRole?.name || t("configuredRoles.unknownRole")}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                  {criteriaImage && <Image src={criteriaImage} alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain" />}
                  {criteria || "—"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
                <Select value={role.mode || "both"} onValueChange={(value) => void handleUpdateRoleMode(role.rule_id, value as RoleMode)}>
                  <SelectTrigger className="min-h-11 min-w-0 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">{t("configuredRoles.modeBoth")}</SelectItem>
                    <SelectItem value="add">{t("configuredRoles.modeAdd")}</SelectItem>
                    <SelectItem value="remove">{t("configuredRoles.modeRemove")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="touch-icon" onClick={() => handleDeleteRole(roleType, role.rule_id)} className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={t("configuredRoles.remove")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-[24px] bg-card shadow-sm shadow-black/5 md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-xs font-semibold text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">
                <button type="button" className="select-none transition-colors hover:text-foreground" onClick={() => handleSortClick("role")}>
                  {t("configuredRoles.discordRole")}<SortIcon col="role" sortCol={sortCol} sortDir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button type="button" className="select-none transition-colors hover:text-foreground" onClick={() => handleSortClick("criteria")}>
                  {t("configuredRoles.criteria")}<SortIcon col="criteria" sortCol={sortCol} sortDir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-left">{t("configuredRoles.mode")}</th>
              <th className="px-4 py-3 text-right">{t("configuredRoles.actions")}</th>
            </tr>
          </thead>
          <tbody>
          {roles.map((role: any, index: number) => {
            const roleId = role.role_id || role.id;
            const discordRole = discordRoles.find((r) => r.id === roleId);
            const criteria = getCriteriaLabel(role);
            const criteriaValue = roleType === "townhall"
              ? role.th ?? role.option
              : roleType === "builderhall"
                ? role.bh ?? role.option
                : role.type ?? role.category ?? role.option;
            const criteriaImage = roleCriteriaImageUrl(roleType, criteriaValue);

            return (
              <tr key={`${roleId}-${index}`} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: discordRole && discordRole.color !== 0
                          ? `#${discordRole.color.toString(16).padStart(6, "0")}`
                          : "#99AAB5" // Discord default role color (grey)
                      }}
                    />
                    <span>{discordRole?.name || t("configuredRoles.unknownRole")}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    {criteriaImage && <Image src={criteriaImage} alt="" width={28} height={28} unoptimized className="h-7 w-7 object-contain" />}
                    {criteria || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Select value={role.mode || 'both'} onValueChange={(value) => void handleUpdateRoleMode(role.rule_id, value as RoleMode)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">{t("configuredRoles.modeBoth")}</SelectItem>
                      <SelectItem value="add">{t("configuredRoles.modeAdd")}</SelectItem>
                      <SelectItem value="remove">{t("configuredRoles.modeRemove")}</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRole(roleType, role.rule_id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t("configuredRoles.remove")}
                  </Button>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
      </>
    );
  };

  const getRoleDuplicateState = () => {
    const existingRoles: any[] = allRoles[currentRoleType] || [];
    let matchesCriterion = false;
    let matchesExact = false;

    if (currentRoleType === "townhall") {
      matchesCriterion = existingRoles.some((r) => r.th === newRole.th);
      matchesExact = existingRoles.some((r) => r.th === newRole.th && r.role_id === newRole.role_id);
    } else if (currentRoleType === "league") {
      matchesCriterion = existingRoles.some((r) => r.type === newRole.league);
      matchesExact = existingRoles.some((r) => r.type === newRole.league && r.role_id === newRole.role_id);
    } else if (currentRoleType === "builderhall") {
      const normBh = (bh: any) =>
        typeof bh === "string" ? Number.parseInt(bh.replace(/^bh/i, "")) : Number(bh);
      matchesCriterion = existingRoles.some((r) => normBh(r.bh) === newRole.bh);
      matchesExact = existingRoles.some((r) => normBh(r.bh) === newRole.bh && r.role_id === newRole.role_id);
    } else if (currentRoleType === "builder_league") {
      matchesCriterion = existingRoles.some((r) => r.type === newRole.builder_league);
      matchesExact = existingRoles.some((r) => r.type === newRole.builder_league && r.role_id === newRole.role_id);
    } else if (currentRoleType === "clan_category") {
      matchesCriterion = existingRoles.some((r) => r.category === newRole.category);
      matchesExact = existingRoles.some((r) => r.category === newRole.category && r.role_id === newRole.role_id);
    }

    return { matchesCriterion, matchesExact };
  };

  const duplicateState = getRoleDuplicateState();

  const hasChanged = roleSettings.auto_eval_status !== originalRoleSettings.auto_eval_status ||
    roleSettings.auto_eval_nickname !== originalRoleSettings.auto_eval_nickname;

  const isAddRoleDisabled = () => {
    const hasRole = !!newRole.role_id;
    if (!hasRole) return true;
    if (duplicateState.matchesExact) return true;

    switch (currentRoleType) {
      case "townhall": return !newRole.th;
      case "league": return !newRole.league;
      case "builderhall": return !newRole.bh;
      case "builder_league": return !newRole.builder_league;
      case "clan_category": return !newRole.category;
      default: return true;
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[calc(80rem+3rem)] space-y-8 bg-background p-4 pb-12 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {/* Error/Success Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500/30 bg-green-500/5">
            <AlertCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600">{t("toast.changesSaved")}</AlertDescription>
          </Alert>
        )}

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{t("settings.title")}</h2>
                  <InfoPopover
                    label={t("infoCard.title")}
                    content={(
                      <div className="space-y-2">
                        <p><span className="font-semibold">{t("infoCard.automaticEvaluation")}</span> {t("infoCard.automaticEvaluationDesc")}</p>
                        <p><span className="font-semibold">{t("infoCard.rolePriority")}</span> {t("infoCard.rolePriorityDesc")}</p>
                        <p><span className="font-semibold">{t("infoCard.manualOverride")}</span> {t("infoCard.manualOverrideDesc")}</p>
                      </div>
                    )}
                  />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{t("settings.description")}</p>
              </div>
              {saveStatus === 'saved' ? (
                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{t("toast.changesSaved")}</span>
                </div>
              ) : hasChanged && (
                <Button
                  onClick={handleSaveSettings}
                  disabled={saveStatus === 'saving'}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("settings.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t("settings.saveButton")}
                    </>
                  )}
                </Button>
              )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-4 rounded-[24px] bg-card px-5 py-4 shadow-sm shadow-black/5">
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor="auto-eval">{t("settings.enableAutoEval")}</Label>
                <p className="text-xs leading-relaxed text-muted-foreground">{t("settings.enableAutoEvalDesc")}</p>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-11 rounded-full animate-pulse" />
              ) : (
                <Switch
                  id="auto-eval"
                  checked={roleSettings.auto_eval_status}
                  onCheckedChange={(checked) =>
                    setRoleSettings({ ...roleSettings, auto_eval_status: checked })
                  }
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[24px] bg-card px-5 py-4 shadow-sm shadow-black/5">
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor="auto-nickname">{t("settings.autoNickname")}</Label>
                <p className="text-xs leading-relaxed text-muted-foreground">{t("settings.autoNicknameDesc")}</p>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-11 rounded-full animate-pulse" />
              ) : (
                <Switch
                  id="auto-nickname"
                  checked={roleSettings.auto_eval_nickname}
                  onCheckedChange={(checked) =>
                    setRoleSettings({ ...roleSettings, auto_eval_nickname: checked })
                  }
                />
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-semibold">{t("configuredRoles.title")}</h2>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (open && !staticOptionsRequested.current) {
                  staticOptionsRequested.current = true;
                  void Promise.all([loadLeagues(), loadMaxLevels()]);
                }
                if (!open) setDialogError(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    {tCommon("add")} {t("addRoleDialog.roleType")}
                  </Button>
                </DialogTrigger>
                <DialogContent variant="form" className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{t("addRoleDialog.title")}</DialogTitle>
                    <DialogDescription>
                      {t("addRoleDialog.description")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="role-type">{t("addRoleDialog.roleType")}<span className="ml-1 text-destructive">*</span></Label>
                      <Select
                        value={currentRoleType}
                        onValueChange={(value) => {
                          setCurrentRoleType(value as RoleType);
                          setNewRole({ mode: 'both' });
                          setDialogError(null);
                        }}
                      >
                        <SelectTrigger id="role-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role-mode">{t("addRoleDialog.mode")}</Label>
                      <Select value={newRole.mode || 'both'} onValueChange={(value) => setNewRole({ ...newRole, mode: value as RoleMode })}>
                        <SelectTrigger id="role-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">{t("configuredRoles.modeBoth")}</SelectItem>
                          <SelectItem value="add">{t("configuredRoles.modeAdd")}</SelectItem>
                          <SelectItem value="remove">{t("configuredRoles.modeRemove")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {renderRoleForm()}
                    {dialogError && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{dialogError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      {t("addRoleDialog.cancel")}
                    </Button>
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      onClick={handleAddRole}
                      disabled={isAddRoleDisabled()}
                    >
                      {t("addRoleDialog.addRole")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          <div>
            <Tabs defaultValue="townhall" className="w-full">
              <DashboardTabsList>
                {roleTypes.map((type) => (
                  <DashboardTabTrigger
                    key={type.value}
                    value={type.value}
                    artwork={type.value === "clan_category" ? (
                      <Tags aria-hidden="true" />
                    ) : (
                      <Image
                        src={roleTypeImageUrl(type.value, townHallMaxLevel, builderHallMaxLevel)}
                        alt=""
                        width={22}
                        height={22}
                        unoptimized
                      />
                    )}
                    count={isLoading ? <Skeleton className="h-2.5 w-2.5 rounded-[2px]" /> : (allRoles[type.value]?.length ?? 0)}
                  >
                    {type.label}
                  </DashboardTabTrigger>
                ))}
              </DashboardTabsList>

              {roleTypes.map((type) => (
                <TabsContent key={type.value} value={type.value} className="mt-6">
                  {isLoading ? (
                    <div className="space-y-3 rounded-[24px] bg-card p-5 shadow-sm shadow-black/5">
                      <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="ml-auto h-4 w-16" />
                      </div>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="grid grid-cols-3 items-center gap-4 py-2">
                          <div className="flex items-center gap-2"><Skeleton className="h-3 w-3 rounded-full" /><Skeleton className="h-4 w-32" /></div>
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="ml-auto h-8 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    renderRolesList(type.value)
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>
    </div>
  );
}
