# Production release

Production uses four public origins:

- `https://clashk.ing` — marketing and legal pages
- `https://dash.clashk.ing` — authenticated dashboard
- `https://v2-api.clashk.ing` — Go API
- `https://ai.clashk.ing` — roster-assistant Worker

The graphics editor has no AI assistant endpoint.

## Release order

1. **Create and migrate the target Timescale database.** Apply the authoritative DevKit Goose baseline from `database/timescale`. A fresh database applies `001_initial_stats.sql` and `002_initial_settings.sql` and ends at Goose version 2. Run the DevKit data importers required for the cutover before sending production traffic to the new API.
2. **Deploy the Go API against the migrated database.** Point its `TIMESCALE_*` values at the target database, publish it on `v2-api.clashk.ing`, and confirm its health and authentication endpoints before deploying clients.
3. **Deploy the admin panel.** It uses the same Timescale database. The seeded `subscription_support` flag appears under **Dashboard & billing** and starts disabled.
4. **Configure and deploy the roster-assistant Worker.** Set both Worker secrets, then deploy `wrangler.assistant.jsonc` to `ai.clashk.ing`.
5. **Deploy the dashboard Worker.** `npm run deploy:dashboard` builds with the production API and assistant origins before deploying `wrangler.deploy.jsonc` to the marketing and dashboard domains. `npm run deploy` performs steps 4 and 5 together after the API is ready.

## API environment

Use `clashking-api/example.env` as the key inventory. The production-specific values are:

```dotenv
WEB_ALLOWED_ORIGINS=https://clashk.ing,https://dash.clashk.ing
DISCORD_REDIRECT_URI=https://dash.clashk.ing/auth/callback
AI_USAGE_SECRET=<same strong secret used by the roster-assistant Worker>
STRIPE_CHECKOUT_SUCCESS_URL=https://dash.clashk.ing/dashboard/settings?checkout=success
STRIPE_CHECKOUT_CANCEL_URL=https://dash.clashk.ing/dashboard/settings?checkout=cancelled
STRIPE_PORTAL_RETURN_URL=https://dash.clashk.ing/dashboard/settings
```

`AI_USAGE_SECRET` is required outside local mode. Keep it out of Wrangler variables and source control. Stripe checkout remains unavailable while `subscription_support` is disabled, even if Stripe keys are present and someone calls the API endpoint directly. Existing subscribers can still open the Stripe portal.

Add `https://dash.clashk.ing/auth/callback` to the Discord application’s allowed OAuth redirect URIs. When Stripe checkout is eventually enabled, configure its webhook destination as `https://v2-api.clashk.ing/v2/billing/stripe/webhook` and use that endpoint’s signing secret as `STRIPE_WEBHOOK_SECRET`.

When subscriptions are ready, update `subscription_support` in the admin panel: include the `web` platform, choose the rollout percentage, and enable the flag. Rollout assignment is stable per user, and the API applies its start/end window.

## Cloudflare Workers

The dashboard has no runtime secrets; its public API, assistant, and Discord client values are pinned by `build:production`. The roster assistant has one non-secret variable in `wrangler.assistant.jsonc`:

```text
CLASHKING_API_URL=https://v2-api.clashk.ing
```

Set the assistant secrets in Cloudflare before its first production deploy:

```bash
npx wrangler secret put OPENAI_API_KEY --config wrangler.assistant.jsonc
npx wrangler secret put AI_USAGE_SECRET --config wrangler.assistant.jsonc
```

The second value must exactly match the API environment. The checked-in `.dev.vars` is local-only and does not configure production.

Run these checks before release:

```bash
npm run typecheck
npm run lint
npm test
npm run build:production
npx wrangler deploy --dry-run --config wrangler.deploy.jsonc
npx wrangler deploy --dry-run --config wrangler.assistant.jsonc
```

Wrangler needs an authenticated Cloudflare session or `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the deployment environment. Do not use temporary preview-account deployment for production.

## Why old notes mention migrations 003 and 004

The V2 cleanup and roster architecture originally existed as `003_v2_schema_cleanup.sql` and `004_roster_architecture.sql`; DevKit commit `77be112` contains those files. The current DevKit worktree intentionally squashes their final schema into the fresh-install `001`/`002` baseline, and `database/timescale/schema_baseline_report.md` preserves the historical validation record. That is why Git history and an older API handoff could name 003/004 while the current migration directory contains only 001/002.

Do not apply the squashed baseline over a database that already recorded versions 003/004. The two-file baseline is for the new database; an existing migrated database needs an explicit upgrade plan based on its Goose state.
