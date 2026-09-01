# ClashKing Dashboard

Vinext/React dashboard and static ClashKing marketing site.

## Architecture

- `clashk.ing` serves the statically prerendered marketing homepage and legal pages.
- `dash.clashk.ing` serves the static dashboard application.
- `connect.clashk.ing` serves the standalone connected-app consent flow.
- Production browser API calls go directly to `https://api.clashk.ing`; local development calls the Go API directly on `http://localhost:8000`.
- Dashboard routes are finite static shells. Guild context is carried as `?guildId=...`; roster detail uses `?guildId=...&rosterId=...`.
- The Go API owns Discord and email authentication, refresh-cookie rotation, Discohook resolution, uploads, and all application data.

Browser access tokens exist only in memory. The rotating refresh credential is a host-only `Secure`, `HttpOnly`, `SameSite=Strict` cookie set by `/v2/auth/web/*`. Startup restores the session through `/v2/auth/web/refresh`; `device_id` and non-authoritative user display data may remain in browser storage.

English, French, and Dutch messages remain in `messages/*.json`. Public language variants use real static paths (`/`, `/fr`, `/nl`, and their `/privacy` and `/terms` pages). Dashboard and authentication URLs stay locale-neutral; their locale preference is stored in `localStorage`, and the matching JSON bundle is loaded in the browser.

## Development

Requirements: Node.js 26.1+ and npm 12+.

```bash
npm install
npm run dev
```

The development server listens on `http://localhost:3002`. Configure `.env.local` from `.env.example`; the Go API listens on `http://localhost:8000`. Those ports are separate origins, so credentialed CORS still applies, but they share the localhost site and its host-only development refresh cookie. Production builds override the local API URL.

The roster AI assistant is a separate Cloudflare Worker. Copy `.dev.vars.example` to the ignored `.dev.vars`, add the OpenAI project key and the same `AI_USAGE_SECRET` used by the Go API, then run `npm run assistant:dev`. The roster builder streams through `http://localhost:8788/chat` and attaches the short-lived web access token. GPT-5.6 Luna runs through the OpenAI Responses API, with server-side compaction for long roster conversations. The graphics editor does not use this Worker or expose an AI assistant.

## Validation

```bash
npm run lint
npm run validate:messages
npm test
npx tsc --noEmit
npm run build
```

`npm run validate:messages` requires French and Dutch to have the same keys, value types, and ICU placeholders as English. It runs automatically before every Vinext static build. `npm run preview` serves the generated assets with Wrangler. Deployment is intentionally separate and is not performed by validation.

## Deployment

One Cloudflare Worker serves the static build on `clashk.ing`, `dash.clashk.ing`, `connect.clashk.ing`, and `www.clashk.ing`. The Worker redirects the dashboard hostname root to `/login`, where an existing session continues to `/servers`; it gives connected apps permanent `https://connect.clashk.ing/{application_id}` URLs, moves other application routes from the marketing hostname to the dashboard hostname, and redirects `www` to the apex.

A second Worker in `workers/roster-assistant` serves `ai.clashk.ing`. Its `/chat` route asks `https://api.clashk.ing` to authorize and meter roster requests, then exposes only typed roster tools to a network-disabled Dynamic Worker. `OPENAI_API_KEY` and `AI_USAGE_SECRET` must be stored as Cloudflare Worker secrets; `AI_USAGE_SECRET` must exactly match the API value.

Production builds pin the browser API and Discord application configuration before uploading assets, so a developer's `.env.local` cannot leak into a deployment:

```bash
npm run build:production
npm run deploy:assistant
npm run deploy:dashboard
# or deploy both Workers in that order
npm run deploy
```

Cloudflare serves the generated HTML, JavaScript, CSS, and media from Workers Static Assets. Fingerprinted `/_next/static/*` files use immutable browser caching; HTML keeps Cloudflare's revalidation behavior so new deployments and rollbacks take effect without leaving stale documents in browsers.

Vinext reads `wrangler.jsonc` while prerendering. Production deployment uses `wrangler.deploy.jsonc` so the hostname-routing Worker can wrap those assets without replacing Vinext's build-time server.

## SEO

The homepage, privacy policy, and terms are static in English, French, and Dutch, with localized titles, descriptions, canonical URLs, `hreflang`, Open Graph/Twitter metadata, `robots.txt`, and sitemap alternates. Cloudflare applies `X-Robots-Tag: noindex, nofollow` to every dashboard-host response; private application routes also carry page-level `noindex` metadata.
