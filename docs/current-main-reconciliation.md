# Dashboard current-main reconciliation — September 4, 2026

## Evidence and boundaries

The source of upstream requirements is freshly fetched GitHub main, [`2cb5bf0b5207346a08d2207515d972e6f8f048c7`](https://github.com/ClashKingInc/ClashKingDashboard/tree/2cb5bf0b5207346a08d2207515d972e6f8f048c7), stored locally as `refs/audit/origin-main-20260904`. The commit is dated September 1 at 10:19:48 -05:00; it was fetched September 4 at 16:13:02 UTC. The independent implementation remains detached at recovery snapshot `24039b5fc93ccbfa80bd07d59162a7987f9182dd`; that snapshot is not called current main.

The original checkout at `/Users/matthewanderson/GolandProjects/ClashKingDashboard` remains clean at `11ce67643055a9afbedde24b63a4945f779ae691`. There were no newer dirty Dashboard changes to import. No original files, branch, snapshot or worktree were changed. The upstream review below covers all 30 changed paths between that original commit and fresh main; it is not a claim that every API operation has been exercised end to end.

## Complete newer-upstream inventory

| Changed source paths | Requirement and disposition |
| --- | --- |
| `app/connect/layout.tsx`, `app/connect/page.tsx`, `app/connect/page.test.tsx`; `components/connected-apps-settings.tsx`, `components/connected-apps-settings.test.tsx`; `lib/connected-apps.ts`, `lib/connected-apps.test.ts` | Removed upstream and explicitly retired by the user. They remain absent from the implementation. Ordinary Discord login remains. |
| `lib/api/clients/connected-apps-client.ts`, its test; `lib/api/types/connected-apps.ts`; `lib/api/client.ts`, `lib/api/index.ts` | Removed consent endpoints/types and their client registration. The implementation keeps those removed and retains the other domain clients through the shared API packages. |
| `app/login/page.tsx`, `app/auth/callback/page.tsx` | Preserve a stored return path, otherwise go to `/servers`; remove the special Connect-host destination. The callback still caches the authenticated user and prefetches guilds, ordered with the bot present first and then by name. The implementation retains those behaviors through its Vite navigation and typed API transport. |
| `app/dashboard/settings/page.tsx`, its test | Remove the connected-app settings section only. Account language/theme/usage controls remain. |
| `components/locale-provider.tsx`, its test; `components/public-locale-provider.tsx`; `i18n/request.ts`; `lib/public-seo.ts` | Use complete locale catalogs without the consent-only English fallback. This review found the fallback still active in the rewrite and removed it from the client/public/SEO loaders. The old Next request-loader file is replaced by client locale loading in the deliberate Vite port. |
| `lib/message-catalog.ts`, its test; `messages/en.json`; `scripts/validate-messages.mjs` | Remove the old fallback helper/test, ConnectedApps English namespace and its validation exemption. The implementation now does the same; the validator still requires all 30 catalogs to match. |
| `workers/dashboard-edge/index.ts`, its test; `public/_headers`; `wrangler.deploy.jsonc`; `README.md` | Remove Connect-host routing, special asset rewrites, headers and deployment route. Marketing, Dashboard and www behavior remain. The Next RSC asset machinery is intentionally replaced by the Vite static application, not emulated by an extra proxy. |

The independent page inventory was compared with `git ls-tree` of that exact fresh-main commit: 47 source pages, 46 required pages, with `/admin/creators` explicitly retired. Unlike consent, creator review is still stale code in current main; the user's explicit retirement governs its disposition. Developer API access and creator-code support are separate and are not retired by this decision.

## Other concrete port corrections and retained behavior

The initial source comparison had already restored the same-Worker public `GET /api/tenor-media?url=…`, the giveaways loading view, original ticket identities and saved-message behavior, and original roster response fields. They remain applicable to fresh main. Tenor's helper is unchanged from source; it is not an authenticated central-API POST and does not introduce another general proxy. See the implementation checkpoint for its tests and limits.

This review compared the substantial form/transport changes in auto-boards, clans, general settings, links, roles, logs, reminders, and roster callers against the source rather than treating renamed framework files as missing pages. Shared schemas replace local decoders and browser requests target the retained central Dashboard API operations. The approved token setting remains off unless enabled; verified-account restrictions and the approved roster-removal/highlight decisions remain separate deliberate changes.

Two actual error-handling regressions were corrected:

1. **Role limits remain independent.** The old page kept a successful Town Hall result even when the Builder Hall HTTP request failed, and vice versa. The typed-client port's `Promise.all` discarded both results on either failure. `role-max-levels.ts` now settles the requests separately and the page applies each successful result, preserving the existing default levels and API calls. Three focused tests cover both successes and either failure.
2. **A successful reminder save stays successful.** After creating or cloning, the page refreshes its list. An HTTP error on that refresh used to leave the old source's successful mutation closed; the throwing typed client instead left its dialog open and displayed a failed-save error, inviting a duplicate submission. A shared refresh helper now logs refresh failure without reclassifying the confirmed mutation. Two new regression cases failed before the correction and passed afterward. They assert one POST, the original body, a closed dialog and the success message. The fixtures were corrected to match the actual string server ID and response status, so those assertions reach the real success path.

The reminder correction also isolates a network/decoder failure during that follow-up refresh. This is an implementation judgment using the same principle: once the write has been confirmed, a later read failure must not invite the user to repeat it. The list may remain stale until the next refresh; no automatic mutation retry or new API behavior was introduced.

## Verification and honest limits

Focused regression checks passed: eight reminder tests and three role-limit tests. The refreshed package pair was then cleanly installed and all 761 tests, all three TypeScript projects, lint, locale validation, production build, bundle budgets and Wrangler dry run passed. Full evidence and the coordinated local package hashes are recorded in [implementation-review.md](./implementation-review.md).

The upstream delta and current route inventory are reconciled; no known newer-upstream Dashboard feature remains unaccounted for in this review. This is still code-level evidence. It does not prove every combination of API permissions, live Discord login, cache freshness or production cross-origin cookies. All existing code tests, locale checks and production build remain required, and deployment/registry publication are separate work. No visual testing, deployment, production requests, commit, push or original-checkout edit was performed.
