# Production release and rollback

This document prepares the coordinated release; it does not authorize a production cutover.

The browser origins are `https://clashk.ing` and `https://dash.clashk.ing`. They call the API Worker at `https://api.clashk.ing` directly. The roster assistant remains a separate Worker at `https://ai.clashk.ing`.

## Required release inputs

- Publish matching `@clashking/api-contracts` and `@clashking/api-client` release candidates, install those exact versions in every consumer, and verify their generated schemas and endpoint registry came from the same API revision.
- Apply required Goose migrations from the authoritative schema repository before enabling API code that reads or writes the new shape.
- Configure API CORS with exact allowed origins for the two browser hosts and local development. Credentialed requests cannot use a wildcard origin.
- Add `https://dash.clashk.ing/auth/callback` to Discord's allowed OAuth redirect URIs and keep the refresh cookie scoped for direct API requests.
- Confirm the API release exposes the body-based home activity POST endpoint and the statistics and league analytics GET endpoints (including `GET /v2/stats/armies`) before building the dashboard.
- Apply the canonical ticket-configuration migration before serving ticket settings. Verify active panels and buttons expose stable UUIDs, settings are keyed by canonical `ck:ticket:open:<panel-id>:<button-id>` values, archived panels remain immutable, and historical tickets still resolve their original panel identity.
- Keep ticket and roster publishing disabled until their API-owned publication records and Discord delivery handlers persist the exact channel/message result. Dashboard settings readiness alone does not prove persistent-message readiness.

## Release order

1. **Publish contracts and client.** Publish immutable release-candidate versions, verify their package contents and provenance, then lock every consumer to the coordinated versions. Do not publish an implementation that silently falls back to the legacy method or response shape.
2. **Apply schemas.** Run the authoritative Goose status and up commands for each affected datastore, record the applied versions, and verify the new objects before changing API traffic.
3. **Deploy the API Worker without switching clients.** Verify health, authentication refresh, exact-origin CORS, the home activity POST route, and the statistics and league analytics GET routes against the release-candidate contracts.
4. **Deploy dependent applications.** Deploy the admin and other consumers against the same package versions, then deploy the roster assistant if its API contract changed.
5. **Build and stage the dashboard Worker.** Run the validation commands below, upload or preview the Worker without changing custom-domain routing, verify the generated deployment contains the expected API and assistant origins, and verify its same-Worker `GET /api/tenor-media` resolver.
6. **Republish persistent messages deliberately.** Once the new Bot handlers and publication records are verified, replace legacy ticket and roster messages with canonical `ck:` components. Do not enable a legacy-ID parser or assume old message locations can be recovered from configuration that never stored them.
7. **Cut over deliberately.** Only after the cross-repository checks pass, attach or promote the staged dashboard Worker to the production domains. This step requires separate production authorization.

## Dashboard validation and staging

Use the repository's declared Node.js 26.1+/npm 12+ toolchain:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build:production
npx wrangler deploy --dry-run --config dist/clashking_dashboard/wrangler.json
```

`build:production` embeds `https://api.clashk.ing`, `https://ai.clashk.ing`, and the production Discord client ID in browser assets. The dashboard Worker has no runtime secrets. The local dry-run does not upload or switch traffic; an upload requires an authenticated Cloudflare session or a narrowly scoped API token.

The roster assistant still requires `OPENAI_API_KEY` and `AI_USAGE_SECRET` in Cloudflare Secrets Store. Its generated Wrangler configuration must bind the same `AI_USAGE_SECRET` value that the API Worker expects.

## Rollback

Roll back in the reverse dependency direction, keeping schemas forward-compatible unless an explicit down migration has been reviewed and authorized.

1. **Dashboard first.** Redeploy the last known-good dashboard Worker version or restore its previous Cloudflare deployment. Because documents are revalidated and assets are content-addressed, clients will load that version's matching entry point and chunks.
2. **Other clients next.** Restore any dependent application that consumed the new contracts before rolling back the API.
3. **API after clients.** Restore the previous API Worker only after no active client requires the new statistics, league analytics, or home activity contracts. Recheck authentication and exact-origin CORS after promotion.
4. **Packages stay immutable.** Deprecate a bad release candidate and publish a new version; never overwrite an existing package version.
5. **Schemas last and usually not down.** Prefer a forward repair. Run a down migration only when it is explicitly proven safe for production data and separately authorized.

Record the Cloudflare deployment IDs, package versions, schema versions, API commit, dashboard commit, validation output, and the person authorizing cutover. Those values are the rollback coordinates; a branch name or mutable tag is not sufficient.
