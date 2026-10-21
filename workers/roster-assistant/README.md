# Roster assistant

The assistant runs GPT-6 Luna through the OpenAI Responses API. The Dashboard selects authorized rosters, the assistant queries the API with the user's token, and API validation precedes every membership proposal. Membership changes require approval in the Dashboard and an unchanged roster revision.

## Local stack

`https://local-dash.clashk.ing` → `https://local-ai.clashk.ing/chat` → loopback API `http://127.0.0.1:8787`.

The assistant listens on `127.0.0.1:8789`; the bot retains 8788. The named local tunnel exposes only `/chat` and `/health` for the AI hostname. The assistant allowlists the exact local Dashboard origin and retains authenticated developer-preview access.

From the managed ClashKing workspace, run `clashking up assistant`. The schema-owned CLI reads `OPENAI_API_KEY` from the Dashboard's ignored `.dev.vars`, and writes a private assistant environment file with the API's existing `AI_USAGE_SECRET` from `.clashking/local.env`. `clashking logs assistant`, `clashking status assistant`, and `clashking down assistant` manage the service.

For standalone development, put both secrets in `.dev.vars`, then run `npm run assistant:dev`. The launcher generates a local config, supplies the explicit environment file and defaults to the loopback API. Override `CLASHKING_API_ORIGIN`, `CLASHKING_ASSISTANT_PORT`, or `CLASHKING_ASSISTANT_ENV_FILE` when needed.

Local inference still sends requested roster context/tool results to OpenAI. Local databases, API and Worker execution do not imply an offline model.

## Analysis capabilities

- `war.regular_hit_rate`: three-star attacks / observed attacks in completed regular wars, excluding CWL and friendly.
- `war.cwl_hit_rate`: the same calculation restricted to CWL.
- `war.missed_attacks`: expected attack slots minus attacks made, for members in observed completed wars. Expected slots come from each war's `attacksPerMember` (one for CWL). No observed war or unknown attack allowance returns null.
- `war.participation`: `completedWars`, `attacks`, `expectedAttacks`, `missedAttacks`, and `completionPercent`. Completion is `100 × attacks / expectedAttacks`, capped at100. These are observed wars, not proof of complete career coverage.
- `war.hit_rate_confidence`: actual attacks/triples/completedWars, observed three-star rate, and Wilson95% lower/upper rate bounds with z=1.96. It is a sampling interval, not an opaque confidence index. With no attacks, rate and interval bounds are null.
- `windowDays`: a trailing window starting at a UTC day boundary, up to 365 days. `warCount` instead selects each player's latest 1–500 completed matching wars, filtering type before ranking. When both are supplied, select the latest N within that window. Results include attack counts; absent observations remain null.
- `benchmark.th_hit_rate`: attack-weighted regular-war baseline across all tracked wars for the player's current Town Hall and the same UTC-day window. This is observed tracking data, not the entire game population. `benchmark.th_hit_rate_delta` returns the player minus baseline in percentage points. A last-N comparison needs a separately disclosed calendar window for the global baseline.
- `getGlobalWarStats`: regular-war aggregate sample sizes and triple rates, with optional attacker/defender Town Hall and equal-TH filters.
- `player.hero_percent`: home-village hero completion against released Town Hall maxima, using profile levels or the retained home-village total from a refreshed roster snapshot. `player.hero_rushed_percent` is 100 minus completion. Missing data remains unknown; this does not measure buildings or troops.
- `player.last_online`: latest observed activity from the roster snapshot and online events. An absent observation is not proof of inactivity.
- `cwl.league_history`: season, clan and league from registered CWL squads. The evidence explicitly says registration; it does not prove the player attacked in every round.
- `cwl.performance_history`: last `seasonCount` participated seasons (default 6, range 1–24), confirmed by completed-war lineups. Per-season and combined attack/defense averages, triples, missed attacks, completion and sample counts are computed from archives. Seasons use actual CWL group round identities, not the end month. Bench-only registrations do not count; zero-attack lineups do count. Coverage is observed lineups, not a claim that every historical war was tracked. Late-attack timing is unavailable. Historical averages can be shown as baseline estimates, never as a calibrated forecast.
- Questionnaire answers, anonymous linked-owner account groups and stored Discord identity are available through existing member/account tools.

Reusable views can include computed grouping, all requested metrics and signup answers. For a split, select the source and existing destination rosters. Exactly-equal thresholds and unknown rates must be handled explicitly.

## Family discovery and approval

The Family selection works without an existing roster. `getFamilyMembers` reads only the selected server's configured clans and server-local roster assignments. It returns names, tags, Town Halls, clan membership and roster IDs; it never reads private Discord messages or other servers. Clan reads run in batches of four, and any failure rejects the whole discovery instead of misclassifying players as unassigned.

`publishNewRosterProposal` rechecks current family membership and rejects assigned tags before publishing a transient creation preview. Apply uses the existing roster creation API with `unassigned_only=true`. Its existing server-row transaction lock protects the assignment check and inserts together: two concurrent assistant creates cannot claim the same player. Missing profiles and players outside the configured family fail closed. Normal manual multi-roster membership remains permitted; this is not a global uniqueness constraint. No assistant tool mutates rosters automatically.

`getFamilyWarMetric` reads historical war metrics without requiring roster membership. Its API endpoint, `POST /v2/roster/family/war-metrics/query?server_id=…`, validates all requested tags against current members of the authorized server's configured clans, then uses the existing archive calculator. It supports hit rates, participation, missed attacks and confidence with the same window/type parameters as roster metrics. No temporary roster or metric storage is created. Missing history remains unknown, not zero.

To fill an attached empty roster, the assistant discovers clan members, ranks the requested historical metrics and publishes an add-membership proposal for that roster. It does not create a duplicate roster or apply changes without confirmation. New-roster proposals still use the unassigned-only checks above.

Existing add/remove/move previews retain revision-checked Apply. Add-only proposals offer revision-checked Undo. Removal signup data and original move positions cannot be restored through the existing mutation API, so those proposals explicitly warn that Undo is unavailable. New roster creation likewise has no automatic destructive Undo.

The API repository retains a real-service E2E check at `scripts/e2e/roster-assistant.mjs`. Run `CLASHKING_E2E_DASHBOARD_REPO=/absolute/path/to/ClashKingDashboard npm run e2e:roster-assistant` from the API repo against the owned loopback development database. It starts an isolated API on a free port (8798 by default), uses synthetic SQL/game data, verifies concurrent creation and historical values, then removes its rows/processes. It never calls OpenAI or Discord. Override `CLASHKING_E2E_DATABASE_URL`, `CLASHKING_E2E_API_PORT`, or `CLASHKING_E2E_STATIC_ASSETS_ROOT` when needed; non-loopback databases and occupied ports are rejected.
