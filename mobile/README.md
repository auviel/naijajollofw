# Mobile apps

Two Expo SDK 57 apps talk to the Next.js API:

| App | Folder | Audience | Store listing |
|-----|--------|----------|----------------|
| **Naija Jollof** | [`customer/`](./customer) | Guests | Public App Store / Play |
| **Naija Jollof Kitchen** | [`staff/`](./staff) | Staff only | **Not public** — TestFlight / closed Play track |

Point `EXPO_PUBLIC_API_URL` at the Next.js origin (LAN IP + port for Expo Go).

## Sentry

| App | Sentry project | Env |
|-----|----------------|-----|
| Diner | `naijajollofw-diner` | `EXPO_PUBLIC_SENTRY_DSN` in `customer/.env` |
| Kitchen | `naijajollofw-kitchen` | `EXPO_PUBLIC_SENTRY_DSN` in `staff/.env` |

Copy from `.env.example`, paste the project DSN from Sentry, restart Metro with `-c`. For EAS source maps / native symbols, set `SENTRY_AUTH_TOKEN` in EAS secrets (org `naija-jollof-waterloo`). Do not commit tokens or DSNs.

## Checks (what catches user errors)

Layered so a missed field, bad tip, or broken native plugin fails *before* a diner hits it:

1. **Domain unit tests** (`npm test` at repo root) — Zod / form validation for checkout, signup, tip caps, delivery lat/lng. These catch “user typed garbage” messages.
2. **Playwright e2e** (`npm run test:e2e`) — real browser: empty signup, empty checkout, delivery toggle, tip chip, simulate pickup order. Needs seed + `CHECKOUT_SIMULATE_PAYMENTS=true`.
3. **Mobile typecheck** (`npm run typecheck:mobile`) — diner + kitchen `tsc`. Runs in CI. Does **not** prove Square IAP or native modules.
4. **EAS dev / preview builds** — compile native code (Square In-App Payments, notifications, splash). Expo Go cannot catch plugin/native crashes.

Web `npm run prepush` (Husky) stays lint + web typecheck + coverage + audit. Mobile typecheck is CI + local when you touch `mobile/`.

```bash
# from repo root
npm test
npm run test:e2e
npm run typecheck:mobile
```

## One-time EAS setup

1. Expo account (org `auviel` already in `app.json`).
2. Install CLI: `npm i -g eas-cli`
3. In each app folder:

```bash
cd mobile/customer   # then again in mobile/staff
npx eas init         # writes the real projectId into app.json
```

4. GitHub: both apps are linked to [`auviel/naijajollofw`](https://github.com/auviel/naijajollofw) with base dirs `/mobile/customer` and `/mobile/staff`. Builds are **manual only** (no push triggers) to avoid burning Expo free-plan minutes — use Actions → **EAS preview**, or `eas workflow:run .eas/workflows/preview.yml` in each app folder. Needs repo secret `EXPO_TOKEN` for the GitHub Action.
5. Apple / Google credentials via `eas credentials` when you first build iOS/Android.

## Build profiles

| Profile | Who installs it | API URL | Use |
|---------|-----------------|---------|-----|
| `development` | Internal dev client | from local `.env` | Square IAP, push, native debug |
| `preview` | Internal Testers | `https://naijajollofw.ca` | Staff + diner QA before store |
| `production` | Diner: store. Kitchen: internal only | production origin | Release |

```bash
cd mobile/customer
eas build --profile development --platform ios
eas build --profile preview --platform all
eas build --profile production --platform all
eas submit --profile production --platform ios
```

Kitchen `production` is **internal distribution**, not a public listing.

Trigger preview builds from GitHub → Actions → **EAS preview** (workflow dispatch).
