/** Destruction is the sum of attack percentages, so totals can exceed 100.
 * Reusable source reads the current selection on every replay. Historical
 * averages are baselines, not calibrated forecasts or an invented skill score. */
export function cwlPerformanceViewSource(seasonCount: number, options: {windowMonths?: number; familyOnly?: boolean} = {}): string {
  if (!Number.isInteger(seasonCount) || seasonCount < 1 || seasonCount > 24) throw new Error("Choose 1–24 CWL seasons");
  if (options.windowMonths !== undefined && (!Number.isInteger(options.windowMonths) || options.windowMonths < 1 || options.windowMonths > 24)) throw new Error("Choose 1–24 calendar months");
  const parameters = {...(options.windowMonths === undefined ? {seasonCount} : {windowMonths:options.windowMonths}), ...(options.familyOnly ? {familyOnly:true} : {})};
  const name = options.windowMonths === undefined ? `CWL · last ${seasonCount} participated seasons` : `CWL · last ${options.windowMonths} calendar months${options.familyOnly ? " · family clans" : ""}`;
  return `async () => {
    const { rows: members } = await codemode.getRosterMembers({ fields: ["playerName", "townhall"] });
    const { rows: metrics } = await codemode.getRosterMetric({ metricId: "cwl.performance_history", parameters: ${JSON.stringify(parameters)} });
    const byPlayer = new Map(metrics.map(row => [row.rosterId + ":" + row.playerTag, row.value]));
    const columns = [
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
    return { name: ${JSON.stringify(name)}, description: ${JSON.stringify(`CWL performance across ${options.windowMonths ? `the last ${options.windowMonths} calendar months` : `each player’s last ${seasonCount} participated seasons`}${options.familyOnly ? " in family clans" : ""}, including average stars, attacks, total stars, destruction and missed attacks.`)}, columns,
      rows: members.map(member => {
        const history = byPlayer.get(member.rosterId + ":" + member.playerTag);
        const s = history?.summary;
        return { rosterId: member.rosterId, playerTag: member.playerTag, values: {
          player: member.playerName ?? member.playerTag, townhall: member.townhall ?? null,
          seasons: history?.observedSeasons ?? 0, wars: s?.completedWars ?? 0, stars_per_war: s?.averageStarsPerWar ?? null, attacks: s?.attacks ?? 0,
          stars: s?.completedWars ? s.attackStars : null,
          destruction: s?.completedWars ? s.attackDestruction : null,
          hit_rate: s?.hitRate ?? null, baseline_stars: s?.averageStars ?? null,
          defenses: s?.defenses ?? 0, conceded_stars: s?.averageStarsConceded ?? null,
          missed: s?.missedAttacks ?? null, completion: s?.completionPercent ?? null
        } };
      }), filters: [], sort: [{ columnId: ${JSON.stringify(options.windowMonths === undefined ? "baseline_stars" : "stars_per_war")}, direction: "desc" }, { columnId: "attacks", direction: "desc" }, { columnId: "stars", direction: "desc" }, { columnId: "destruction", direction: "desc" }], highlights: [], limit: null };
  }`;
}
