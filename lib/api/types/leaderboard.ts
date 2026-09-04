/** Types retained as compile-time tombstones for the removed `/v1/leaderboard` route. */
export type LeaderboardEntry = never;
export type LeaderboardResponse = never;
export type LeaderboardQueryParams = never;

/** UI selection vocabulary from the removed facade. */
export type LeaderboardCategory = "capital";
export type LeaderboardEntityType = "players" | "clans";
export type PlayerCapitalMetric = "capital_looted";
export type ClanCapitalMetric = "capitalTotalLoot" | "raidsCompleted" | "enemyDistrictsDestroyed" | "medals";
export type LeaderboardMetric = PlayerCapitalMetric | ClanCapitalMetric;
