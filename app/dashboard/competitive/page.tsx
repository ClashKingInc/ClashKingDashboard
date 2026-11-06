"use client";
import { useTranslations, useLocale } from "use-intl";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import Image from "@/components/app-image";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import { useGuildId } from "@/lib/dashboard-route";
import { embeddedServerId } from "@/lib/auth/embedded";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { competitiveApi, type Permission } from "./api";
import { Artwork, Empty, Pill, competitiveArt, dateLabel, rowClass } from "./ui";
import { TeamsPanel } from "./teams";
import { TournamentsPanel } from "./tournaments";
import { ProfilePanel } from "./profile";
import { PermissionsPanel } from "./permissions";
import { WarGraphics } from "./graphics";

export default function CompetitivePage() {
  const t = useTranslations("CompetitivePage");
  const serverId = useGuildId(), client = useQueryClient();
  const { canManage } = useDashboardAccess();
  const embedded = Boolean(embeddedServerId());
  const report = useQuery({ queryKey: ["competitive", serverId, "overview"], queryFn: ({ signal }) => competitiveApi.overview(serverId, signal), enabled: Boolean(serverId) });
  // Invalidate the whole server prefix after every mutation, including inactive
  // Activity queries, so their fresh-cache window cannot hide the new audit row.
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["competitive", serverId] }); };
  const overview = report.data;
  const hasPermission = (permission: Permission) => Boolean(overview?.manager || overview?.permissions.includes(permission));
  // Scoped sessions retain the access ceiling from the existing provider.
  // Normal Discord sessions combine section visibility with fine role grants.
  const writableScope = !embedded || canManage("competitive");
  const can = (permission: Permission) => writableScope && hasPermission(permission);
  return <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <div className="relative overflow-hidden rounded-[28px] bg-card shadow-sm"><Image src={competitiveArt.landscape} alt="" width={1600} height={420} unoptimized className="absolute inset-0 h-full w-full object-cover opacity-25 dark:opacity-30" /><div className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-card/10" /><div className="relative flex flex-wrap items-center justify-between gap-4 p-6 sm:p-7"><div className="max-w-xl"><div className="mb-3 flex items-center gap-2"><Artwork kind="tournaments" size={26} /><Pill>{t("clanCompetition")}</Pill></div><h1 className="text-2xl font-bold sm:text-3xl">{t("competitive")}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("yourClansYourLineupsYourNextGreatWar")}</p></div><Button variant="secondary" disabled={report.isFetching} onClick={() => void refresh()}><RefreshCw className={`mr-2 h-4 w-4 ${report.isFetching ? "animate-spin" : ""}`} />{t("refresh")}</Button></div></div>
    {report.isPending ? <Empty>{t("loadingYourCompetitionWorkspace")}</Empty> : report.error || !overview ? <div className="rounded-3xl bg-destructive/10 p-5"><p role="alert" className="text-sm text-destructive">{report.error?.message ?? t("couldNotLoadCompetitions")}</p><Button variant="secondary" className="mt-3" onClick={() => void report.refetch()}>{t("tryAgain")}</Button></div> : <Tabs defaultValue="tournaments"><DashboardTabsList><DashboardTabTrigger value="tournaments" artwork={<Artwork kind="tournaments" />} count={overview.tournaments.length}>{t("tournaments")}</DashboardTabTrigger><DashboardTabTrigger value="teams" artwork={<Artwork kind="teams" />} count={overview.teams.length}>{t("teams")}</DashboardTabTrigger><DashboardTabTrigger value="audit">{t("activity")}</DashboardTabTrigger>{hasPermission("permissions") && <DashboardTabTrigger value="permissions">{t("permissions")}</DashboardTabTrigger>}<DashboardTabTrigger value="graphics" artwork={<Artwork kind="matches" />}>{t("warGraphics")}</DashboardTabTrigger>{!embeddedServerId() && <DashboardTabTrigger value="profile">{t("myProfile")}</DashboardTabTrigger>}</DashboardTabsList>
      <TabsContent value="tournaments" className="mt-6"><TournamentsPanel serverId={serverId} overview={overview} can={can} refresh={refresh} /></TabsContent>
      <TabsContent value="teams" className="mt-6"><TeamsPanel serverId={serverId} overview={overview} manage={can("teams")} refresh={refresh} /></TabsContent>
      <TabsContent value="audit" className="mt-6"><AuditPanel serverId={serverId} /></TabsContent>
      {hasPermission("permissions") && <TabsContent value="permissions" className="mt-6"><PermissionsPanel serverId={serverId} manage={overview.manager && writableScope} refresh={refresh} /></TabsContent>}
      <TabsContent value="graphics" className="mt-6"><WarGraphics serverId={serverId} /></TabsContent>
      {!embeddedServerId() && <TabsContent value="profile" className="mt-6"><ProfilePanel /></TabsContent>}
    </Tabs>}
  </main>;
}

function AuditPanel({ serverId }: { serverId: string }) {
  const t = useTranslations("CompetitivePage"), locale = useLocale();
  const audit = useQuery({ queryKey: ["competitive", serverId, "audit"], queryFn: ({ signal }) => competitiveApi.audit(serverId, signal) });
  return <section className="space-y-4"><div><h2 className="text-lg font-semibold">{t("competitionActivity")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("teamChangesRegistrationsScoresAndPenaltiesRetainTheirActorAndReason")}</p></div>{audit.isPending ? <Empty>{t("loadingActivity")}</Empty> : audit.error ? <p role="alert" className="text-sm text-destructive">{audit.error.message}<Button className="ml-3" variant="secondary" onClick={() => void audit.refetch()}>{t("retry")}</Button></p> : !audit.data?.items.length ? <Empty>{t("noRecordedCompetitionActivity")}</Empty> : audit.data.items.map((entry, index) => <article key={entry.id ?? index} className={rowClass}><div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-semibold">{entry.action.replaceAll("_", " ")}</h3><time className="text-xs text-muted-foreground">{dateLabel(entry.createdAt, locale)}</time></div>{entry.actorId && <p className="mt-1 text-xs text-muted-foreground">{t("actor")}{" "}{entry.actorId}</p>}<details className="mt-3"><summary className="cursor-pointer text-xs text-muted-foreground">{t("changeDetails")}</summary><pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted/45 p-3 text-xs">{JSON.stringify({ before: entry.before, after: entry.after, reason: entry.reason }, null, 2)}</pre></details></article>)}</section>;
}
