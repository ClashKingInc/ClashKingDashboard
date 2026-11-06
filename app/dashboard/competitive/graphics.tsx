import { useTranslations } from "use-intl";
import Link from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { dashboardHref } from "@/lib/dashboard-route";
import { Artwork } from "./ui";

export function WarGraphics({ serverId }: { serverId: string }) {
  const t = useTranslations("CompetitivePage");
  const { canView } = useDashboardAccess();
  return <section className="space-y-5"><div><h2 className="text-lg font-semibold">{t("warMatchupGraphics")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("startWithTheRightLineupEachDraftIncludesTwoClansTheirBadgesTheScoreAndBothPlayerLists")}</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[2, 3, 5, 10].map(size => <article key={size} className="rounded-3xl bg-card p-5 shadow-sm shadow-black/5"><div className="flex items-center gap-3"><Artwork kind="matches" size={40} /><h3 className="text-xl font-bold">{size}{" "}{t("vs")}{" "}{size}</h3></div><p className="mt-4 text-sm text-muted-foreground">{t("lineupDescription", { size })}</p>{canView("embeds") ? <Button asChild variant="secondary" className="mt-5 w-full"><Link href={dashboardHref("graphics", serverId, new URLSearchParams({ warSize: String(size) }))}>{t("createWarGraphic")}</Link></Button> : <p className="mt-5 text-xs text-muted-foreground">{t("requiresAccessToTheGraphicsSection")}</p>}</article>)}</div><p className="text-xs text-muted-foreground">{t("opensTheExistingClashKingEditorOnDesktopDraftsStayInThisBrowserYourPublishedTournamentDataStaysSeparate")}</p></section>;
}
