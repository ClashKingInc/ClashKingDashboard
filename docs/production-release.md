# Production release

Production uses four public origins:

- `https://clashk.ing` — marketing and legal pages
- `https://dash.clashk.ing` — authenticated dashboard
- `https://api.clashk.ing` — Go API
- `https://ai.clashk.ing` — roster-assistant Worker

The graphics editor has no AI assistant endpoint.

## Release order

1. **Create and migrate the target Timescale database.** Apply the authoritative DevKit Goose baseline from `database/timescale`. A fresh database applies `001_initial_stats.sql` and `002_initial_settings.sql` and ends at Goose version 2. Run the DevKit data importers required for the cutover before sending production traffic to the new API.
2. **Deploy the Go API against the migrated database.** Map its canonical `TIMESCALE_*`, `VALKEY_*`, origin, and trust values from the Coolify server environment, publish it on `api.clashk.ing`, and confirm its health and authentication endpoints before deploying clients.
3. **Deploy the admin panel.** It uses the same Timescale database. The seeded `subscription_support` flag appears under **Dashboard & billing** and starts disabled.
4. **Configure and deploy the roster-assistant Worker.** Create both account secrets in Cloudflare Secrets Store, bind them through the generated Wrangler configuration, then deploy to `ai.clashk.ing`.
5. **Deploy the dashboard Worker.** `npm run deploy:dashboard` builds with the production API and assistant origins before deploying `wrangler.deploy.jsonc` to the marketing and dashboard domains. `npm run deploy` performs steps 4 and 5 together after the API is ready.

## API environment

Use `clashking-api/example.env` and the DevKit production-environment contract as the key inventory. URLs are derived from canonical origins:

```dotenv
CLASHKING_LANDING_ORIGIN=https://clashk.ing
CLASHKING_DASHBOARD_ORIGIN=https://dash.clashk.ing
CLASHKING_PROXY_INTERNAL_ORIGIN=http://clashking-proxy:8011
AI_USAGE_SECRET=<same strong secret used by the roster-assistant Worker>
```

`AI_USAGE_SECRET` is required outside local mode. Keep it out of Wrangler variables and source control. Stripe checkout remains unavailable while `subscription_support` is disabled, even when the three `STRIPE_*` values are configured.

Add `https://dash.clashk.ing/auth/callback` to the Discord application’s allowed OAuth redirect URIs. When Stripe checkout is eventually enabled, configure its webhook destination as `https://api.clashk.ing/v2/billing/stripe/webhook` and use that endpoint’s signing secret as `STRIPE_WEBHOOK_SECRET`.

When subscriptions are ready, update `subscription_support` in the admin panel: include the `web` platform, choose the rollout percentage, and enable the flag. Rollout assignment is stable per user, and the API applies its start/end window.

## Cloudflare Workers

The dashboard has no runtime secrets; its public API, assistant, and Discord client values are pinned by `build:production`. The roster assistant has one non-secret variable in `wrangler.assistant.jsonc`:

```text
CLASHKING_API_ORIGIN=https://api.clashk.ing
```

Create the account-level secrets, then expose the non-secret store ID to the deployment job:

```bash
npx wrangler secrets-store store list
npx wrangler secrets-store secret create <STORE_ID> --name OPENAI_API_KEY --scopes workers --remote
npx wrangler secrets-store secret create <STORE_ID> --name AI_USAGE_SECRET --scopes workers --remote
CLOUDFLARE_SECRETS_STORE_ID=<STORE_ID> npm run deploy:assistant
```

The `AI_USAGE_SECRET` value must exactly match the API environment. The preparation script replaces only the public store ID in a gitignored generated config; secret values never enter source files.

Run these checks before release:

```bash
npm run typecheck
npm run lint
npm test
npm run build:production
npx wrangler deploy --dry-run --config wrangler.deploy.jsonc
CLOUDFLARE_SECRETS_STORE_ID=<STORE_ID> npm run assistant:config
npx wrangler deploy --dry-run --config .wrangler/wrangler.assistant.generated.jsonc
```

Wrangler needs an authenticated Cloudflare session or `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the deployment environment. Do not use temporary preview-account deployment for production.

## Why old notes mention migrations 003 and 004

The V2 cleanup and roster architecture originally existed as `003_v2_schema_cleanup.sql` and `004_roster_architecture.sql`; DevKit commit `77be112` contains those files. The current DevKit worktree intentionally squashes their final schema into the fresh-install `001`/`002` baseline, and `database/timescale/schema_baseline_report.md` preserves the historical validation record. That is why Git history and an older API handoff could name 003/004 while the current migration directory contains only 001/002.

Do not apply the squashed baseline over a database that already recorded versions 003/004. The two-file baseline is for the new database; an existing migrated database needs an explicit upgrade plan based on its Goose state.
