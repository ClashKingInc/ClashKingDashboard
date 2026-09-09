# Copilot instructions for ClashKing Dashboard

ClashKing Dashboard is a TypeScript 7, React 19, Vite, TanStack Router/Query application deployed on Cloudflare Workers Static Assets.

## Project map

- `src/router.tsx`: client route tree and route-level code splitting.
- `app/`: route components retained from the product surface.
- `components/ui/`: reusable shadcn/ui primitives.
- `components/dashboard/`: dashboard feature components.
- `lib/api/`: temporary migration facade; endpoint execution and public schemas belong in `@clashking/api-client` and `@clashking/api-contracts`.
- `workers/dashboard-edge/`: hostname redirects and static-asset delegation only.
- `messages/`: translation catalogs for every supported locale.

## Coding rules

1. Keep the browser application client-rendered and route work code-split.
2. Use TanStack Query for remote state and TanStack Router for navigation and URL state.
3. Run Effect programs at explicit boundaries; do not leak Effects through React components.
4. Do not add dashboard API proxy routes, duplicate API response interfaces, or unchecked generic `response.json<T>()` calls.
5. Import endpoint contracts from `@clashking/api-contracts` and execute them through `@clashking/api-client`.
6. Reuse existing components and translate all user-facing text.
7. Preserve in-memory access tokens, refresh-cookie rotation, PKCE, and exact-origin credentialed CORS behavior.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build:production`. Do not deploy as part of validation.
