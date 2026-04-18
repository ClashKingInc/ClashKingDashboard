# Copilot Instructions for ClashKing Dashboard

This file gives repository-specific guidance for AI coding agents working in this project.

## About ClashKing Dashboard

ClashKing Dashboard is the web control panel for configuring ClashKing bot settings for Discord servers in a clear and user-friendly way.

## Primary goals

- Keep the Next.js App Router codebase stable, typed, and production-safe.
- Prefer small, focused changes over broad refactors.
- Match existing architecture, naming, and component patterns.

## Stack and runtime

- Next.js 16 App Router, React 19, TypeScript 5.
- Tailwind CSS 4 and shadcn/ui.
- i18n via next-intl (`app/[locale]`, `messages/*.json`).
- Tests with Vitest.
- Dev and prod app port is `3002`.

## Project map

- `app/`: routes, layouts, and Next.js API proxy endpoints.
- `components/ui/`: reusable shadcn/ui primitives.
- `components/dashboard/`: dashboard-specific feature components.
- `lib/api/`: type-safe API SDK (domain clients, core base client, types).
- `lib/*.ts`: shared utilities (cache, locale preference, theme, PKCE, utils).
- `messages/`: translation JSON files for all supported locales.

## Coding rules

1. Prefer Server Components by default. Add `"use client"` only when required.
2. Keep TypeScript strict; avoid `any` unless there is a clear and documented reason.
3. Reuse existing components before creating new ones.
4. Follow existing file placement and naming conventions.
5. Keep comments concise and only where logic is not obvious.

## API and data access

1. Preserve the proxy pattern:
   - Browser-facing calls should go through Next.js routes in `app/api/**`.
   - Keep auth/header pass-through behavior intact.
2. Extend SDK clients in `lib/api/clients/**` for new endpoints when possible.
3. Retry behavior in `lib/api/core/base-client.ts` is intentional:
   - Retry transient failures once for idempotent `GET` requests only.
   - Do not add automatic transient retries for non-`GET` requests.
   - Keep `401` token refresh retry flow working.
4. Do not hardcode API secrets, tokens, or private URLs.

## i18n and UX

1. All user-facing text must be translatable.
2. When adding UI strings, update all locale files under `messages/*.json`.
3. Keep translation keys aligned across every locale file.
4. If a new locale is added, update i18n routing/config and provide complete translations for that locale.
5. Keep locale-aware routes under `app/[locale]/**`.

## Testing expectations

1. Add or update unit tests for behavior changes, especially in `lib/**`.
2. For non-trivial UI logic changes, add component tests where practical.
3. Keep tests deterministic by mocking network/time dependencies where needed.

## Validation before completion

Run relevant checks before marking work complete:

- `npm run lint`
- `npm run test`
- `npm run build`

CI expects typecheck (`npx tsc --noEmit`), lint, tests with coverage, build, and a security audit.

## Pull request expectations

1. Keep diffs focused and minimal.
2. Include tests for behavior changes, especially in `lib/**`.
3. Avoid unrelated refactors in feature PRs.
4. Document new environment variables in `README.md` when introduced.

## Safety constraints

- Never commit secrets, tokens, or `.env` content.
- Do not weaken auth, permission checks, or input validation.
- Prefer defensive error handling for API and network code.