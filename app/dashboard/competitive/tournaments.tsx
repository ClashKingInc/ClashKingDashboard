import { useTranslations, useLocale } from "use-intl";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import { competitiveApi, type Match, type Overview, type Permission, type Tournament } from "./api";
import { TournamentForm, formats } from "./forms";
import { Artwork, Choice, Empty, Field, Pill, controlClass, dateLabel, rowClass } from "./ui";
import { MatchBoard, Standings } from "./match-board";
import { MatchAttacks } from "./attacks";

type Props = { serverId: string; overview: Overview; can: (permission: Permission) => boolean; refresh: () => Promise<void> };

// Keep the selector aligned with the API's forward-only tournament lifecycle.
// Completed and cancelled events cannot be reopened as an existing tournament.
const tournamentTransitions: Readonly<Record<string, readonly string[]>> = {
  draft: ["draft", "registration", "cancelled"],
  registration: ["registration", "active", "cancelled"],
  active: ["active", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};
export function TournamentsPanel(props: Props) {
  const t = useTranslations("CompetitivePage"), locale = useLocale();
  const [create, setCreate] = useState(false), [selected, setSelected] = useState<string | null>(null);
  if (selected) return <TournamentDetail {...props} id={selected} back={() => setSelected(null)} />;
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{t("yourTournaments")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("runAKnockoutCupRoundRobinOrEloLeagueOnYourOwnSchedule")}</p></div>{props.can("tournaments") && <Button onClick={() => setCreate(true)}><Plus className="mr-2 h-4 w-4" />{t("createTournament")}</Button>}</div>
    {!props.overview.tournaments.length ? <Empty>{t("noTournamentsYetSetTheRulesAndOpenRegistrationWhenYoureReady")}</Empty> : <div className="grid gap-4 xl:grid-cols-2">{props.overview.tournaments.map(tournament => <button key={tournament.id} onClick={() => setSelected(tournament.id)} className={`${rowClass} text-left transition-shadow duration-150 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}><div className="flex items-center gap-3"><Artwork kind="tournaments" size={44} /><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{tournament.name}</h3><p className="mt-1 text-xs text-muted-foreground">{t(formats.find(format => format.value === tournament.format)?.label ?? "format")} · {tournament.teamSize}{" "}{t("vs")}{" "}{tournament.teamSize}</p></div><Pill active={tournament.status === "active"}>{t(tournament.status)}</Pill></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"><span>{t("starts")}{" "}{dateLabel(tournament.startsAt, locale)}</span><span>{t("ends")}{" "}{dateLabel(tournament.endsAt, locale)}</span></div></button>)}</div>}
    <TournamentForm open={create && props.can("tournaments")} onClose={() => setCreate(false)} submit={async value => { await competitiveApi.createTournament(props.serverId, value); await props.refresh(); }} />
  </div>;
}

function TournamentDetail({ id, back, ...props }: Props & { id: string; back: () => void }) {
  const t = useTranslations("CompetitivePage"), locale = useLocale();
  const { serverId, overview, can } = props;
  const report = useQuery({ queryKey: ["competitive", serverId, "tournament", id], queryFn: ({ signal }) => competitiveApi.tournament(serverId, id, signal) });
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [teamId, setTeamId] = useState(""), [newMatch, setNewMatch] = useState(false), [score, setScore] = useState<Match | null>(null), [editing, setEditing] = useState(false), [inspecting, setInspecting] = useState<Match | null>(null);
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await props.refresh(); }
    catch (cause) { setError(cause instanceof Error && cause.message.trim() ? cause.message.trim() : t("couldNotSaveChanges")); }
    finally { setBusy(false); }
  }
  if (report.isPending) return <Empty>{t("loadingTournament")}</Empty>;
  if (report.error || !report.data) return <div className="space-y-3"><Button variant="secondary" onClick={back}>{t("backToTournaments")}</Button><p role="alert" className="text-sm text-destructive">{report.error?.message ?? t("tournamentUnavailable")}</p><Button variant="secondary" onClick={() => void report.refetch()}>{t("retry")}</Button></div>;
  const { tournament, participants, matches } = report.data;
  const activeParticipants = participants.filter(item => !item.withdrawnAt);
  const participantIds = new Set(activeParticipants.map(item => item.teamId));
  const eligibleTeams = overview.teams.filter(team => !team.archived && team.size === tournament.teamSize && !participantIds.has(team.id));
  const allowedStatuses = (tournamentTransitions[tournament.status] ?? [tournament.status]).filter(status => status === tournament.status || status !== "completed" || matches.every(match => ["completed", "cancelled"].includes(match.status)));
  const teamName = (id: string) => overview.teams.find(team => team.id === id)?.clanName ?? participants.find(item => item.teamId === id)?.clanName ?? t("externalClan");
  return <div className="min-w-0 space-y-5">
    <Button variant="ghost" className="-ml-3" onClick={back}><ArrowLeft className="mr-2 h-4 w-4" />{t("tournaments")}</Button>
    <div className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)] items-start gap-x-4 gap-y-4 sm:grid-cols-[52px_minmax(0,1fr)_auto]">
      <Artwork kind="tournaments" size={52} />
      <div className="min-w-0">
        <h2 className="break-words text-2xl font-semibold leading-tight">{tournament.name}</h2>
        <p className="mt-1 break-words text-sm text-muted-foreground">{t(formats.find(item => item.value === tournament.format)?.label ?? "format")} · {tournament.teamSize}{" "}{t("vs")}{" "}{tournament.teamSize}</p>
        <p className="mt-2 break-words text-xs leading-5 text-muted-foreground"><span className="block sm:inline">{dateLabel(tournament.startsAt, locale)}</span><span className="hidden sm:inline"> — </span><span className="block sm:inline">{dateLabel(tournament.endsAt, locale)}</span></p>
      </div>
      <div className="col-span-2 min-w-0 sm:col-span-1 sm:w-44">{can("tournaments") ? <Choice label={t("tournamentStatus")} value={tournament.status} disabled={busy || allowedStatuses.length < 2} onChange={status => void mutate(() => competitiveApi.updateTournament(serverId, id, { status }))} choices={allowedStatuses.map(value => ({ value, label: t(value) }))} /> : <Pill active={tournament.status === "active"}>{t(tournament.status)}</Pill>}</div>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {(can("tournaments") || can("matches")) && <div className="flex min-w-0 flex-wrap items-center gap-2">
      {can("tournaments") && <Button variant="secondary" className="max-w-full" onClick={() => setEditing(true)}>{t("editDetailsSchedule")}</Button>}
      {can("matches") && <Button variant="secondary" className="max-w-full" disabled={busy || tournament.status !== "active"} onClick={() => void mutate(() => competitiveApi.syncWars(serverId, id))}>{t("syncTrackedWars")}</Button>}
    </div>}
    {can("matches") && <div className="flex flex-wrap items-center gap-3"><Button disabled={busy || !["registration", "active"].includes(tournament.status) || activeParticipants.filter(item => item.checkedInAt).length < 2} onClick={() => void mutate(() => competitiveApi.generateMatches(serverId, id))}>{t("generateNextRound")}</Button><p className="text-xs text-muted-foreground">{activeParticipants.filter(item => item.checkedInAt).length}{" "}{t("teamsCheckedInTeamsCheckInThroughTheAppBeforePairing")}</p></div>}
    <Tabs defaultValue="participants"><DashboardTabsList><DashboardTabTrigger value="participants" artwork={<Artwork kind="teams" />} count={participants.length}>{t("teamsRosters")}</DashboardTabTrigger><DashboardTabTrigger value="matches" artwork={<Artwork kind="matches" />} count={matches.length}>{t("matchesResults")}</DashboardTabTrigger><DashboardTabTrigger value="standings" artwork={<Artwork kind="tournaments" />}>{t("standings")}</DashboardTabTrigger><DashboardTabTrigger value="rules">{t("rulesEligibility")}</DashboardTabTrigger></DashboardTabsList>
      <TabsContent value="participants" className="mt-5 space-y-4">{can("participants") && <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); void mutate(() => competitiveApi.enter(serverId, id, teamId)); }}><div className="w-full min-w-0 sm:w-auto sm:min-w-56 sm:flex-1"><Field label={t("addAClanLineup")}><Choice value={teamId} onChange={setTeamId} label={t("eligibleTeam")} choices={eligibleTeams.map(team => ({ value: team.id, label: `${team.clanName} · ${team.internalName}` }))} disabled={busy || !eligibleTeams.length} /></Field></div><Button disabled={busy || tournament.status !== "registration" || !teamId || !eligibleTeams.some(team => team.id === teamId)}>{t("registerTeam")}</Button></form>}
        {!participants.length ? <Empty>{t("noTeamsRegistered")}</Empty> : participants.map(participant => <article className={rowClass} key={participant.teamId}>
          <div className="grid min-w-0 grid-cols-[34px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[34px_minmax(0,1fr)_auto] sm:items-center">
            <Artwork kind="teams" size={34} />
            <div className="min-w-0"><h3 className="break-words font-semibold">{teamName(participant.teamId)}</h3><p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{overview.teams.find(team => team.id === participant.teamId)?.internalName ?? participant.clanTag}</p></div>
            <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
              <Pill active={Boolean(participant.checkedInAt) && !participant.withdrawnAt}>{participant.withdrawnAt ? t("withdrawn") : participant.checkedInAt ? t("checkedIn") : t("awaitingCheckIn")}</Pill>
              {can("participants") && !participant.withdrawnAt && <Button variant="secondary" disabled={busy || ["active", "completed"].includes(tournament.status)} onClick={() => void mutate(() => competitiveApi.withdraw(serverId, id, participant.teamId))}>{t("withdraw")}</Button>}
            </div>
          </div>
          <details className="mt-4"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">{t("eventRosterSnapshot")}</summary><div className="mt-3 space-y-2">{participant.roster?.length ? participant.roster.map(player => <p className="break-words text-sm" key={player.playerTag}>{player.name || player.playerTag}<span className="ml-2 text-xs text-muted-foreground">{player.playerTag}{player.townHallLevel ? ` · ${t("townHallNumber", { level: player.townHallLevel })}` : ""}</span></p>) : <p className="text-xs text-muted-foreground">{t("noRosterSnapshotRecorded")}</p>}</div></details>
        </article>)}
      </TabsContent>
      <TabsContent value="matches" className="mt-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{t("linkWarsThroughExistingClashKingTrackingScoreCorrectionsRequireAReason")}</p>{can("matches") && <Button variant="secondary" disabled={activeParticipants.length < 2} onClick={() => setNewMatch(true)}><Plus className="mr-2 h-4 w-4" />{t("scheduleMatch")}</Button>}</div><MatchBoard inspect={setInspecting} matches={matches} teamName={teamName} elimination={tournament.format.includes("elimination")} score={can("scores") ? setScore : undefined} /></TabsContent>
      <TabsContent value="standings" className="mt-5 space-y-4"><div><h3 className="text-lg font-semibold">{tournament.format === "elo" ? t("eloLeaderboard") : t("tournamentStandings")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("completedResultsUpdateStandingsAuditedCorrectionsReplaceThePreviousResult")}</p></div><Standings rows={report.data.standings ?? []} teamName={teamName} elo={tournament.format === "elo"} /></TabsContent>
      <TabsContent value="rules" className="mt-5"><TournamentDocuments rules={tournament.rules} /><RulesEditor key={tournament.id + JSON.stringify(tournament.rules)} tournament={tournament} manage={can("tournaments")} save={value => mutate(() => competitiveApi.updateTournament(serverId, id, value))} busy={busy} /></TabsContent>
    </Tabs>
    {newMatch && can("matches") && <MatchForm teams={activeParticipants.map(item => ({ value: item.teamId, label: teamName(item.teamId) }))} close={() => setNewMatch(false)} save={async value => { await competitiveApi.createMatch(serverId, id, value); await props.refresh(); }} />}
    {editing && can("tournaments") && <TournamentForm open initial={tournament} onClose={() => setEditing(false)} submit={async ({ name, startsAt, endsAt, rules }) => { await competitiveApi.updateTournament(serverId, id, { name, startsAt, endsAt, rules }); await props.refresh(); }} />}
    {score && can("scores") && <ScoreForm match={score} penalties={can("penalties")} close={() => setScore(null)} save={async value => { await competitiveApi.updateMatch(serverId, score.id, value); await props.refresh(); }} />}
    {inspecting && <MatchAttacks serverId={serverId} match={inspecting} close={() => setInspecting(null)} />}
  </div>;
}

function RulesEditor({ tournament, manage, save, busy }: { tournament: Tournament; manage: boolean; save: (value: unknown) => Promise<void>; busy: boolean }) {
  const t = useTranslations("CompetitivePage");
  const [description, setDescription] = useState(String(tournament.rules.description ?? "")), [min, setMin] = useState(String(tournament.rules.minTownHall ?? 1)), [max, setMax] = useState(String(tournament.rules.maxTownHall ?? 18));
  return <form className="space-y-5" onSubmit={event => { event.preventDefault(); void save({ rules: { ...tournament.rules, description, minTownHall: Number(min), maxTownHall: Number(max), maxRosterSize: tournament.teamSize } }); }}><div className="grid gap-4 sm:grid-cols-2"><Field label={t("minimumTownHall")}><Input type="number" min={1} max={Number(max)} required value={min} disabled={!manage || busy} onChange={event => setMin(event.target.value)} className={controlClass} /></Field><Field label={t("maximumTownHall")}><Input type="number" min={Number(min)} max={18} required value={max} disabled={!manage || busy} onChange={event => setMax(event.target.value)} className={controlClass} /></Field></div><Field label={t("competitionRules")}><Textarea value={description} maxLength={8000} disabled={!manage || busy} onChange={event => setDescription(event.target.value)} className={controlClass} /></Field>{manage && <Button disabled={busy}>{t("saveRules")}</Button>}</form>;
}

function TournamentDocuments({ rules }: { rules: Tournament["rules"] }) {
  const t = useTranslations("CompetitivePage");
  const prize = typeof rules.prizeDescription === "string" ? rules.prizeDescription : "";
  const rulebook = typeof rules.rulebookUrl === "string" && rules.rulebookUrl.startsWith("https://") ? rules.rulebookUrl : "";
  return <div className="mb-6 space-y-4"><Pill>{rules.visibility === "unlisted" ? t("unlistedTournament") : t("publicTournament")}</Pill>{prize && <section><h3 className="text-sm font-semibold">{t("prizes")}</h3><p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{prize}</p></section>}{rulebook && <Button asChild variant="secondary"><a href={rulebook} target="_blank" rel="noopener noreferrer">{t("openRulebook")}</a></Button>}</div>;
}

function MatchForm({ teams, close, save }: { teams: { value: string; label: string }[]; close: () => void; save: (body: unknown) => Promise<void> }) {
  const t = useTranslations("CompetitivePage");
  const [home, setHome] = useState(teams[0]?.value ?? ""), [away, setAway] = useState(teams[1]?.value ?? ""), [round, setRound] = useState("1"), [war, setWar] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <Dialog open onOpenChange={value => { if (!value && !busy) close(); }}><DialogContent variant="form" className="border-0"><DialogHeader><DialogTitle>{t("scheduleMatch")}</DialogTitle><DialogDescription>{t("useAWarIDFromClashKingsExistingWarTrackingWhenAvailable")}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { await save({ homeTeamId: home, awayTeamId: away, round: Number(round), ...(war.trim() ? { warId: war.trim() } : {}) }); close(); } catch (cause) { setError(cause instanceof Error && cause.message.trim() ? cause.message.trim() : t("couldNotScheduleMatch")); } finally { setBusy(false); } }}><Field label={t("homeClan")}><Choice value={home} onChange={setHome} choices={teams} /></Field><Field label={t("awayClan")}><Choice value={away} onChange={setAway} choices={teams.filter(team => team.value !== home)} /></Field><Field label={t("round")}><Input required type="number" min={1} value={round} onChange={event => setRound(event.target.value)} className={controlClass} /></Field><Field label={t("trackedWarIDOptional")}><Input value={war} onChange={event => setWar(event.target.value)} className={controlClass} /></Field>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy || !home || !away || home === away}>{busy ? t("scheduling") : t("scheduleMatch")}</Button></form></DialogContent></Dialog>;
}

function ScoreForm({ match, penalties, close, save }: { match: Match; penalties: boolean; close: () => void; save: (body: unknown) => Promise<void> }) {
  const t = useTranslations("CompetitivePage");
  const [home, setHome] = useState(String(match.rawHomeScore ?? match.homeScore ?? 0)), [away, setAway] = useState(String(match.rawAwayScore ?? match.awayScore ?? 0)), [reason, setReason] = useState(""), [status, setStatus] = useState(match.status), [penalty, setPenalty] = useState(match.penalty?.reason ?? ""), [homeDeduction, setHomeDeduction] = useState(String(match.penalty?.homeDeduction ?? 0)), [awayDeduction, setAwayDeduction] = useState(String(match.penalty?.awayDeduction ?? 0));
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <Dialog open onOpenChange={value => { if (!value && !busy) close(); }}><DialogContent variant="form" className="border-0"><DialogHeader><DialogTitle>{t("scorePenalties")}</DialogTitle><DialogDescription>{t("theAuditTrailRecordsTheActorResultAndReasonForEveryCorrection")}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { await save({ homeScore: Number(home), awayScore: Number(away), status, reason: reason.trim(), ...(penalties && (penalty.trim() || match.penalty) ? { penalty: { homeDeduction: Number(homeDeduction), awayDeduction: Number(awayDeduction), reason: penalty.trim() } } : {}) }); close(); } catch (cause) { setError(cause instanceof Error && cause.message.trim() ? cause.message.trim() : t("couldNotSaveResult")); } finally { setBusy(false); } }}><div className="grid grid-cols-2 gap-4"><Field label={t("homeScoreBeforeDeductions")}><Input required type="number" min={0} step="any" value={home} onChange={event => setHome(event.target.value)} className={controlClass} /></Field><Field label={t("awayScoreBeforeDeductions")}><Input required type="number" min={0} step="any" value={away} onChange={event => setAway(event.target.value)} className={controlClass} /></Field></div><Field label={t("matchStatus")}><Choice value={status} onChange={setStatus} choices={["scheduled", "active", "completed", "cancelled"].map(value => ({ value, label: t(value) }))} /></Field><Field label={t("reasonForCorrection")}><Textarea required minLength={3} value={reason} onChange={event => setReason(event.target.value)} className={controlClass} /></Field>{penalties && <><div className="grid grid-cols-2 gap-4"><Field label={t("homeDeduction")}><Input required type="number" min={0} step="any" value={homeDeduction} onChange={event => setHomeDeduction(event.target.value)} className={controlClass} /></Field><Field label={t("awayDeduction")}><Input required type="number" min={0} step="any" value={awayDeduction} onChange={event => setAwayDeduction(event.target.value)} className={controlClass} /></Field></div><Field label={t("penaltyReason")}><Textarea required={Boolean(Number(homeDeduction) || Number(awayDeduction) || match.penalty)} value={penalty} maxLength={2000} onChange={event => setPenalty(event.target.value)} className={controlClass} /></Field><p className="rounded-xl bg-muted/45 p-3 text-sm">{t("finalScore")}{" "}<strong>{Math.max(0, Number(home) - Number(homeDeduction))} : {Math.max(0, Number(away) - Number(awayDeduction))}</strong></p></>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy || reason.trim().length < 3}>{busy ? t("saving") : t("saveAuditedResult")}</Button></form></DialogContent></Dialog>;
}
