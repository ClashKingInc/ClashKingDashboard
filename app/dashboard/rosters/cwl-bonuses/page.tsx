"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ClanCombobox } from "@/components/ui/clan-combobox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api/client";
import type { CwlGroupResponse, CwlSeasonItem, CwlWarLeagueStaticItem } from "@/lib/api/types/war";
import { dashboardHref, useGuildId } from "@/lib/dashboard-route";
import { cwlLeagueImageUrl, townHallImageUrl } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { fetchClans } from "../_lib/api";
import type { Clan } from "../_lib/types";
import {
  calculateCwlRewards,
  calculateCwlStandings,
  calculateCwlPlayerPerformance,
  resolveCwlLeagueMovement,
  resolveCwlWarSize,
  selectableCwlSeasons,
  sortCwlMembersByPerformance,
} from "./calculation";

const WAR_LEAGUES_URL = "https://assets.clashk.ing/static_data/war_leagues.json";
const CWL_ASSETS = {
  rank: {
    promoted: "https://assets.clashk.ing/bot/icons/up_green_arrow.png",
    demoted: "https://assets.clashk.ing/bot/icons/down_red_arrow.png",
    unchanged: "https://assets.clashk.ing/bot/icons/grey_dash.png",
  },
  sword: "https://assets.clashk.ing/bot/icons/clash_sword.png",
  star: "https://assets.clashk.ing/bot/icons/war_star.png",
  medal: "https://assets.clashk.ing/bot/icons/cwl_medal.png",
} as const;

function seasonLabel(item: CwlSeasonItem, locale: string, unknownLeague: string): string {
  const [year, month] = item.season.split("-").map(Number);
  const date = year && month ? new Date(Date.UTC(year, month - 1, 1)) : null;
  const label = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(date)
    : item.season;
  return `${label} · ${item.warLeague?.name ?? unknownLeague}`;
}

interface SummaryItemProps {
  readonly label: string;
  readonly value: string | number;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly largeArtwork?: boolean;
}

function SummaryItem({ label, value, imageUrl, imageAlt, largeArtwork = false }: SummaryItemProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[22px] bg-card px-4 py-3 shadow-sm shadow-black/5">
      <Image
        src={imageUrl}
        alt={imageAlt}
        width={largeArtwork ? 48 : 36}
        height={largeArtwork ? 48 : 36}
        unoptimized
        className={cn("shrink-0 object-contain", largeArtwork ? "h-12 w-12" : "h-9 w-9")}
      />
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function CwlBonusesPage() {
  const guildId = useGuildId();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("RostersPage.cwlBonuses");
  const { toast } = useToast();
  const [clans, setClans] = useState<Clan[]>([]);
  const [clanTag, setClanTag] = useState("");
  const [seasons, setSeasons] = useState<CwlSeasonItem[]>([]);
  const [season, setSeason] = useState("");
  const [group, setGroup] = useState<CwlGroupResponse>();
  const [rules, setRules] = useState<CwlWarLeagueStaticItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!guildId) return;
    fetchClans(guildId).then((items) => {
      setClans(items);
      setClanTag((current) => current || items[0]?.tag || "");
    }).catch(() => setError(t("loadClansError")));
  }, [guildId, t]);

  useEffect(() => {
    if (!clanTag) return;
    setSeason("");
    setGroup(undefined);
    setSelected([]);
    setError(undefined);
    apiClient.wars.getCwlSeasons(clanTag).then((response) => {
      if (response.error) return setError(response.error);
      const items = selectableCwlSeasons(response.data?.items ?? []);
      setSeasons(items);
      setSeason(items[0]?.season ?? "");
    });
  }, [clanTag]);

  useEffect(() => {
    if (!guildId || !clanTag || !season) return;
    setLoading(true);
    setError(undefined);
    setSelected([]);
    Promise.all([
      apiClient.wars.getStoredCwl(clanTag, season),
      apiClient.wars.getCwlBonusRecipients(guildId, clanTag, season),
      fetch(WAR_LEAGUES_URL, { cache: "force-cache" }).then(async (response) => {
        if (!response.ok) throw new Error(t("loadMedalRulesError"));
        return response.json() as Promise<{ items: CwlWarLeagueStaticItem[] }>;
      }),
    ]).then(([groupResponse, savedResponse, staticData]) => {
      if (groupResponse.error) throw new Error(groupResponse.error);
      if (savedResponse.error) throw new Error(savedResponse.error);
      setGroup(groupResponse.data);
      setSelected((savedResponse.data?.items ?? []).map((item) => item.playerTag));
      setRules(staticData.items);
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : t("loadDataError")))
      .finally(() => setLoading(false));
  }, [clanTag, guildId, season, t]);

  const standings = useMemo(() => group ? calculateCwlStandings(group) : undefined, [group]);
  const selectedSeason = seasons.find((item) => item.season === season);
  const standing = standings?.items.find((item) => item.clanTag === clanTag);
  const rule = rules.find((item) => item._id === group?.warLeague?.id);
  const warSize = resolveCwlWarSize(group, selectedSeason?.warSize);
  const rewards = warSize && standing && rule ? calculateCwlRewards(rule, standing, warSize) : undefined;
  const clan = group?.clans.find((item) => item.tag === clanTag);
  const playerPerformance = useMemo(() => group ? calculateCwlPlayerPerformance(group) : {}, [group]);
  const members = useMemo(() => sortCwlMembersByPerformance(clan?.members ?? [], playerPerformance), [clan?.members, playerPerformance]);
  const selectionEnabled = Boolean(standings?.complete && rewards);
  const ready = Boolean(selectionEnabled && clan && selected.length === rewards?.bonusSlots);
  const movement = resolveCwlLeagueMovement(rule, standing?.rank);
  const remaining = Math.max(0, (rewards?.bonusSlots ?? 0) - selected.length);

  const toggle = (tag: string) => setSelected((current) => {
    if (current.includes(tag)) return current.filter((item) => item !== tag);
    if (!rewards || current.length >= rewards.bonusSlots) return current;
    return [...current, tag];
  });

  const save = async () => {
    if (!ready || !rewards) return;
    setSaving(true);
    const response = await apiClient.wars.replaceCwlBonusRecipients(
      guildId,
      clanTag,
      season,
      selected.map((playerTag) => ({ playerTag, medalCount: rewards.bonusMedals })),
    );
    setSaving(false);
    if (response.error) return setError(response.error);
    toast({ title: t("saved") });
  };

  const summary = [
    {
      label: t("league"),
      value: group?.warLeague?.name ?? t("unknownLeague"),
      imageUrl: cwlLeagueImageUrl(group?.warLeague?.name),
      imageAlt: group?.warLeague?.name ?? t("unrankedLeague"),
      largeArtwork: true,
    },
    {
      label: t("rank"),
      value: standing ? `#${standing.rank}` : "—",
      imageUrl: CWL_ASSETS.rank[movement],
      imageAlt: t(`movement.${movement}`),
    },
    { label: t("warsWon"), value: standing?.wins ?? "—", imageUrl: CWL_ASSETS.sword, imageAlt: t("warsWon") },
    { label: t("leagueMedals"), value: rewards?.placementMedals ?? "—", imageUrl: CWL_ASSETS.medal, imageAlt: t("leagueMedals") },
    { label: t("bonusSlots"), value: rewards?.bonusSlots ?? "—", imageUrl: CWL_ASSETS.medal, imageAlt: t("bonusSlots") },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-5 md:px-6 md:py-7">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label={t("back")} onClick={() => router.push(dashboardHref("rosters", guildId))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </header>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cwl-clan" className="text-xs font-medium text-muted-foreground">{t("clan")}</Label>
            <ClanCombobox
              id="cwl-clan"
              clans={clans}
              value={clanTag}
              onValueChange={setClanTag}
              placeholder={t("selectClan")}
              searchPlaceholder={t("searchClans")}
              emptyText={t("noClanFound")}
              className="border-0 bg-muted/55 shadow-sm shadow-black/5 hover:bg-muted/65"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t("season")}</Label>
            <Select value={season} onValueChange={setSeason} disabled={!seasons.length}>
              <SelectTrigger className="h-12 border-0 bg-muted/55 shadow-sm shadow-black/5 focus:ring-ring/35">
                {selectedSeason ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <Image src={cwlLeagueImageUrl(selectedSeason.warLeague?.name)} alt="" width={32} height={32} unoptimized className="h-8 w-8 shrink-0 object-contain" />
                    <span className="truncate">{seasonLabel(selectedSeason, locale, t("unknownLeague"))}</span>
                  </div>
                ) : <SelectValue placeholder={t("noStoredSeasons")} />}
              </SelectTrigger>
              <SelectContent>
                {seasons.map((item) => (
                  <SelectItem key={item.season} value={item.season}>
                    <span className="flex items-center gap-2.5">
                      <Image src={cwlLeagueImageUrl(item.warLeague?.name)} alt="" width={30} height={30} unoptimized className="h-[30px] w-[30px] shrink-0 object-contain" />
                      <span>{seasonLabel(item, locale, t("unknownLeague"))}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {loading && (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
          </div>
        )}

        {!loading && group && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {summary.map((item) => <SummaryItem key={item.label} {...item} />)}
            </section>

            {!standings?.complete && (
              <Alert className="border-amber-500/25 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription>{t("incomplete")}</AlertDescription>
              </Alert>
            )}

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("awardBonuses")}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("selectionSummary", {
                      selected: selected.length,
                      total: rewards?.bonusSlots ?? "—",
                      medals: rewards?.bonusMedals ?? "—",
                    })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {!selectionEnabled
                      ? t("selectionLocked")
                      : ready
                        ? <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><Check className="h-3.5 w-3.5" /> {t("ready")}</span>
                        : t("chooseMore", { count: remaining })}
                  </p>
                </div>
                <Button className="rounded-xl" disabled={!ready || saving} onClick={() => void save()}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Image src={CWL_ASSETS.medal} alt="" width={24} height={18} unoptimized className="mr-2 h-[18px] w-6 object-contain" />}
                  {t("save")}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {members.map((member) => {
                  const checked = selected.includes(member.tag);
                  return (
                    <button
                      key={member.tag}
                      type="button"
                      disabled={!selectionEnabled}
                      aria-pressed={checked}
                      onClick={() => toggle(member.tag)}
                      className={cn(
                        "flex min-h-[76px] items-center gap-3 rounded-[22px] bg-card px-3.5 py-3 text-left shadow-sm shadow-black/5 transition-[background-color,box-shadow] hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
                        checked && "bg-primary/8 ring-2 ring-primary/45 hover:bg-primary/10",
                      )}
                    >
                      <Image src={townHallImageUrl(member.townHallLevel)} alt={t("townHallAlt", { level: member.townHallLevel })} width={46} height={46} unoptimized className="h-11 w-11 shrink-0 object-contain" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{member.name}</span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{member.tag}</span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/65 px-2 py-0.5 text-[10px] font-medium text-foreground">
                            <Image src={CWL_ASSETS.star} alt="" width={14} height={14} unoptimized className="h-3.5 w-3.5 object-contain" />
                            {t("stars", { count: playerPerformance[member.tag]?.stars ?? 0 })}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/65 px-2 py-0.5 text-[10px] font-medium text-foreground">
                            <Image src={CWL_ASSETS.sword} alt="" width={14} height={14} unoptimized className="h-3.5 w-3.5 object-contain" />
                            {t("attacks", { count: playerPerformance[member.tag]?.attacks ?? 0 })}
                          </span>
                        </span>
                      </span>
                      <span className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input text-primary-foreground",
                        checked && "border-primary bg-primary",
                      )} aria-hidden="true">
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
                {members.length === 0 && (
                  <div className="col-span-full rounded-[24px] bg-muted/35 px-4 py-12 text-center text-sm text-muted-foreground">{t("noPlayers")}</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
