# deliverGO — Architecture & Engineering Guide

> How we structure code today so v1 stays simple, and v2+ (ecommerce, multi-carrier) scales without rewrites.  
> Companion docs: [IMPLEMENTATION.md](./IMPLEMENTATION.md) · [RESTAURANT_IMPLEMENTATION.md](./RESTAURANT_IMPLEMENTATION.md) · [STYLING.md](./STYLING.md)

---

## Vision

| Stage | Scope | Architecture goal |
|-------|--------|-------------------|
| **v1 (now)** | Store manager dispatches Uber Direct deliveries (Canada) | Thin UI, clear layers, one delivery provider behind an interface |
| **v2** | Cancel, schedule, POD, webhooks, multi-store | Same layers; add events + tenant scoping |
| **v3** | Restaurant ordering (catalog, cart, checkout, kitchen, pickup/delivery) | New **Order** domain; delivery is a staff-chosen fulfillment step — see [RESTAURANT_IMPLEMENTATION.md](./RESTAURANT_IMPLEMENTATION.md) |
| **v4** | Uber + other delivery partners | Plug-in providers; routing/fallback without touching UI or order logic |
| **Later** | iOS/Android apps, blog/marketing | Same `lib/` + `app/api` contract; no monorepo until a second real client ships |

We optimize for a **modular monolith** first. Extract services (workers, webhooks, catalog) only when traffic or team size demands it — not on day one.

---

## High-level system diagram

### Today (v1)

```
┌──────────────┐     ┌─────────────────────────────────────────────┐
│   Browser    │────▶│  Next.js App (modular monolith)             │
│              │     │  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
└──────────────┘     │  │   app/  │─▶│ services │─▶│ integrations│ │
                     │  │ (routes)│  │ (use     │  │ uber/       │ │
                     │  └─────────┘  │  cases)  │  │ mapbox/     │ │
                     │       │       └────┬─────┘  └──────┬──────┘ │
                     │       │            │               │        │
                     │       ▼            ▼               ▼        │
                     │  components/   domain/         External APIs│
                     │                db/ (Prisma)    PostgreSQL   │
                     └─────────────────────────────────────────────┘
                                          ▲
                     Uber webhooks ────────┘
```

### Future (v3+)

```
┌──────────┐    ┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Storefront│───▶│ Order       │───▶│ Fulfillment      │───▶│ Delivery        │
│ (diner)   │    │ (restaurant)│    │ pickup | delivery│    │ Provider Router │
└──────────┘    └─────────────┘    │ staff: delivergo │    └────────┬────────┘
┌──────────┐           ▲           │      or manual   │             │
│ Staff UI │───────────┘           └──────────────────┘   ┌─────────┼─────────┐
└──────────┘                                              ▼         ▼         ▼
                                                       Uber     DoorDash   Manual
┌──────────┐
│ Mobile   │───▶ same app/api ──▶ same lib/services     (no carrier API)
│ (later)  │
└──────────┘
```

**Rule:** UI and order logic never import `uber` directly. They call `DeliveryService` / fulfillment services → `DeliveryProvider` interface. Mobile and blog clients never import React feature components — only HTTP + shared domain rules.

---

## Layer model

Strict dependency direction — **inner layers never depend on outer layers**.

```
┌─────────────────────────────────────────────────────────┐
│  app/ + components/          Presentation               │  ← pages, forms, API route handlers
├─────────────────────────────────────────────────────────┤
│  lib/services/               Application / use cases    │  ← orchestration, auth checks, transactions
├─────────────────────────────────────────────────────────┤
│  lib/domain/                 Domain                     │  ← types, enums, validation rules, pure functions
├─────────────────────────────────────────────────────────┤
│  lib/db/                     Persistence               │  ← Prisma, repositories
├─────────────────────────────────────────────────────────┤
│  lib/integrations/           Infrastructure            │  ← Uber, Mapbox, future carriers, webhooks
└─────────────────────────────────────────────────────────┘
```

### What each layer may do

| Layer | May | Must not |
|-------|-----|----------|
| **app/** | Parse request, call one service, return response/redirect | Business rules, Prisma queries, fetch to Uber |
| **components/** | Render props, local UI state, call server actions / API | Direct DB or Uber access |
| **services/** | Orchestrate domain + db + integrations; enforce store scoping | Render JSX; know HTTP status codes deeply |
| **domain/** | Pure logic, Zod schemas shared with API, status mapping | Import Prisma, fetch, React |
| **db/** | CRUD, transactions, queries | Uber-specific field names in generic repo methods |
| **integrations/** | HTTP clients, mappers to/from domain types | UI concerns; business policy |

---

## Folder structure

**Conventions (locked for v3+):**

- `app/` route groups by **audience**: `(storefront)`, `(dashboard)`, `(marketing)`, `(auth)`
- `lib/domain`, `lib/services`, `components/features` grow by **domain** (`menu`, `cart`, `order`, `delivery`, …)
- `app/api` is the **shared HTTP contract** for web today and mobile later — thin handlers, stable JSON
- **Do not** introduce Turborepo / `packages/*` until a real second client (native app) ships
- Blog/marketing stays an island under `(marketing)` — no coupling to Order/Delivery

Full restaurant checklist: [RESTAURANT_IMPLEMENTATION.md](./RESTAURANT_IMPLEMENTATION.md).

```
deliverGO/
├── app/                              # Next.js App Router — keep routes thin
│   ├── (marketing)/                  # Landing + future blog
│   ├── (storefront)/                 # Diner UX (menu, cart, checkout, track)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── item/[id]/
│   │   ├── cart/
│   │   ├── checkout/
│   │   └── orders/[id]/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/                  # Staff / kitchen shell
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # live orders board
│   │   ├── orders/
│   │   ├── menu/
│   │   ├── hours/
│   │   ├── customers/
│   │   ├── deliveries/
│   │   └── store/
│   ├── api/                          # ★ Shared contract (web + future mobile)
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── geocode/
│   │   ├── deliveries/
│   │   ├── webhooks/
│   │   │   ├── uber/
│   │   │   ├── doordash/
│   │   │   └── square/
│   │   └── health/
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── ui/                           # Design system — see STYLING.md
│   ├── layout/                       # Shells per audience
│   └── features/                     # Co-locate by domain
│       ├── menu/
│       ├── cart/
│       ├── orders/
│       ├── storefront/
│       └── deliveries/
│
├── lib/
│   ├── domain/                       # Pure domain — no I/O
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── order/
│   │   ├── fulfillment/
│   │   ├── delivery/
│   │   ├── store/
│   │   ├── customer/
│   │   └── address/
│   ├── services/                     # Use cases — entry for app/ and api/
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── order/
│   │   ├── fulfillment/
│   │   ├── payment/
│   │   ├── delivery/
│   │   └── geocoding/
│   ├── db/
│   │   ├── client.ts
│   │   └── repositories/
│   ├── integrations/
│   │   ├── delivery/                 # ★ Provider abstraction
│   │   │   ├── provider.interface.ts
│   │   │   ├── uber/
│   │   │   └── doordash/
│   │   ├── payments/
│   │   │   └── square/
│   │   └── geocoding/
│   │       └── mapbox/
│   ├── auth/
│   └── utils/
│
├── prisma/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker-compose.yml
├── .env.example
├── ARCHITECTURE.md
├── IMPLEMENTATION.md                 # Delivery stack checklist
├── RESTAURANT_IMPLEMENTATION.md      # Ordering / kitchen checklist
└── STYLING.md
```

### Multi-client readiness (without restructuring)

| Client | Talks to | Must not |
|--------|----------|----------|
| Storefront / dashboard (Next.js) | `lib/services` via RSC/API | Import Uber/DoorDash in UI |
| Future iOS / Android | `app/api` over HTTPS | Import `components/` or Prisma |
| Future blog | `(marketing)` + CMS/MDX | Touch Order/Cart/Delivery domains |

When mobile starts: add token auth beside cookie sessions; optionally introduce `/api/v1`. Extract `packages/` only if sharing across repos becomes painful — not before.

### Naming conventions

| Kind | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `create-delivery.ts` |
| React components | PascalCase file + export | `DeliveryTimeline.tsx` |
| Services | verb-noun function in file | `createDelivery()` in `create-delivery.ts` |
| Repositories | `{entity}.repository.ts` | `delivery.repository.ts` |
| Provider adapters | `{vendor}/adapter.ts` | `uber/adapter.ts` |
| API routes | REST plural nouns | `/api/deliveries/[id]/cancel` |
| DB tables | PascalCase Prisma models | `Delivery`, `WebhookEvent` |
| Env vars | SCREAMING_SNAKE | `UBER_CLIENT_ID` |

---

## Delivery provider abstraction (critical for scale)

All carrier-specific code lives under `lib/integrations/delivery/{provider}/`.  
Application code depends only on the interface.

### Interface (sketch)

```typescript
// lib/integrations/delivery/provider.interface.ts

export interface DeliveryProvider {
  readonly id: DeliveryProviderId; // 'uber_direct' | 'doordash_drive' | ...

  createQuote(input: ProviderQuoteRequest): Promise<ProviderQuote>;
  createDelivery(input: ProviderCreateDeliveryRequest): Promise<ProviderDelivery>;
  getDelivery(externalId: string): Promise<ProviderDelivery>;
  cancelDelivery(externalId: string, input: ProviderCancelRequest): Promise<void>;
  parseWebhook(raw: unknown, headers: Headers): Promise<ProviderWebhookEvent | null>;
}

export type DeliveryProviderId = 'uber_direct'; // extend union when adding partners
```

### Registry

```typescript
// lib/integrations/delivery/provider.registry.ts

export function getDeliveryProviderForStore(store: Store): DeliveryProvider {
  // v1: always Uber
  // v4: store.deliveryProviderId or multi-provider routing
  return uberDirectAdapter;
}
```

### Mapper pattern

Uber returns `fee` in cents, `status: "EN_ROUTE_TO_PICKUP"`.  
Adapters map to domain types once; never leak Uber strings into components.

```typescript
// lib/integrations/delivery/uber/mappers.ts
export function toDomainDelivery(uber: UberDeliveryResponse): ProviderDelivery { ... }
```

---

## Domain model evolution

Design the schema so ecommerce and multi-provider fit later **without renaming everything**.

### v1 entities

- **Store** — pickup location + future provider credentials per store
- **User** — auth; `role` enum grows (`STORE_MANAGER`, `ADMIN`, …)
- **Delivery** — fulfillment record (v1: 1:1 with Uber trip)
- **WebhookEvent** — idempotency audit

### v1 Delivery fields (provider-ready)

| Field | Purpose now | Future |
|-------|-------------|--------|
| `providerId` | `'uber_direct'` | Which carrier fulfilled |
| `providerDeliveryId` | Uber delivery id | Generic external id |
| `providerOrderId` | Uber order id | Same |
| `providerPayload` | JSON snapshot | Debug + reconcile across APIs |
| `orderId` | nullable | FK to **Order** when ecommerce ships |

Do **not** name columns `uberDeliveryId` in new code — use `providerDeliveryId` + `providerId`.

### Future entities (placeholders — do not build yet)

```
Order ──▶ OrderLineItem
  │
  └──▶ Delivery (1:N possible: split shipment)
         └── providerId, providerDeliveryId
```

When ecommerce arrives, **OrderService** creates an order; **FulfillmentService** chooses provider and calls the same `DeliveryProvider` interface.

---

## Coding principles

### 1. Thin routes, fat services

```typescript
// app/api/deliveries/route.ts — good
export async function POST(req: Request) {
  const session = await requireStoreManager();
  const body = createDeliverySchema.parse(await req.json());
  const delivery = await createDelivery({ storeId: session.storeId, ...body });
  return Response.json(delivery, { status: 201 });
}
```

Routes: auth → validate → one service call → respond. Nothing else.

### 2. Validate at boundaries

- **HTTP in:** Zod in `lib/domain/*/validation.ts`
- **HTTP out:** typed DTOs; never send Prisma models with secrets
- **Webhooks:** validate signature first, then parse with provider parser

### 3. Errors are structured

```typescript
// lib/utils/errors.ts
export class AppError extends Error {
  constructor(
    public code: 'QUOTE_EXPIRED' | 'INVALID_ADDRESS' | 'PROVIDER_ERROR' | ...,
    message: string,
    public status: number = 400,
  ) { super(message); }
}
```

Map `AppError` → HTTP in a small `handleApiError()` helper. Never expose stack traces or raw Uber JSON to the client.

### 4. Idempotency for writes

- **Create delivery:** accept optional `idempotencyKey` (header or body); unique constraint in DB
- **Webhooks:** dedupe by `eventId` in `WebhookEvent`

### 5. Tenant scoping everywhere

Every query that touches store data includes `storeId` from session — never trust client-supplied `storeId` alone.

```typescript
// good
await deliveryRepository.findById(id, session.storeId);

// bad
await prisma.delivery.findUnique({ where: { id } });
```

### 6. Configuration over hardcoding

| Concern | Where |
|---------|--------|
| API URLs, secrets | env vars |
| Sandbox vs live | `UBER_LIVE_MODE` + adapter behavior |
| Robo courier | adapter adds `test_specifications` when not live |
| Feature flags | env or DB `Store.features` later |

### 7. No business logic in React

- Server Components fetch via services
- Client Components: form state only; submit via Server Actions or `fetch('/api/...')`
- Status colors/map: import from `lib/domain/delivery/status.ts`

### 8. Dependency injection (lightweight)

Services accept dependencies as parameters or use small factory for tests:

```typescript
export async function createDelivery(
  input: CreateDeliveryInput,
  deps = { provider: getDeliveryProviderForStore, repo: deliveryRepository },
) { ... }
```

No heavy DI container needed until v3+.

### 9. Immutability for domain snapshots

When a delivery is created, **snapshot** pickup address from Store onto `Delivery`. Store profile edits must not rewrite history.

### 10. Log with context, not noise

```typescript
logger.info('delivery.created', { deliveryId, storeId, providerId, liveMode });
logger.error('uber.quote.failed', { storeId, errorCode, /* never log secrets */ });
```

---

## API design standards

| Rule | Detail |
|------|--------|
| REST + JSON | `/api/deliveries`, nested actions as subpaths (`/cancel`) |
| Auth | Session cookie for dashboard; webhook routes use signature |
| Success shape | `{ data: T }` or raw resource — pick one and stay consistent |
| Error shape | `{ error: string, code?: string, details?: unknown }` |
| Pagination | `?cursor=&limit=` on list endpoints (add when list grows) |
| Versioning | Not needed until public API; prefix `/api/v1/` if exposing to partners |

---

## Database practices

- **Prisma migrations** only — no manual prod schema drift
- **Transactions** for: create delivery (insert DB + call provider → if provider fails, don’t orphan; use outbox or two-phase pattern: call provider then insert with provider ids, or insert `pending` then update)
- **Indexes:** `(storeId, createdAt DESC)`, `(providerDeliveryId)`, `(WebhookEvent.eventId)` unique
- **Soft delete:** not needed for deliveries; use status `cancelled`
- **JSON columns:** `providerPayload`, `proofOfDelivery` for vendor-specific fields without schema churn

Recommended create flow:

1. Insert `Delivery` with status `draft` or `quoting`
2. Call provider create
3. Update with provider ids + `trackingUrl` + status `pending`
4. On failure: status `failed` + error message

---

## Security

| Area | Practice |
|------|----------|
| Secrets | Server-only env; never `NEXT_PUBLIC_*` for Uber/Mapbox secret keys |
| Auth | HTTP-only session; bcrypt passwords; rate-limit login |
| CSRF | Auth.js defaults for mutations |
| Webhooks | Verify Uber signature before processing |
| RBAC | `requireRole('STORE_MANAGER')` in services; extend for admin |
| PII | Phone/address in DB; redact in logs |
| Sandbox | Banner in UI + `liveMode` stored per delivery |

---

## Testing strategy

| Layer | What to test | Tool |
|-------|--------------|------|
| **domain/** | Status maps, validation, phone normalize | Vitest |
| **integrations/** mappers | Uber JSON fixtures → domain types | Vitest |
| **services/** | Mock provider + repo | Vitest |
| **api/** | Request/response contract | Vitest + supertest or MSW |
| **e2e** | Login → quote → create (sandbox) | Playwright |

Fixtures: store sanitized Uber webhook + delivery responses in `tests/fixtures/uber/`.

---

## Scalability path (when needed)

Stay monolith until a clear bottleneck appears. Extraction order if growth demands it:

1. **Webhook worker** — queue webhook processing (BullMQ / SQS) if volume spikes
2. **Provider adapter service** — only if multiple apps need dispatch
3. **Catalog / Order service** — when ecommerce is a separate team or deploy cycle

Modular folders make extraction mechanical: move `lib/services/order/` + `lib/domain/order/` to a new repo without renaming concepts.

---

## Git & code review checklist

Before merging:

- [ ] No `import` from `integrations/uber` outside `services/` or `integrations/`
- [ ] New env vars documented in `.env.example`
- [ ] Zod schema for new API inputs
- [ ] Store scoping on all data access
- [ ] Types exported from `domain/`; UI imports domain types, not Prisma types
- [ ] Matches [STYLING.md](./STYLING.md) for UI changes
- [ ] Task checked in [IMPLEMENTATION.md](./IMPLEMENTATION.md) if applicable

**Branch naming:** `feat/delivery-cancel`, `fix/webhook-signature`, `chore/deps`

**Commits:** imperative, scoped — `Add delivery cancel service and API route`

---

## Anti-patterns (avoid from day 1)

| Anti-pattern | Why it hurts later |
|--------------|-------------------|
| Uber types in components | Blocks second carrier |
| `uberDeliveryId` column naming | Renaming pain at scale |
| God `lib/utils.ts` | Unfindable logic |
| Fetch Uber from Server Component directly | Untestable, duplicated auth |
| One 800-line `route.ts` | Unmaintainable |
| Skipping provider interface “because we only have Uber” | Guaranteed rewrite for partner #2 |
| Shared mutable global state for tokens | Race conditions under serverless |

---

## Module boundaries (future ecommerce)

When adding commerce, treat these as separate **domain modules** inside the monolith:

```
lib/domain/
├── catalog/       # products, variants, inventory
├── cart/
├── order/         # checkout, Square payment
├── fulfillment/   # warehouse, pick lists
└── delivery/      # already exists — consumes Order
```

**Cross-module rule:** `order/` may call `delivery/` services; `delivery/` must not import `cart/`.

---

## Environment variables

```bash
# App
DATABASE_URL=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=

# Uber Direct
UBER_CLIENT_ID=
UBER_CLIENT_SECRET=
UBER_CUSTOMER_ID=
UBER_LIVE_MODE=false
UBER_WEBHOOK_SIGNING_SECRET=

# Geocoding
MAPBOX_ACCESS_TOKEN=

# Optional future
# STRIPE_SECRET_KEY=
# DELIVERY_DEFAULT_PROVIDER=uber_direct
```

---

## Related documents

| Doc | Purpose |
|-----|---------|
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Phased tasks and checkboxes |
| [STYLING.md](./STYLING.md) | UI tokens and components |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | This file — structure and principles |

---

## Summary

1. **Modular monolith** with strict layers: app → services → domain → db / integrations  
2. **DeliveryProvider interface** on day one — Uber is just the first adapter  
3. **Provider-agnostic DB fields** (`providerId`, `providerDeliveryId`)  
4. **Thin routes, tested services, pure domain**  
5. **Tenant-scoped, validated, idempotent** writes  
6. **Feature folders** under `components/features/` and `lib/domain/` ready for ecommerce modules later  

Build v1 inside this structure and adding DoorDash, Shopify-style catalog, or admin roles becomes additive — not a rewrite.
