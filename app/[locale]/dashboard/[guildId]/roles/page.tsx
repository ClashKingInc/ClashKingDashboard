"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleCombobox } from "@/components/ui/role-combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Plus,
  Trash2,
  Settings,
  Loader2,
  AlertCircle,
  Save,
  Users,
  Trophy,
  Hammer,
  Award,
  Crown,
  Check,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api/client";
import type {
  RoleType,
  DiscordRole,
  TownhallRole,
  LeagueRole,
  BuilderHallRole,
  StatusRole,
  FamilyPositionRole,
  RoleSettings,
} from "@/lib/api/types/roles";
import { LetterCaseUppercaseIcon } from "@radix-ui/react-icons";

const ROLE_TYPES_CONFIG: Array<{ value: RoleType; icon: any }> = [
  { value: "townhall", icon: Users },
  { value: "league", icon: Trophy },
  { value: "builderhall", icon: Hammer },
  { value: "builder_league", icon: Award },
];

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

function SortIcon({ col, sortCol, sortDir }: { readonly col: "role" | "criteria"; readonly sortCol: string | null; readonly sortDir: string }) {
  if (sortCol !== col) return <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="ml-1 h-3 w-3 inline" />
    : <ChevronDown className="ml-1 h-3 w-3 inline" />;
}

export default function RolesPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const locale = useLocale();
  const t = useTranslations("RolesPage");
  const tCommon = useTranslations("Common");

  const roleTypes = ROLE_TYPES_CONFIG.map((rt) => ({
    ...rt,
    label: t(`roleTypes.${rt.value.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`),
  }));

  const builderLeagues = BUILDER_LEAGUE_TIERS.flatMap((tier) => {
    const tierName = t(`builderLeagues.${tier.id}`);
    if (!tier.range) {
      return [{ value: tier.apiName, label: tierName }];
    }
    const leaguesInTier = [];
    for (let i = tier.range[0]; i <= tier.range[1]; i++) {
      const roman = i === 1 ? "I" : i === 2 ? "II" : i === 3 ? "III" : i === 4 ? "IV" : "V";
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
    server_id: guildId,
    auto_eval_status: false,
    auto_eval_nickname: false,
    autoeval_triggers: [],
    autoeval_log: undefined,
    blacklisted_roles: [],
    role_treatment: [],
  });
  const [originalRoleSettings, setOriginalRoleSettings] = useState<RoleSettings>({
    server_id: guildId,
    auto_eval_status: false,
    auto_eval_nickname: false,
    autoeval_triggers: [],
    autoeval_log: undefined,
    blacklisted_roles: [],
    role_treatment: [],
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [allRoles, setAllRoles] = useState<Record<string, any[]>>({
    townhall: [],
    league: [],
    builderhall: [],
    builder_league: [],
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentRoleType, setCurrentRoleType] = useState<RoleType>("townhall");
  const [newRole, setNewRole] = useState<any>({});
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<"role" | "criteria" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Dynamic league data loaded from API
  const [availableLeagues, setAvailableLeagues] = useState<Array<{ value: string; label: string }>>([]);
  
  // Max levels for Town Hall and Builder Hall
  const [townHallMaxLevel, setTownHallMaxLevel] = useState<number>(18); // Fallback — update when new TH is released
  const [builderHallMaxLevel, setBuilderHallMaxLevel] = useState<number>(10); // Fallback — update when new BH is released
  
  // Get building prefixes from translations
  const thPrefix = t("addRoleDialog.thPrefix");
  const bhPrefix = t("addRoleDialog.bhPrefix");

  useEffect(() => {
    loadData();
    loadLeagues();
    loadMaxLevels();
  }, [guildId, locale]);
  
  const loadMaxLevels = async () => {
    try {
      // Load Town Hall max level
      const thEncoded = encodeURIComponent('Town Hall');
      const thUrl = `/api/v2/static/buildings/${thEncoded}/maxlevel`;
      const thResponse = await fetch(thUrl);
      if (thResponse.ok) {
        const thData = await thResponse.json();
        setTownHallMaxLevel(thData.max_level);
      } else {
        const errorText = await thResponse.text();
        console.error('Failed to load Town Hall max level:', thResponse.status, thResponse.statusText, errorText);
      }
      
      // Load Builder Hall max level
      const bhEncoded = encodeURIComponent('Builder Hall');
      const bhUrl = `/api/v2/static/buildings/${bhEncoded}/maxlevel`;
      const bhResponse = await fetch(bhUrl);
      if (bhResponse.ok) {
        const bhData = await bhResponse.json();
        setBuilderHallMaxLevel(bhData.max_level);
      } else {
        const errorText = await bhResponse.text();
        console.error('Failed to load Builder Hall max level:', bhResponse.status, bhResponse.statusText, errorText);
      }
    } catch (err) {
      console.error("Failed to load max levels:", err);
      // Keep fallback values
    }
  };

  const loadLeagues = async () => {
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
      const response = await fetch(`/api/v2/static/league_tiers/names?locale=${apiLocale}`);
      if (response.ok) {
        const leagueNames: string[] = await response.json();
        // Transform to {value, label} format for the select
        setAvailableLeagues(leagueNames.map(name => ({ value: name, label: name })));
      }
    } catch (err) {
      console.error("Failed to load leagues from static data:", err);
      // Keep empty array if loading fails, will show empty dropdown
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [rolesRes, settingsRes, discordRolesRes] = await Promise.all([
        apiClient.roles.getAllRoles(guildId),
        apiClient.roles.getRoleSettings(guildId),
        apiClient.roles.getDiscordRoles(guildId),
      ]);

      if (rolesRes.data) {
        // Normalize role data from API
        // CRITICAL: Convert all Discord IDs to strings immediately to prevent precision loss
        // Discord Snowflake IDs are 64-bit integers that get rounded when stored as JS numbers
        const normalizedRoles = {
          townhall: rolesRes.data.roles.townhall?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
            th: typeof r.th === 'string' ? parseInt(r.th.replace(/^th/i, '')) : r.th,
          })) || [],
          league: rolesRes.data.roles.league?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
          })) || [],
          builderhall: rolesRes.data.roles.builderhall?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
          })) || [],
          builder_league: rolesRes.data.roles.builder_league?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
          })) || [],
          achievement: rolesRes.data.roles.achievement?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
          })) || [],
        };
        setAllRoles(normalizedRoles);
      }

      if (settingsRes.data) {
        setRoleSettings(settingsRes.data);
        setOriginalRoleSettings(settingsRes.data);
      }

      if (discordRolesRes.data) {
        setDiscordRoles(discordRolesRes.data.roles);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load roles");
      console.error("Failed to load roles:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaveStatus('saving');
      setError(null);

      await apiClient.roles.updateRoleSettings(guildId, {
        auto_eval_status: roleSettings.auto_eval_status,
        auto_eval_nickname: roleSettings.auto_eval_nickname,
        autoeval_triggers: roleSettings.autoeval_triggers,
        autoeval_log: roleSettings.autoeval_log,
        blacklisted_roles: roleSettings.blacklisted_roles,
        role_treatment: roleSettings.role_treatment,
      });

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
          typeof bh === "string" ? parseInt(bh.replace(/^bh/i, "")) : Number(bh);
        matchesCriterion = existingRoles.some((r) => normBh(r.bh) === newRole.bh);
        matchesExact = existingRoles.some((r) => normBh(r.bh) === newRole.bh && r.role_id === newRole.role_id);
      } else if (currentRoleType === "builder_league") {
        matchesCriterion = existingRoles.some((r) => r.type === newRole.builder_league);
        matchesExact = existingRoles.some((r) => r.type === newRole.builder_league && r.role_id === newRole.role_id);
      }

      if (matchesExact) {
        setDialogError(t("addRoleDialog.errorDuplicateExact"));
        return;
      }
      if (matchesCriterion) {
        setDialogError(t("addRoleDialog.errorDuplicateCriterion"));
        return;
      }

      // Transform data to match backend format
      let roleData: any = { ...newRole };

      // For league roles: rename "league" → "type" to match API schema
      // Backend expects: { role: int, type: "Legend League" }
      if (currentRoleType === "league" && roleData.league) {
        roleData.type = roleData.league;
        delete roleData.league;
      }

      // For builder_league roles: rename "builder_league" → "type" to match API schema
      // Backend expects: { role: int, type: "Diamond I" }
      if (currentRoleType === "builder_league" && roleData.builder_league) {
        roleData.type = roleData.builder_league;
        delete roleData.builder_league;
      }

      // Backend expects "role" field for most types, but frontend uses "role_id"
      // Keep as string to avoid JavaScript number precision loss with 64-bit Discord IDs
      // Pydantic will handle string -> int conversion on the backend
      if (roleData.role_id !== undefined) {
        roleData.role = roleData.role_id; // Keep as string
        delete roleData.role_id;
      }

      const result = await apiClient.roles.createRole(guildId, currentRoleType, roleData);

      if (result.error) {
        setDialogError(result.error);
        return;
      }

      await loadData();
      setIsAddDialogOpen(false);
      setNewRole({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add role");
    }
  };

  const handleDeleteRole = async (roleType: RoleType, roleId: string | number) => {
    try {
      setError(null);

      await apiClient.roles.deleteRole(guildId, roleType, roleId);

      await loadData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete role");
    }
  };

  const renderRoleForm = () => {
    switch (currentRoleType) {
      case "townhall":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="th">{t("addRoleDialog.townHallLevel")}</Label>
              <Select
                value={newRole.th?.toString()}
                onValueChange={(value) => setNewRole({ ...newRole, th: parseInt(value) })}
              >
                <SelectTrigger id="th">
                  <SelectValue placeholder={t("addRoleDialog.selectThLevel")} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {Array.from({ length: townHallMaxLevel }, (_, i) => townHallMaxLevel - i).map((th) => (
                    <SelectItem key={th} value={th.toString()}>
                      {thPrefix} {th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("addRoleDialog.discordRole")}</Label>
              <RoleCombobox
                roles={discordRoles}
                value={newRole.role_id?.toString() || ""}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
                placeholder={t("addRoleDialog.selectRole")}
                showDisabled={false}
              />
            </div>
          </>
        );

      case "league":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="league">{t("addRoleDialog.league")}</Label>
              <Select
                value={newRole.league}
                onValueChange={(value) => setNewRole({ ...newRole, league: value })}
              >
                <SelectTrigger id="league">
                  <SelectValue placeholder={t("addRoleDialog.selectLeague")} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {availableLeagues.map((league) => (
                    <SelectItem key={league.value} value={league.value}>
                      {league.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("addRoleDialog.discordRole")}</Label>
              <RoleCombobox
                roles={discordRoles}
                value={newRole.role_id?.toString() || ""}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
                placeholder={t("addRoleDialog.selectRole")}
                showDisabled={false}
              />
            </div>
          </>
        );

      case "builderhall":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="bh">{t("addRoleDialog.builderHallLevel")}</Label>
              <Select
                value={newRole.bh?.toString()}
                onValueChange={(value) => setNewRole({ ...newRole, bh: parseInt(value) })}
              >
                <SelectTrigger id="bh">
                  <SelectValue placeholder={t("addRoleDialog.selectBhLevel")} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {Array.from({ length: builderHallMaxLevel }, (_, i) => builderHallMaxLevel - i).map((bh) => (
                    <SelectItem key={bh} value={bh.toString()}>
                      {bhPrefix} {bh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("addRoleDialog.discordRole")}</Label>
              <RoleCombobox
                roles={discordRoles}
                value={newRole.role_id?.toString() || ""}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
                placeholder={t("addRoleDialog.selectRole")}
                showDisabled={false}
              />
            </div>
          </>
        );

      case "builder_league":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="builder_league">{t("addRoleDialog.builderLeague")}</Label>
              <Select
                value={newRole.builder_league}
                onValueChange={(value) => setNewRole({ ...newRole, builder_league: value })}
              >
                <SelectTrigger id="builder_league">
                  <SelectValue placeholder={t("addRoleDialog.selectBuilderLeague")} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {builderLeagues.map((league) => (
                    <SelectItem key={league.value} value={league.value}>
                      {league.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("addRoleDialog.discordRole")}</Label>
              <RoleCombobox
                roles={discordRoles}
                value={newRole.role_id?.toString() || ""}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
                placeholder={t("addRoleDialog.selectRole")}
                showDisabled={false}
              />
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
    const normNum = (v: any) => typeof v === "string" ? parseInt(v.replace(/^\D+/i, "")) : Number(v);

    const getCriteriaLabel = (role: any): string => {
      switch (roleType) {
        case "townhall": return role.th ? `TH ${role.th.toString().replace(/^th/i, "")}` : "";
        case "league": return role.type ? denormalizeLeagueName(role.type) : "";
        case "builderhall": return role.bh ? `BH ${role.bh.toString().replace(/^bh/i, "")}` : "";
        case "builder_league": return role.type ? denormalizeLeagueName(role.type) : "";
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
      return (a.type ?? "").localeCompare(b.type ?? "");
    });

    if (roles.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>{t("configuredRoles.noRolesConfigured", { roleType: roleType.replace("_", " ") })}</p>
          <p className="text-sm mt-2">{t("configuredRoles.addRoleToStart")}</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSortClick("role")}
            >
              {t("configuredRoles.discordRole")}<SortIcon col="role" sortCol={sortCol} sortDir={sortDir} />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSortClick("criteria")}
            >
              {t("configuredRoles.criteria")}<SortIcon col="criteria" sortCol={sortCol} sortDir={sortDir} />
            </TableHead>
            <TableHead className="text-right">{t("configuredRoles.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role: any, index: number) => {
            const roleId = role.role_id || role.id;
            const discordRole = discordRoles.find((r) => r.id === roleId);
            const criteria = getCriteriaLabel(role);

            return (
              <TableRow key={index}>
                <TableCell>
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
                </TableCell>
                <TableCell>{criteria}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRole(roleType, role.role_id || role.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t("configuredRoles.remove")}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  // Calculate statistics
  const totalRoles = Object.values(allRoles).reduce((sum, roles: any) => sum + (roles?.length || 0), 0);
  const activeRoleTypes = Object.entries(allRoles).filter(([_, roles]: [string, any]) => roles.length > 0).length;
  const totalRoleTypes = 4; // townhall, league, builderhall, builder_league

  const hasChanged = roleSettings.auto_eval_status !== originalRoleSettings.auto_eval_status ||
    roleSettings.auto_eval_nickname !== originalRoleSettings.auto_eval_nickname;

  const isAddRoleDisabled = () => {
    const hasRole = !!newRole.role_id;
    if (!hasRole) return true;

    switch (currentRoleType) {
      case "townhall": return !newRole.th;
      case "league": return !newRole.league;
      case "builderhall": return !newRole.bh;
      case "builder_league": return !newRole.builder_league;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10">
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("description")}
            </p>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.totalRoles")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-16 animate-pulse" />
                    <Skeleton className="h-8 w-8 animate-pulse" />
                  </div>
                  <Skeleton className="h-3 w-24 mt-2 animate-pulse" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-blue-500">{totalRoles}</div>
                    <Shield className="h-8 w-8 text-blue-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("stats.totalRolesDesc")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.autoEvaluation")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-20 animate-pulse" />
                    <Skeleton className="h-8 w-8 animate-pulse" />
                  </div>
                  <Skeleton className="h-3 w-32 mt-2 animate-pulse" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className={`text-3xl font-bold ${roleSettings.auto_eval_status ? 'text-green-500' : 'text-green-500/50'}`}>
                      {roleSettings.auto_eval_status ? t("stats.autoEvaluationOn") : t("stats.autoEvaluationOff")}
                    </div>
                    <Settings className={`h-8 w-8 ${roleSettings.auto_eval_status ? 'text-green-500/50' : 'text-green-500/30'}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {roleSettings.auto_eval_status ? t("stats.autoEvaluationActiveDesc") : t("stats.autoEvaluationInactiveDesc")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.activeTypes")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-12 animate-pulse" />
                    <Skeleton className="h-8 w-8 animate-pulse" />
                  </div>
                  <Skeleton className="h-3 w-28 mt-2 animate-pulse" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-purple-500">{activeRoleTypes}/{totalRoleTypes}</div>
                    <Trophy className="h-8 w-8 text-purple-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("stats.activeTypesDesc")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("stats.discordRoles")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-12 animate-pulse" />
                    <Skeleton className="h-8 w-8 animate-pulse" />
                  </div>
                  <Skeleton className="h-3 w-28 mt-2 animate-pulse" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-yellow-500">{discordRoles.length}</div>
                    <Users className="h-8 w-8 text-yellow-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("stats.discordRolesDesc")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
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

        {/* Auto-Eval Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t("settings.title")}
                </CardTitle>
                <CardDescription>
                  {t("settings.description")}
                </CardDescription>
              </div>
              {saveStatus === 'saved' ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-500/10 px-3 py-2 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("toast.changesSaved")}</span>
                </div>
              ) : hasChanged && (
                <Button
                  onClick={handleSaveSettings}
                  disabled={saveStatus === 'saving'}
                  className="bg-primary hover:bg-primary/90 w-full md:w-auto"
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-eval">{t("settings.enableAutoEval")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.enableAutoEvalDesc")}
                </p>
              </div>
              <Switch
                id="auto-eval"
                checked={roleSettings.auto_eval_status}
                onCheckedChange={(checked) =>
                  setRoleSettings({ ...roleSettings, auto_eval_status: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-nickname">{t("settings.autoNickname")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.autoNicknameDesc")}
                </p>
              </div>
              <Switch
                id="auto-nickname"
                checked={roleSettings.auto_eval_nickname}
                onCheckedChange={(checked) =>
                  setRoleSettings({ ...roleSettings, auto_eval_nickname: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Role Types Tabs */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>{t("configuredRoles.title")}</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) setDialogError(null); }}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    {tCommon("add")} {t("addRoleDialog.roleType")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{t("addRoleDialog.title")}</DialogTitle>
                    <DialogDescription>
                      {t("addRoleDialog.description")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="role-type">{t("addRoleDialog.roleType")}</Label>
                      <Select
                        value={currentRoleType}
                        onValueChange={(value) => {
                          setCurrentRoleType(value as RoleType);
                          setNewRole({});
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
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="townhall" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 h-auto">
                {isLoading ? (
                  [...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full animate-pulse" />
                  ))
                ) : (
                  roleTypes.map((type) => (
                    <TabsTrigger key={type.value} value={type.value} className="text-xs lg:text-sm">
                      <type.icon className="mr-1 lg:mr-2 h-3 w-3 lg:h-4 lg:w-4" />
                      <span className="hidden sm:inline">{type.label}</span>
                      <span className="sm:hidden">{type.label.split(' ')[0]}</span>
                    </TabsTrigger>
                  ))
                )}
              </TabsList>

              {roleTypes.map((type) => (
                <TabsContent key={type.value} value={type.value} className="mt-6">
                  {isLoading ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Skeleton className="h-4 w-24 animate-pulse" />
                          </TableHead>
                          <TableHead>
                            <Skeleton className="h-4 w-20 animate-pulse" />
                          </TableHead>
                          <TableHead className="text-right">
                            <Skeleton className="h-4 w-16 animate-pulse ml-auto" />
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[1, 2, 3].map((i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-3 w-3 rounded-full animate-pulse" />
                                <Skeleton className="h-4 w-32 animate-pulse" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24 animate-pulse" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-8 w-20 animate-pulse ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    renderRolesList(type.value)
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-blue-400">{t("infoCard.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-300">
            <p>
              <strong>{t("infoCard.automaticEvaluation")}</strong> {t("infoCard.automaticEvaluationDesc")}
            </p>
            <p>
              <strong>{t("infoCard.rolePriority")}</strong> {t("infoCard.rolePriorityDesc")}
            </p>
            <p>
              <strong>{t("infoCard.manualOverride")}</strong> {t("infoCard.manualOverrideDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
