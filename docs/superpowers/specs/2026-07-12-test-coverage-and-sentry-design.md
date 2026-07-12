# Test Coverage + Sentry Design

**Date:** 2026-07-12  
**Status:** Approved (Approach 2; §1 tests approved; CI/Sentry per prior choices)

## Goal

Catch logic bugs early in CI, and surface production error/latency spikes in Sentry for `naija-jollof-waterloo` / `naijajollofw-web`.

## Decisions

| Topic | Choice |
|-------|--------|
| Test depth | C — Vitest coverage gates + critical-path tests + Playwright smoke |
| Sentry signals | B — Errors + performance tracing (no Session Replay yet) |
| Alerts | A — Email on new issues / error spikes |
| Approach | Layered quality stack |

## Test architecture

```
tests/unit/           # existing + new domain/service unit tests
tests/integration/    # API/service tests with mocked DB/externals
e2e/                  # Playwright storefront + staff smoke
```

### Vitest

- Environment: `node`
- Coverage via `@vitest/coverage-v8`
- Include: `lib/**`, `app/api/**` (exclude generated, types, configs)
- Initial thresholds: **70%** lines / functions / branches / statements on covered files; ratchet later
- Scripts: `test`, `test:watch`, `test:coverage`

### Critical-path unit/integration (first wave)

- Diner validation (register / password / address schemas)
- `handleApiError` reports unexpected errors to Sentry (when DSN present)
- Login-protection / password helpers where pure
- Cart/checkout validation edges already partially covered — extend as needed

### Playwright smoke

1. Storefront home loads (brand / menu signal)
2. Add item → cart reachable
3. Staff `/login` page renders (auth form present)

No live Square payment E2E in v1.

## CI (GitHub Actions)

On PR + push to `main`:

1. `npm ci`
2. `npm run lint`
3. `npm run test:coverage` (fails under threshold)
4. Playwright: install browsers + `npm run test:e2e` against production build when feasible; otherwise `next start` via `webServer`

Secrets: none required for unit tests. E2E uses local seed-free smoke only.

## Sentry

Org: `naija-jollof-waterloo`  
Project: `naijajollofw-web`  
SDK: `@sentry/nextjs`

### Files

- `instrumentation-client.ts` — browser errors + traces
- `sentry.server.config.ts` — Node server
- `sentry.edge.config.ts` — edge
- `instrumentation.ts` — register + `onRequestError`
- `app/global-error.tsx` — root React errors → `captureException`
- `next.config.ts` wrapped with `withSentryConfig` (org/project, tunnel `/monitoring`, source maps via `SENTRY_AUTH_TOKEN`)

### Sampling

- Dev: `tracesSampleRate: 1.0`
- Prod: `tracesSampleRate: 0.1` baseline; **1.0** for `/api/checkout` and `/api/diner/*` via `tracesSampler`
- No Session Replay integrations in v1

### Error capture rule

- Unexpected / 500 paths in `handleApiError` call `Sentry.captureException`
- Expected `AppError` / Zod validation do **not** spam Sentry (tag only if status ≥ 500)

### Env

```
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_AUTH_TOKEN=          # build-time source maps (secret)
SENTRY_ORG=naija-jollof-waterloo
SENTRY_PROJECT=naijajollofw-web
```

CSP `connect-src` must allow Sentry ingest (and tunnel stays same-origin via `/monitoring`).

### Alerts (email)

1. New issue (`first_seen_event`)
2. Error frequency spike (e.g. ≥ 20 events / 1 hour)

Notify issue owners / org members via email. Requires org auth token with `alerts:write` to create via API, or manual UI setup.

## Alerts (email) — manual setup

Sentry MCP cannot create alert rules in this environment. Create these in the UI:

1. Open https://naija-jollof-waterloo.sentry.io/alerts/rules/?project=naijajollofw-web
2. **New issue alert** — When: `A new issue is created` → Action: `Send a notification via email` to Issue Owners / your user
3. **Error spike alert** — When: `Number of events in an issue is more than 20 in 1 hour` → Action: email same target
4. Optional metric alert: error rate / failed transactions for `/api/checkout` and `/api/diner/*`

## DSN

Add Client Key DSN from:
https://naija-jollof-waterloo.sentry.io/settings/projects/naijajollofw-web/keys/

to `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` in `.env` and Vercel.

For source maps, create an auth token with `project:releases` + `org:read` and set `SENTRY_AUTH_TOKEN` in Vercel build env.
