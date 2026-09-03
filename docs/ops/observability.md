# Observability runbook — Naija Jollof

Errors go to **Sentry**. Structured app logs and uptime checks go to **Better Stack**. PostHog is deferred.

## Sentry (errors)

| Surface | Project (org `naija-jollof-waterloo`) |
|---------|--------------------------------------|
| Web (Next / CF Workers) | `naijajollofw-web` |
| Kitchen Expo | `naijajollofw-kitchen` |
| Diner Expo | `naijajollofw-diner` |

**Env:** `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (source maps at build), `SENTRY_ORG`, `SENTRY_PROJECT`.

**Alerts (configure in Sentry UI):**

1. New issue in production → email/Slack the on-call.
2. Spike in error volume (e.g. >N events / 5m) → page.
3. Unhandled React `global-error` / mobile crash → high priority.

**Releases:**

- Web: Sentry Next.js plugin uploads source maps on `next build` / OpenNext deploy when `SENTRY_AUTH_TOKEN` is set.
- Mobile: EAS builds upload maps via `@sentry/react-native/expo` + `SENTRY_AUTH_TOKEN` (see `mobile/README.md`).

**Mobile capture:** Staff and diner `apiFetch` report non-401 failures and network errors with `api_path` / `api_method` / `api_status` tags (no tokens).

## Better Stack (logs)

1. Create a **Logs → HTTP source**.
2. Set Wrangler / production secret `BETTERSTACK_SOURCE_TOKEN` to the source token.
3. Optional: `BETTERSTACK_INGEST_URL` if the source uses a non-default host (default `https://in.logs.betterstack.com`).
4. `lib/utils/logger.ts` ships `info` / `warn` / `error` as JSON; secrets-like keys are redacted. Console logging always remains.

Local / CI without the token: logs stay on stdout only.

## Better Stack (uptime)

1. Create a **Uptime monitor** (HTTP) against production:  
   `GET https://<your-prod-host>/api/health`
2. Expect **200** with body `status: "ok"`. Treat **503** (`status: "degraded"`, e.g. DB down) as down.
3. Alert channel: same Slack/email as Sentry for ops.
4. Check interval: 1–3 minutes; regions: NA + one other.

Health payload (no secrets):

```json
{
  "status": "ok",
  "service": "naija-jollof",
  "timestamp": "...",
  "checks": { "database": "ok" }
}
```

## Security headers

Web responses set CSP, `X-Frame-Options`, `X-Content-Type-Options`, Referrer-Policy, and Permissions-Policy via `next.config.ts`. Spot-check with browser DevTools / securityheaders.com after each deploy that touches headers.

## Secrets checklist (prod)

Never commit values. Mirror names in `.env.example`.

**Core:** `AUTH_SECRET`, `DATABASE_URL`  
**Observe:** `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `BETTERSTACK_SOURCE_TOKEN`, optional `BETTERSTACK_INGEST_URL`  
**Payments / delivery:** Square, Uber Direct, DoorDash as configured  
**Email / media / bot:** Resend, R2, Turnstile, Sanity, OpenAI / AI Gateway  

Wrangler: `npx wrangler secret put BETTERSTACK_SOURCE_TOKEN` (and peers) for production Worker.
