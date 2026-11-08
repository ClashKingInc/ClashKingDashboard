/** Destruction is the sum of attack percentages, so totals can exceed 100.
 * Reusable source reads the current selection on every replay. Historical
 * averages are baselines, not calibrated forecasts or an invented skill score. */
export function cwlPerformanceViewSource(seasonCount: number, options: {season?: string; windowMonths?: number; familyOnly?: boolean; groupByClan?: boolean; hideZeroMisses?: boolean} = {}): string {
  if (!Number.isInteger(seasonCount) || seasonCount < 1 || seasonCount > 24) throw new Error("Choose 1–24 CWL seasons");
  if (options.windowMonths !== undefined && (!Number.isInteger(options.windowMonths) || options.windowMonths < 1 || options.windowMonths > 24)) throw new Error("Choose 1–24 calendar months");
  if (options.season !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(options.season)) throw new Error("Choose a CWL season as YYYY-MM");
  if (options.season && options.windowMonths !== undefined) throw new Error("Choose an exact season or a rolling calendar window");
  const parameters = {...(options.season ? {season:options.season} : options.windowMonths === undefined ? {seasonCount} : {windowMonths:options.windowMonths}), ...(options.familyOnly ? {familyOnly:true} : {})};
  const name = options.season ? `CWL · ${options.season}${options.familyOnly ? " · family clans" : ""}` : options.windowMonths === undefined ? `CWL · last ${seasonCount} participated seasons` : `CWL · last ${options.windowMonths} calendar months${options.familyOnly ? " · family clans" : ""}`;
  return `async () => {
    const { rows: members } = await codemode.getRosterMembers({ fields: ["playerName", "townhall"] });
    const { rows: metrics } = await codemode.getRosterMetric({ metricId: "cwl.performance_history", parameters: ${JSON.stringify(parameters)} });
    const byPlayer = new Map(metrics.map(row => [row.rosterId + ":" + row.playerTag, row.value]));
    const columns = [
      ${options.groupByClan ? '{ id: "league", label: "CWL league", metricId: "view.computed", format: "text" }, { id: "clan", label: "CWL clan", metricId: "view.computed", format: "text" },' : ''}
      { id: "player", label: "Player", metricId: "player.name", format: "player" },
      { id: "townhall", label: "Town Hall", metricId: "player.townhall", format: "number" },
      { id: "seasons", label: "Observed seasons", metricId: "view.computed", format: "number" },
      { id: "wars", label: "Completed wars", metricId: "view.computed", format: "number" },
      { id: "stars_per_war", label: "Stars / war", metricId: "view.computed", format: "number" },
      { id: "attacks", label: "Attacks", metricId: "view.computed", format: "number" },
      { id: "stars", label: "Total stars", metricId: "view.computed", format: "number" },
      { id: "destruction", label: "Total destruction (%)", metricId: "view.computed", format: "number" },
      { id: "hit_rate", label: "Three-star rate", metricId: "view.computed", format: "percent" },
      { id: "baseline_stars", label: "Baseline stars / hit", metricId: "view.computed", format: "number" },
      { id: "defenses", label: "Defenses", metricId: "view.computed", format: "number" },
      { id: "conceded_stars", label: "Stars / defense", metricId: "view.computed", format: "number" },
      { id: "missed", label: "Missed attacks", metricId: "view.computed", format: "number" },
      { id: "completion", label: "Attack completion", metricId: "view.computed", format: "percent" }
    ];
    return { name: ${JSON.stringify(name)}, description: ${JSON.stringify(`CWL performance across ${options.season ? `the ${options.season} season` : options.windowMonths ? `the last ${options.windowMonths} calendar months` : `each player’s last ${seasonCount} participated seasons`}${options.familyOnly ? " in family clans" : ""}, including average stars, attacks, total stars, destruction and missed attacks.`)}, columns,
      rows: members.map(member => {
        const history = byPlayer.get(member.rosterId + ":" + member.playerTag);
        const s = history?.summary;
        const clans = history?.clans ?? [];
        const clanNames = [...new Set(clans.map(clan => clan.clanName))].join(", ");
        const leagueNames = [...new Set(clans.map(clan => clan.leagueName).filter(Boolean))];
        // CWL strength comes from the observed CWL group, never the player's
        // current ranked league. A mixed history is labeled explicitly.
        const strengths = clans.map(clan => {
          const match = /^(Bronze|Silver|Gold|Crystal|Master|Champion) League (III|II|I)$/.exec(clan.leagueName ?? "");
          return match ? ["Bronze","Silver","Gold","Crystal","Master","Champion"].indexOf(match[1]) * 3 + ({III:1,II:2,I:3}[match[2]]) : null;
        }).filter(value => value !== null);
        const league = leagueNames.length ? {label:leagueNames.join(", "),sortValue:strengths.length ? Math.max(...strengths) : -1} : null;
        return { rosterId: member.rosterId, playerTag: member.playerTag, values: {
          ${options.groupByClan ? "clan: clanNames || null, league," : ""}
          player: member.playerName ?? member.playerTag, townhall: member.townhall ?? null,
          seasons: history?.observedSeasons ?? 0, wars: s?.completedWars ?? 0, stars_per_war: s?.averageStarsPerWar ?? null, attacks: s?.attacks ?? 0,
          stars: s?.completedWars ? s.attackStars : null,
          destruction: s?.completedWars ? s.attackDestruction : null,
          hit_rate: s?.hitRate ?? null, baseline_stars: s?.averageStars ?? null,
          defenses: s?.defenses ?? 0, conceded_stars: s?.averageStarsConceded ?? null,
          missed: ${options.hideZeroMisses ? "s?.missedAttacks > 0 ? s.missedAttacks : null" : "s?.missedAttacks ?? null"}, completion: s?.completionPercent ?? null
        } };
      }), filters: [], sort: [${options.groupByClan ? '{columnId:"league",direction:"desc"},{columnId:"clan",direction:"asc"},' : ""}{ columnId: ${JSON.stringify(!options.season && options.windowMonths === undefined ? "baseline_stars" : "stars_per_war")}, direction: "desc" }, { columnId: "attacks", direction: "desc" }, { columnId: "stars", direction: "desc" }, { columnId: "destruction", direction: "desc" }], highlights: [], limit: null };
  }`;
}
