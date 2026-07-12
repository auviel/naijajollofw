# deliverGO — Restaurant Ordering Implementation Plan

> Single-restaurant online ordering (Uber Eats–style UX) on top of the existing delivery stack.  
> Companion docs: [ARCHITECTURE.md](./ARCHITECTURE.md) · [IMPLEMENTATION.md](./IMPLEMENTATION.md) (delivery checklist) · [STYLING.md](./STYLING.md)  
> **Status: Phases R0–R6 complete.** Check off remaining follow-ups with `[x]` as they ship.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Surfaces | Public **customer storefront** + **staff / kitchen ops** dashboard |
| Tenancy | One restaurant (existing `Store`) — not a marketplace |
| Fulfillment at checkout | Customer chooses **pickup** or **delivery** |
| Dispatch after order | Staff chooses **deliverGO carriers** (Uber / DoorDash) **or** **manual** delivery elsewhere |
| UX reference | Uber Eats consumer feel: browse → item → cart → short checkout → live status |
| Checkout | **Guest** checkout (name + phone; address when delivery). Diner accounts later |
| Payments | **Square** (restaurant’s existing processor) — Web Payments SDK → CreatePayment before kitchen |
| Cart | Server-backed cart keyed by **cookie session id** (no diner login required) |
| Staff auth | Existing NextAuth store manager; kitchen uses same dashboard for now |
| Engineering | Modular monolith; **HTTP API is the contract** for web today and mobile later |
| Structure | Route groups by audience; domain folders by feature — **no Turborepo until a real mobile app ships** |

---

## Simplicity rules (day 1 → mobile / blog later)

1. **One modular monolith** until a second real client (iOS/Android) ships. Do not invent `apps/` + `packages/` early.
2. **Business logic lives in `lib/domain` + `lib/services`.** Pages and components stay thin. Mobile will call the same services via HTTP — it will never import React.
3. **`app/api` is the shared contract.** Stable JSON shapes; thin handlers → one service call.
4. **Blog / marketing is an island.** When added, it lives under `(marketing)` and does not touch Order / Delivery domains.
5. **No premature GraphQL, BFF-per-client, or shared RN+web UI.** Different clients, same API + domain.

```
        ┌─────────────┐  ┌──────────────┐  ┌─────────┐
        │ Storefront  │  │ Staff web    │  │ Mobile  │  (later)
        │ + Blog      │  │ dashboard    │  │ iOS/And │
        └──────┬──────┘  └──────┬───────┘  └────┬────┘
               │                │               │
               └────────────┬───┴───────────────┘
                            ▼
                     app/api  (HTTP)
                            ▼
               lib/services + domain + db + integrations
```

**Auth note:** Staff/web today uses cookie sessions (NextAuth). When mobile ships, add token auth for diners/staff apps **without moving domain code**.

---

## System split

```
┌──────────────────┐         ┌─────────────────────────────┐
│ Customer         │         │ Staff dashboard             │
│ storefront       │         │                             │
│ menu → cart →    │────────▶│ orders board → accept →     │
│ checkout → pay   │  Order  │ prepare → ready → fulfill   │
│ → track          │         │   ├─ deliverGO (quote/send) │
└──────────────────┘         │   └─ manual (note + status) │
                             │ menu admin · hours          │
                             └──────────────┬──────────────┘
                                            │
                                            ▼
                             Existing Delivery domain
                             (Uber / DoorDash adapters)
```

**Rule:** Storefront and order logic never import `uber` / `doordash`. They call Order / Fulfillment services. Carrier APIs stay behind `DeliveryProvider` (see [ARCHITECTURE.md](./ARCHITECTURE.md)).

---

## Folder conventions (locked)

Grow by **audience** in `app/` and by **domain** in `lib/` + `components/`. Do not restructure existing delivery code until a phase needs it — prefer additive route groups.

```
deliverGO/
├── app/
│   ├── (marketing)/              # Public marketing + future blog
│   │   ├── page.tsx              # Optional landing / redirect to storefront
│   │   └── blog/                 # Later — MDX or CMS; isolated
│   ├── (storefront)/             # Diner UX (Uber Eats feel)
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Menu home
│   │   ├── item/[id]/
│   │   ├── cart/
│   │   ├── checkout/
│   │   └── orders/[id]/         # Public tracking (tokenized)
│   ├── (auth)/
│   │   └── login/                # Staff login (existing)
│   ├── (dashboard)/              # Staff / kitchen (migrate current dashboard here)
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Live orders board (new default home)
│   │   ├── orders/
│   │   ├── menu/
│   │   ├── hours/
│   │   ├── customers/            # Existing
│   │   ├── deliveries/           # Existing (standalone dispatch + order-linked)
│   │   └── store/
│   └── api/                      # ★ Shared HTTP contract (web + future mobile)
│       ├── menu/
│       ├── cart/
│       ├── orders/
│       ├── payments/             # Square checkout + webhooks
│       ├── deliveries/           # Existing
│       └── ...
│
├── components/
│   ├── ui/                       # Shared design system
│   ├── layout/                   # Shells per audience (storefront vs dashboard)
│   └── features/                 # Co-locate by domain
│       ├── menu/
│       ├── cart/
│       ├── orders/
│       ├── storefront/
│       ├── customers/
│       ├── deliveries/           # Existing
│       └── store/
│
├── lib/
│   ├── domain/
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── order/
│   │   ├── fulfillment/          # pickup vs delivery; staff method rules
│   │   ├── delivery/             # Existing
│   │   ├── customer/
│   │   └── store/
│   ├── services/
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── order/
│   │   ├── fulfillment/          # Link order → deliverGO or manual
│   │   ├── payment/
│   │   └── delivery/             # Existing
│   ├── db/repositories/
│   ├── integrations/
│   │   ├── delivery/             # Existing Uber / DoorDash
│   │   ├── payments/square/
│   │   └── geocoding/
│   └── ...
```

### Non-goals for structure

These stay unchecked on purpose — we are **not** doing them yet:

- [ ] Turborepo / `packages/core` before a real mobile app exists
- [ ] GraphQL gateway
- [ ] Separate BFF per client
- [ ] Sharing React Native screens with Next.js

---

## Route map

### Public storefront

| Route | Purpose | UX note |
|-------|---------|---------|
| `/` (storefront) | Restaurant home + menu | Hero + sticky category chips |
| `/item/[id]` | Item detail + modifiers | Bottom sheet OK on mobile |
| `/cart` | Review cart | Sticky “Go to checkout” |
| `/checkout` | Contact, pickup/delivery, tip, pay | Ruthlessly short |
| `/orders/[id]` | Live order status | Guest access via signed token in URL/cookie |

### Staff dashboard

| Route | Purpose |
|-------|---------|
| `/dashboard` | Live **orders board** (default home) |
| `/dashboard/orders` | All orders + filters |
| `/dashboard/orders/[id]` | Detail → accept / prepare / ready → fulfill |
| `/dashboard/menu` | Categories, items, availability |
| `/dashboard/menu/[id]` | Edit item + modifiers + photos |
| `/dashboard/hours` | Open/closed, prep time estimates |
| `/dashboard/customers` | Existing |
| `/dashboard/deliveries` | Existing (manual dispatch + linked deliveries) |
| `/dashboard/store` | Existing store profile + carrier toggles |

### Marketing (later)

| Route | Purpose |
|-------|---------|
| `/blog`, `/blog/[slug]` | Content — no coupling to orders |

---

## Domain & data model (sketch)

### New Prisma models (indicative)

- **MenuCategory** — `storeId`, name, sortOrder, active
- **MenuItem** — category, name, description, priceCents, imageUrl, available, sortOrder
- **MenuModifierGroup** — item, name, required, min/max select
- **MenuModifier** — group, name, priceDeltaCents, available
- **Cart** / **CartItem** — `sessionId`, line snapshots or refs + qty + selected modifiers
- **Order** — totals, tip, taxes, customer contact, fulfillment fields (below)
- **OrderLineItem** — **price/name snapshot** at purchase time (menu edits must not rewrite history)
- **OrderEvent** — status transitions + actor (customer/staff/system) for timeline

### Order fields (fulfillment)

| Field | Values | Set by |
|-------|--------|--------|
| `fulfillmentType` | `pickup` \| `delivery` | Customer at checkout |
| `fulfillmentMethod` | `unassigned` \| `delivergo` \| `manual` | Staff after ready (delivery only) |
| `deliveryId` | optional FK → `Delivery` | When staff dispatches via deliverGO |
| `manualDeliveryNote` | optional string | When staff chooses manual |
| `publicToken` | opaque token | Guest tracking URL |

### Order status machine

```
pending_payment
       │ (Square succeeds)
       ▼
pending_acceptance
       │ (staff accepts)
       ▼
    accepted
       │
       ▼
   preparing
       │
       ▼
     ready
       │
       ├── pickup ──▶ ready_for_pickup ──▶ completed
       │
       └── delivery
              ├── delivergo ──▶ out_for_delivery ──▶ completed
              └── manual    ──▶ out_for_delivery ──▶ completed

(any active) ──▶ cancelled
```

---

## Staff fulfillment flow (locked)

1. Customer pays → order appears on board as `pending_acceptance`.
2. Staff **accepts** → **preparing** → marks **ready**.
3. **Pickup:** mark `ready_for_pickup` → customer collects → `completed`.
4. **Delivery:**
   - **deliverGO:** from order detail, quote/compare carriers using existing delivery services → create `Delivery` → set `fulfillmentMethod = delivergo`, link `deliveryId` → map carrier progress to `out_for_delivery` → `completed`.
   - **manual:** set `fulfillmentMethod = manual`, optional note (courier / external ref) → `out_for_delivery` → later `completed`. **No** carrier API call.

Standalone `/dashboard/deliveries/new` remains available for non-order dispatches.

---

## UX bar (storefront)

- Mobile-first; sticky cart CTA and category rail
- Item page: photo, price, required modifiers, quantity, one primary CTA
- Minimal chrome — brand + menu, not a dashboard
- Order tracking is the post-pay payoff (status + ETA when delivery is linked)

Staff UI may stay denser (kanban / board). Do not force consumer chrome onto the kitchen.

---

## Phase R0 — Docs, conventions, shells

- [x] Write this plan + lock folder / multi-client conventions in [ARCHITECTURE.md](./ARCHITECTURE.md)
- [x] Add App Router groups: `(storefront)`, `(dashboard)`, `(marketing)` (migrate existing dashboard routes into `(dashboard)` when convenient)
- [x] Prisma spike: draft models above in a migration branch (no production cutover required yet)
  - Schema + `prisma/migrations/20260712000000_restaurant_ordering_spike`
  - Applied via `prisma db push` (Neon migrate history still has an older failed migration — resolve before relying on `migrate deploy`)
- [x] Empty route shells for storefront + `/dashboard/orders` + `/dashboard/menu`
- [x] Confirm Square + Mapbox env placeholders in `.env.example`

---

## Phase R1 — Catalog + staff menu admin

- [x] Migrate `MenuCategory`, `MenuItem`, modifier models
- [x] `lib/domain/menu` + `lib/services/menu` + repository
- [x] `GET/POST/PATCH` `/api/menu/...` (staff auth)
- [x] `/dashboard/menu` list + `/dashboard/menu/[id]` edit
- [x] Availability / sold-out toggle
- [x] Seed sample menu for the store

---

## Phase R2 — Storefront browse + cart

- [x] Public menu read API (no staff auth)
- [x] Storefront home + category rail + item page
- [x] Cart session cookie + `lib/services/cart`
- [x] `/cart` page; add/update/remove lines + modifiers
- [x] Closed restaurant / unavailable item handling

---

## Phase R3 — Checkout, Square, create order

- [x] Checkout UI: contact, pickup vs delivery, address + geocode when delivery, tip
- [x] Square Web Payments + CreatePayment (`lib/integrations/payments/square`)
- [x] Create `Order` + line snapshots on successful payment → `pending_acceptance`
- [x] Square webhook: confirm / fail payment idempotently
- [x] Redirect to `/orders/[id]` with public token

---

## Phase R4 — Kitchen board + status transitions

- [x] `/dashboard` live orders board (poll or light realtime later)
- [x] `/dashboard/orders` + `[id]` with actions: accept, preparing, ready, cancel
- [x] `OrderEvent` audit trail
- [x] Sound / badge for new `pending_acceptance` (nice-to-have)

---

## Phase R5 — Fulfillment (pickup + deliverGO + manual)

- [x] Pickup path: `ready_for_pickup` → `completed`
- [x] Delivery + **deliverGO**: reuse quote/create delivery services; link `order.deliveryId`
- [x] Delivery + **manual**: note + status only
- [x] Sync delivery webhook status into order when linked
- [x] Staff cannot dispatch deliverGO until order is `ready` (configurable later)

---

## Phase R6 — Diner tracking polish

- [x] Clear status timeline on `/orders/[id]`
- [x] Show carrier tracking URL when deliverGO delivery exists
- [x] Prep-time / ETA messaging from store hours settings
- [x] SMS/WhatsApp order updates (optional; reuse WhatsApp stack carefully)

---

## API surface (initial)

Staff (session auth):

- `CRUD /api/menu/categories`, `/api/menu/items`, …
- `GET /api/orders` (staff list + filters)
- `GET /api/orders/[id]` (staff session) · `GET /api/orders/[id]?token=` (guest)
- `POST /api/orders/[id]/transition`
- `POST /api/orders/[id]/fulfill/delivergo` (quote + create delivery)
- `POST /api/orders/[id]/fulfill/manual`

Public / cart session:

- `GET /api/menu` (published catalog)
- `GET/POST/PATCH /api/cart`
- `GET /api/checkout/config` → Square app/location + cart preview
- `POST /api/checkout` → Square charge + paid order
- `GET /api/orders/[id]?token=…` (guest track)

Webhooks:

- `POST /api/webhooks/square`
- Existing `/api/webhooks/uber`, `/api/webhooks/doordash`

---

## Non-goals (this initiative)

- Multi-restaurant marketplace / discovery
- Driver / Dasher app
- Diner social features, reviews network, complex loyalty
- Replacing WhatsApp staff dispatch (can coexist)
- Native iOS/Android apps (consume same API when ready)
- Blog CMS (route island only when needed)

---

## Suggested build order

`R0 → R1 → R2 → R3 → R4 → R5 → R6` — **all shipped**

---

## Open follow-ups (post R6)

| Topic | Status |
|-------|--------|
| Tax / receipt | [x] Simple tax via `TAX_RATE_BPS` (Ontario HST default); receipts later |
| Tips | [x] Optional tip at checkout; staff payouts later |
| Multi-location | Out of scope (single `Store`) |
| Diner accounts | After guest path works |
| API versioning (`/api/v1`) | Add when mobile client starts |
| Full open/closed hours | [x] Weekly schedule on `/dashboard/hours`; storefront + checkout enforce open/closed |
