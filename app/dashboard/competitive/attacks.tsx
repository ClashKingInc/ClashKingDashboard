import { useTranslations } from "use-intl";
import { useQuery } from "@tanstack/react-query";
import Image from "@/components/app-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { townHallImageUrl } from "@/lib/theme";
import { competitiveApi, type Match } from "./api";
import { Artwork, Empty, Pill } from "./ui";

export function MatchAttacks({ serverId, match, close }: { serverId: string; match: Match; close: () => void }) {
  const t = useTranslations("CompetitivePage");
  const report = useQuery({ queryKey: ["competitive", serverId, "attacks", match.id], queryFn: ({ signal }) => competitiveApi.attacks(serverId, match.id, signal), enabled: Boolean(match.warId) });
  const players = [...new Set(report.data?.items.map(attack => attack.attackerTag) ?? [])];
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent className="max-h-[85dvh] overflow-y-auto border-0 sm:max-w-3xl"><DialogHeader><DialogTitle>{t("warAccountAttacks")}</DialogTitle><DialogDescription>{match.warId ? t("trackedWarRound", { warId: match.warId, round: match.round }) : t("noTrackedWarIsLinkedToThisMatchYet")}</DialogDescription></DialogHeader>
    {!match.warId ? <Empty>{t("linkACanonicalTrackedWarWhenSchedulingTheMatchOrSyncTrackedWars")}</Empty> : report.isPending ? <Empty>{t("loadingArchivedWarAttacks")}</Empty> : report.error ? <div><p role="alert" className="text-sm text-destructive">{report.error.message}</p><Button variant="secondary" className="mt-3" onClick={() => void report.refetch()}>{t("retry")}</Button></div> : !players.length ? <Empty>{t("noArchivedAttacksAreAvailableForThisWarYet")}</Empty> : <div className="space-y-4">{players.map(tag => {
      const attacks = report.data!.items.filter(attack => attack.attackerTag === tag).sort((a, b) => a.attackOrder - b.attackOrder);
      const player = attacks[0];
      return <article key={tag} className="rounded-2xl bg-muted/35 p-4"><div className="flex flex-wrap items-center gap-3"><Image src={townHallImageUrl(player.attackerTownhall)} alt={t("townHallNumber", { level: player.attackerTownhall })} width={40} height={40} unoptimized className="h-10 w-10 object-contain" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{player.attackerName || tag}</h3><p className="text-xs text-muted-foreground">{tag} · {player.attackingClanTag}</p></div><Pill>{t("attackCount", { count: attacks.length })}</Pill></div><div className="mt-4 space-y-2">{attacks.map(attack => <div key={`${tag}-${attack.attackOrder}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-card/70 px-3 py-2.5"><span className="text-xs text-muted-foreground">#{attack.attackOrder}</span><div className="min-w-0 flex-1"><p className="text-sm">{attack.defenderName || attack.defenderTag}</p><p className="text-xs text-muted-foreground">{t("tH")}{" "}{attack.defenderTownhall} · {attack.defenderTag}</p></div><span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums"><Artwork kind="matches" size={16} />{attack.stars}<span className="ml-2 text-muted-foreground">{attack.destructionPercentage}%</span></span><span className="text-xs tabular-nums text-muted-foreground">{Math.floor(attack.duration / 60)}:{String(attack.duration % 60).padStart(2, "0")}</span></div>)}</div></article>;
    })}</div>}
  </DialogContent></Dialog>;
}
