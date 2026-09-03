# Production readiness design

**Date:** 2026-09-03  
**Status:** Implementing  
**Surfaces:** Web (Cloudflare / Next), Kitchen Expo, Diner Expo

## Goals

Prevent most regressions before merge; detect and fix the rest quickly. Not a claim of zero bugs.

## Locked defaults

| Concern | Tool |
|---------|------|
| Exceptions | Sentry (web + kitchen + diner) |
| Structured logs | Better Stack HTTP source via `logger` |
| Uptime | Better Stack monitor on `GET /api/health` |
| Local pre-push | lint, typecheck, Prisma validate, coverage, `npm audit` |
| CI extras | `npm run build`, Semgrep (`p/typescript` + `p/nextjs`), Dependabot |
| Pre-commit | lint-staged (ESLint on staged JS/TS) |
| Product analytics | PostHog **deferred** |

## Observe

- Mobile `apiFetch` captures non-401 failures + network errors (no tokens/PII).
- Web `logger` ships info/warn/error to Better Stack when `BETTERSTACK_SOURCE_TOKEN` is set; redacts secret-like keys.
- `/api/health` checks DB (`SELECT 1`); **200** ok / **503** degraded. Public; no secrets in body.
- Runbook: [`docs/ops/observability.md`](../../ops/observability.md).

## Ship gates

```
pre-commit → lint-staged
pre-push   → npm run prepush
CI         → unit + mobile typecheck + e2e + web build + Semgrep
Dependabot → weekly npm (root, mobile/staff, mobile/customer) + GitHub Actions
```

Deploy remains `npm run deploy` (OpenNext + Cloudflare). CI `next build` is a compile gate only.

## Security

Critical mutating routes use **durable** rate limits (`assertDurableRateLimit` / AuthChallenge store), keyed by user id when authenticated:

- Staff password OTP / confirm, email confirm, profile PATCH
- Mobile login (IP)
- Checkout / cart-add (already)
- Delivery quote/create, store update, customer create, order fulfill

In-memory `checkRateLimit` may remain on lower-risk GETs / AI / geocode / menu image ops.

Headers: CSP and related security headers stay in `next.config.ts` (see observability/security notes).

## Secrets checklist (production)

Set in Cloudflare Wrangler secrets / EAS / CI as appropriate — never commit values.

| Secret | Used for |
|--------|----------|
| `AUTH_SECRET` | Sessions / JWT |
| `DATABASE_URL` | Postgres |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error tracking |
| `SENTRY_AUTH_TOKEN` | Source maps upload |
| `BETTERSTACK_SOURCE_TOKEN` | Log shipping |
| `BETTERSTACK_INGEST_URL` | Optional regional ingest |
| Square / Uber / DoorDash / Resend / R2 / Turnstile / Sanity / OpenAI | Integrations per `.env.example` |

Client bundles must only receive `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` values.

## Out of scope

PostHog, passkeys, EAS build on every push, rewriting every in-memory limiter.
