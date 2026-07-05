# ClashKing Dashboard — Audit & Action Plan

_Audit date: 2026-07-05 · Baseline: `main` @ 70a9b4a_

## Current health snapshot

What is already in good shape and should be preserved:

- **CI**: typecheck, lint, tests + coverage, `npm audit`, build, and SonarCloud all run on every PR.
- **Tests**: 264 tests across 21 files, all green. `lib/` (SDK core, auth, caches, utils) is well covered.
- **TypeScript**: `tsc --noEmit` passes with zero errors; strict mode enabled.
- **Dependencies**: 0 `npm audit` vulnerabilities (prod), almost everything on latest.
- **i18n**: en/fr/nl message files are key-complete relative to each other (no missing keys).
- **API SDK** (`lib/api`): clean modular architecture, typed clients, shared token refresh with race protection, transient GET retry with abort-aware backoff.
- **Rosters module**: the `_components/_hooks/_lib` structure with co-located tests is the reference pattern the rest of the dashboard should converge to.

The issues below are ordered by priority: P0 (security/correctness) → P3 (polish).

---

## P0 — Security

### 1. Add `state` parameter to the Discord OAuth flow — S ✅ _(done)_
`lib/auth/discord-login.ts` builds the authorize URL with PKCE but **without a `state` parameter**, and the callback page never validates one. PKCE protects against code interception but not against login-CSRF / authorization-code injection (an attacker can complete their own flow in the victim's browser). Generate a random `state`, store it in `sessionStorage` next to the code verifier, and reject the callback when it does not match.

### 2. Add security headers in `next.config.ts` — S/M ✅ _(done: CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS)_
No `headers()` configuration exists: no CSP, no `X-Frame-Options`/`frame-ancestors`, no `Referrer-Policy`, no `Permissions-Policy`, no HSTS. Because tokens live in `localStorage` (see #3), a single XSS is full account compromise, so a Content-Security-Policy is the main mitigation available today. Start with a report-only CSP, then enforce.

### 3. Move tokens out of `localStorage` (or explicitly accept + mitigate) — L
`access_token`, `refresh_token` and the serialized `user` are stored in `localStorage` and read in ~57 places. Any XSS exfiltrates a long-lived refresh token. The proxy layer (`app/api/*` routes forwarding `Authorization`) already exists, so the natural target architecture is: tokens in `httpOnly` `SameSite` cookies set by a Next route handler, proxy routes reading the cookie instead of the header. This also unlocks real server-side auth guards (#4). Large change — plan it as its own project; in the meantime #1 and #2 reduce exposure.

### 4. Server-side auth guard for `/dashboard` and `/servers` — M 🔶 _(client-side guard centralized in useRequireAuth with return-URL support; true server-side enforcement blocked on #3)_
`proxy.ts` (middleware) only handles i18n. Auth is enforced per-page, client-side, inconsistently: protected pages render their shell first, then fetch, then maybe redirect. Until #3 lands, at minimum centralize the client-side guard (one hook/wrapper used by the dashboard layout instead of copy-pasted checks per page). After #3, enforce it in the middleware.

---

## P1 — Bugs & robustness

### 5. No `error.tsx` anywhere — S ✅ _(done)_
The only special file is the root `app/not-found.tsx`. Any render/runtime error in a dashboard page bubbles to Next's default white error screen. Add a root `global-error.tsx` plus an `error.tsx` under `app/[locale]/` and `app/[locale]/dashboard/[guildId]/` with a translated "retry" UI.

### 6. Only one `loading.tsx` in the whole app — S ✅ _(done: shared skeleton at the `[guildId]` segment covers all sections)_
Only giveaways has one. Every other dashboard section renders nothing while its client bundle loads. Add `loading.tsx` skeletons for the dashboard sections (the giveaways one is a good template).

### 7. Fetches in `useEffect` without cancellation — M 🔶 _(solved for pages migrated to TanStack Query — autoboards first; remaining pages migrate with #13)_
Only 3 `AbortController` usages across the app, while nearly every dashboard page fetches in `useEffect` and calls `setState` unconditionally in `.then`. Rapid navigation between guilds/pages can apply stale responses to the wrong view and triggers setState-after-unmount. Either wire `AbortController`/ignore-flags through the data hooks, or fold this into the TanStack Query migration (#13) which solves it wholesale.

### 8. Proxy routes assume the backend answers JSON — M ✅ _(done via upstreamJsonResponse in the shared proxy helper)_
All ~88 proxy handlers do `const data = await response.json()` with no guard. When the backend or an intermediary returns HTML (502/504 gateway pages), `.json()` throws, and the catch converts the real upstream status into a generic 500. Guard the parse (`response.json().catch(() => null)`) and forward the upstream status — best fixed once via the shared proxy helper (#12).

### 9. Hard redirect to login from the SDK refresh path — S ✅ _(done: return URL preserved through the login flow + clashking:auth-expired event)_
`base-client.ts:_doRefresh` performs `window.location.href = /{locale}/login` on refresh failure. A background fetch can thus yank the user out of a half-filled form with a full page reload, losing all state. Emit an "auth expired" event / callback and let the app decide (dialog, soft redirect preserving the return URL).

### 10. Native `alert()` used for validation & errors — S ✅ _(done)_
`autoboards/page.tsx` (9×) and `links/page.tsx` use blocking `alert()` while the rest of the app uses the shadcn toast system. Replace with `useToast`, and translate the messages (links' alert is hardcoded English).

### 11. Hardcoded English error strings in localized pages — M ✅ _(done for user-facing fallbacks via the shared Errors namespace; console logs intentionally stay English; rosters/giveaways internal hooks keep technical messages)_
~56 `"Failed to …"` strings are set into error state / toasts without going through `next-intl`, and 113 fr keys are still identical to en (mostly acceptable brand/technical terms — worth a pass to confirm). French/Dutch users see English errors exactly where reassurance matters most.

---

## P2 — Code quality & architecture

### 12. Collapse the 88 copy-pasted proxy routes — M ✅ _(done: 65 routes generated against proxyApiRequest, 19 bespoke-query routes patched with safe parsing, ~1,900 duplicated lines removed)_
88 of 91 `app/api/**/route.ts` files are the same ~30-line fetch-forward block. Options: (a) a shared `proxyRequest(request, path)` helper keeping explicit files, or (b) a catch-all `app/api/v2/[...path]/route.ts` with an allowlist. Either removes ~2,500 duplicated lines and gives one place to fix #8, timeouts, and logging.

### 13. Adopt TanStack Query for dashboard data — L 🔶 _(infra + provider in place, autoboards migrated as the reference; migrate remaining pages one by one)_
The dashboard currently combines a hand-rolled `ApiCache`, `dashboard-cache` normalizers, and per-page `useState`/`useEffect` pyramids (tickets: 59 `useState`, 11 `useEffect`). TanStack Query replaces cache + dedup + invalidation + loading/error states + cancellation (#7) with less code. The README already (incorrectly) claims it is used. Migrate page by page, starting with a simple one (links or autoboards).

### 14. Split the monolithic pages — L (incremental) 🔶 _(started: tickets pure helpers extracted to _lib with tests; components remain)_
Top offenders: `embed-editor.tsx` 3,199 lines (Sonar complexity rules are suppressed for it), `tickets/page.tsx` 2,989, `rosters/page.tsx` 2,214, `rosters/[rosterId]/page.tsx` 2,144, `wars/page.tsx` 1,631, `bans-and-strikes/page.tsx` 1,622, `giveaways/GiveawaysClient.tsx` 1,389. Apply the rosters `_components/_hooks/_lib` pattern. Extracted hooks/libs become unit-testable (#18). Suggested order: tickets → embed-editor → wars → bans-and-strikes.

### 15. Reduce `any` usage — M (incremental) 🔶 _(dashboard-cache typed; no-explicit-any enabled at warn (~200 legacy warnings visible to hold the line))_
162 `any` occurrences, concentrated in `dashboard-cache.ts` normalizers, `buildQueryString`, and page-level payload handling. Type the normalizers against the existing `lib/api/types` and enable `@typescript-eslint/no-explicit-any` as `warn` to hold the line.

### 16. Remove dead code & dependencies — S ✅ _(done)_
- `lib/api-client.ts` (legacy client) is imported nowhere (only mentioned in `lib/api/README.md`) — delete it and its Sonar exclusions.
- `axios` is a declared dependency with zero imports — remove.
- `NEXTAUTH_SECRET`/`NEXTAUTH_URL` in `ci.yml` build env: NextAuth is not used — remove.
- Device-ID generation is duplicated (`lib/api-client.ts` + `auth/callback/page.tsx`) — after deleting the legacy client, extract the callback version into `lib/auth/device-id.ts`.

### 17. Fix the README — S ✅ _(done)_
It states Next.js 15 (elsewhere 16), Zustand, TanStack Query + Axios, NextAuth.js v5 — none of which are in `package.json` — and "Node.js 25+" as a prerequisite. Misleads every new contributor; align with reality.

---

## P3 — Tests, accessibility, performance, product

### 18. Extend test coverage to dashboard logic — M (incremental) 🔶 _(ongoing: +31 tests this pass — proxy helper, device-id, format-count, tickets _lib)_
Coverage is concentrated in `lib/`; Sonar's `sonar.coverage.exclusions` writes off all pages and components. That is fair for pure JSX, but the big pages contain substantial business logic (filtering, validation, payload building) that is untested precisely because it is trapped inside components. Track with #14: every extraction ships with tests, like `useGiveawayEntries` and the rosters `_lib` already do.

### 19. Accessibility pass — M 🔶 _(shared chrome icon buttons labeled; jsx-a11y baseline active via eslint-config-next; ~48 page-level icon buttons and an axe run remain)_
Only 12 `aria-label`/`aria-describedby` in the entire app; icon-only buttons (sidebar, table row actions) have no accessible name. Add labels, check focus traps in the custom popovers/comboboxes, and run axe on the main pages. Add `eslint-plugin-jsx-a11y` to keep it enforced.

### 20. Replace `<img>` with `next/image` — S ✅ _(done; remaining lint warnings are pre-existing `react-hooks/exhaustive-deps`, tracked by #7/#13)_
The 24 remaining ESLint warnings are all `@next/next/no-img-element` (player/clan popovers, loading screen, etc.). Mechanical fix; brings CI to zero warnings so new ones stand out.

### 21. Dynamic server count on the landing page — S ✅ _(done: server-side fetch with 6h revalidate behind optional `CLASHKING_API_TOKEN`, static fallback otherwise)_
`lib/constants.ts` hardcodes `SERVER_COUNT = "12.5k"`. Fetch from the existing stats endpoint (ISR/revalidate) or it will drift forever.

### 22. Ranking pages — L (product)
The README's only "Planned" item. The API surface (leaderboard client, `v1/leaderboard/*` proxies, CWL rankings) already exists, so this is mostly frontend work.

---

## Suggested sequencing

| Phase | Items | Theme |
|---|---|---|
| 1 — Quick wins (~1 week) | 1, 5, 6, 10, 16, 17, 20, 21 | Security header + OAuth state, error/loading boundaries, dead code, docs |
| 2 — Robustness | 2, 8, 9, 11, 12 | CSP, proxy consolidation, error handling & i18n of errors |
| 3 — Architecture | 13, 14, 15, 18 | TanStack Query, split monoliths, types, tests (incremental, page by page) |
| 4 — Strategic | 3, 4, 19, 22 | Cookie-based auth + middleware guard, a11y, Ranking feature |

Effort legend: **S** < ½ day · **M** ½–2 days · **L** > 2 days / incremental.
Status legend: ✅ done · 🔶 partially done / in progress.

## Items requiring work outside this repository

- **#3 (httpOnly cookie tokens)** needs the ClashKing API to issue/accept
  cookie-based sessions (or a Next-side token exchange endpoint contract).
  The in-repo groundwork (CSP, centralized guard, proxy layer) is done.
- **#22 (Ranking pages)** is a product feature that needs UX/scope
  definition before implementation; the API surface already exists.
