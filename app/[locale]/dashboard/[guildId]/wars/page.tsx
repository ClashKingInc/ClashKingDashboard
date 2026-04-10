"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth/logout";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Trophy,
  Swords,
  Shield,
  Filter,
  Download,
  TrendingUp,
  Star,
  Loader2
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { darkTheme, clashKingColors } from "@/lib/theme";
import type { War } from "@/lib/api/types/war";

interface PlayerStats {
  tag: string;
  name: string;
  townhall: number;
  stats?: {
    attacks: number;
    stars: number;
    avg_stars: number;
    three_stars: number;
    avg_destruction: number;
  };
  missed?: { all?: number; [th: string]: number | undefined };
  defense?: {
    defenses: number;
    stars_given: number;
    avg_stars_given: number;
  };
}

interface WarTypeCounts {
  random: number;
  friendly: number;
  cwl: number;
}

interface Clan {
  tag: string;
  name: string;
  badge_url?: string | null;
}

interface ComputedClanStats {
  clan_tag: string;
  clan_name: string;
  total_wars: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  avg_stars_per_attack: number;
  avg_defense_stars: number;
  avg_destruction: number;
  current_war?: War | null;
  is_in_war: boolean;
  is_in_cwl: boolean;
}

interface DefenderStats {
  tag: string;
  name: string;
  townhall: number;
  defenses: number;
  avg_stars_given: number;
}

interface DailyWarStats {
  date: string;
  wins: number;
  losses: number;
  draws: number;
}

interface THStats {
  th: string;
  success: number;
  failed: number;
}

export default function WarsPage() { // NOSONAR — React page component: complexity is aggregate state/handler management, not a single logic unit
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guildId = params?.guildId as string;
  const t = useTranslations("WarsPage");
  const [loading, setLoading] = useState(true);
  const [clans, setClans] = useState<Clan[]>([]);
  const [clanStats, setClanStats] = useState<ComputedClanStats[]>([]);
  const [topPerformers, setTopPerformers] = useState<PlayerStats[]>([]);
  const [worstAttackers, setWorstAttackers] = useState<PlayerStats[]>([]);
  const [missedAttackers, setMissedAttackers] = useState<PlayerStats[]>([]);
  const [topDefenders, setTopDefenders] = useState<DefenderStats[]>([]);
  const [worstDefenders, setWorstDefenders] = useState<DefenderStats[]>([]);
  const [warTypeCounts, setWarTypeCounts] = useState<WarTypeCounts>({ random: 0, friendly: 0, cwl: 0 });
  const [dailyStats, setDailyStats] = useState<DailyWarStats[]>([]);
  const [thStats, setTHStats] = useState<THStats[]>([]);

  const [filters, setFilters] = useState({
    clan: "all",
    townHall: "all",
    datePreset: "90d",
    startDate: "",
    endDate: "",
    warTypes: { random: true, friendly: true, cwl: true },
  });

  // Fetch clans and war data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          router.push(`/${params.locale}/login`);
          return;
        }

        // Fetch clans first
        const clansRes = await fetch(`/api/v2/server/${guildId}/clans`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!clansRes.ok) {
          if (clansRes.status === 401) {
            logout();
            router.push(`/${params.locale}/login`);
            return;
          }
          throw new Error("Failed to fetch clans");
        }

        const clansData = await clansRes.json();
        setClans(clansData || []);

        // If we have clans, fetch war data immediately
        if (clansData && clansData.length > 0) {
          await fetchWarDataForClans(clansData, accessToken);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: t('toast.errorTitle'),
          description: t('toast.errorLoadingClans'),
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
  }, [guildId, router, toast]);

  const fetchWarDataForClans = async (clansList: Clan[], token: string) => { // NOSONAR — data-fetching orchestration: parallel API calls + multi-dimension aggregation, inherently complex
    try {
      const clansToFetch = filters.clan === "all"
        ? clansList.map(c => c.tag).filter(tag => tag && tag.trim() !== '')
        : filters.clan && filters.clan !== "all" ? [filters.clan] : [];

      // If no clans to fetch, return early
      if (clansToFetch.length === 0) {
        console.warn('No clans to fetch - clans data might be invalid');
        setLoading(false);
        return;
      }

      // Calculate timestamps from preset or custom dates
      const now = Date.now();
      const presetMs: Record<string, number> = {
        "7d":  7   * 24 * 60 * 60 * 1000,
        "30d": 30  * 24 * 60 * 60 * 1000,
        "90d": 90  * 24 * 60 * 60 * 1000,
        "6m":  180 * 24 * 60 * 60 * 1000,
        "1y":  365 * 24 * 60 * 60 * 1000,
      };
      const startTs = filters.datePreset === "custom" && filters.startDate
        ? Math.floor(new Date(filters.startDate).getTime() / 1000)
        : Math.floor((now - (presetMs[filters.datePreset] ?? presetMs["90d"])) / 1000);
      const endTs = filters.datePreset === "custom" && filters.endDate
        ? Math.floor(new Date(filters.endDate).getTime() / 1000)
        : Math.floor(now / 1000);

      // Fetch war summaries (includes current war + CWL info) and player stats in parallel
      const [warSummaryRes, playerStatsRes, historicalWars] = await Promise.all([
        fetch('/api/v2/war/war-summary', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clan_tags: clansToFetch }),
        }).then(res => res.ok ? res.json() : { items: [] }),

        fetchPlayerStats(clansToFetch, token, startTs, endTs),

        // Fetch historical wars for statistics
        Promise.all(
          clansToFetch.map(tag =>
            fetch(`/api/v2/war/${encodeURIComponent(tag)}/previous?timestamp_start=${startTs}&timestamp_end=${endTs}&limit=100&include_cwl=${filters.warTypes.cwl}`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(res => res.ok ? res.json() : { items: [] })
          )
        )
      ]);

      // Combine historical wars, filtering by selected war types
      const allHistoricalWars: War[] = historicalWars.flatMap(result => result.items || []).filter(war => {
        const isCwl = !!war.tag;
        const isFriendly = war.type === 'friendly' || war.warType === 'friendly';
        const isRandom = !isCwl && !isFriendly;
        if (isCwl && !filters.warTypes.cwl) return false;
        if (isFriendly && !filters.warTypes.friendly) return false;
        if (isRandom && !filters.warTypes.random) return false;
        return true;
      });

      // Calculate clan stats
      const statsMap = new Map<string, ComputedClanStats>();

      clansToFetch.forEach((clanTag, index) => {
        const summary = summaries.find(s => s.clan_tag === clanTag || s.war_info?.clan?.tag === clanTag);
        const clanWars = (historicalWars[index]?.items || []) as War[];
        const clanName = clansList.find(c => c.tag === clanTag)?.name || clanTag;

        let wins = 0, losses = 0, draws = 0;
        let totalStars = 0, totalAttacks = 0, totalOpponentStars = 0, totalOpponentAttacks = 0, totalDestruction = 0;

        // Calculate from historical wars
        clanWars.forEach(war => {
          if (war.state !== 'warEnded') return;

          const clanStars = war.clan.stars;
          const opponentStars = war.opponent.stars;

          totalStars += clanStars;
          totalAttacks += war.clan.attacks ?? ((war.teamSize ?? war.team_size ?? 0) * (war.attacksPerMember ?? 2));
          totalOpponentStars += war.opponent.stars;
          totalOpponentAttacks += war.opponent.attacks ?? ((war.teamSize ?? war.team_size ?? 0) * (war.attacksPerMember ?? 2));
          totalDestruction += (war.clan.destructionPercentage ?? war.clan.destruction) ?? 0;

          if (clanStars > opponentStars) wins++;
          else if (clanStars < opponentStars) losses++;
          else draws++;
        });

        const totalWars = wins + losses + draws;

        statsMap.set(clanTag, {
          clan_tag: clanTag,
          clan_name: clanName,
          total_wars: totalWars,
          wins,
          losses,
          draws,
          win_rate: totalWars > 0 ? wins / totalWars : 0,
          avg_stars_per_attack: totalAttacks > 0 ? totalStars / totalAttacks : 0,
          avg_defense_stars: totalOpponentAttacks > 0 ? totalOpponentStars / totalOpponentAttacks : 0,
          avg_destruction: totalWars > 0 ? totalDestruction / totalWars : 0,
          current_war: summary?.war_info || null,
          is_in_war: summary?.isInWar || false,
          is_in_cwl: summary?.isInCwl || false,
        });
      });

      setClanStats(Array.from(statsMap.values()));

      // Calculate daily stats from all historical wars
      calculateDailyStats(allHistoricalWars);

      // Compute war type distribution from historical wars
      const counts: WarTypeCounts = { random: 0, friendly: 0, cwl: 0 };
      allHistoricalWars.forEach(war => {
        if (war.state !== 'warEnded') return;
        if (war.tag) counts.cwl++;
        else if (war.type === 'friendly' || war.warType === 'friendly') counts.friendly++;
        else counts.random++;
      });
      setWarTypeCounts(counts);

      // Top performers — sorted by avg stars per attack
      const topByStars = [...playerStatsRes]
        .filter(p => (p.stats?.attacks ?? 0) > 0)
        .sort((a, b) => {
          const starDiff = (b.stats?.avg_stars ?? 0) - (a.stats?.avg_stars ?? 0);
          return starDiff !== 0 ? starDiff : (b.stats?.attacks ?? 0) - (a.stats?.attacks ?? 0);
        })
        .slice(0, 20);
      setTopPerformers(topByStars);

      // Missed attackers — sorted by total missed attacks desc
      const missed = [...playerStatsRes]
        .filter(p => (p.missed?.all ?? 0) > 0)
        .sort((a, b) => (b.missed?.all ?? 0) - (a.missed?.all ?? 0))
        .slice(0, 20);
      setMissedAttackers(missed);

      // Top defenders — from playerStatsRes.defense (computed backend-side)
      const topDefs = [...playerStatsRes]
        .filter(p => (p.defense?.defenses ?? 0) > 0)
        .sort((a, b) => {
          const starDiff = (a.defense?.avg_stars_given ?? 999) - (b.defense?.avg_stars_given ?? 999);
          return starDiff !== 0 ? starDiff : (b.defense?.defenses ?? 0) - (a.defense?.defenses ?? 0);
        })
        .slice(0, 20)
        .map(p => ({
          tag: p.tag,
          name: p.name,
          townhall: p.townhall,
          defenses: p.defense!.defenses,
          avg_stars_given: p.defense!.avg_stars_given,
        }));
      setTopDefenders(topDefs);

      // Worst attackers — lowest avg stars, min 3 attacks to filter noise
      const worstByStars = [...playerStatsRes]
        .filter(p => (p.stats?.attacks ?? 0) >= 3)
        .sort((a, b) => {
          const starDiff = (a.stats?.avg_stars ?? 0) - (b.stats?.avg_stars ?? 0);
          return starDiff !== 0 ? starDiff : (b.stats?.attacks ?? 0) - (a.stats?.attacks ?? 0);
        })
        .slice(0, 20);
      setWorstAttackers(worstByStars);

      // Worst defenders — highest avg stars given up, min 3 defenses
      const worstDefs = [...playerStatsRes]
        .filter(p => (p.defense?.defenses ?? 0) >= 3)
        .sort((a, b) => {
          const starDiff = (b.defense?.avg_stars_given ?? 0) - (a.defense?.avg_stars_given ?? 0);
          return starDiff !== 0 ? starDiff : (b.defense?.defenses ?? 0) - (a.defense?.defenses ?? 0);
        })
        .slice(0, 20)
        .map(p => ({
          tag: p.tag,
          name: p.name,
          townhall: p.townhall,
          defenses: p.defense!.defenses,
          avg_stars_given: p.defense!.avg_stars_given,
        }));
      setWorstDefenders(worstDefs);

      // Calculate TH stats from player data
      calculateTHStats(playerStatsRes);

    } catch (error) {
      console.error("Error fetching war data:", error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorLoadingWarData'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerStats = async (clanTags: string[], token: string, startTs: number, endTs: number): Promise<PlayerStats[]> => {
    try {
      const params = new URLSearchParams();
      clanTags.forEach(tag => params.append('clan_tags', tag));
      params.append('timestamp_start', startTs.toString());
      params.append('timestamp_end', endTs.toString());

      if (filters.townHall !== "all") {
        params.append('townhall_filter', `${filters.townHall}v*`);
      }
      const warTypesInt = (filters.warTypes.random ? 1 : 0) + (filters.warTypes.friendly ? 2 : 0) + (filters.warTypes.cwl ? 4 : 0);
      if (warTypesInt !== 7) params.append('war_types', warTypesInt.toString());

      const res = await fetch(`/api/v2/war/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        return data.items || [] as PlayerStats[];
      }
    } catch (error) {
      console.error("Error fetching player stats:", error);
    }
    return [];
  };

  const calculateDailyStats = (allWars: War[]) => {
    // Aggregate ended wars by ISO week (Monday-based)
    const weekMap = new Map<string, DailyWarStats>();

    const getWeekKey = (date: Date): string => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      // Shift to Monday
      const day = d.getDay();
      d.setDate(d.getDate() - ((day + 6) % 7));
      return d.toISOString().split('T')[0];
    };

    allWars.forEach(war => {
      if (war.state !== 'warEnded' || (!war.endTime && !war.end_time)) return;

      const rawDate = war.endTime || war.end_time!;
      const normalized = /^\d{8}T/.test(rawDate)
        ? rawDate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
        : rawDate;
      const parsed = new Date(normalized);
      if (isNaN(parsed.getTime())) return;

      const weekKey = getWeekKey(parsed);
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { date: weekKey, wins: 0, losses: 0, draws: 0 });
      }
      const stats = weekMap.get(weekKey)!;
      if (war.clan.stars > war.opponent.stars) stats.wins++;
      else if (war.clan.stars < war.opponent.stars) stats.losses++;
      else stats.draws++;
    });

    const sorted = Array.from(weekMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-13);

    setDailyStats(sorted);
  };

  const calculateTHStats = (playerStats: PlayerStats[]) => {
    const thMap = new Map<number, { attacks: number, threeStars: number }>();

    playerStats.forEach(player => {
      if (!player.townhall) return;

      const existing = thMap.get(player.townhall) || { attacks: 0, threeStars: 0 };
      existing.attacks += player.stats?.attacks ?? 0;
      existing.threeStars += player.stats?.three_stars ?? 0;
      thMap.set(player.townhall, existing);
    });

    const thStatsArray = Array.from(thMap.entries())
      .map(([th, data]) => ({
        th: `TH${th}`,
        success: data.attacks > 0 ? Math.round((data.threeStars / data.attacks) * 100) : 0,
        failed: data.attacks > 0 ? Math.round(((data.attacks - data.threeStars) / data.attacks) * 100) : 0,
      }))
      .filter(stat => stat.success + stat.failed > 0)
      .sort((a, b) => parseInt(b.th.slice(2)) - parseInt(a.th.slice(2)))
      .slice(0, 5);

    setTHStats(thStatsArray);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleApplyFilters = async () => {
    if (clans.length === 0) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorNoClans'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        await fetchWarDataForClans(clans, accessToken);
      }
    } catch (error) {
      console.error("Error applying filters:", error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorApplyingFilters'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const totalWins = clanStats.reduce((sum, stat) => sum + stat.wins, 0);
  const totalLosses = clanStats.reduce((sum, stat) => sum + stat.losses, 0);
  const totalDraws = clanStats.reduce((sum, stat) => sum + stat.draws, 0);
  const totalWars = clanStats.reduce((sum, stat) => sum + stat.total_wars, 0);
  const overallWinRate = totalWars > 0 ? ((totalWins / totalWars) * 100).toFixed(1) : "0.0";

  // Count active wars
  const activeWars = clanStats.filter(s => s.is_in_war).length;
  const activeCwl = clanStats.filter(s => s.is_in_cwl).length;

  // Prepare daily chart data
  const dailyChartData = dailyStats.map(day => ({
    name: new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    wins: day.wins,
    losses: day.losses,
    draws: day.draws,
  }));

  const totalWarTypeCount = warTypeCounts.random + warTypeCounts.friendly + warTypeCounts.cwl;
  const warTypeDistribution = totalWarTypeCount > 0 ? [
    { name: t('charts.warTypeDistribution.random'), value: warTypeCounts.random, color: "#FAA81A" },
    { name: t('charts.warTypeDistribution.cwl'), value: warTypeCounts.cwl, color: clashKingColors.primary },
    { name: t('charts.warTypeDistribution.friendly'), value: warTypeCounts.friendly, color: "#3BA55D" },
  ].filter(e => e.value > 0) : [];


  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <Swords className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
                <p className="text-muted-foreground mt-1">
                  {t('description')}
                </p>
              </div>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90 w-full md:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {t('actions.exportData')}
          </Button>
        </div>

        {/* WAR STATISTICS */}
        <div className="space-y-6">
            {/* Filters Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      {t('filters.title')}
                    </CardTitle>
                    <CardDescription>{t('filters.description')}</CardDescription>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" onClick={() => {
                      setFilters({ clan: "all", townHall: "all", datePreset: "90d", startDate: "", endDate: "", warTypes: { random: true, friendly: true, cwl: true } });
                    }} className="flex-1 md:flex-none">
                      {t('actions.resetFilters')}
                    </Button>
                    <Button size="sm" onClick={handleApplyFilters} disabled={loading} className="flex-1 md:flex-none">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('actions.applyFilters')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="clan-filter">{t('filters.clan')}</Label>
                    <Select value={filters.clan} onValueChange={(value) => handleFilterChange("clan", value)}>
                      <SelectTrigger id="clan-filter">
                        <SelectValue placeholder={t('filters.clan')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('filters.allClans')}</SelectItem>
                        {clans.map((clan) => (
                          <SelectItem key={clan.tag} value={clan.tag}>
                            {clan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="th-filter">{t('filters.townHall')}</Label>
                    <Select value={filters.townHall} onValueChange={(value) => handleFilterChange("townHall", value)}>
                      <SelectTrigger id="th-filter">
                        <SelectValue placeholder={t('filters.townHall')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('filters.allTownHalls')}</SelectItem>
                        {[18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8].map((th) => (
                          <SelectItem key={th} value={th.toString()}>
                            {t('filters.townHallLevel', { level: th })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-preset">{t('filters.period')}</Label>
                    <Select value={filters.datePreset} onValueChange={(value) => handleFilterChange("datePreset", value)}>
                      <SelectTrigger id="date-preset">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">{t('filters.last7Days')}</SelectItem>
                        <SelectItem value="30d">{t('filters.last30Days')}</SelectItem>
                        <SelectItem value="90d">{t('filters.last90Days')}</SelectItem>
                        <SelectItem value="6m">{t('filters.last6Months')}</SelectItem>
                        <SelectItem value="1y">{t('filters.lastYear')}</SelectItem>
                        <SelectItem value="custom">{t('filters.custom')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('filters.warTypes')}</Label>
                    <div className="flex flex-col gap-1.5">
                      {(['random', 'friendly', 'cwl'] as const).map(type => (
                        <div key={type} className="flex items-center gap-2">
                          <Checkbox
                            id={`wt-${type}`}
                            checked={filters.warTypes[type]}
                            onCheckedChange={(checked) =>
                              setFilters({ ...filters, warTypes: { ...filters.warTypes, [type]: !!checked } })
                            }
                          />
                          <label htmlFor={`wt-${type}`} className="text-sm cursor-pointer select-none">
                            {t(`charts.warTypeDistribution.${type}`)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {filters.datePreset === "custom" && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">{t('filters.startDate')}</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange("startDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date">{t('filters.endDate')}</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange("endDate", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {loading && clanStats.length === 0 ? (
                <>
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-3">
                      <Skeleton className="h-4 w-24 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-9 w-16 animate-pulse" />
                        <Skeleton className="h-8 w-8 animate-pulse" />
                      </div>
                      <Skeleton className="h-3 w-28 mt-2 animate-pulse" />
                    </CardContent>
                  </Card>
                  <Card className="border-red-500/30 bg-red-500/5">
                    <CardHeader className="pb-3">
                      <Skeleton className="h-4 w-28 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-9 w-16 animate-pulse" />
                        <Skeleton className="h-8 w-8 animate-pulse" />
                      </div>
                      <Skeleton className="h-3 w-20 mt-2 animate-pulse" />
                    </CardContent>
                  </Card>
                  <Card className="border-yellow-500/30 bg-yellow-500/5">
                    <CardHeader className="pb-3">
                      <Skeleton className="h-4 w-20 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-9 w-16 animate-pulse" />
                        <Skeleton className="h-8 w-8 animate-pulse" />
                      </div>
                      <Skeleton className="h-3 w-32 mt-2 animate-pulse" />
                    </CardContent>
                  </Card>
                  <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardHeader className="pb-3">
                      <Skeleton className="h-4 w-24 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-9 w-12 animate-pulse" />
                        <Skeleton className="h-8 w-8 animate-pulse" />
                      </div>
                      <Skeleton className="h-3 w-24 mt-2 animate-pulse" />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{t('summaryStats.totalWins')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-green-500">{totalWins}</div>
                        <Trophy className="h-8 w-8 text-green-500/50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('summaryStats.totalWinsDesc', { totalWars })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-red-500/30 bg-red-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{t('summaryStats.totalLosses')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-primary">{totalLosses}</div>
                        <Shield className="h-8 w-8 text-primary/50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('summaryStats.totalLossesDesc', { totalDraws })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-yellow-500/30 bg-yellow-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{t('summaryStats.winRate')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-yellow-500">{overallWinRate}%</div>
                        <TrendingUp className="h-8 w-8 text-yellow-500/50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('summaryStats.winRateDesc')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{t('summaryStats.activeWars')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-blue-500">{activeWars}</div>
                        <Star className="h-8 w-8 text-blue-500/50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('summaryStats.activeWarsDesc', { activeCwl })}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-6 lg:grid-cols-2">
              {loading && clanStats.length === 0 ? (
                <>
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <Skeleton className="h-6 w-48 animate-pulse" />
                      <Skeleton className="h-4 w-64 mt-2 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-64 w-full animate-pulse" />
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <Skeleton className="h-6 w-56 animate-pulse" />
                      <Skeleton className="h-4 w-48 mt-2 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-64 w-full animate-pulse" />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle>{t('charts.dailyPerformance.title')}</CardTitle>
                      <CardDescription>{t('charts.dailyPerformance.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkTheme.border.primary} />
                          <XAxis dataKey="name" stroke={darkTheme.text.secondary} />
                          <YAxis stroke={darkTheme.text.secondary} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkTheme.background.elevated,
                              border: `1px solid ${darkTheme.border.primary}`,
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="wins" fill="#3BA55D" name={t('charts.dailyPerformance.wins')} />
                          <Bar dataKey="losses" fill="#ED4245" name={t('charts.dailyPerformance.losses')} />
                          <Bar dataKey="draws" fill="#FAA81A" name={t('charts.dailyPerformance.draws')} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle>{t('charts.thSuccessRate.title')}</CardTitle>
                      <CardDescription>{t('charts.thSuccessRate.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={thStats} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke={darkTheme.border.primary} />
                          <XAxis type="number" stroke={darkTheme.text.secondary} />
                          <YAxis dataKey="th" type="category" stroke={darkTheme.text.secondary} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkTheme.background.elevated,
                              border: `1px solid ${darkTheme.border.primary}`,
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="success" fill="#3BA55D" name={t('charts.thSuccessRate.threeStarPercent')} stackId="a" />
                          <Bar dataKey="failed" fill="#ED4245" name={t('charts.thSuccessRate.otherPercent')} stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Charts Row 2: War Type Distribution + Missed Attacks */}
            <div className="grid gap-6 lg:grid-cols-2">
              {loading && clanStats.length === 0 ? (
                <>
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <Skeleton className="h-6 w-40 animate-pulse" />
                      <Skeleton className="h-4 w-56 mt-2 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-64 w-full animate-pulse" />
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <Skeleton className="h-6 w-36 animate-pulse" />
                      <Skeleton className="h-4 w-48 mt-2 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-8 w-8 rounded-full animate-pulse" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-32 animate-pulse" />
                              <Skeleton className="h-3 w-24 animate-pulse" />
                            </div>
                            <Skeleton className="h-6 w-20 animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle>{t('charts.warTypeDistribution.title')}</CardTitle>
                      <CardDescription>{t('charts.warTypeDistribution.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {warTypeDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={warTypeDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: ${value} (${totalWarTypeCount > 0 ? Math.round(value / totalWarTypeCount * 100) : 0}%)`}
                              outerRadius={90}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {warTypeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: darkTheme.background.elevated,
                                border: `1px solid ${darkTheme.border.primary}`,
                                borderRadius: '8px',
                              }}
                              formatter={(value, name) => [`${value ?? 0} wars`, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-muted-foreground py-8 h-[300px] flex items-center justify-center">
                          {t('charts.topPerformers.noData')}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle>{t('charts.missedAttacks.title')}</CardTitle>
                      <CardDescription>{t('charts.missedAttacks.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {missedAttackers.length > 0 ? (
                        <div className="overflow-y-auto max-h-[340px] pr-1 space-y-4">
                          {missedAttackers.map((player, index) => (
                            <div key={player.tag ?? index} className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${
                                index === 0 ? 'bg-red-500/20 text-red-500' :
                                index === 1 ? 'bg-orange-500/20 text-orange-500' :
                                'bg-gray-600/20 text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground truncate">{player.name}</div>
                                <div className="text-xs text-muted-foreground">TH{player.townhall}</div>
                              </div>
                              <Badge variant="secondary" className="bg-red-500/20 text-red-500 border-red-500/30 shrink-0">
                                -{player.missed?.all ?? 0}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8 h-[300px] flex items-center justify-center">
                          {t('charts.topPerformers.noData')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Top Performers + Top Defenders side by side */}
            {!loading && (topPerformers.length > 0 || topDefenders.length > 0) && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>{t('charts.topPerformers.title')}</CardTitle>
                    <CardDescription>{t('charts.topPerformers.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topPerformers.length > 0 ? (
                      <div className="overflow-y-auto max-h-[340px] pr-1 space-y-4">
                        {topPerformers.map((player, index) => (
                          <div key={player.tag ?? index} className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                              index === 1 ? 'bg-gray-400/20 text-muted-foreground' :
                              index === 2 ? 'bg-orange-500/20 text-orange-500' :
                              'bg-gray-600/20 text-gray-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate">{player.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {t('charts.topPerformers.attacksAndStars', { attacks: player.stats?.attacks ?? 0, stars: player.stats?.stars ?? 0 })}
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30 shrink-0">
                              {(player.stats?.avg_stars ?? 0).toFixed(2)}★
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {t('charts.topPerformers.noData')}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>{t('charts.topDefenders.title')}</CardTitle>
                    <CardDescription>{t('charts.topDefenders.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topDefenders.length > 0 ? (
                      <div className="overflow-y-auto max-h-[340px] pr-1 space-y-4">
                        {topDefenders.map((player, index) => (
                          <div key={player.tag} className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                              index === 1 ? 'bg-gray-400/20 text-muted-foreground' :
                              index === 2 ? 'bg-orange-500/20 text-orange-500' :
                              'bg-gray-600/20 text-gray-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate">{player.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {t('charts.topDefenders.defensesAndStars', { defenses: player.defenses, stars: Math.round(player.defenses * player.avg_stars_given) })}
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 border-blue-500/30 shrink-0">
                              {player.avg_stars_given.toFixed(2)}★
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {t('charts.topDefenders.noData')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Worst Attackers + Worst Defenders side by side */}
            {!loading && (worstAttackers.length > 0 || worstDefenders.length > 0) && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>{t('charts.worstAttackers.title')}</CardTitle>
                    <CardDescription>{t('charts.worstAttackers.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {worstAttackers.length > 0 ? (
                      <div className="overflow-y-auto max-h-[340px] pr-1 space-y-4">
                        {worstAttackers.map((player, index) => (
                          <div key={player.tag ?? index} className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 bg-gray-600/20 text-gray-500">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate">{player.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {t('charts.worstAttackers.attacksAndStars', { attacks: player.stats?.attacks ?? 0, stars: player.stats?.stars ?? 0 })}
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-red-500/20 text-red-500 border-red-500/30 shrink-0">
                              {(player.stats?.avg_stars ?? 0).toFixed(2)}★
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {t('charts.worstAttackers.noData')}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>{t('charts.worstDefenders.title')}</CardTitle>
                    <CardDescription>{t('charts.worstDefenders.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {worstDefenders.length > 0 ? (
                      <div className="overflow-y-auto max-h-[340px] pr-1 space-y-4">
                        {worstDefenders.map((player, index) => (
                          <div key={player.tag} className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 bg-gray-600/20 text-gray-500">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate">{player.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {t('charts.worstDefenders.defensesAndStars', { defenses: player.defenses, stars: Math.round(player.defenses * player.avg_stars_given) })}
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-red-500/20 text-red-500 border-red-500/30 shrink-0">
                              {player.avg_stars_given.toFixed(2)}★
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {t('charts.worstDefenders.noData')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Clan Stats Table */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t('clanStatsTable.title')}</CardTitle>
                <CardDescription>{t('clanStatsTable.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && clanStats.length === 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.clan')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.status')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.wars')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.record')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.winRate')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.avgStarsPerAttack')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.avgDefenseStars')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.avgDestruction')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-32 animate-pulse mb-1" />
                              <Skeleton className="h-3 w-24 animate-pulse" />
                            </td>
                            <td className="text-center py-3 px-4">
                              <Skeleton className="h-6 w-16 mx-auto animate-pulse" />
                            </td>
                            <td className="text-center py-3 px-4">
                              <Skeleton className="h-4 w-12 mx-auto animate-pulse" />
                            </td>
                            <td className="text-center py-3 px-4">
                              <Skeleton className="h-4 w-20 mx-auto animate-pulse" />
                            </td>
                            <td className="text-center py-3 px-4">
                              <Skeleton className="h-4 w-16 mx-auto animate-pulse" />
                            </td>
                            <td className="text-center py-3 px-4">
                              <Skeleton className="h-4 w-12 mx-auto animate-pulse" />
                            </td>
                            <td className="text-center py-3 px-4">
                              <Skeleton className="h-4 w-12 mx-auto animate-pulse" />
                            </td>
                            <td className="text-center py-3 px-4">
                              <Skeleton className="h-4 w-16 mx-auto animate-pulse" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : clanStats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.clan')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.status')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.wars')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.record')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.winRate')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.avgStarsPerAttack')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.avgDefenseStars')}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{t('clanStatsTable.headers.avgDestruction')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clanStats.map((stat) => (
                          <tr key={stat.clan_tag} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">{stat.clan_name}</div>
                              <div className="text-xs text-muted-foreground">{stat.clan_tag}</div>
                            </td>
                            <td className="text-center py-3 px-4">
                              {stat.is_in_war && (
                                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                  {t('clanStatsTable.status.inWar')}
                                </Badge>
                              )}
                              {stat.is_in_cwl && !stat.is_in_war && (
                                <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                                  {t('clanStatsTable.status.cwl')}
                                </Badge>
                              )}
                              {!stat.is_in_war && !stat.is_in_cwl && (
                                <Badge variant="secondary">
                                  {t('clanStatsTable.status.peace')}
                                </Badge>
                              )}
                            </td>
                            <td className="text-center py-3 px-4 text-foreground">{stat.total_wars}</td>
                            <td className="text-center py-3 px-4">
                              <span className="text-green-500">{stat.wins}</span>
                              <span className="text-muted-foreground"> / </span>
                              <span className="text-red-500">{stat.losses}</span>
                              <span className="text-muted-foreground"> / </span>
                              <span className="text-yellow-500">{stat.draws}</span>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge variant="secondary" className={
                                stat.win_rate >= 0.7 ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                                stat.win_rate >= 0.5 ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                                'bg-red-500/20 text-red-500 border-red-500/30'
                              }>
                                {(stat.win_rate * 100).toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-4 text-foreground">{stat.avg_stars_per_attack.toFixed(2)}</td>
                            <td className="text-center py-3 px-4">
                              <span className={
                                stat.avg_defense_stars <= 1.5 ? 'text-green-500' :
                                stat.avg_defense_stars <= 2.2 ? 'text-yellow-500' :
                                'text-red-500'
                              }>{stat.avg_defense_stars.toFixed(2)}</span>
                            </td>
                            <td className="text-center py-3 px-4 text-foreground">{stat.avg_destruction.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    {t('clanStatsTable.noData')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
      </div>
    </div>
  );
}
