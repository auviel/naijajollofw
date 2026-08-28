# AI Storefront Assistant (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a warm-host storefront AI chat (floating widget) plus smarter shared catalog ranking so diners can ask food/hours questions, browse matches, open products, and add simple items to cart — without checkout in chat — on a ports-and-adapters core reusable for other ecommerce verticals.

**Architecture:** Ports-and-adapters commerce AI: vertical-agnostic core (`lib/ai/core`, `lib/ai/ports`, `lib/ai/catalog` ranking) plus a **restaurant** adapter that wires existing menu/hours/cart services. `POST /api/ai/chat` is a thin route. Floating chat + header search share catalog ranking. Pharmacy/other verticals later = new adapter, not a fork.

**Tech Stack:** Next.js App Router, `ai` + `@ai-sdk/react`, Zod, Vitest, existing Prisma menu/cart/store services (adapter only).

**Spec:** `docs/superpowers/specs/2026-08-28-ai-storefront-assistant-design.md`

## Global Constraints

- Primary model: **`openai/gpt-4o-mini`**
- Fallback model: **`openai/gpt-5-mini`** via `providerOptions.gateway.models`
- Header search: **no LLM** — shared catalog ranking only
- Phase 1 tools only: `searchCatalog`, `getProduct`, `getMerchantStatus`, `addToCart`, `openProduct`
- Core must not import menu Prisma/repos — only ports + restaurant adapter
- Generic types: `CatalogSearchItem` (not `MenuItem*` inside `lib/ai/core` / `lib/ai/catalog`)
- No checkout, payment, address mutation, or order-status tools
- Facts (price, availability, hours) **only** from tools — never invent
- Voice: warm host, short replies (restaurant prompt fragment)
- Guests OK; account asks → sign-in nudge (no fake success)
- Rate-limit chat by IP
- Do not commit secrets; document keys in `.env.example`
- Prefer existing cart/menu services **inside adapters** over HTTP self-fetch
- YAGNI: no pharmacy adapter in phase 1 — only clean seams
- After `npm install ai`, verify exports: use `stepCountIs` **or** `isStepCount`, and `toUIMessageStreamResponse` **or** `createUIMessageStreamResponse`/`toUIMessageStream` per installed package typings

---

## File map

| Path | Responsibility |
|------|----------------|
| `lib/ai/ports/catalog.ts` | `CatalogPort` + `CatalogSearchItem` / product detail types |
| `lib/ai/ports/cart.ts` | `CartPort` (addSimple, canAddWithoutCustomize semantics) |
| `lib/ai/ports/merchant.ts` | `MerchantPort` (open status, hours, fulfillment blurb) |
| `lib/ai/catalog/rank.ts` | Pure `rankCatalogItems` / suggestions over `CatalogSearchItem` |
| `lib/domain/menu/search.ts` | Thin bridge: menu catalog → `CatalogSearchItem` + re-export rank for header (keep existing callers working) |
| `tests/unit/catalog-rank.test.ts` | Ranking tests on generic items |
| `tests/unit/menu-search.test.ts` | Keep/adapt existing menu search tests via bridge |
| `lib/ai/core/models.ts` | Primary + gateway fallback |
| `lib/ai/core/prompt.ts` | `composeAssistantPrompt({ brand, vertical, policies })` |
| `lib/ai/core/create-chat-handler.ts` | Shared streamText + tools factory |
| `lib/ai/verticals/restaurant/ports.ts` | Implement Catalog/Cart/Merchant ports |
| `lib/ai/verticals/restaurant/prompt.ts` | Restaurant voice + food policies |
| `lib/ai/verticals/restaurant/tools.ts` | Bind ports → AI SDK tools |
| `lib/ai/verticals/restaurant/create-chat.ts` | `createRestaurantChatHandler()` |
| `app/api/ai/chat/route.ts` | Rate limit + call restaurant handler |
| `components/features/ai/storefront-ai-chat.tsx` | Floating launcher + panel |
| `components/features/ai/ai-chat-messages.tsx` | Messages + product cards + sign-in nudge |
| `app/(storefront)/layout.tsx` | Mount floating chat |
| `.env.example` | AI env keys |
| `tests/unit/ai-can-add-simple.test.ts` | Pure cart eligibility helper (port-level) |

---

### Task 1: Install AI SDK + env docs

**Files:**
- Modify: `package.json` / lockfile
- Modify: `.env.example`
- Modify: `.env` (local only — never commit)

**Interfaces:**
- Produces: packages `ai`, `@ai-sdk/react` available; env key documented for later tasks

- [ ] **Step 1: Install packages**

```bash
npm install ai @ai-sdk/react
```

- [ ] **Step 2: Document env**

Append to `.env.example`:

```bash
# AI storefront assistant (chat). Prefer Vercel AI Gateway on deploy;
# local/BYOK can use OpenAI directly.
OPENAI_API_KEY=""
# Optional if using Gateway API key instead of OIDC:
# AI_GATEWAY_API_KEY=""
```

Ensure local `.env` already has `OPENAI_API_KEY` (do not print or commit it).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "$(cat <<'EOF'
chore: add AI SDK deps for storefront assistant

EOF
)"
```

---

### Task 2: Catalog ranking core + menu bridge

**Files:**
- Create: `lib/ai/ports/catalog.ts` (minimal `CatalogSearchItem` type)
- Create: `lib/ai/catalog/rank.ts`
- Create: `tests/unit/catalog-rank.test.ts`
- Modify: `lib/domain/menu/search.ts` (map menu → catalog rank; keep existing exports)
- Modify: `tests/unit/menu-search.test.ts`

**Interfaces:**
- Produces:
  - `CatalogSearchItem` `{ id, slug, name, description, priceCents, imageUrl, available }`
  - `rankCatalogItems(items: CatalogSearchItem[], query: string, limit?: number): CatalogSearchItem[]`
  - Menu bridge: `rankMenuItems` / `buildSearchSuggestions` call `rankCatalogItems` so header keeps working

- [ ] **Step 1: Failing catalog-rank tests**

```ts
// tests/unit/catalog-rank.test.ts
import { describe, expect, it } from "vitest";
import { rankCatalogItems } from "@/lib/ai/catalog/rank";
import type { CatalogSearchItem } from "@/lib/ai/ports/catalog";

const items: CatalogSearchItem[] = [
  {
    id: "1",
    slug: "jollof-rice-plantain-and-chicken",
    name: "Jollof Rice, Plantain and Chicken",
    description: "Smoky party-style jollof.",
    priceCents: 2399,
    imageUrl: null,
    available: true,
  },
  {
    id: "3",
    slug: "fried-plantain",
    name: "Fried Plantain",
    description: "Sweet ripe plantain.",
    priceCents: 599,
    imageUrl: null,
    available: true,
  },
];

describe("rankCatalogItems", () => {
  it("ranks exact-ish name hits first", () => {
    expect(rankCatalogItems(items, "fried plantain", 5)[0]?.slug).toBe(
      "fried-plantain",
    );
  });

  it("matches description tokens", () => {
    expect(
      rankCatalogItems(items, "smoky party rice", 5).some((i) =>
        i.slug.includes("jollof"),
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- tests/unit/catalog-rank.test.ts
```

- [ ] **Step 3: Implement ports type + pure ranker**

`lib/ai/ports/catalog.ts` — export `CatalogSearchItem` (and later `CatalogPort` interface stub with `search` / `getBySlugOrId` method signatures only — implement in Task 4).

`lib/ai/catalog/rank.ts` — token scoring (exact/startswith/includes/desc/available boost) identical spirit to prior plan; **no menu imports**.

Bridge in `lib/domain/menu/search.ts`: map `MenuSearchItem` ↔ `CatalogSearchItem`, implement `rankMenuItems` via `rankCatalogItems`, wire `buildSearchSuggestions` / `filterCatalogByQuery` to ranked results.

- [ ] **Step 4: Run tests — PASS**

```bash
npm test -- tests/unit/catalog-rank.test.ts tests/unit/menu-search.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/ai/ports/catalog.ts lib/ai/catalog/rank.ts tests/unit/catalog-rank.test.ts lib/domain/menu/search.ts tests/unit/menu-search.test.ts
git commit -m "$(cat <<'EOF'
feat: add vertical-agnostic catalog ranking for AI search

EOF
)"
```

---

### Task 3: AI core (models, prompt composer, cart eligibility)

**Files:**
- Create: `lib/ai/core/models.ts`
- Create: `lib/ai/core/prompt.ts`
- Create: `lib/ai/core/can-add-simple.ts`
- Create: `lib/ai/ports/cart.ts` (types + `CartPort` interface)
- Create: `lib/ai/ports/merchant.ts` (`MerchantPort` interface)
- Create: `lib/ai/verticals/restaurant/prompt.ts`
- Create: `tests/unit/ai-can-add-simple.test.ts`

**Interfaces:**
- Produces:
  - `AI_CHAT_MODEL`, `AI_CHAT_FALLBACK_MODELS`, `aiChatProviderOptions`
  - `composeAssistantPrompt({ brandName, verticalInstructions, policies })`
  - `RESTAURANT_VERTICAL_INSTRUCTIONS` (food voice; plate/tray; no medical claims)
  - `canAddWithoutCustomize(groups: { required: boolean; minSelect: number }[]): boolean`
  - Port interfaces only (no restaurant service imports in `core/` or `ports/`)

- [ ] **Step 1: Failing can-add tests**

```ts
import { canAddWithoutCustomize } from "@/lib/ai/core/can-add-simple";
// same cases as before: empty/optional OK; required or minSelect>0 blocked
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- tests/unit/ai-can-add-simple.test.ts
```

- [ ] **Step 3: Implement core + ports + restaurant prompt fragment**

Port sketches:

```ts
// lib/ai/ports/catalog.ts (extend)
export type CatalogPort = {
  search(query: string, limit?: number): Promise<CatalogSearchItem[]>;
  getBySlugOrId(slugOrId: string): Promise<CatalogProductDetail | null>;
};

// lib/ai/ports/cart.ts
export type CartPort = {
  addSimple(input: {
    productId: string;
    quantity: number;
  }): Promise<
    | { ok: true; name: string; quantity: number }
    | { ok: false; needsCustomize: true; slug: string; reason: string }
    | { ok: false; error: string }
  >;
};

// lib/ai/ports/merchant.ts
export type MerchantPort = {
  getStatus(): Promise<{
    isOpen: boolean;
    message: string;
    todayLabel?: string | null;
    nextOpenLabel?: string | null;
    timezone: string;
    fulfillmentBlurb: string;
  }>;
};
```

`composeAssistantPrompt` concatenates: safety policies (never invent catalog/merchant facts; tools only) + brand line + vertical instructions.

Restaurant fragment: warm host; food cravings; plate vs tray; modifiers → `openProduct`; account/pay → `/signin` or checkout.

- [ ] **Step 4: Run — PASS**

```bash
npm test -- tests/unit/ai-can-add-simple.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/ai/core lib/ai/ports lib/ai/verticals/restaurant/prompt.ts tests/unit/ai-can-add-simple.test.ts
git commit -m "$(cat <<'EOF'
feat: add AI core ports, models, and restaurant prompt

EOF
)"
```

---

### Task 4: Restaurant adapters + commerce tools

**Files:**
- Create: `lib/ai/verticals/restaurant/ports.ts`
- Create: `lib/ai/verticals/restaurant/tools.ts`
- Create: `lib/ai/core/create-tools.ts` (optional thin binder: ports → tool())
- Create: `lib/ai/verticals/restaurant/create-chat.ts`

**Interfaces:**
- Consumes: `CatalogPort`, `CartPort`, `MerchantPort`, `rankCatalogItems`, restaurant services
- Produces:
  - `createRestaurantPorts(): { catalog, cart, merchant }`
  - `createCommerceTools(ports)` → `searchCatalog`, `getProduct`, `getMerchantStatus`, `addToCart`, `openProduct`
  - `createRestaurantChatHandler()` used by the route

- [ ] **Step 1: Implement restaurant port adapters**

Wire:
- catalog.search → `getPublicStorefront` + `rankCatalogItems`
- catalog.getBySlugOrId → `getPublicMenuItem` mapped to `CatalogProductDetail` (include option groups for can-add)
- merchant.getStatus → `getPublicStoreOpenStatus` + hours schedule + fixed fulfillment blurb
- cart.addSimple → `canAddWithoutCustomize` then `addCartItem` (map productId → menuItemId)

No Prisma imports outside these adapter files.

- [ ] **Step 2: Bind AI SDK tools to ports**

Tool names must be the commerce-generic set. `openProduct` returns `{ href: `/item/${slug}`, slug }`.  
`createRestaurantChatHandler` calls `streamText` with `composeAssistantPrompt({ brandName: "Naija Jollof", verticalInstructions: RESTAURANT_VERTICAL_INSTRUCTIONS, policies: DEFAULT_COMMERCE_POLICIES })`, `AI_CHAT_MODEL`, gateway fallbacks, `createCommerceTools(createRestaurantPorts())`, `stopWhen: stepCountIs(5)`.

- [ ] **Step 3: Typecheck `lib/ai/**`**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -50
```

- [ ] **Step 4: Commit**

```bash
git add lib/ai
git commit -m "$(cat <<'EOF'
feat: wire restaurant AI adapters and commerce tools

EOF
)"
```

---

### Task 5: Thin chat API route

**Files:**
- Create: `app/api/ai/chat/route.ts`

**Interfaces:**
- Consumes: `createRestaurantChatHandler` (or equivalent), `getRequestIpFromRequest`, `checkRateLimit`
- Produces: `POST /api/ai/chat`; **20 req / IP / minute**

- [ ] **Step 1: Implement route**

```ts
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { createRestaurantChatHandler } from "@/lib/ai/verticals/restaurant/create-chat";

export const maxDuration = 30;

export async function POST(req: Request) {
  const ip = getRequestIpFromRequest(req);
  const limited = checkRateLimit(`ai-chat:${ip}`, 20, 60_000);
  if (!limited.allowed) {
    return Response.json(
      { error: "Too many messages. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds ?? 60) },
      },
    );
  }
  return createRestaurantChatHandler(req);
}
```

Handler parses `{ messages }`, runs `streamText`, returns UI message stream (match installed `ai` API).

- [ ] **Step 2: Smoke curl**

```bash
curl -sS -X POST http://localhost:3000/api/ai/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"Are you open?"}]}]}' \
  | head -c 500
```

Expected: stream chunks, not 500.

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/chat/route.ts
git commit -m "$(cat <<'EOF'
feat: add streaming storefront AI chat API

EOF
)"
```

---

### Task 6: Floating chat UI

**Files:**
- Create: `components/features/ai/storefront-ai-chat.tsx`
- Create: `components/features/ai/ai-chat-messages.tsx`
- Modify: `app/(storefront)/layout.tsx`

**Interfaces:**
- Consumes: `useChat` → `/api/ai/chat`; `formatCadFromCents`
- Produces: fixed bottom-end launcher; panel with messages, input, item cards (Add/View), sign-in link

- [ ] **Step 1: Message renderer**

In `ai-chat-messages.tsx`:

- Map `message.parts`
- `text` → paragraph
- Tool parts for `searchMenu` / `getItem` → cards: name, `formatCadFromCents(priceCents)`, **View** (`Link` `/item/[slug]`), **Add** via client `POST /api/cart` with `{ menuItemId, quantity: 1 }` when available and simple; otherwise View only
- `openProduct` → “Open dish” link from `href`
- `addToCart` success → confirmation; `needsCustomize` → item link
- If assistant text clearly asks to sign in → show `Link` to `/signin`

Use existing storefront tokens — no new purple theme.

- [ ] **Step 2: Shell with useChat**

```tsx
"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
});
```

UI requirements:

- Collapsed: fixed bottom-end button (high z-index)
- Expanded: panel `min(420px, calc(100vw - 2rem))`, title **Ask Naija**, close control, welcome “What are you craving today?”
- Input + send; disable while streaming
- Do not auto-navigate on `openProduct` — require user click

- [ ] **Step 3: Mount in layout**

```tsx
import { StorefrontAiChat } from "@/components/features/ai/storefront-ai-chat";

// inside StorefrontProviders, after footer Suspense:
<StorefrontAiChat />
```

- [ ] **Step 4: Manual UI check**

- Chat button on desktop + mobile web
- “what’s spicy?” → cards
- Add simple item → cart updates
- Required-modifier item → customize path
- “use my saved card” → sign-in nudge, no charge

- [ ] **Step 5: Commit**

```bash
git add components/features/ai "app/(storefront)/layout.tsx"
git commit -m "$(cat <<'EOF'
feat: add floating storefront AI chat widget

EOF
)"
```

---

### Task 7: Header search alignment + prompt polish

**Files:**
- Modify: `components/features/storefront/menu-search-suggest.tsx` (only if still unsorted after Task 2)
- Modify: `lib/ai/verticals/restaurant/prompt.ts` if manual tests show invention / verbosity

**Interfaces:**
- Consumes: `buildSearchSuggestions` / `rankMenuItems`
- Produces: typeahead order matches chat search quality

- [ ] **Step 1: Verify typeahead**

Type `plantain` / `smoky` in header — top hits match `rankMenuItems`. Fix suggest component if it re-sorts.

- [ ] **Step 2: Prompt polish**

Tighten instructions if the model invents prices or skips tools.

- [ ] **Step 3: Commit if changes**

```bash
git add components/features/storefront/menu-search-suggest.tsx lib/ai/verticals/restaurant/prompt.ts
git commit -m "$(cat <<'EOF'
fix: align header search ranking and AI prompt polish

EOF
)"
```

---

### Task 8: Regression pass + spec status

**Files:**
- Modify: `docs/superpowers/specs/2026-08-28-ai-storefront-assistant-design.md` (status)

- [ ] **Step 1: Run unit suite**

```bash
npm test -- tests/unit/catalog-rank.test.ts tests/unit/menu-search.test.ts tests/unit/ai-can-add-simple.test.ts
```

Expected: PASS

- [ ] **Step 2: Manual checklist**

- [ ] Vague craving → useful ranked items
- [ ] Hours / open-closed grounded via tool
- [ ] Simple add-to-cart from chat
- [ ] Modifier-required → open customize
- [ ] Account ask → sign-in nudge
- [ ] No invented prices in spot check
- [ ] Burst chat hits 429

- [ ] **Step 3: Mark spec status**

Set header to `Status: Phase 1 implemented` (roadmap phases 2–4 remain later).

- [ ] **Step 4: Final commit**

```bash
git add docs/superpowers/specs/2026-08-28-ai-storefront-assistant-design.md
git commit -m "$(cat <<'EOF'
docs: mark AI storefront assistant phase 1 implemented

EOF
)"
```

---

## Out of scope (do not build in this plan)

- Pharmacy (or other) vertical adapter — leave ports only
- Mobile diner bottom-nav chat / profile header move
- Checkout, cards, addresses in chat
- Order status companion / pushes
- Embeddings / vector DB
- Sanity/blog grounding
- WhatsApp agent
- Extracting `lib/ai` into a separate npm package (premature)

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Ports & adapters / vertical-ready core | Tasks 2–4 |
| Smarter catalog ranking, no embeddings | Task 2 |
| Floating chat web | Task 6 |
| Tools: searchCatalog/getProduct/merchant/add/open | Task 4–5 |
| Models 4o-mini → 5-mini | Task 3, 5 |
| Guest + sign-in nudge | Task 6 |
| Rate limit | Task 5 |
| Warm host, no invention | Task 3 restaurant prompt |
| Menu/hours/cart only in restaurant adapter | Task 4 |
| Unit tests ranking + helpers | Tasks 2–3, 8 |
| Pharmacy vertical | Out of scope (seams only) |
| Mobile app / ordering / companion | Explicitly out of scope |
