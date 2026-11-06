import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Match, Standing } from "./api";
import { Artwork, Empty, Pill } from "./ui";

export function MatchBoard({ matches, teamName, score, inspect, elimination }: {
  matches: Match[]; teamName: (id: string) => string; score?: (match: Match) => void;
  inspect?: (match: Match) => void; elimination: boolean;
}) {
  const t = useTranslations("CompetitivePage");
  const rounds = [...new Set(matches.map(match => match.round))].sort((a, b) => a - b);
  if (!rounds.length) return <Empty>{t("generateARoundAfterCheckInOrScheduleAnIndividualMatch")}</Empty>;
  return <div className="scrollbar-custom -mx-1 w-full min-w-0 max-w-full overflow-x-auto px-1 pb-4" role="region" aria-label={elimination ? t("tournamentBracket") : t("tournamentRounds")} tabIndex={0}><div className="flex min-w-max items-stretch gap-8 py-1">{rounds.map((round, roundIndex) => {
    const items = matches.filter(match => match.round === round);
    return <section key={round} aria-label={t("roundNumber", { round })} className="flex w-72 shrink-0 flex-col gap-4"><div className="flex items-center justify-between px-1"><h3 className="text-sm font-semibold">{t("round")}{" "}{round}</h3><Pill>{t("matchCount", { count: items.length })}</Pill></div><div className="flex flex-1 flex-col justify-around gap-5">{items.map(match => <article key={match.id} className="relative rounded-3xl bg-card p-4 shadow-sm shadow-black/5">{elimination && roundIndex < rounds.length - 1 && <span aria-hidden="true" className="pointer-events-none absolute -right-8 top-1/2 h-px w-8 bg-primary/25" />}
      <div className="mb-3 flex items-center justify-between gap-2"><Pill active={match.status === "completed"}>{t(match.status)}</Pill><Artwork kind="matches" size={20} /></div>
      {[{ id: match.homeTeamId, score: match.homeScore, opponent: match.awayScore }, { id: match.awayTeamId, score: match.awayScore, opponent: match.homeScore }].map((team, index) => {
        const winner = match.status === "completed" && team.score !== null && team.opponent !== null && team.score > team.opponent;
        return <div key={`${team.id}-${index}`} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", winner ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : index === 0 ? "bg-muted/45" : "bg-muted/25", index === 1 && "mt-1")}><span className="min-w-0 flex-1 truncate text-sm font-semibold" title={teamName(team.id)}>{teamName(team.id)}</span><span className="text-lg font-bold tabular-nums">{team.score ?? "—"}</span></div>;
      })}
      {(score || inspect) && <div className="mt-3 flex flex-wrap gap-2">{inspect && <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => inspect(match)}>{t("warAttacks")}</Button>}{score && <Button variant="secondary" size="sm" className="ml-auto h-8 rounded-xl px-3 text-xs" onClick={() => score(match)}>{t("editResult")}</Button>}</div>}
    </article>)}</div></section>;
  })}</div></div>;
}

export function Standings({ rows, teamName, elo }: { rows: Standing[]; teamName: (id: string) => string; elo: boolean }) {
  const t = useTranslations("CompetitivePage");
  if (!rows.length) return <Empty>{t("standingsWillAppearWhenTeamsEnterThisTournament")}</Empty>;
  return <div className="scrollbar-custom w-full min-w-0 max-w-full overflow-x-auto rounded-3xl bg-card px-2 py-2 shadow-sm shadow-black/5 sm:px-4"><table className="w-full min-w-[34rem] text-left text-sm"><caption className="sr-only">{t("tournamentStandings")}</caption><thead><tr className="text-xs text-muted-foreground"><th scope="col" className="px-3 py-4 font-medium">{t("rank")}</th><th scope="col" className="px-3 py-4 font-medium">{t("clan")}</th><th scope="col" className="px-3 py-4 text-center font-medium">{t("played")}</th><th scope="col" className="px-3 py-4 text-center font-medium">{t("winDrawLoss")}</th><th scope="col" className="px-3 py-4 text-right font-medium">{elo ? t("elo") : t("points")}</th></tr></thead><tbody>{[...rows].sort((a, b) => elo ? b.elo - a.elo || b.points - a.points : b.points - a.points || b.elo - a.elo).map((row, index) => <tr key={row.teamId} className={index === 0 ? "bg-amber-500/10" : "odd:bg-muted/30"}><td className="rounded-l-xl px-3 py-4 tabular-nums"><span className="inline-flex items-center gap-2">{index === 0 && <Artwork kind="tournaments" size={20} />}{index + 1}</span></td><th scope="row" className="min-w-40 max-w-72 break-words px-3 py-4 font-semibold">{teamName(row.teamId)}</th><td className="px-3 py-4 text-center tabular-nums">{row.played}</td><td className="whitespace-nowrap px-3 py-4 text-center tabular-nums"><span className="text-emerald-600 dark:text-emerald-400">{row.wins}</span><span className="px-1 text-muted-foreground">/</span>{row.draws}<span className="px-1 text-muted-foreground">/</span><span className="text-rose-600 dark:text-rose-400">{row.losses}</span></td><td className="rounded-r-xl px-3 py-4 text-right font-bold tabular-nums">{elo ? row.elo : row.points}</td></tr>)}</tbody></table></div>;
}
