# deliverGO

Store manager dashboard for dispatching **Uber Direct** and **DoorDash Drive** deliveries in Canada.

Compare carrier quotes side-by-side, pick the best fee, and track deliveries from one dashboard.

## Docs

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Code structure, layers, scaling principles |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Phased build plan with checkboxes |
| [STYLING.md](./STYLING.md) | UI tokens and component guidelines |

## Stack

- **Next.js 16** (App Router) + TypeScript
- **PostgreSQL** + Prisma
- **Tailwind CSS v4** (Uber-inspired design tokens)
- **Uber Direct API** (sandbox + robo courier)
- **DoorDash Drive API** (sandbox — no real Dasher dispatched)

## Prerequisites

- Node.js 20+
- Docker (for local Postgres)
- Uber Direct sandbox credentials from [direct.uber.com](https://direct.uber.com)
- Mapbox access token (Phase 4)

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Uber sandbox credentials, optional DoorDash credentials, and Mapbox token when ready.

Get a Mapbox access token from [mapbox.com](https://account.mapbox.com/access-tokens/) (used for Canadian address geocoding).

Generate an auth secret:

```bash
openssl rand -base64 32
```

Set the output as `AUTH_SECRET` in `.env`.

### 3. Start PostgreSQL

```bash
docker compose up -d
```

Connection string (already in `.env.example`):

```
postgresql://delivergo:delivergo@localhost:5433/delivergo?schema=public
```

> **Note:** Docker Postgres runs on port **5433** to avoid conflicts with a local Homebrew PostgreSQL install on 5432.

### 4. Database

```bash
npm run db:migrate
npm run db:seed
```

**Seed credentials (local dev only):**

| Account | Email | Password | Notes |
|---------|-------|----------|-------|
| Staff | `store.manager@delivergo.local` | `DeliverGODev2026!` | `/login` (or `/staff` → login) |
| Diner | `diner@delivergo.local` | `DeliverGODev2026!` | Storefront `/signin` — verified email + default address |

| Field | Value |
|-------|-------|
| Store | Naija Jollof Waterloo — 280 Lester St #102, Waterloo, ON |
| Store id | `seed-store-waterloo` |
| DoorDash store id | `DOORDASH_EXTERNAL_STORE_ID` in `.env` (e.g. `default`) |

After seeding, register the store with DoorDash:

```bash
npm run doordash:register-store
```

This reads your deliverGO store from the database and calls the DoorDash Business & Store API (`POST /developer/v1/businesses/{id}/stores`). Re-run anytime to refresh name, phone, or address. Pass a different store id as an optional argument.

See [DoorDash setup](#doordash-drive-setup) below.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the storefront.

- Staff login: `/login` (alias `/staff` → login or dashboard)
- Kitchen board: `/dashboard` (requires staff login; guests are redirected to `/login`)
- Session API: `/api/me`
- Geocode API: `POST /api/geocode` (auth required, Canada only)
- Health check: `/api/health`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Prisma Studio |
| `docker compose up -d` | Start local Postgres |

## Project structure

```
app/           → Routes (thin handlers)
components/    → UI (ui/, layout/, features/)
lib/
  domain/      → Types, validation, pure logic
  services/    → Use cases
  db/          → Prisma client + repositories
  integrations/→ Uber, DoorDash, Mapbox
prisma/        → Schema + migrations + seed
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

## Sandbox mode

When `UBER_LIVE_MODE=false` (default in `.env.example`):

- A **test-mode banner** appears at the top of the dashboard
- A **Test mode** badge appears in the sidebar and top bar
- **Robo courier** is injected automatically on delivery create — no real drivers are dispatched
- Deliveries are stored with `liveMode: false`

### Robo courier behavior

In sandbox, Uber simulates a full delivery trip without a human courier:

1. Create a delivery → status starts as `pending`
2. Uber sends `dapi.status_changed` webhooks as the robo courier progresses
3. Typical progression: pending → en route to pickup → at pickup → en route to dropoff → at dropoff → completed
4. On completion, deliverGO fetches proof-of-delivery (photo/signature if configured)

The detail page auto-refreshes every 30 seconds, but webhooks update status in near real time when your webhook URL is reachable.

### Sandbox test checklist

Use this before going live:

- [ ] `POST /api/deliveries/quote` returns a fee in CAD (sandbox credentials configured)
- [ ] `POST /api/deliveries` returns a delivery with `tracking_url` and `liveMode: false`
- [ ] Webhook URL registered and `UBER_WEBHOOK_SIGNING_SECRET` set (or client secret fallback)
- [ ] Robo courier webhooks advance status on the delivery detail timeline
- [ ] Full flow: login → new delivery → quote → send → track → complete → POD visible

### Going to production

1. Obtain **live** Uber Direct credentials in the [Uber Direct dashboard](https://direct.uber.com)
2. Update Vercel env vars: `UBER_CLIENT_ID`, `UBER_CLIENT_SECRET`, `UBER_CUSTOMER_ID`
3. Set `UBER_LIVE_MODE=true` and redeploy
4. Robo courier spec is **not** sent when live mode is on — real couriers are dispatched
5. Register production webhook URL in Uber Developer Dashboard → Settings → Ride Requests
6. Pilot with one store before wider rollout

## Deployment (Vercel + Neon)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com)
2. Connect a [Neon](https://neon.tech) Postgres database (Vercel integration recommended)
3. Set environment variables in Vercel:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Neon **pooled** connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `UBER_*` | Sandbox creds first; switch to live when ready |
| `UBER_LIVE_MODE` | `false` until production pilot |
| `DOORDASH_EXTERNAL_BUSINESS_ID` | Merchant id (often `default` in sandbox) |
| `DOORDASH_EXTERNAL_STORE_ID` | Store id (often `default` in sandbox) |
| `DOORDASH_LIVE_MODE` | `false` until DoorDash production access |
| `DOORDASH_WEBHOOK_AUTHORIZATION` | From DoorDash webhook settings |
| `MAPBOX_ACCESS_TOKEN` | Required for geocoding |
| `UBER_WEBHOOK_SIGNING_SECRET` | From Uber dashboard webhook settings |
| `WHATSAPP_ENABLED` | Set `true` after Meta WhatsApp Cloud API is configured |
| `WHATSAPP_ACCESS_TOKEN` | Meta system user token |
| `WHATSAPP_APP_SECRET` | Meta app secret (webhook signature verify) |
| `WHATSAPP_VERIFY_TOKEN` | Custom string for GET webhook verification |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Phone number ID from API Setup |
| `WHATSAPP_STAFF_PHONES` | Comma-separated allowlisted staff phones (+15195550100) |
| `WHATSAPP_STORE_ID` | Optional store ID (defaults to first store in DB) |

4. Run migrations against Neon once:

```bash
DATABASE_URL="your-neon-url" npx prisma migrate deploy
DATABASE_URL="your-neon-url" npm run db:seed
```

5. Set Vercel build command (optional): `npx prisma migrate deploy && npm run build`

## API routes

All dashboard API routes require an authenticated session except webhook routes (verified separately) and `/api/health`.

| Route | Method | Auth |
|-------|--------|------|
| `/api/geocode` | POST | Session |
| `/api/deliveries/quote` | POST | Session |
| `/api/deliveries` | GET, POST | Session |
| `/api/deliveries/[id]` | GET | Session |
| `/api/deliveries/[id]/cancel` | POST | Session |
| `/api/webhooks/uber` | POST | HMAC signature |
| `/api/webhooks/doordash` | POST | Authorization header |
| `/api/webhooks/whatsapp` | GET, POST | Verify token / HMAC signature |
| `/api/me` | GET | Session |
| `/api/health` | GET | Public |

Errors return `{ error, code?, details? }`. Validation errors include a `details` object with field messages.

## Webhooks

Uber Direct sends `dapi.status_changed` events when delivery status updates. deliverGO verifies the `X-Uber-Signature` header (HMAC-SHA256 of the raw body) and updates local delivery records automatically.

### Production (Vercel)

1. Open the [Uber Developer Dashboard](https://developer.uber.com/) → **Settings** → **Ride Requests**
2. Set your webhook URL:

```
https://your-app.vercel.app/api/webhooks/uber
```

3. Copy the **signing key** into Vercel as `UBER_WEBHOOK_SIGNING_SECRET` (or rely on `UBER_CLIENT_SECRET` as fallback)
4. Redeploy after setting env vars

When a delivery completes, the webhook triggers a POD fetch from Uber and saves verification images to the delivery record.

### Local development

Uber cannot reach `localhost`. Use a tunnel to forward webhooks to your dev server:

**ngrok**

```bash
npm run dev
ngrok http 3000
```

Register the ngrok HTTPS URL in the Uber dashboard:

```
https://YOUR-SUBDOMAIN.ngrok-free.app/api/webhooks/uber
```

**Cloudflare Tunnel**

```bash
cloudflared tunnel --url http://localhost:3000
```

Use the generated `*.trycloudflare.com` URL the same way.

> Tip: create a delivery in sandbox with robo courier enabled — status webhooks should arrive within seconds and advance the detail page timeline without manual refresh.

## DoorDash Drive setup

deliverGO can quote **Uber Direct** and **DoorDash Drive** in parallel on the new delivery page. The cheapest quote is marked **Recommended**; the store manager picks a carrier before sending.

### 1. Developer account

1. Sign up at [DoorDash Developer Portal](https://developer.doordash.com)
2. Select **Drive: Request on-demand deliveries** (not Logistics or Marketplace Retail)
3. Create **sandbox credentials** (Developer ID, Key ID, Signing Secret)
4. Set `DOORDASH_EXTERNAL_BUSINESS_ID` — your merchant identifier (e.g. `default` or `delivergo-main`). See [Businesses and stores](https://developer.doordash.com/en-US/docs/drive/reference/businesses_and_stores/)

### 2. Environment variables

```env
DOORDASH_DEVELOPER_ID=""
DOORDASH_KEY_ID=""
DOORDASH_SIGNING_SECRET=""
DOORDASH_EXTERNAL_BUSINESS_ID="default"
DOORDASH_EXTERNAL_STORE_ID="default"
DOORDASH_API_BASE="https://openapi.doordash.com"
DOORDASH_LIVE_MODE="false"
DOORDASH_WEBHOOK_AUTHORIZATION="Bearer your-generated-token"
```

When any DoorDash variable is missing, deliverGO quotes **Uber only**.

### 3. Store ↔ DoorDash mapping

DoorDash identifies pickup locations with two IDs:

| DoorDash field | deliverGO source |
|----------------|------------------|
| `external_business_id` | `DOORDASH_EXTERNAL_BUSINESS_ID` in `.env` |
| `external_store_id` | `DOORDASH_EXTERNAL_STORE_ID` in `.env`, or **`Store.id`** if unset |

**Seed store id:** `seed-store-waterloo`

Register or refresh the DoorDash store address from your deliverGO store profile:

```bash
npm run doordash:register-store
```

Uses `DOORDASH_EXTERNAL_STORE_ID` from `.env` (falls back to `Store.id`). Re-run after updating pickup address in **Store profile**.

Pickup address and phone should match your deliverGO store profile.

### 4. Canada sandbox

DoorDash Drive supports Canada, but **non-US sandbox** often requires a support request:

1. [Get support](https://developer.doordash.com/en-US/docs/marketplace/how_to/request_support/) → category **Drive**
2. Ask to enable **Canada sandbox** for your developer account

Until enabled, DoorDash quotes may fail while Uber still works.

### 5. Per-store carrier toggles

**Store profile → Delivery carriers**

- Enable/disable Uber Direct and DoorDash Drive per store

### 6. DoorDash webhooks

**Production (Vercel)**

1. Developer Portal → **Webhooks** → Create endpoint
2. URL:

```
https://your-app.vercel.app/api/webhooks/doordash
```

3. Events: **All events** (or delivery lifecycle events)
4. Authentication: generate an **Authorization** token (≥ 16 chars)
5. Set the same value in Vercel as `DOORDASH_WEBHOOK_AUTHORIZATION` (with or without `Bearer ` prefix — deliverGO accepts both)
6. Redeploy

**Local development**

Use ngrok or Cloudflare Tunnel the same way as Uber:

```
https://YOUR-SUBDOMAIN.ngrok-free.app/api/webhooks/doordash
```

### DoorDash sandbox checklist

Manual validation (Phase 14.7):

- [ ] DoorDash credentials + `DOORDASH_EXTERNAL_BUSINESS_ID` configured
- [ ] Store registered in DoorDash with matching `external_store_id`
- [ ] Canada sandbox enabled (if testing Canadian addresses)
- [ ] `POST /api/deliveries/quote` returns DoorDash fee alongside Uber (or DoorDash-only if Uber disabled)
- [ ] Accept quote → delivery has `tracking_url`
- [ ] Webhook advances status on delivery detail page
- [ ] Cancel before Dasher pickup works
- [ ] Completed delivery shows photo/signature when configured
- [ ] Webhook URL + `DOORDASH_WEBHOOK_AUTHORIZATION` set on production

### Going to production (DoorDash)

DoorDash Drive **production access is gated** — demo + review required.

1. Complete integration against sandbox
2. Request production access in the Developer Portal
3. Set `DOORDASH_LIVE_MODE=true` and production credentials
4. Register production webhook URL
5. Pilot one store before wider rollout

See [Drive FAQs](https://developer.doordash.com/en-US/docs/drive/overview/faqs) and [Manage credentials](https://developer.doordash.com/en-US/docs/drive/how_to/manage_credentials).

## WhatsApp staff dispatch (Phase 15)

Staff text your Meta WhatsApp test number → deliverGO matches **Customers**, quotes, confirms with `YES`, creates a delivery. Full plan: [WHATSAPP_IMPLEMENTATION.md](./WHATSAPP_IMPLEMENTATION.md).

### Meta setup (sandbox)

1. Create a Meta app with **Connect with customers through WhatsApp**
2. In **WhatsApp → API Setup**, copy **Phone number ID** and generate an access token
3. Add your staff phone as a **test recipient** (up to 5 numbers)
4. Set env vars (see table above), including `WHATSAPP_STAFF_PHONES` with your verified test number
5. Register webhook URL (requires public HTTPS):

```
https://your-app.vercel.app/api/webhooks/whatsapp
```

Subscribe to **messages**. Use the same string for Meta verify token and `WHATSAPP_VERIFY_TOKEN`.

Restart the dev server after changing `.env`, then text the bot: `PING` → `pong`, then a customer name → quote → `YES`.

Local dev: use ngrok the same way as Uber webhooks:

```
https://YOUR-SUBDOMAIN.ngrok-free.app/api/webhooks/whatsapp
```

## License

Private — all rights reserved.
