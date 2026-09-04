/**
 * The former `/v1/leaderboard/:entity/:category` facade was removed with its
 * unregistered API route. Canonical v2 leaderboard operations are exposed by
 * the shared contracts and can be added here when the Dashboard ships a caller.
 */
import { BaseApiClient } from "../core/base-client";

export class LeaderboardClient extends BaseApiClient {}
