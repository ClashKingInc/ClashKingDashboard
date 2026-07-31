# ClashKing Dashboard

Vinext/React dashboard and static ClashKing marketing site.

## Architecture

- `clashk.ing` serves the statically prerendered marketing homepage and legal pages.
- `dashboard.clashk.ing` serves the static dashboard application.
- Browser API calls go directly to `https://v2-api.clashk.ing`.
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

The development server listens on `http://localhost:3002`. Configure `.env.local` from `.env.example`; production defaults to `https://v2-api.clashk.ing`.

## Validation

```bash
npm run lint
npm run validate:messages
npm test
npx tsc --noEmit
npm run build
```

`npm run validate:messages` requires French and Dutch to have the same keys, value types, and ICU placeholders as English. It runs automatically before every Vinext static build. `npm run preview` serves the generated assets with Wrangler. Deployment is intentionally separate and is not performed by validation.

## SEO

The homepage, privacy policy, and terms are static in English, French, and Dutch, with localized titles, descriptions, canonical URLs, `hreflang`, Open Graph/Twitter metadata, `robots.txt`, and sitemap alternates. Cloudflare applies `X-Robots-Tag: noindex, nofollow` to every `dashboard.clashk.ing` response; private application routes also carry page-level `noindex` metadata.
