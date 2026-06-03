# deliverGO — Implementation Plan

> Store manager dashboard for dispatching last-mile deliveries in Canada (Uber Direct v1; DoorDash Drive next).  
> Check off tasks with `[x]` as they are completed.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Stack | Next.js 15 (App Router) + TypeScript + PostgreSQL + Prisma |
| Auth | Auth.js (NextAuth v5) — credentials provider, seeded store manager |
| Styling | Tailwind CSS v4 + design tokens from [STYLING.md](./STYLING.md) |
| Region | Canada (`country: "CA"`, `+1` phone, postal codes) |
| Geocoding | Single dropoff text field → Mapbox Geocoding API (CA-biased) |
| Payments | Store pays via Uber Direct account — no customer payment UI |
| Uber env | Sandbox first; robo courier for automated test flows |
| DoorDash env | Sandbox first; no real Dasher dispatched in sandbox |
| Design reference | Uber Base / Direct dashboard simplicity — see [STYLING.md](./STYLING.md) |
| Engineering | Layered modular monolith — see [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## Architecture overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Store Manager  │────▶│  deliverGO App   │────▶│  Uber Direct    │
│  (browser)      │     │  Next.js + PG    │     │  Sandbox API    │
└─────────────────┘     └────────┬─────────┘     └────────▲────────┘
                                 │                        │
                                 │  webhooks              │
                                 └────────────────────────┘
```

**Core API flow per delivery**

1. Geocode dropoff address (Mapbox)
2. `POST /delivery_quotes` → fee + ETA + `quote_id` (expires ~15 min)
3. User confirms → `POST /deliveries` with `quote_id` + manifest + optional schedule + POD config
4. Save delivery record + `tracking_url`
5. Webhook `dapi.status_changed` → update local status
6. On complete → fetch + display proof of delivery from `Get Delivery`

---

## Phase 0 — Project foundation

- [x] Initialize Next.js 15 app with TypeScript, App Router, ESLint, Tailwind v4
- [x] Scaffold folder structure per [ARCHITECTURE.md](./ARCHITECTURE.md) (`lib/domain`, `lib/services`, `lib/integrations/delivery/uber`, etc.)
- [x] Add `DeliveryProvider` interface + Uber adapter stub (no logic yet — establishes boundary)
- [x] Configure environment variables template (`.env.example`)
  - [x] `DATABASE_URL`
  - [x] `AUTH_SECRET`
  - [x] `UBER_CLIENT_ID`, `UBER_CLIENT_SECRET`, `UBER_CUSTOMER_ID`
  - [x] `UBER_API_BASE` (sandbox default)
  - [x] `UBER_WEBHOOK_SIGNING_SECRET` (if applicable)
  - [x] `MAPBOX_ACCESS_TOKEN`
  - [x] `NEXT_PUBLIC_APP_URL`
- [x] Set up PostgreSQL (local Docker Compose or hosted)
- [x] Install and configure Prisma
- [x] Add `README.md` with local dev setup (install, migrate, seed, run)
- [x] Configure path aliases (`@/components`, `@/lib`, etc.)

---

## Phase 1 — Database & seed data

### Schema

- [x] **Store** model
  - [x] `id`, `name`, `phone`, `addressLine1`, `addressLine2`, `city`, `province`, `postalCode`, `country` (default `CA`)
  - [x] `latitude`, `longitude`
  - [x] `createdAt`, `updatedAt`
- [x] **User** model
  - [x] `id`, `email`, `passwordHash`, `name`, `role` (enum: `STORE_MANAGER`)
  - [x] `storeId` → Store
  - [x] `createdAt`, `updatedAt`
- [x] **Delivery** model (provider-agnostic naming — see [ARCHITECTURE.md](./ARCHITECTURE.md))
  - [x] `id`, `externalId` (our reference, sent to provider as `external_id`)
  - [x] `storeId` → Store
  - [x] `providerId` (default `uber_direct`), `providerDeliveryId`, `providerOrderId`, `quoteId`
  - [x] `orderId` nullable (future ecommerce FK)
  - [x] `providerPayload` JSON (raw provider snapshot)
  - [x] Pickup snapshot: `pickupName`, `pickupPhone`, `pickupAddress`, `pickupLat`, `pickupLng`
  - [x] Dropoff: `dropoffName`, `dropoffPhone`, `dropoffAddress`, `dropoffLat`, `dropoffLng`
  - [x] `feeCents`, `currency`, `status` (local enum mirroring Uber lifecycle)
  - [x] `trackingUrl`, `pickupReadyAt`, `scheduledFor` (nullable)
  - [x] POD flags: `podSignature`, `podPicture` (booleans)
  - [x] POD results (JSON): `proofOfDelivery` (signature URL, picture URL, signer name, fetched_at)
  - [x] `cancelledAt`, `cancelReason`, `cancelledBy`
  - [x] `liveMode` (boolean — sandbox vs production)
  - [x] `createdAt`, `updatedAt`
- [x] **WebhookEvent** model (idempotency + audit)
  - [x] `eventId` (unique), `eventType`, `payload`, `processedAt`, `deliveryId`

### Migrations & seed

- [x] Run initial migration
- [x] Seed script: one Canadian store (Toronto or user-provided address)
- [x] Seed script: one store manager user (`store.manager@delivergo.local` / dev password in README only)
- [x] Verify seed via Prisma Studio or SQL query

---

## Phase 2 — Authentication

- [x] Install and configure Auth.js with credentials provider
- [x] Password hashing (bcrypt)
- [x] Login page (`/login`) — email + password, minimal Uber-style layout
- [x] Session middleware — protect `/dashboard/*` routes
- [x] Logout action
- [x] Redirect unauthenticated users to `/login`
- [x] Load store profile into session or server context after login
- [x] Add `GET /api/me` (optional) for client session + store info

---

## Phase 3 — Uber Direct client (server-only)

- [x] Implement under `lib/integrations/delivery/uber/` (implements `DeliveryProvider` — see [ARCHITECTURE.md](./ARCHITECTURE.md))
- [x] `client.ts` — OAuth client credentials, scope `eats.deliveries`, token cache with expiry refresh
- [x] `adapter.ts` — maps domain ↔ Uber API
  - [x] `createQuote(pickup, dropoff, pickupReady?)`
  - [x] `createDelivery(payload)` — includes `quote_id`, manifest, lat/lng, optional schedule
  - [x] `getDelivery(uberDeliveryId)`
  - [x] `listDeliveries(filters?)`
  - [x] `cancelDelivery(orderId, reason, cancellingParty)`
- [x] `mappers.ts` — format Canadian addresses as Uber JSON string
- [x] `lib/utils/phone.ts` — normalize to E.164 `+1XXXXXXXXXX`
- [x] `lib/domain/delivery/manifest.ts` — default manifest item helper (`"Store order"`, size `small`, qty 1)
- [x] Sandbox mode flag — when `UBER_LIVE_MODE=false`:
  - [x] Attach `test_specifications.robo_courier_specification.mode: "auto"` on create delivery
  - [x] Set `live_mode: false` expectation in responses
- [x] Error mapping — user-friendly messages for invalid_params, expired quote, etc.
- [x] Unit tests for address + phone formatters

---

## Phase 4 — Geocoding (Canada)

- [x] Create `lib/geocoding/mapbox.ts`
  - [x] Geocode single-line Canadian address
  - [x] Return structured: line1, city, province, postalCode, lat, lng
  - [x] Bias to Canada (`country=CA`)
- [x] `POST /api/geocode` — server route, rate-limited
- [x] Address validation UX rules
  - [x] Show parsed address preview before quote
  - [x] Block quote if geocode confidence too low
- [x] Store pickup lat/lng validated at seed time (geocode store address once)

---

## Phase 5 — App shell & navigation

- [x] Dashboard layout with sidebar + top bar (see STYLING.md)
- [x] Navigation items: **Deliveries**, **New delivery**
- [x] Store name + manager name in header
- [x] Sandbox badge when not in live mode (“Test mode — robo courier enabled”)
- [x] Empty states for list pages
- [x] Toast/alert system for success and errors
- [x] Loading skeletons for list and detail views

---

## Phase 6 — Deliveries list page

**Route:** `/dashboard/deliveries`

- [x] Server component fetches deliveries for logged-in store (paginated, newest first)
- [x] Table/card list columns:
  - [x] Customer name
  - [x] Dropoff address (truncated)
  - [x] Status badge
  - [x] Fee (formatted CAD)
  - [x] Created date
  - [x] Scheduled time (if set)
- [x] Status filter tabs: All | Active | Scheduled | Completed | Cancelled
- [x] Search by customer name or external ID
- [x] Row click → delivery detail
- [x] “New delivery” primary CTA (top right)
- [x] Auto-refresh or SWR polling for active deliveries (30s fallback if webhooks lag)

---

## Phase 7 — New delivery page

**Route:** `/dashboard/deliveries/new`

### Pickup section (read-only, from store profile)

- [x] Store name
- [x] Store phone
- [x] Store address (formatted)

### Dropoff section (editable)

- [x] Customer name (required)
- [x] Customer phone (required, CA validation)
- [x] Dropoff address — single text field with autocomplete (Mapbox)
- [x] Geocoded address preview card

### Schedule section

- [x] Toggle: **ASAP** vs **Schedule pickup**
- [x] Date + time picker for scheduled pickup (`pickup_ready_dt`)
  - [x] Min: now + 15 minutes
  - [x] Max: per Uber limits (document in code comment)
- [x] Pass schedule to quote + create delivery

### Proof of delivery section

- [x] Toggle: **Signature required** (`dropoff_verification.signature_requirement`)
- [x] Toggle: **Photo proof** (`dropoff_verification.picture`)
- [x] Helper text explaining courier steps (from Uber POD guide)
- [x] Default: signature OFF, picture ON (leave at door friendly) — confirm in UI copy

### Quote flow

- [x] “Get delivery quote” button (disabled until dropoff valid)
- [x] Call `POST /api/deliveries/quote`
- [x] Display quote card:
  - [x] Fee (CAD)
  - [x] Estimated pickup duration
  - [x] Estimated delivery time (ETA)
  - [x] Quote expiry countdown (~15 min)
- [x] Re-quote automatically if expired on submit

### Send delivery

- [x] “Send delivery” primary button (enabled after valid quote)
- [x] Call `POST /api/deliveries`
- [x] Include: quote_id, pickup/dropoff, manifest, schedule, POD config, robo courier (sandbox)
- [x] On success → redirect to delivery detail
- [x] On error → inline error + preserve form state

---

## Phase 8 — Delivery detail page

**Route:** `/dashboard/deliveries/[id]`

- [x] Fetch delivery from DB + refresh from Uber if active
- [x] Header: status badge + external ID + created time
- [x] **Status timeline** component
  - [x] pending → scheduled → en route to pickup → at pickup → en route to dropoff → at dropoff → completed
  - [x] failed / cancelled terminal states
- [x] Pickup & dropoff info cards
- [x] Fee + currency display
- [x] Scheduled pickup time (if applicable)
- [x] **Tracking link** — open Uber `tracking_url` in new tab (never modify URL)
- [x] Courier section (when available from Uber): name, vehicle, ETA

### Cancel delivery

- [x] Show “Cancel delivery” when status is cancellable (before terminal state)
- [x] Cancel modal with reason select:
  - [x] `CUSTOMER_CALLED_TO_CANCEL`
  - [x] `OUT_OF_ITEMS`
  - [x] `RESTAURANT_TOO_BUSY`
  - [x] `OTHER` (+ details field)
- [x] `POST /api/deliveries/[id]/cancel` → Uber cancel API, `cancelling_party: MERCHANT`
- [x] Update local status + show confirmation
- [x] Disable cancel button after success

### Proof of delivery

- [x] When status = completed, fetch latest from Uber `Get Delivery`
- [x] Display POD section if verification data exists:
  - [x] Signature image + signer name
  - [x] Delivery photo
  - [ ] Barcode scan result (if configured later)
- [x] Handle expired POD URLs gracefully (Uber retains ~30 days via API)
- [x] “Proof pending” state if completed but verification not yet available

---

## Phase 9 — Webhooks

- [x] `POST /api/webhooks/uber` endpoint
- [x] Verify webhook signature (Uber security docs)
- [x] Handle `dapi.status_changed` events
- [x] Idempotency via `WebhookEvent.eventId`
- [x] Map Uber status → local `Delivery.status`
- [x] On `COMPLETED` → trigger POD fetch + save to `proofOfDelivery`
- [x] Return `200` empty body on success
- [x] Log failures for retry visibility
- [x] Document webhook URL setup in README (Uber Developer Dashboard → Settings → Ride Requests)
- [x] Local dev: ngrok / Cloudflare tunnel instructions for webhook testing

---

## Phase 10 — API routes summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/geocode` | POST | Geocode dropoff address |
| `/api/deliveries/quote` | POST | Create Uber quote |
| `/api/deliveries` | POST | Create delivery |
| `/api/deliveries` | GET | List store deliveries |
| `/api/deliveries/[id]` | GET | Get delivery + Uber sync |
| `/api/deliveries/[id]/cancel` | POST | Cancel delivery |
| `/api/webhooks/uber` | POST | Status + POD updates |

- [x] Implement all routes with auth checks (webhook excluded)
- [x] Zod validation on all request bodies
- [x] Consistent error response shape `{ error, code?, details? }`

---

## Phase 11 — Sandbox & robo courier

- [x] `UBER_LIVE_MODE=false` in `.env.example` by default
- [x] Visual sandbox indicator across dashboard
- [x] Auto-inject robo courier spec on delivery create in test mode
- [x] Document robo courier behavior in README (simulated trip progression)
- [x] Test checklist:
  - [x] Quote in sandbox returns fee
  - [x] Create delivery returns `tracking_url` + `live_mode: false`
  - [x] Robo courier advances status via webhooks
  - [x] Full flow: quote → create → track → complete → POD visible
- [x] Production toggle checklist (separate section in README)
  - [x] Switch credentials in Uber Direct dashboard
  - [x] Set `UBER_LIVE_MODE=true`
  - [x] Remove robo courier spec
  - [x] Pilot with real store before full rollout

---

## Phase 12 — Polish & quality

- [x] Apply [STYLING.md](./STYLING.md) across all pages
- [x] Responsive layout (tablet + desktop; mobile usable)
- [x] Accessibility pass: focus states, labels, aria on status badges, keyboard nav
- [x] Form validation messages (inline, plain language)
- [x] Currency formatting (`en-CA`, CAD)
- [x] Date/time formatting (store timezone — default `America/Toronto`, configurable later)
- [x] Error boundary on dashboard routes
- [x] Rate limiting on quote + create endpoints
- [x] Audit log for cancel actions (optional: extend WebhookEvent or separate table)

---

## Phase 13 — Testing & deployment

- [ ] Integration test: quote + create with mocked Uber (or sandbox in CI secrets)
- [ ] E2E smoke test: login → new delivery → list shows delivery (Playwright)
- [x] Deploy target documented (Vercel + Neon/Supabase Postgres, or Railway)
- [x] Production env vars checklist
- [ ] Webhook URL registered in Uber dashboard for production
- [x] Health check route `/api/health`

---

## Phase 14 — DoorDash Drive integration

> **Goal:** Add a second carrier using the existing `DeliveryProvider` boundary — no rewrite of list/detail/quote flows.  
> **Signup:** DoorDash Developer Portal → **Drive: Request on-demand deliveries** (not Logistics or Marketplace Retail).

### Architecture (reuse)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Store Manager  │────▶│  deliverGO App   │────▶│  DoorDash Drive │
│  (browser)      │     │  Next.js + PG    │     │  Sandbox API    │
└─────────────────┘     └────────┬─────────┘     └────────▲────────┘
                                 │                        │
                                 │  webhooks              │
                                 └────────────────────────┘
```

**Core API flow per delivery (DoorDash)**

1. Geocode dropoff address (Mapbox — unchanged)
2. `POST /drive/v2/quotes` → fee + ETA + `external_delivery_id` (accept within **5 minutes**)
3. User confirms → `POST /drive/v2/quotes/{external_delivery_id}/accept` (or `POST /drive/v2/deliveries` if skipping quote)
4. Save delivery record + `tracking_url`
5. Webhook (`DASHER_CONFIRMED`, `DASHER_PICKED_UP`, `DASHER_DROPPED_OFF`, etc.) → update local status
6. On complete → fetch POD from `Get Delivery` response

**Status mapping (DoorDash → domain)**

| DoorDash (examples) | Local `DeliveryStatus` |
|---------------------|------------------------|
| `created`, `confirmed` | `pending` |
| `scheduled` | `scheduled` |
| `dasher_confirmed`, en route to pickup | `en_route_to_pickup` |
| at pickup | `arrived_at_pickup` |
| picked up / en route to dropoff | `en_route_to_dropoff` |
| at dropoff | `arrived_at_dropoff` |
| `delivered` | `completed` |
| `cancelled` | `cancelled` |
| failed / undeliverable | `failed` |

Document exact strings from sandbox responses in `lib/integrations/delivery/doordash/mappers.ts`. *(initial mapping done; refine after live sandbox payloads)*

---

### Phase 14.0 — Account & credentials

- [x] Create DoorDash Developer account → select **Drive** *(manual)*
- [x] Submit support request to enable **Canada sandbox** *(manual)*
- [x] Create sandbox credentials in Developer Portal → Credentials tab *(manual)*
  - [x] `developer_id`, `key_id`, `signing_secret`
  - [x] `external_business_id` (3–64 chars, stable per merchant)
  - [x] `external_store_id` per physical store (map from `Store.id` or dedicated field)
- [x] Register webhook URL in Developer Portal → Webhooks (`POST /api/webhooks/doordash`) *(manual)*
- [x] Document production access process (Drive production is gated — demo + review required)
- [x] Add env vars to `.env.example` and README:
  - [x] `DOORDASH_DEVELOPER_ID`
  - [x] `DOORDASH_KEY_ID`
  - [x] `DOORDASH_SIGNING_SECRET`
  - [x] `DOORDASH_EXTERNAL_BUSINESS_ID`
  - [x] `DOORDASH_API_BASE` (sandbox default from portal)
  - [x] `DOORDASH_LIVE_MODE` (`false` default)
  - [x] `DOORDASH_WEBHOOK_AUTHORIZATION` (if portal provides shared secret / auth header)

---

### Phase 14.1 — Domain & database

- [x] Extend `DeliveryProviderId` union: `"uber_direct" | "doordash_drive"`
- [x] Per-store carrier toggles: `enabledUberDirect`, `enabledDoorDashDrive` on **Store**
- [x] DoorDash `external_store_id` from `DOORDASH_EXTERNAL_STORE_ID` env (falls back to `Store.id`)
- [x] Migration for new store columns (`20250603120000_store_delivery_settings`)
- [x] Seed: document how test store maps to DoorDash `external_store_id`
- [x] Ensure `Delivery.providerId` can be `doordash_drive` on create (no schema change if string already flexible)

---

### Phase 14.2 — DoorDash client (`lib/integrations/delivery/doordash/`)

- [x] `config.ts` — load env, validate required fields, sandbox vs production base URL
- [x] `auth.ts` — JWT generation (HS256, max 30 min TTL, refresh before expiry)
- [x] `client.ts` — HTTP wrapper with auth header
  - [x] `createQuote(input)` → `POST /drive/v2/quotes`
  - [x] `acceptQuote(externalDeliveryId, options?)` → `POST /drive/v2/quotes/{id}/accept`
  - [x] `createDelivery(input)` → `POST /drive/v2/deliveries` (direct path, optional)
  - [x] `getDelivery(externalDeliveryId)` → `GET /drive/v2/deliveries/{id}`
  - [x] `cancelDelivery(externalDeliveryId)` → cancel endpoint per API reference
  - [x] `checkServiceability(input)` → pre-quote coverage check
- [x] `types.ts` — raw DoorDash request/response types
- [x] `errors.ts` — map API errors to user-friendly messages (unserviceable area, expired quote, invalid address)
- [x] Unit tests: JWT shape, address/phone mappers, status mapping

---

### Phase 14.3 — Adapter & mappers

- [x] `mappers.ts`
  - [x] `toProviderQuote` — fee (string dollars → cents), ETA fields, quote expiry (~5 min accept window)
  - [x] `buildQuoteRequest` — pickup/dropoff address objects, `external_delivery_id`, schedule (`pickup_time` or `dropoff_time`, not both)
  - [x] `buildAcceptQuoteRequest` — POD: `dropoff_options.signature`, pincode verification, SMS notifications flag
  - [x] `toDomainDelivery` — map `delivery_status`, `tracking_url`, courier/Dasher fields, POD URLs
  - [x] `mapDoorDashStatusToDomain(status: string): DeliveryStatus`
- [x] `adapter.ts` — implement `DeliveryProvider`
  - [x] `id: "doordash_drive"`
  - [x] `createQuote` / `createDelivery` — prefer quote → accept workflow (matches Uber UX)
  - [x] `getDelivery` — use `external_delivery_id` (our `externalId`) as DoorDash key
  - [x] `listDeliveries` — stub or paginate if needed (Uber has this; DoorDash may differ)
  - [x] `cancelDelivery`
  - [x] `parseWebhook` — verify auth/signature, map event → `ProviderWebhookEvent`
- [x] Register in `provider.registry.ts` (`getDeliveryProviderById`, `getDeliveryProviderForStore`)

---

### Phase 14.4 — Service layer (provider-aware, minimal diff)

- [x] `create-delivery.ts` — resolve provider from store; pass `liveMode` from `DOORDASH_LIVE_MODE`
- [x] `create-quote.ts` — parallel multi-provider quotes; per-store enabled carriers
- [x] `sync-from-provider.ts` — already uses `getDeliveryProviderById`; verify DoorDash get + status merge
- [x] `sync-active-deliveries.ts` — include `doordash_drive` active deliveries
- [x] `cancel-delivery.ts` — DoorDash cancel reason mapping (merchant-initiated)
- [x] `handle-doordash-webhook.ts` — idempotency via `WebhookEvent`, status update, POD fetch on complete
- [x] Quote expiry: surface **5 minute** accept window in UI (Uber uses ~15 min — provider-specific copy)

---

### Phase 14.5 — Webhooks

- [x] `POST /api/webhooks/doordash` route
- [x] Verify webhook authenticity (portal-configured secret / authorization header — follow Drive docs)
- [x] Handle delivery lifecycle events (at minimum):
  - [x] Dasher assigned / confirmed
  - [x] Picked up
  - [x] Dropped off / delivered
  - [x] Cancelled
- [x] Idempotency via `WebhookEvent.eventId` (reuse model; store `providerId` in payload or event type prefix)
- [x] Return `200` on success
- [x] README: webhook URL + Canada sandbox setup steps
- [x] Local dev: ngrok / tunnel (same as Uber)

---

### Phase 14.6 — UI & UX

- [x] Multi-provider quote comparison — cheapest fee marked **Recommended**, user selects carrier before send
- [x] Parallel quotes from all configured providers; partial failures shown inline
- [x] Quote after customer name + phone + verified address (DoorDash requires contact at quote time)
- [x] Re-quote only the selected provider if expired on submit
- [x] Provider label on delivery detail header
- [x] Store settings: provider enable/disable per store
- [x] Provider badge on delivery list rows
- [x] Tracking link: open provider `tracking_url` as-is (never modify)
- [x] Sandbox indicator: generic “Test mode” works for both providers

---

### Phase 14.7 — Sandbox & Canada checklist

- [x] `DOORDASH_LIVE_MODE=false` in `.env.example` by default
- [ ] Sandbox create does **not** dispatch a real Dasher *(confirm in portal during manual test)*
- [ ] Test checklist *(manual — see README)*:
  - [ ] Quote returns fee + ETA for Canadian pickup/dropoff (after sandbox enabled)
  - [ ] Accept quote returns `tracking_url`
  - [ ] Webhook updates status on detail page (live poll + webhook)
  - [ ] Cancel before pickup works
  - [ ] Completed delivery shows signature/photo if configured
- [ ] Production checklist *(manual)*:
  - [ ] Complete DoorDash demo + production access request
  - [ ] Set `DOORDASH_LIVE_MODE=true`
  - [ ] Register production webhook URL
  - [ ] Pilot one store before rollout

---

### Phase 14.8 — Testing

- [x] Unit tests: mappers, status map, cancel reasons, store delivery settings
- [ ] Integration test: quote + accept with mocked DoorDash HTTP
- [ ] Manual E2E in Canada sandbox: login → quote → send → track → complete

---

## Future (post-v1 — not in scope now)

- [ ] Roles admin + multi-store (Organizations API)
- [ ] Barcode POD + order reference scanning
- [ ] Return deliveries
- [ ] Embedded map (tracking URL link-out is sufficient for v1)
- [ ] Analytics dashboard (delivery volume, spend, avg fee)
- [ ] SkipGo / other Canadian carriers (partner API access required)

---

## Progress tracker

| Phase | Name | Status |
|-------|------|--------|
| 0 | Project foundation | [x] |
| 1 | Database & seed | [x] |
| 2 | Authentication | [x] |
| 3 | Uber Direct client | [x] |
| 4 | Geocoding | [x] |
| 5 | App shell | [x] |
| 6 | Deliveries list | [x] |
| 7 | New delivery | [x] |
| 8 | Delivery detail | [x] |
| 9 | Webhooks | [x] |
| 10 | API routes | [x] |
| 11 | Sandbox & robo courier | [x] |
| 12 | Polish & quality | [x] |
| 13 | Testing & deployment | [~] |
| 14 | DoorDash Drive | [x] |

---

## Reference links

### Project docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [STYLING.md](./STYLING.md)

### Uber Direct

- [Uber Direct Overview](https://developer.uber.com/docs/deliveries/overview)
- [Get Started / Sandbox](https://developer.uber.com/docs/deliveries/get-started)
- [Proof of Delivery](https://developer.uber.com/docs/deliveries/guides/proof-of-delivery)
- [Delivery Status Webhook](https://developer.uber.com/docs/deliveries/direct/api/webhook-dapi-statuschanged)
- [Cancel Order](https://developer.uber.com/docs/deliveries/direct/api/v1/post-eats-orders-orderid-cancel)
- [Uber Direct SDK (npm)](https://www.npmjs.com/package/uber-direct)

### DoorDash Drive

- [DoorDash Developer Portal](https://developer.doordash.com)
- [Drive API reference](https://developer.doordash.com/en-US/api/drive/)
- [Create & accept quotes](https://developer.doordash.com/en-US/docs/drive/how_to/quote_deliveries)
- [Schedule deliveries](https://developer.doordash.com/en-US/docs/drive/how_to/schedule_deliveries)
- [Manage credentials & JWT](https://developer.doordash.com/en-US/docs/drive/how_to/manage_credentials)
- [Webhooks (Drive API)](https://developer.doordash.com/en-US/blog/webhooks-drive-api)
- [Drive FAQs (countries, sandbox)](https://developer.doordash.com/en-US/docs/drive/overview/faqs)
- [Get support (Canada sandbox)](https://developer.doordash.com/en-US/docs/marketplace/how_to/request_support/)
