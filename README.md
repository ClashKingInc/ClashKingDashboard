# ClashKing Dashboard

TypeScript 7, React 19, TanStack Router/Query, and Effect 4 frontend deployed as a Cloudflare Worker with static assets.

## Architecture

- `clashk.ing` serves the marketing homepage and legal pages.
- `dash.clashk.ing` serves authentication and the dashboard application.
- The browser calls the API Worker directly at `api.clashk.ing` through the shared `@clashking/api-client` and `@clashking/api-contracts` packages. This Worker never proxies API traffic.
- TanStack Router owns client navigation and code-splits each route; TanStack Query owns remote data state.
- Effect validates runtime configuration and is executed only at application boundaries.

The edge Worker in `workers/dashboard-edge` owns hostname redirects and then delegates documents and fingerprinted assets to Workers Static Assets. The build emits localized metadata shells for the indexable marketing and legal URLs; Cloudflare's SPA fallback serves the application shell for all other deep links.

Browser access tokens exist only in memory. The rotating refresh credential is a host-only `Secure`, `HttpOnly`, `SameSite=Strict` cookie set by `/v2/auth/web/*`. Startup restores the session through `/v2/auth/web/refresh`; `device_id` and non-authoritative user display data may remain in browser storage.

Public language variants use `/`, `/fr`, `/nl`, and their `/privacy` and `/terms` pages. Dashboard and authentication URLs stay locale-neutral; their locale preference is stored in `localStorage`, and the matching catalog is loaded in the browser.

## Development

Requirements: Node.js 26.1+ and npm 12+.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The Vite server listens on `http://localhost:3002`. The default example points API calls at `http://localhost:8000` and the roster assistant at `http://localhost:8788`; credentialed API CORS must explicitly allow the dashboard origin.

The roster AI assistant remains a separate Cloudflare Worker. Copy `.dev.vars.example` to the ignored `.dev.vars`, add the OpenAI project key and the same `AI_USAGE_SECRET` used by the API Worker, then run `npm run assistant:dev`.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build:production
```

`validate:messages` checks every locale for the same keys, value types, ICU placeholders, and valid plural selectors as English, and runs automatically before each production build. The build also enforces route-level bundle budgets. No validation command deploys or changes production traffic.

## Deployment

`wrangler.jsonc` defines the single dashboard Worker and its three custom domains. Production builds pin only public browser configuration:

```bash
npm run build:production
npx wrangler deploy --dry-run --config dist/clashking_dashboard/wrangler.json
```

Fingerprinted `/assets/*` files use immutable caching. The HTML shell is revalidated so a deployment or rollback cannot strand browsers on stale entry points. See [docs/production-release.md](docs/production-release.md) for coordinated release and rollback steps; do not run `npm run deploy:dashboard` until the API, contracts, and CORS release is ready.
