"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardEndpoints, ServerAnalyticsEndpoint } from "@clashking/api-contracts";
import { useLocale, useTranslations } from "use-intl";
import { ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";
import Image from "@/components/app-image";
import Link from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuildId, dashboardHref } from "@/lib/dashboard-route";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { townHallImageUrl } from "@/lib/clash-asset-urls";
import { playerLeagueImageUrl } from "@/lib/clash-asset-urls";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { cn } from "@/lib/utils";
import { cwlLeague, heatmapCells, metricColors, nextDay, presetRange, rankedPlayers, resourceArtwork, townHallComposition, utcDate, activityValue, type ActivityMetric, type AnalyticsReport, type Metric } from "./analytics-model";
import { FarmingPanel } from "./farming-panel";
import { PaginatedList } from "./paginated-list";

const control = "h-10 rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5";
const surface = "min-w-0 rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-6";
const progressArtwork: Record<number,string> = {1:"https://assets.clashk.ing/bot/icons/troop.png",3:"https://assets.clashk.ing/heroes/barbarian_king/icon.webp",4:"https://assets.clashk.ing/bot/icons/spells.png",5:"https://assets.clashk.ing/bot/icons/pet_paw.png",6:"https://assets.clashk.ing/bot/icons/equipment_anvil.webp",7:townHallImageUrl(18)};
const progressTypes: Record<number,string> = {1:"troops",3:"heroes",4:"spells",5:"pets",6:"equipment",7:"townHalls"};

export default function AnalyticsPage() {
  const t = useTranslations("analytics"), locale = useLocale(), guildId = useGuildId(), router = useRouter(), search = useSearchParams();
  const {canView} = useDashboardAccess();
  const preset = search.get("period") ?? "month", fallback = presetRange(["month","30","90","180"].includes(preset) ? preset : "month");
  const start = search.get("start") ?? fallback.start, end = search.get("end") ?? fallback.end;
  const selected = search.get("clans") ?? "";
  const [playerSearch,setPlayerSearch] = useState("");
  const [day,setDay] = useState<string | null>(null), [metric,setMetric] = useState<ActivityMetric>("totalLoot");
  const [selectedPlayer, setSelectedPlayer] = useState<AnalyticsReport["players"][number] | null>(null);
  const fmt = (value: number) => new Intl.NumberFormat(locale).format(value);
  const compact = (value: number) => new Intl.NumberFormat(locale,{notation:"compact",maximumFractionDigits:1}).format(value);
  const date = (value: string) => new Intl.DateTimeFormat(locale,{month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));
  const setFilters = (values: Record<string,string | null>) => {
    const params = new URLSearchParams(search); for (const [key,value] of Object.entries(values)) if (value === null) params.delete(key); else params.set(key,value);
    router.replace(dashboardHref("analytics",guildId,params)); setDay(null);
  };
  const guild = useQuery({queryKey:["analytics-guild",guildId],enabled:!!guildId,queryFn:({signal}) => executeSharedEndpoint(dashboardEndpoints.dashboardGuild,{path:{guildId},query:{},body:{}},{signal}),staleTime:300_000,retry:0});
  const query = {start,end,...(selected ? {clans:selected} : {})};
  const report = useQuery({queryKey:["analytics",guildId,query],enabled:!!guildId,queryFn:({signal}) => executeSharedEndpoint(ServerAnalyticsEndpoint,{path:{serverId:guildId},query,body:{}},{signal}),staleTime:60_000,retry:1});
  const family = useQuery({queryKey:["analytics",guildId,{start,end}],enabled:!!guildId && !!selected,
    queryFn:({signal}) => executeSharedEndpoint(ServerAnalyticsEndpoint,{path:{serverId:guildId},query:{start,end},body:{}},{signal}),staleTime:60_000,retry:1});
  const detail = useQuery({queryKey:["analytics-day",guildId,day,selected],enabled:!!guildId && !!day,
    queryFn:({signal}) => executeSharedEndpoint(ServerAnalyticsEndpoint,{path:{serverId:guildId},query:{start:day!,end:nextDay(day!),...(selected ? {clans:selected} : {})},body:{}},{signal}),staleTime:60_000,retry:1});
  const links = useQuery({queryKey:["analytics-links",guildId],enabled:!!guildId && canView("links"),
    queryFn:({signal}) => executeSharedEndpoint(dashboardEndpoints.serverLinks,{path:{serverId:guildId},query:{limit:1},body:{}},{signal}),staleTime:60_000,retry:0});
  const data = report.data;
  const current = useMemo(() => data?.players.filter(player => player.currentMember) ?? [],[data]);
  const composition = useMemo(() => townHallComposition(data?.players ?? []),[data]);
  const clanName = (tag: string) => data?.clans.find(clan => clan.tag === tag)?.name ?? tag;
  const metricLabel = (key: ActivityMetric) => key === "totalLoot" ? t("totalLoot") : t(`metrics.${key}`);
  const chosen: ActivityMetric = metric;
  const selectDay = (value: string) => {setMetric(chosen);setDay(value);};
  const players = rankedPlayers(data?.players ?? [],chosen).filter(player => player.name.toLowerCase().includes(playerSearch.toLowerCase()));

  function LootGrid() {
    const cells = heatmapCells(data?.days ?? []), maximum = Math.max(1,...(data?.days.map(row => activityValue(row.metrics, chosen)) ?? []));
    return <section className={surface}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{metricLabel(chosen)}</h2><p className="mt-1 text-xs text-muted-foreground">{t("calendarHint")}</p></div><span className="text-2xl font-semibold tabular-nums">{compact(data ? activityValue(data.totals, chosen) : 0)}</span></div>
      <div className="min-w-0 max-w-full overflow-x-auto pb-2"><div className="grid min-w-max grid-flow-col gap-1.5" style={{gridTemplateRows:"repeat(7, 16px)",gridTemplateColumns:`repeat(${Math.ceil(cells.length/7)}, minmax(16px, 1fr))`}}>
        {cells.map((cell,index) => cell ? <button key={cell.day} title={`${date(cell.day)} · ${fmt(activityValue(cell.metrics, chosen))} ${metricLabel(chosen)}`} aria-label={`${date(cell.day)}: ${fmt(activityValue(cell.metrics, chosen))} ${metricLabel(chosen)}`}
          onClick={() => selectDay(cell.day)} onKeyDown={event => {const shift = {ArrowDown:1,ArrowUp:-1,ArrowRight:7,ArrowLeft:-7}[event.key];if(shift!==undefined){event.preventDefault();(event.currentTarget.parentElement?.children[index+shift] as HTMLElement | undefined)?.focus();}}}
          className="h-4 min-w-4 rounded-[4px] ring-offset-background transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
          style={{background:activityValue(cell.metrics, chosen) ? metricColors[chosen === "totalLoot" ? "gold" : chosen] : "var(--muted)",opacity:activityValue(cell.metrics, chosen) ? 0.25+0.75*Math.sqrt(activityValue(cell.metrics, chosen)/maximum) : 1}}/> : <span key={`blank-${index}`} />)}
      </div></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{date(start)} — {date(utcDate(new Date(Date.parse(end)-86_400_000)))}</span><div className="flex items-center gap-1.5"><span className="mr-1">{t("less")}</span>{[0.2,0.4,0.6,0.8,1].map(opacity => <span key={opacity} className="h-3 w-3 rounded-sm" style={{background:metricColors[chosen === "totalLoot" ? "gold" : chosen],opacity}}/>)}<span className="ml-1">{t("more")}</span></div></div>
    </section>;
  }
  function PlayerRows({rows, keyMetric, offset=0, limit=10}: {rows: AnalyticsReport["players"];keyMetric: ActivityMetric;offset?:number;limit?:number}) {
    return <div className="space-y-2">{rows.length ? rows.slice(offset,offset+limit).map((player,index) => <div key={player.tag} className="flex items-center gap-3 rounded-2xl bg-muted/35 px-4 py-3">
      <span className="w-5 text-xs tabular-nums text-muted-foreground">{offset+index+1}</span>{player.townHall>0 && <Image src={townHallImageUrl(player.townHall)} alt={`Town Hall ${player.townHall}`} width={32} height={32} className="h-8 w-8 object-contain"/>}
      <div className="min-w-0 flex-1"><button onClick={()=>{setDay(null);setSelectedPlayer(player);}} className="block max-w-full truncate text-left text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-ring">{player.name}</button><p className="truncate text-xs text-muted-foreground">{clanName(player.clanTag)}{!player.currentMember ? ` · ${t("formerMember")}` : ""}</p></div>
      <span className="text-sm font-semibold tabular-nums">{fmt(activityValue(player.metrics, keyMetric))}</span>
    </div>) : <p className="rounded-2xl bg-muted/35 p-5 text-sm text-muted-foreground">{t("noEvents")}</p>}</div>;
  }
  function ClanRows() {
    return <section><h2 className="mb-4 text-lg font-semibold">{t("clanComparison")}</h2><div className="space-y-3">{(family.data ?? data)?.clans.map(clan => <div key={clan.tag} className={cn(surface,"grid grid-cols-2 items-center gap-4 !py-4 @xl/dashboard:grid-cols-3 @5xl/dashboard:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))]", selected===clan.tag&&"bg-muted/55")}>
      <button onClick={()=>setFilters({clans:selected===clan.tag?null:clan.tag})} aria-pressed={selected===clan.tag} className="col-span-2 flex min-w-0 items-center gap-3 rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring @xl/dashboard:col-span-3 @5xl/dashboard:col-span-1">
        <Image src={clan.badge} alt="" width={44} height={44} className="h-11 w-11 shrink-0 object-contain"/><div className="min-w-0"><p className="truncate font-semibold hover:underline">{clan.name}</p><p className="mt-1 text-xs text-muted-foreground">{t("memberCount",{count:clan.members})}</p></div>
      </button>
      {(["active","donated","gold"] as Metric[]).map(key => <div key={key} className="min-w-0"><div className="text-xs leading-5 text-muted-foreground">{metricLabel(key)}</div><div className="mt-1 text-sm font-semibold tabular-nums">{compact(clan.metrics[key])}</div></div>)}
      <div className="min-w-0"><div className="text-xs leading-5 text-muted-foreground">{t("lifetimeWins")}</div><div className="mt-1 text-sm font-semibold tabular-nums">{fmt(clan.warWins)}</div></div>
      <div className="min-w-0"><div className="text-xs leading-5 text-muted-foreground">{t("winStreak")}</div><div className="mt-1 text-sm font-semibold tabular-nums">{fmt(clan.warWinStreak)}</div></div>
    </div>)}</div></section>;
  }

  return <div className="min-h-screen min-w-0 p-4 md:p-6"><main className="mx-auto w-full min-w-0 max-w-[1440px] space-y-6 pb-12">
    <section className="relative isolate min-w-0 overflow-hidden rounded-3xl bg-card px-5 py-7 shadow-sm sm:px-7 sm:py-9">
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-800 to-slate-950" style={guild.data?.banner ? { backgroundImage: `url(${JSON.stringify(guild.data.banner)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}/><div className="absolute inset-0 -z-10 bg-black/55"/>
      <div className="flex flex-wrap items-center gap-4 text-white">
        {guild.data?.icon && <Image src={guild.data.icon} alt="" width={64} height={64} className="h-16 w-16 rounded-2xl object-cover"/>}
        <div className="min-w-0 flex-1"><h1 className="break-words text-2xl font-semibold">{guild.data?.name}</h1>{guild.data?.description && <p className="mt-2 max-w-2xl text-sm text-white/80">{guild.data.description}</p>}</div>
        {selected && <Button variant="secondary" className="rounded-full" onClick={()=>setFilters({clans:null})}>{t("allClans")} ←</Button>}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 text-foreground [&_input]:bg-background/95 [&_button]:bg-background/95">
      <Select value={preset} onValueChange={value => {if(value==="custom") setFilters({period:value});else setFilters({...presetRange(value),period:value});}}><SelectTrigger className={cn(control,"w-44")}><SelectValue/></SelectTrigger><SelectContent>{["month","30","90","180","custom"].map(value => <SelectItem key={value} value={value}>{t(`periods.${value}`)}</SelectItem>)}</SelectContent></Select>
      {preset==="custom" && <div className="flex flex-wrap items-center gap-2"><Input type="date" aria-label={t("startDate")} value={start} max={utcDate(new Date())} onChange={event => event.target.value&&setFilters({start:event.target.value})} className={cn(control,"w-40")}/><span className="text-muted-foreground">—</span><Input type="date" aria-label={t("endDate")} value={utcDate(new Date(Date.parse(end)-86_400_000))} max={utcDate(new Date())} onChange={event => event.target.value&&setFilters({end:nextDay(event.target.value)})} className={cn(control,"w-40")}/></div>}
      </div>
    </section>
    {report.isError ? <div role="alert" className={surface}><h2 className="font-semibold">{t("loadError")}</h2><p className="mt-2 text-sm text-muted-foreground">{report.error.message}</p><Button className="mt-4" onClick={() => void report.refetch()}>{t("retry")}</Button></div> : !data ? <div className="space-y-4" aria-label={t("loading")}><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[1,2,3,4].map(key => <Skeleton key={key} className="h-36 rounded-3xl"/>)}</div><Skeleton className="h-80 rounded-3xl"/></div> : data.clans.length===0 ? <section className={surface}><h2 className="text-lg font-semibold">{t("noClans")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("noClansHint")}</p><Button asChild className="mt-4"><Link href={dashboardHref("clans",guildId)}>{t("manageClans")}</Link></Button></section> : <>
      <section id="overview" className="space-y-6 scroll-mt-6"><div className="grid gap-3 @xl/dashboard:grid-cols-2 @5xl/dashboard:grid-cols-4">{[[t("membersNow"),current.length],[t("arrivals"),data.movement.arrivals],[t("departures"),data.movement.departures],[t("arrivalsStillHere"),data.movement.arrivalsStillPresent]].map(([label,value]) => <div key={label} className={surface}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p></div>)}</div><p className="text-xs text-muted-foreground">{t("movementHint",{count:data.movement.transfers})}</p><section className={surface}><h2 className="text-lg font-semibold">{t("townHallComposition")}</h2><div className="mt-5 space-y-3">{composition.map(row => <div key={row.level} className="flex items-center gap-4"><Image src={townHallImageUrl(row.level)} alt={`Town Hall ${row.level}`} width={40} height={40} className="h-10 w-10 object-contain"/><span className="text-sm text-muted-foreground">TH{row.level}</span><div className="h-3 flex-1 rounded-full bg-muted"><div className="h-3 rounded-full bg-blue-500/70" style={{width:`${row.count/Math.max(1,current.length)*100}%`}}/></div><span className="w-12 text-right text-sm font-semibold tabular-nums">{row.count}</span></div>)}</div></section><ClanRows/></section>
      <section id="farming" className="space-y-6 scroll-mt-6">
        <FarmingPanel data={data} metric={chosen} onMetricChange={setMetric}/>
        <LootGrid/>
        <section id="progress" className={cn(surface,"scroll-mt-6")}><h2 className="text-lg font-semibold">{t("upgradeBreakdown")}</h2><div className="mt-5 grid gap-4 @xl/dashboard:grid-cols-2 @3xl/dashboard:grid-cols-3">{data.progress.map(row => <div key={row.type}><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Image src={progressArtwork[row.type]} alt="" width={28} height={28} className="h-7 w-7 object-contain" onError={event => { const image = event.currentTarget; if (row.type === 6 && !image.dataset.fallback) { image.dataset.fallback = "true"; image.src = "https://assets.clashk.ing/equipment/giant_gauntlet.webp"; } else image.style.visibility = "hidden"; }}/>{t(`progressTypes.${progressTypes[row.type]}`)}</span><span className="font-semibold tabular-nums">{fmt(row.levels)}</span></div><div className="mt-2 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-pink-500/70" style={{width:`${row.levels/Math.max(1,...data.progress.map(item=>item.levels))*100}%`}}/></div></div>)}</div>{!data.progress.length&&<p className="mt-4 text-sm text-muted-foreground">{t("noEvents")}</p>}</section>
        <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("contributors")}</h2><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input value={playerSearch} onChange={event => setPlayerSearch(event.target.value)} placeholder={t("searchPlayers")} className={cn(control,"pl-9")}/></div></div><PaginatedList key={`${start}:${end}:${selected}:${chosen}:${playerSearch}`} count={players.length}>{(offset,limit)=><PlayerRows rows={players} keyMetric={chosen} offset={offset} limit={limit}/>}</PaginatedList></section>
      </section>
      <section id="members" className="space-y-6 scroll-mt-6"><section><h2 className="mb-4 text-lg font-semibold">{t("recentMovement")}</h2><PaginatedList key={`${start}:${end}:${selected}`} count={data.movements.length}>{(offset,limit)=><div className="space-y-2">{[...data.movements].reverse().slice(offset,offset+limit).map((event,index) => <div key={`${event.tag}-${event.time}-${index}`} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3"><span className={cn("rounded-full p-2",event.type==="join"?"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400":"bg-muted text-muted-foreground")}>{event.type==="join"?<ArrowDownLeft className="h-4 w-4"/>:<ArrowUpRight className="h-4 w-4"/>}</span>{event.townHall>0&&<Image src={townHallImageUrl(event.townHall)} alt={`Town Hall ${event.townHall}`} width={30} height={30} className="h-8 w-8 object-contain"/>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{event.name}</p><p className="text-xs text-muted-foreground">{t(event.type==="join"?"joinedClan":"leftClan",{name:clanName(event.clanTag)})}</p></div><time className="text-xs text-muted-foreground" dateTime={event.time}>{date(event.time.slice(0,10))}</time></div>)}{!data.movements.length&&<p className={cn(surface,"text-sm text-muted-foreground")}>{t("noEvents")}</p>}</div>}</PaginatedList></section></section>
      <section id="competition" className="space-y-6 scroll-mt-6">
        <section className={surface}><h2 className="text-lg font-semibold">{t("cwlTimeline")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("cwlHint")}</p><div className="mt-5 space-y-6">{data.clans.map(clan => {const history=data.cwl.filter(row=>row.clanTag===clan.tag);return <div key={clan.tag}><h3 className="mb-3 text-sm font-semibold">{clan.name}</h3><div className="flex min-w-0 max-w-full gap-3 overflow-x-auto pb-2">{history.length?history.map(row=>{const league=cwlLeague(row.leagueId);return <div key={row.season} className="flex min-w-36 items-center gap-3 rounded-2xl bg-muted/40 p-3">{league&&<Image src={league.artwork} alt={league.name} width={34} height={34} className="h-9 w-9 object-contain"/>}<div><p className="text-xs text-muted-foreground">{row.season}</p><p className="mt-1 text-sm font-semibold">{league?.name??"—"}</p><p className="mt-1 text-xs text-muted-foreground">{t("cwlResult",{stars:row.stars,rank:row.rank??"—"})}</p></div></div>;}):<p className="text-sm text-muted-foreground">{t("noCwl")}</p>}</div></div>;})}</div></section>
        <section><h2 className="mb-4 text-lg font-semibold">{t("officialRankings")}</h2><div className="space-y-2">{data.rankings.length?data.rankings.map(row=><div key={`${row.clanTag}-${row.type}`} className="flex items-center justify-between gap-4 rounded-2xl bg-card px-5 py-4"><div><p className="font-semibold">{clanName(row.clanTag)}</p><p className="mt-1 text-xs text-muted-foreground">{t(`rankingTypes.${row.type}`)}</p></div><div className="text-right"><p className="text-xl font-semibold tabular-nums">#{fmt(row.rank)}</p><p className="mt-1 text-xs text-muted-foreground">{fmt(row.points)} {t("points")}</p></div></div>):<p className={cn(surface,"text-sm text-muted-foreground")}>{t("noRankings")}</p>}</div></section>
      </section>
      {<div className="grid items-start gap-6 @3xl/dashboard:grid-cols-2"><section className={surface}><h2 className="text-lg font-semibold">{t("retentionTitle")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("retentionHint")}</p><p className="mt-5 text-4xl font-semibold tabular-nums">{data.retention.eligible?`${Math.round(data.retention.retained/data.retention.eligible*100)}%`:"—"}</p><p className="mt-2 text-sm text-muted-foreground">{t("retentionCount",{retained:data.retention.retained,eligible:data.retention.eligible,immature:data.retention.immature})}</p></section><section className={surface}><h2 className="text-lg font-semibold">{t("leagueComposition")}</h2><div className="mt-5 flex flex-wrap gap-2">{data.leagues.map(league=><div key={league.id} className="flex items-center gap-2 rounded-2xl bg-muted/45 p-3"><Image src={playerLeagueImageUrl(league.name)} alt={league.name} width={32} height={32} className="h-8 w-8 object-contain"/><div><p className="text-xs text-muted-foreground">{league.name}</p><p className="text-sm font-semibold tabular-nums">{league.count}</p></div></div>)}{!data.leagues.length&&<p className="text-sm text-muted-foreground">{t("noLeagues")}</p>}</div></section></div>}
      {links.data && <section className={surface}><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("serverLinks")}</h2><Link href={dashboardHref("links",guildId)} className="text-sm text-primary hover:underline">{t("manageLinks")} →</Link></div><p className="mt-1 text-xs text-muted-foreground">{t("serverLinksHint")}</p><div className="mt-5 grid grid-cols-3 gap-4">{[[t("linkedPeople"),links.data.members_with_links],[t("linkedAccounts"),links.data.total_linked_accounts],[t("verifiedAccounts"),links.data.verified_accounts]].map(([label,value])=><div key={label}><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}</div></section>}
      {<section><h2 className="mb-4 text-lg font-semibold">{t("legendFinishes")}</h2><div className="space-y-2">{data.legends.length?data.legends.map(player=><div key={`${player.tag}-${player.season}`} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4"><div><p className="font-semibold">{player.name}</p><p className="mt-1 text-xs text-muted-foreground">{player.season}</p></div><div className="text-right"><p className="text-xl font-semibold tabular-nums">#{fmt(player.rank)}</p><p className="mt-1 text-xs text-muted-foreground">{fmt(player.trophies)} {t("trophies")}</p></div></div>):<p className={cn(surface,"text-sm text-muted-foreground")}>{t("noLegends")}</p>}</div></section>}
      <footer className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{t("trackingFootnote")}</span><span>{t("updated",{time:new Intl.DateTimeFormat(locale,{hour:"numeric",minute:"2-digit"}).format(new Date(data.generatedAt))})}</span></footer>
    </>}
    <Sheet open={!!day} onOpenChange={open=>!open&&setDay(null)}><SheetContent className="!left-auto !right-0 w-full max-w-[520px] overflow-y-auto rounded-l-3xl p-6 sm:max-w-[520px]" closeLabel={t("close")}><SheetTitle className="mt-8 text-xl font-semibold">{day?date(day):""} · {metricLabel(metric)}</SheetTitle><SheetDescription className="mt-2">{t("dayDetailHint")}</SheetDescription><div className="my-6 text-4xl font-semibold tabular-nums">{detail.data?fmt(activityValue(detail.data.totals, metric)):"—"}</div>{detail.isError?<p role="alert" className="text-sm text-destructive">{t("loadError")}</p>:detail.isPending?<Skeleton className="h-40 rounded-2xl"/>:<PaginatedList key={`${day}:${metric}`} count={rankedPlayers(detail.data?.players??[],metric).length}>{(offset,limit)=><PlayerRows rows={rankedPlayers(detail.data?.players??[],metric)} keyMetric={metric} offset={offset} limit={limit}/>}</PaginatedList>}</SheetContent></Sheet>
    <Sheet open={!!selectedPlayer} onOpenChange={open=>!open&&setSelectedPlayer(null)}><SheetContent className="!left-auto !right-0 w-full overflow-y-auto rounded-l-3xl p-6 sm:max-w-[520px]" closeLabel={t("close")}>
      <SheetTitle className="mt-8 text-xl font-semibold">{selectedPlayer?.name}</SheetTitle><SheetDescription className="mt-2">{selectedPlayer?.tag} · {selectedPlayer?clanName(selectedPlayer.clanTag):""}</SheetDescription>
      {selectedPlayer && <><div className="my-6 grid grid-cols-2 gap-3">{(["gold","elixir","darkElixir","attacks","donated","received","upgrades","capital"] as Metric[]).map(key=><div key={key} className="rounded-2xl bg-muted/40 p-4">{resourceArtwork[key]&&<Image src={resourceArtwork[key]!} alt="" width={28} height={28}/>}<p className="mt-2 text-2xl font-semibold tabular-nums">{compact(selectedPlayer.metrics[key])}</p><p className="mt-1 text-xs text-muted-foreground">{metricLabel(key)}</p></div>)}</div><p className="text-xs text-muted-foreground">{t("trackingFootnote")}</p></>}
    </SheetContent></Sheet>
  </main></div>;
}
