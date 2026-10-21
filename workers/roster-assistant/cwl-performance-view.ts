/** Reusable source reads the current selection on every replay. Historical
 * averages are baselines, not calibrated forecasts or an invented skill score. */
export function cwlPerformanceViewSource(seasonCount: number): string {
  if (!Number.isInteger(seasonCount) || seasonCount < 1 || seasonCount > 24) throw new Error("Choose 1–24 CWL seasons");
  return `async () => {
    const { rows: members } = await codemode.getRosterMembers({ fields: ["playerName", "townhall"] });
    const { rows: metrics } = await codemode.getRosterMetric({ metricId: "cwl.performance_history", parameters: { seasonCount: ${seasonCount} } });
    const byPlayer = new Map(metrics.map(row => [row.rosterId + ":" + row.playerTag, row.value]));
    const columns = [
      { id: "player", label: "Player", metricId: "player.name", format: "player" },
      { id: "townhall", label: "Town Hall", metricId: "player.townhall", format: "number" },
      { id: "seasons", label: "Observed seasons", metricId: "view.computed", format: "number" },
      { id: "attacks", label: "Attacks", metricId: "view.computed", format: "number" },
      { id: "hit_rate", label: "Three-star rate", metricId: "view.computed", format: "percent" },
      { id: "baseline_stars", label: "Baseline stars / hit", metricId: "view.computed", format: "number" },
      { id: "defenses", label: "Defenses", metricId: "view.computed", format: "number" },
      { id: "conceded_stars", label: "Stars / defense", metricId: "view.computed", format: "number" },
      { id: "missed", label: "Missed attacks", metricId: "view.computed", format: "number" },
      { id: "completion", label: "Attack completion", metricId: "view.computed", format: "percent" }
    ];
    return { name: "CWL · last ${seasonCount} participated seasons", columns,
      rows: members.map(member => {
        const history = byPlayer.get(member.rosterId + ":" + member.playerTag);
        const s = history?.summary;
        return { rosterId: member.rosterId, playerTag: member.playerTag, values: {
          player: member.playerName ?? member.playerTag, townhall: member.townhall ?? null,
          seasons: history?.observedSeasons ?? 0, attacks: s?.attacks ?? 0,
          hit_rate: s?.hitRate ?? null, baseline_stars: s?.averageStars ?? null,
          defenses: s?.defenses ?? 0, conceded_stars: s?.averageStarsConceded ?? null,
          missed: s?.missedAttacks ?? null, completion: s?.completionPercent ?? null
        } };
      }), filters: [], sort: [{ columnId: "baseline_stars", direction: "desc" }], highlights: [], limit: null };
  }`;
}
