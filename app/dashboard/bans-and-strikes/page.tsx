"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowDownAZ,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ImageIcon,
  List,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserX,
  Users,
} from "lucide-react";

import { apiClient } from "@/lib/api/client";
import { dashboardQueryKeys } from "@/lib/dashboard-query";
import { dashboardQueryOptions } from "@/lib/dashboard-query-options";
import type { BannedPlayer, Strike } from "@/lib/api/types/server";
import { dashboardHref, useGuildId } from "@/lib/dashboard-route";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DiscordUserDisplay } from "@/components/ui/discord-user-display";
import { InfoPopover } from "@/components/ui/info-popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerProfilePopover } from "@/components/ui/player-profile-popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type StrikeViewMode = "grouped" | "all";
type BanSort = "newest" | "oldest" | "player" | "reason" | "moderator";
type StrikeSort = "newest" | "oldest" | "player" | "reason" | "moderator";
type GroupSort = "weight" | "count" | "player" | "recent";
type NewStrike = {
  player_tag: string;
  reason: string;
  strike_weight: number;
  rollover_days: number | undefined;
  image: string;
};

function optionalImageUrlIsValid(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeClanTag(tag?: string | null): string {
  if (!tag?.trim()) return "";
  const normalized = tag.trim().toUpperCase();
  return normalized.startsWith("#") ? normalized : `#${normalized}`;
}

function dateValue(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function BansAndStrikesPage() { // NOSONAR — page coordinates two closely related operational lists and dialogs
  const guildId = useGuildId();
  const locale = useLocale();
  const t = useTranslations("BansPage");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const strikesRequested = useRef(false);

  const [activeTab, setActiveTab] = useState("bans");
  const [bans, setBans] = useState<BannedPlayer[]>([]);
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [isLoadingBans, setIsLoadingBans] = useState(true);
  const [isLoadingStrikes, setIsLoadingStrikes] = useState(true);
  const [searchQueryBans, setSearchQueryBans] = useState("");
  const [searchQueryStrikes, setSearchQueryStrikes] = useState("");
  const [isAddBanDialogOpen, setIsAddBanDialogOpen] = useState(false);
  const [isAddStrikeDialogOpen, setIsAddStrikeDialogOpen] = useState(false);
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);
  const [isSubmittingStrike, setIsSubmittingStrike] = useState(false);
  const [strikeViewMode, setStrikeViewMode] = useState<StrikeViewMode>("grouped");
  const [banSort, setBanSort] = useState<BanSort>("newest");
  const [strikeSort, setStrikeSort] = useState<StrikeSort>("newest");
  const [groupSort, setGroupSort] = useState<GroupSort>("weight");
  const [expandedPlayerTags, setExpandedPlayerTags] = useState<string[]>([]);
  const [clanNameByTag, setClanNameByTag] = useState<Record<string, string>>({});
  const [newBan, setNewBan] = useState({ player_tag: "", reason: "", image: "" });
  const [newStrike, setNewStrike] = useState<NewStrike>({
    player_tag: "",
    reason: "",
    strike_weight: 1,
    rollover_days: undefined as number | undefined,
    image: "",
  });

  const fetchBans = async () => {
    try {
      setIsLoadingBans(true);
      const response = await queryClient.fetchQuery({
        queryKey: dashboardQueryKeys.route("bans", guildId),
        queryFn: () => apiClient.servers.getBans(guildId),
      });
      if (response.error) throw new Error(String(response.error));
      setBans((response.data?.items ?? []).map((ban) => ({ ...ban, added_by: String(ban.added_by) })));
    } catch (error) {
      console.error("Error fetching bans:", error);
      toast({ title: tCommon("error"), description: t("toast.errorLoadingBans"), variant: "destructive" });
    } finally {
      setIsLoadingBans(false);
    }
  };

  const fetchStrikes = async () => {
    try {
      setIsLoadingStrikes(true);
      const response = await queryClient.fetchQuery({
        queryKey: dashboardQueryKeys.route("strikes", guildId),
        queryFn: () => apiClient.servers.getStrikes(guildId),
      });
      if (response.error) throw new Error(String(response.error));
      setStrikes((response.data?.items ?? []).map((strike) => ({ ...strike, added_by: String(strike.added_by) })));
    } catch (error) {
      strikesRequested.current = false;
      console.error("Error fetching strikes:", error);
      toast({ title: tCommon("error"), description: t("toast.errorLoadingStrikes"), variant: "destructive" });
    } finally {
      setIsLoadingStrikes(false);
    }
  };

  const fetchServerClans = async () => {
    try {
      const clans = await queryClient.fetchQuery(dashboardQueryOptions.clans(guildId));
      const names = clans.reduce<Record<string, string>>((result, clan) => {
        const tag = normalizeClanTag(clan.tag);
        if (tag && clan.name) result[tag] = clan.name;
        return result;
      }, {});
      setClanNameByTag(names);
    } catch (error) {
      console.error("Error fetching server clans:", error);
    }
  };

  const loadInitialData = useEffectEvent(() => {
    void fetchBans();
    void fetchServerClans();
  });

  useEffect(() => {
    loadInitialData();
  }, [guildId]);

  const resolveClanName = (clanName?: string | null, clanTag?: string | null) => {
    if (clanName) return clanName;
    const normalizedTag = normalizeClanTag(clanTag);
    return normalizedTag ? clanNameByTag[normalizedTag] ?? null : null;
  };

  const filteredBans = useMemo(() => {
    const query = searchQueryBans.trim().toLowerCase();
    const results = bans.filter((ban) => !query || [ban.VillageName, ban.name, ban.VillageTag, ban.Notes].some((value) => value?.toLowerCase().includes(query)));
    return results.sort((a, b) => {
      if (banSort === "oldest") return dateValue(a.DateCreated) - dateValue(b.DateCreated);
      if (banSort === "player") return (a.name || a.VillageName || a.VillageTag).localeCompare(b.name || b.VillageName || b.VillageTag, locale);
      if (banSort === "reason") return a.Notes.localeCompare(b.Notes, locale);
      if (banSort === "moderator") return (a.added_by_username || String(a.added_by)).localeCompare(b.added_by_username || String(b.added_by), locale);
      return dateValue(b.DateCreated) - dateValue(a.DateCreated);
    });
  }, [banSort, bans, locale, searchQueryBans]);

  const filteredStrikes = useMemo(() => {
    const query = searchQueryStrikes.trim().toLowerCase();
    const results = strikes.filter((strike) => !query || [strike.player_name, strike.tag, strike.reason].some((value) => value?.toLowerCase().includes(query)));
    return results.sort((a, b) => {
      if (strikeSort === "oldest") return dateValue(a.date_created) - dateValue(b.date_created);
      if (strikeSort === "player") return (a.player_name || a.tag).localeCompare(b.player_name || b.tag, locale);
      if (strikeSort === "reason") return a.reason.localeCompare(b.reason, locale);
      if (strikeSort === "moderator") return (a.added_by_username || String(a.added_by)).localeCompare(b.added_by_username || String(b.added_by), locale);
      return dateValue(b.date_created) - dateValue(a.date_created);
    });
  }, [locale, searchQueryStrikes, strikeSort, strikes]);

  const groupedStrikes = useMemo(() => {
    const groups = new Map<string, {
      tag: string;
      player_name?: string;
      town_hall?: number | null;
      trophies?: number | null;
      clan_tag?: string | null;
      clan_name?: string | null;
      strikes: Strike[];
      totalWeight: number;
    }>();
    for (const strike of filteredStrikes) {
      const current = groups.get(strike.tag);
      if (current) {
        current.strikes.push(strike);
        current.totalWeight += strike.strike_weight;
      } else {
        groups.set(strike.tag, {
          tag: strike.tag,
          player_name: strike.player_name,
          town_hall: strike.town_hall,
          trophies: strike.trophies,
          clan_tag: strike.clan_tag,
          clan_name: strike.clan_name,
          strikes: [strike],
          totalWeight: strike.strike_weight,
        });
      }
    }
    return [...groups.values()].sort((a, b) => {
      if (groupSort === "count") return b.strikes.length - a.strikes.length || b.totalWeight - a.totalWeight;
      if (groupSort === "player") return (a.player_name || a.tag).localeCompare(b.player_name || b.tag, locale);
      if (groupSort === "recent") {
        const latestA = Math.max(...a.strikes.map((strike) => dateValue(strike.date_created)));
        const latestB = Math.max(...b.strikes.map((strike) => dateValue(strike.date_created)));
        return latestB - latestA;
      }
      return b.totalWeight - a.totalWeight || b.strikes.length - a.strikes.length;
    });
  }, [filteredStrikes, groupSort, locale]);

  const mutationError = (error: unknown, fallback: string): string => {
    if (typeof error === "string") return error;
    if (Array.isArray(error)) return error.map((item) => typeof item === "string" ? item : item?.msg ?? item?.message ?? JSON.stringify(item)).join(", ");
    if (error && typeof error === "object") {
      const record = error as { detail?: string; message?: string };
      return record.detail ?? record.message ?? JSON.stringify(error);
    }
    return fallback;
  };

  const currentUserId = (): string => {
    const user = localStorage.getItem("user");
    return user ? String(JSON.parse(user).user_id) : "0";
  };

  const handleAddBan = async () => {
    if (!newBan.player_tag.trim() || !newBan.reason.trim() || !optionalImageUrlIsValid(newBan.image)) return;
    try {
      setIsSubmittingBan(true);
      const response = await apiClient.servers.addBan(guildId, newBan.player_tag.replace(/^#/, ""), {
        reason: newBan.reason.trim(),
        added_by: currentUserId(),
        image: newBan.image.trim() || null,
      });
      if (response.error) throw new Error(mutationError(response.error, t("toast.errorAddingBan")));
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("bans", guildId), exact: true });
      await fetchBans();
      setNewBan({ player_tag: "", reason: "", image: "" });
      setIsAddBanDialogOpen(false);
      toast({ title: tCommon("success"), description: t("toast.banAdded") });
    } catch (error) {
      toast({ title: tCommon("error"), description: error instanceof Error ? error.message : t("toast.errorAddingBan"), variant: "destructive" });
    } finally {
      setIsSubmittingBan(false);
    }
  };

  const handleAddStrike = async () => {
    if (!newStrike.player_tag.trim() || !newStrike.reason.trim() || !optionalImageUrlIsValid(newStrike.image)) return;
    try {
      setIsSubmittingStrike(true);
      const response = await apiClient.servers.addStrike(guildId, newStrike.player_tag.replace(/^#/, ""), {
        reason: newStrike.reason.trim(),
        added_by: currentUserId(),
        strike_weight: newStrike.strike_weight,
        rollover_days: newStrike.rollover_days,
        image: newStrike.image.trim() || undefined,
      });
      if (response.error) throw new Error(mutationError(response.error, t("toast.errorAddingStrike")));
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("strikes", guildId), exact: true });
      await fetchStrikes();
      setNewStrike({ player_tag: "", reason: "", strike_weight: 1, rollover_days: undefined, image: "" });
      setIsAddStrikeDialogOpen(false);
      toast({ title: tCommon("success"), description: t("toast.strikeAdded") });
    } catch (error) {
      toast({ title: tCommon("error"), description: error instanceof Error ? error.message : t("toast.errorAddingStrike"), variant: "destructive" });
    } finally {
      setIsSubmittingStrike(false);
    }
  };

  const handleRemoveBan = async (playerTag: string) => {
    try {
      const response = await apiClient.servers.removeBan(guildId, playerTag.replace(/^#/, ""));
      if (response.error) throw new Error(mutationError(response.error, t("toast.errorRemovingBan")));
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("bans", guildId), exact: true });
      await fetchBans();
      toast({ title: tCommon("success"), description: t("toast.banRemoved") });
    } catch (error) {
      toast({ title: tCommon("error"), description: error instanceof Error ? error.message : t("toast.errorRemovingBan"), variant: "destructive" });
    }
  };

  const handleRemoveStrike = async (strikeId: string) => {
    try {
      const response = await apiClient.servers.removeStrike(guildId, strikeId);
      if (response.error) throw new Error(mutationError(response.error, t("toast.errorRemovingStrike")));
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.route("strikes", guildId), exact: true });
      await fetchStrikes();
      toast({ title: tCommon("success"), description: t("toast.strikeRemoved") });
    } catch (error) {
      toast({ title: tCommon("error"), description: error instanceof Error ? error.message : t("toast.errorRemovingStrike"), variant: "destructive" });
    }
  };

  const banExplanation = (
    <div className="space-y-2">
      <p className="font-medium text-foreground">{t("bans.howItWorks.title")}</p>
      <p>{t.rich("bans.howItWorks.description", {
        clansTab: (chunks) => <Link href={dashboardHref("clans", guildId)} className="font-medium text-primary hover:underline">{chunks}</Link>,
      })}</p>
    </div>
  );

  const strikeExplanation = (
    <div className="space-y-3">
      <div><p className="font-medium text-foreground">{t("strikes.howItWorks.title")}</p><p className="mt-1">{t("strikes.howItWorks.description")}</p></div>
      <div><p className="font-medium text-foreground">{t("strikes.guidelines.weights.title")}</p><p className="mt-1">{t("strikes.guidelines.weights.desc")}</p></div>
      <div><p className="font-medium text-foreground">{t("strikes.guidelines.expiration.title")}</p><p className="mt-1">{t("strikes.guidelines.expiration.desc")}</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </header>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          if (value === "strikes" && !strikesRequested.current) {
            strikesRequested.current = true;
            void fetchStrikes();
          }
        }}>
          <DashboardTabsList className="max-w-md grid-cols-2">
            <DashboardTabTrigger value="bans" artwork={<UserX />} count={bans.length}>{t("tabs.bans")}</DashboardTabTrigger>
            <DashboardTabTrigger value="strikes" artwork={<AlertTriangle />} count={strikes.length}>{t("tabs.strikes")}</DashboardTabTrigger>
          </DashboardTabsList>

          <TabsContent value="bans" className="mt-7 space-y-4">
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{t("bans.list.title")}</h2><InfoPopover content={banExplanation} label={t("bans.howItWorks.title")} /></div>
                  <p className="mt-1 text-sm text-muted-foreground">{t("bans.list.count", { count: filteredBans.length })}</p>
                </div>
                <BanDialog
                  open={isAddBanDialogOpen}
                  onOpenChange={setIsAddBanDialogOpen}
                  value={newBan}
                  onChange={setNewBan}
                  onSubmit={() => void handleAddBan()}
                  submitting={isSubmittingBan}
                  imageValid={optionalImageUrlIsValid(newBan.image)}
                  t={t}
                  tCommon={tCommon}
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <SearchControl value={searchQueryBans} onChange={setSearchQueryBans} placeholder={t("bans.list.searchPlaceholder")} className="sm:flex-1" />
                <SortControl value={banSort} onChange={(value) => setBanSort(value as BanSort)} options={["newest", "oldest", "player", "reason", "moderator"]} t={t} />
              </div>

              {isLoadingBans ? <RowSkeletons /> : filteredBans.length === 0 ? (
                <EmptyState
                  title={searchQueryBans ? t("bans.list.noBansFound") : t("bans.list.noBans")}
                  description={searchQueryBans ? t("bans.list.adjustSearch") : t("bans.list.getStarted")}
                />
              ) : (
                <div className="space-y-2">
                  {filteredBans.map((ban) => (
                    <BanRow
                      key={ban.VillageTag}
                      ban={ban}
                      locale={locale}
                      clanName={resolveClanName(ban.clan_name, ban.clan_tag)}
                      onRemove={() => void handleRemoveBan(ban.VillageTag)}
                      t={t}
                      tCommon={tCommon}
                    />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="strikes" className="mt-7 space-y-4">
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{t("strikes.list.title")}</h2><InfoPopover content={strikeExplanation} label={t("strikes.howItWorks.title")} /></div>
                  <p className="mt-1 text-sm text-muted-foreground">{t("strikes.list.count", { count: filteredStrikes.length })}</p>
                </div>
                <StrikeDialog
                  open={isAddStrikeDialogOpen}
                  onOpenChange={setIsAddStrikeDialogOpen}
                  value={newStrike}
                  onChange={setNewStrike}
                  onSubmit={() => void handleAddStrike()}
                  submitting={isSubmittingStrike}
                  imageValid={optionalImageUrlIsValid(newStrike.image)}
                  t={t}
                  tCommon={tCommon}
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex rounded-xl bg-muted/55 p-1 shadow-sm shadow-black/5">
                  <ViewButton active={strikeViewMode === "grouped"} onClick={() => setStrikeViewMode("grouped")} icon={<Users />} label={t("strikes.list.viewGrouped")} />
                  <ViewButton active={strikeViewMode === "all"} onClick={() => setStrikeViewMode("all")} icon={<List />} label={t("strikes.list.viewAll")} />
                </div>
                <SearchControl value={searchQueryStrikes} onChange={setSearchQueryStrikes} placeholder={t("strikes.list.searchPlaceholder")} className="sm:flex-1" />
                <SortControl value={strikeViewMode === "grouped" ? groupSort : strikeSort} onChange={(value) => strikeViewMode === "grouped" ? setGroupSort(value as GroupSort) : setStrikeSort(value as StrikeSort)} options={strikeViewMode === "grouped" ? ["weight", "count", "player", "recent"] : ["newest", "oldest", "player", "reason", "moderator"]} t={t} />
              </div>

              {isLoadingStrikes ? <RowSkeletons /> : filteredStrikes.length === 0 ? (
                <EmptyState
                  title={searchQueryStrikes ? t("strikes.list.noStrikesFound") : t("strikes.list.noStrikes")}
                  description={searchQueryStrikes ? t("strikes.list.adjustSearch") : t("strikes.list.getStarted")}
                />
              ) : strikeViewMode === "all" ? (
                <div className="space-y-2">
                  {filteredStrikes.map((strike) => (
                    <StrikeRow key={strike.strike_id} strike={strike} locale={locale} clanName={resolveClanName(strike.clan_name, strike.clan_tag)} onRemove={() => void handleRemoveStrike(strike.strike_id)} t={t} tCommon={tCommon} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {groupedStrikes.map((group) => {
                    const expanded = expandedPlayerTags.includes(group.tag);
                    return (
                      <div key={group.tag} className="rounded-[22px] bg-card p-4 shadow-sm shadow-black/5 sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1">
                            <PlayerProfilePopover playerName={group.player_name || tCommon("unknown")} playerTag={group.tag} clanName={resolveClanName(group.clan_name, group.clan_tag)} clanTag={group.clan_tag ?? null} townhallLevel={group.town_hall ?? null} trophies={group.trophies ?? null} />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <DataPill label={t("strikes.table.totalStrikes")} value={group.strikes.length} />
                            <DataPill label={t("strikes.table.totalWeight")} value={group.totalWeight} accent />
                            <Button type="button" variant="secondary" size="sm" className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted" onClick={() => setExpandedPlayerTags((current) => current.includes(group.tag) ? current.filter((tag) => tag !== group.tag) : [...current, group.tag])}>
                              {expanded ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}{tCommon("details")}
                            </Button>
                          </div>
                        </div>
                        {expanded && (
                          <div className="mt-4 space-y-2 rounded-2xl bg-muted/45 p-2 sm:p-3">
                            {group.strikes.map((strike) => <StrikeRow key={strike.strike_id} strike={strike} locale={locale} compact onRemove={() => void handleRemoveStrike(strike.strike_id)} t={t} tCommon={tCommon} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

type Translator = ReturnType<typeof useTranslations<"BansPage">>;
type CommonTranslator = ReturnType<typeof useTranslations<"Common">>;

function SearchControl({ value, onChange, placeholder, className }: Readonly<{ value: string; onChange: (value: string) => void; placeholder: string; className?: string }>) {
  return (
    <div className={cn("flex h-10 items-center gap-2 rounded-xl bg-muted/55 px-3 shadow-sm shadow-black/5 focus-within:ring-2 focus-within:ring-ring", className)}>
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </div>
  );
}

function SortControl({ value, onChange, options, t }: Readonly<{ value: string; onChange: (value: string) => void; options: string[]; t: Translator }>) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={t("sort.label")} className="h-10 border-0 bg-muted/55 shadow-sm shadow-black/5 sm:w-48">
        <ArrowDownAZ className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{t(`sort.${option}` as Parameters<Translator>[0])}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function ViewButton({ active, onClick, icon, label }: Readonly<{ active: boolean; onClick: () => void; icon: ReactNode; label: string }>) {
  return <button type="button" onClick={onClick} className={cn("flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>{label}</button>;
}

function RowSkeletons() {
  return <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="flex items-center gap-4 rounded-[22px] bg-card p-4 shadow-sm shadow-black/5"><Skeleton className="h-9 w-9 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-56 max-w-full" /></div><Skeleton className="h-8 w-24 rounded-xl" /></div>)}</div>;
}

function EmptyState({ title, description }: Readonly<{ title: string; description: string }>) {
  return <div className="rounded-[24px] bg-card px-5 py-10 text-center shadow-sm shadow-black/5"><p className="font-medium text-foreground">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function DataPill({ label, value, accent = false }: Readonly<{ label: string; value: number; accent?: boolean }>) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground", accent && "bg-primary/10 text-primary")}><span>{label}</span><strong className="font-semibold text-current">{value}</strong></span>;
}

function EvidenceLink({ image, label }: Readonly<{ image?: string | null; label: string }>) {
  if (!image || !optionalImageUrlIsValid(image)) return null;
  return <a href={image} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ImageIcon className="h-3.5 w-3.5" />{label}<ExternalLink className="h-3 w-3" /></a>;
}

function BanRow({ ban, locale, clanName, onRemove, t, tCommon }: Readonly<{ ban: BannedPlayer; locale: string; clanName: string | null; onRemove: () => void; t: Translator; tCommon: CommonTranslator }>) {
  return (
    <article className="rounded-[22px] bg-card p-4 shadow-sm shadow-black/5 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:w-52 lg:shrink-0"><PlayerProfilePopover playerName={ban.name || ban.VillageName || tCommon("unknown")} playerTag={ban.VillageTag} clanName={clanName} clanTag={ban.clan_tag ?? null} townhallLevel={ban.town_hall ?? null} trophies={ban.trophies ?? null} /></div>
        <div className="min-w-0 flex-1"><p className="text-sm text-foreground">{ban.Notes && ban.Notes !== "No Notes" ? ban.Notes : t("bans.table.noReason")}</p><div className="mt-2 flex flex-wrap items-center gap-2"><EvidenceLink image={ban.image} label={t("image.view")} /><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{new Date(ban.DateCreated).toLocaleDateString(locale)}</span></div></div>
        <div className="flex items-center justify-between gap-3 lg:justify-end"><DiscordUserDisplay userId={String(ban.added_by)} username={ban.added_by_username} avatarUrl={ban.added_by_avatar_url} size="sm" /><Button type="button" variant="ghost" size="icon" onClick={onRemove} className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={t("bans.removeBan")}><Trash2 className="h-4 w-4" /></Button></div>
      </div>
    </article>
  );
}

function StrikeRow({ strike, locale, clanName, compact = false, onRemove, t, tCommon }: Readonly<{ strike: Strike; locale: string; clanName?: string | null; compact?: boolean; onRemove: () => void; t: Translator; tCommon: CommonTranslator }>) {
  return (
    <article className={cn("rounded-[22px] bg-card p-4 shadow-sm shadow-black/5 sm:p-5", compact && "rounded-2xl bg-card/80 p-3 sm:p-3") }>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {!compact && <div className="min-w-0 lg:w-52 lg:shrink-0"><PlayerProfilePopover playerName={strike.player_name || tCommon("unknown")} playerTag={strike.tag} clanName={clanName} clanTag={strike.clan_tag ?? null} townhallLevel={strike.town_hall ?? null} trophies={strike.trophies ?? null} /></div>}
        <div className="min-w-0 flex-1"><p className="text-sm text-foreground">{strike.reason && strike.reason !== "No Notes" ? strike.reason : t("bans.table.noReason")}</p><div className="mt-2 flex flex-wrap items-center gap-2"><DataPill label={t("strikes.table.weight")} value={strike.strike_weight} accent /><EvidenceLink image={strike.image} label={t("image.view")} /><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{new Date(strike.date_created).toLocaleDateString(locale)}</span><span className="text-xs text-muted-foreground">{t("strikes.table.expires")}: {strike.rollover_date ? new Date(strike.rollover_date * 1000).toLocaleDateString(locale) : t("strikes.table.never")}</span></div></div>
        <div className="flex items-center justify-between gap-3 lg:justify-end"><DiscordUserDisplay userId={String(strike.added_by)} username={strike.added_by_username} avatarUrl={strike.added_by_avatar_url} size="sm" /><Button type="button" variant="ghost" size="icon" onClick={onRemove} className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={t("strikes.removeStrike")}><Trash2 className="h-4 w-4" /></Button></div>
      </div>
    </article>
  );
}

function ImageUrlField({ id, value, onChange, valid, t }: Readonly<{ id: string; value: string; onChange: (value: string) => void; valid: boolean; t: Translator }>) {
  return <div className="space-y-2"><Label htmlFor={id}>{t("image.label")}</Label><div className="relative"><ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id={id} type="url" inputMode="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder={t("image.placeholder")} aria-invalid={!valid} className="pl-9" /></div><p className={cn("text-xs text-muted-foreground", !valid && "text-destructive")}>{valid ? t("image.help") : t("image.invalid")}</p></div>;
}

function BanDialog({ open, onOpenChange, value, onChange, onSubmit, submitting, imageValid, t, tCommon }: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void; value: { player_tag: string; reason: string; image: string }; onChange: (value: { player_tag: string; reason: string; image: string }) => void; onSubmit: () => void; submitting: boolean; imageValid: boolean; t: Translator; tCommon: CommonTranslator }>) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />{t("bans.addBan")}</Button></DialogTrigger><DialogContent className="border-0 bg-card shadow-xl sm:max-w-lg"><DialogHeader><DialogTitle>{t("bans.addDialog.title")}</DialogTitle><DialogDescription>{t("bans.addDialog.description")}</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label htmlFor="ban-player-tag">{t("bans.addDialog.playerTagLabel")}</Label><Input id="ban-player-tag" value={value.player_tag} onChange={(event) => onChange({ ...value, player_tag: event.target.value })} placeholder={t("bans.addDialog.playerTagPlaceholder")} /></div><div className="space-y-2"><Label htmlFor="ban-reason">{t("bans.addDialog.reasonLabel")}</Label><Textarea id="ban-reason" value={value.reason} onChange={(event) => onChange({ ...value, reason: event.target.value })} placeholder={t("bans.addDialog.reasonPlaceholder")} /></div><ImageUrlField id="ban-image" value={value.image} onChange={(image) => onChange({ ...value, image })} valid={imageValid} t={t} /></div><DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button><Button onClick={onSubmit} disabled={submitting || !value.player_tag.trim() || !value.reason.trim() || !imageValid}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("bans.addDialog.submit")}</Button></DialogFooter></DialogContent></Dialog>;
}

function StrikeDialog({ open, onOpenChange, value, onChange, onSubmit, submitting, imageValid, t, tCommon }: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void; value: NewStrike; onChange: (value: NewStrike) => void; onSubmit: () => void; submitting: boolean; imageValid: boolean; t: Translator; tCommon: CommonTranslator }>) {
  const info = <div className="space-y-3"><div><p className="font-medium text-foreground">{t("strikes.guidelines.weights.title")}</p><p className="mt-1">{t("strikes.guidelines.weights.desc")}</p></div><div><p className="font-medium text-foreground">{t("strikes.guidelines.expiration.title")}</p><p className="mt-1">{t("strikes.guidelines.expiration.desc")}</p></div></div>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />{t("strikes.addStrike")}</Button></DialogTrigger><DialogContent className="border-0 bg-card shadow-xl sm:max-w-lg"><DialogHeader><DialogTitle>{t("strikes.addDialog.title")}</DialogTitle><DialogDescription>{t("strikes.addDialog.description")}</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label htmlFor="strike-player-tag">{t("strikes.addDialog.playerTagLabel")}</Label><Input id="strike-player-tag" value={value.player_tag} onChange={(event) => onChange({ ...value, player_tag: event.target.value })} placeholder={t("strikes.addDialog.playerTagPlaceholder")} /></div><div className="space-y-2"><Label htmlFor="strike-reason">{t("strikes.addDialog.reasonLabel")}</Label><Textarea id="strike-reason" value={value.reason} onChange={(event) => onChange({ ...value, reason: event.target.value })} placeholder={t("strikes.addDialog.reasonPlaceholder")} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><div className="flex items-center gap-2"><Label htmlFor="strike-weight">{t("strikes.addDialog.weightLabel")}</Label><InfoPopover content={info} label={t("strikes.howItWorks.title")} /></div><Input id="strike-weight" type="number" min={1} value={value.strike_weight} onChange={(event) => onChange({ ...value, strike_weight: Math.max(1, Number.parseInt(event.target.value, 10) || 1) })} /></div><div className="space-y-2"><Label htmlFor="rollover-days">{t("strikes.addDialog.rolloverLabel")}</Label><Input id="rollover-days" type="number" min={1} value={value.rollover_days ?? ""} onChange={(event) => onChange({ ...value, rollover_days: event.target.value ? Math.max(1, Number.parseInt(event.target.value, 10) || 1) : undefined })} placeholder={t("strikes.addDialog.rolloverPlaceholder")} /></div></div><ImageUrlField id="strike-image" value={value.image} onChange={(image) => onChange({ ...value, image })} valid={imageValid} t={t} /></div><DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button><Button onClick={onSubmit} disabled={submitting || !value.player_tag.trim() || !value.reason.trim() || !imageValid}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("strikes.addDialog.submit")}</Button></DialogFooter></DialogContent></Dialog>;
}
