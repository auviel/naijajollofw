# AI Storefront Assistant (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a warm-host storefront AI chat (floating widget) plus smarter shared menu ranking so diners can ask food/hours questions, browse matches, open items, and add simple items to cart — without checkout in chat.

**Architecture:** Upgrade pure menu ranking in `lib/domain/menu/search.ts` (no embeddings). Add `lib/ai/` (prompt, models, tools) and `POST /api/ai/chat` streaming via Vercel AI SDK with tool calling. Tools wrap existing `getPublicStorefront` / `getPublicMenuItem` / `getPublicStoreOpenStatus` / `addCartItem`. Floating chat mounts in storefront layout; header typeahead consumes the same ranking helpers.

**Tech Stack:** Next.js App Router, `ai` + `@ai-sdk/react`, Zod, Vitest, existing Prisma menu/cart/store services.

**Spec:** `docs/superpowers/specs/2026-08-28-ai-storefront-assistant-design.md`

## Global Constraints

- Primary model: **`openai/gpt-4o-mini`**
- Fallback model: **`openai/gpt-5-mini`** via `providerOptions.gateway.models`
- Header search: **no LLM** — shared ranking only
- Phase 1 tools only: `searchMenu`, `getItem`, `getStoreStatus`, `addToCart`, `openItem`
- No checkout, payment, address mutation, or order-status tools
- Facts (price, availability, hours) **only** from tools — never invent
- Voice: warm host, short replies
- Guests OK; account asks → sign-in nudge (no fake success)
- Rate-limit chat by IP
- Do not commit secrets; document keys in `.env.example`
- Prefer existing cart/menu services over HTTP self-fetch inside tools
- After `npm install ai`, verify exports: use `stepCountIs` **or** `isStepCount`, and `toUIMessageStreamResponse` **or** `createUIMessageStreamResponse`/`toUIMessageStream` per installed package typings

---

## File map

| Path | Responsibility |
|------|----------------|
| `lib/domain/menu/search.ts` | Shared ranking + suggestions (header + tools) |
| `tests/unit/menu-search.test.ts` | Ranking / vague-query tests |
| `lib/ai/models.ts` | Primary + gateway fallback config |
| `lib/ai/prompt.ts` | System / instructions string |
| `lib/ai/tools.ts` | Tool defs + execute (menu, hours, cart, open) |
| `lib/ai/types.ts` | Shared tool result / UI message types |
| `lib/ai/can-add-simple.ts` | Whether item can add without customize UI |
| `app/api/ai/chat/route.ts` | Streaming chat endpoint |
| `components/features/ai/storefront-ai-chat.tsx` | Floating launcher + panel shell |
| `components/features/ai/ai-chat-messages.tsx` | Message list, item cards, sign-in nudge |
| `app/(storefront)/layout.tsx` | Mount floating chat |
| `components/features/storefront/menu-search-suggest.tsx` | Consume ranked suggestions (if API changes) |
| `.env.example` | `OPENAI_API_KEY` / AI Gateway notes |
| `tests/unit/ai-can-add-simple.test.ts` | Pure helper tests |

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

### Task 2: Smarter menu ranking (shared brain, no LLM)

**Files:**
- Modify: `lib/domain/menu/search.ts`
- Modify: `tests/unit/menu-search.test.ts`

**Interfaces:**
- Consumes: `MenuSearchIndex`, `MenuSearchItem`
- Produces:
  - `rankMenuItems(index: MenuSearchIndex, query: string, limit?: number): MenuSearchItem[]`
  - `buildSearchSuggestions` / `filterCatalogByQuery` use ranking (available items preferred; token overlap)

- [ ] **Step 1: Write failing tests**

Add to `tests/unit/menu-search.test.ts` (extend catalog fixture if needed):

```ts
import { rankMenuItems, buildSearchIndex } from "@/lib/domain/menu/search";

it("ranks exact name hits above weak substring noise", () => {
  const index = buildSearchIndex(catalog);
  const ranked = rankMenuItems(index, "fried plantain", 5);
  expect(ranked[0]?.slug).toBe("fried-plantain");
});

it("returns matches from description tokens", () => {
  const index = buildSearchIndex(catalog);
  const ranked = rankMenuItems(index, "smoky party rice", 5);
  expect(ranked.some((i) => i.slug.includes("jollof"))).toBe(true);
});

it("prefers available items when scores tie", () => {
  const index = buildSearchIndex(catalog);
  const ranked = rankMenuItems(index, "jollof", 10);
  const firstUnavailable = ranked.findIndex((i) => !i.available);
  const firstAvailable = ranked.findIndex((i) => i.available);
  if (firstUnavailable !== -1 && firstAvailable !== -1) {
    expect(firstAvailable).toBeLessThan(firstUnavailable);
  }
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- tests/unit/menu-search.test.ts
```

Expected: FAIL — `rankMenuItems` not exported / weak ranking.

- [ ] **Step 3: Implement ranking**

In `lib/domain/menu/search.ts`:

```ts
function tokenize(q: string): string[] {
  return normalizeNeedle(q).split(/[^a-z0-9+]+/).filter((t) => t.length > 1);
}

function scoreItem(item: MenuSearchItem, tokens: string[], needle: string): number {
  if (!needle) return 0;
  const name = item.name.toLowerCase();
  const desc = (item.description ?? "").toLowerCase();
  let score = 0;
  if (name === needle) score += 100;
  if (name.startsWith(needle)) score += 40;
  if (name.includes(needle)) score += 25;
  if (desc.includes(needle)) score += 10;
  for (const token of tokens) {
    if (name.includes(token)) score += 12;
    else if (desc.includes(token)) score += 5;
  }
  if (item.available) score += 3;
  return score;
}

export function rankMenuItems(
  index: MenuSearchIndex,
  query: string,
  limit = 8,
): MenuSearchItem[] {
  const needle = normalizeNeedle(query);
  if (!needle) return [];
  const tokens = tokenize(needle);
  return [...index.items]
    .map((item) => ({ item, score: scoreItem(item, tokens, needle) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((row) => row.item);
}
```

Update `buildSearchSuggestions` to use `rankMenuItems(index, draft, itemLimit)` instead of filter+slice.  
Update `filterCatalogByQuery` so when `q` is non-empty, categories only include ranked items (preserve category grouping; order items by rank score).

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- tests/unit/menu-search.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/domain/menu/search.ts tests/unit/menu-search.test.ts
git commit -m "$(cat <<'EOF'
feat: rank storefront menu search by token relevance

EOF
)"
```

---

### Task 3: AI prompt, models, and pure tool helpers

**Files:**
- Create: `lib/ai/models.ts`
- Create: `lib/ai/prompt.ts`
- Create: `lib/ai/types.ts`
- Create: `lib/ai/can-add-simple.ts`
- Create: `tests/unit/ai-can-add-simple.test.ts`

**Interfaces:**
- Consumes: none from Task 2 beyond shared search (later)
- Produces:
  - `AI_CHAT_MODEL = "openai/gpt-4o-mini"`
  - `AI_CHAT_FALLBACK_MODELS = ["openai/gpt-5-mini"]`
  - `aiChatProviderOptions` for gateway failover
  - `STOREFRONT_AI_INSTRUCTIONS: string`
  - `canAddWithoutCustomize(groups: { required: boolean; minSelect: number }[]): boolean`

- [ ] **Step 1: Failing test for can-add helper**

```ts
// tests/unit/ai-can-add-simple.test.ts
import { describe, expect, it } from "vitest";
import { canAddWithoutCustomize } from "@/lib/ai/can-add-simple";

describe("canAddWithoutCustomize", () => {
  it("allows add when no required modifiers", () => {
    expect(canAddWithoutCustomize([{ required: false, minSelect: 0 }])).toBe(true);
    expect(canAddWithoutCustomize([])).toBe(true);
  });

  it("blocks add when a group is required or minSelect > 0", () => {
    expect(canAddWithoutCustomize([{ required: true, minSelect: 0 }])).toBe(false);
    expect(canAddWithoutCustomize([{ required: false, minSelect: 1 }])).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- tests/unit/ai-can-add-simple.test.ts
```

- [ ] **Step 3: Implement helpers + prompt + models**

`lib/ai/can-add-simple.ts`:

```ts
export function canAddWithoutCustomize(
  groups: { required: boolean; minSelect: number }[],
): boolean {
  return groups.every((g) => !g.required && g.minSelect <= 0);
}
```

`lib/ai/models.ts`:

```ts
export const AI_CHAT_MODEL = "openai/gpt-4o-mini" as const;
export const AI_CHAT_FALLBACK_MODELS = ["openai/gpt-5-mini"] as const;

export const aiChatProviderOptions = {
  gateway: {
    models: [...AI_CHAT_FALLBACK_MODELS],
  },
};
```

`lib/ai/prompt.ts` — export `STOREFRONT_AI_INSTRUCTIONS` covering: warm short Nigerian hospitality; never invent prices/hours/availability; always use tools for facts; clarify plate vs tray before add; required modifiers → `openItem`; account/pay/address/place-order → politely nudge sign-in or checkout (no tools); prefer 1–3 suggestions.

`lib/ai/types.ts`:

```ts
export type SearchMenuToolResult = {
  items: Array<{
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    available: boolean;
    description: string | null;
  }>;
};

export type OpenItemToolResult = { href: string; slug: string };

export type AddToCartToolResult =
  | { ok: true; name: string; quantity: number }
  | { ok: false; needsCustomize: true; slug: string; reason: string }
  | { ok: false; error: string };
```

- [ ] **Step 4: Run tests — PASS**

```bash
npm test -- tests/unit/ai-can-add-simple.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/ai tests/unit/ai-can-add-simple.test.ts
git commit -m "$(cat <<'EOF'
feat: add AI prompt, models, and simple-add helper

EOF
)"
```

---

### Task 4: Implement AI tools

**Files:**
- Create: `lib/ai/tools.ts`

**Interfaces:**
- Consumes: `rankMenuItems`, `buildSearchIndex`, `getPublicStorefront`, `getPublicMenuItem`, `getPublicStoreOpenStatus`, `getPublicStoreHoursSchedule`, `addCartItem`, `canAddWithoutCustomize`
- Produces: `createStorefrontAiTools()` → tools `searchMenu`, `getItem`, `getStoreStatus`, `addToCart`, `openItem`

- [ ] **Step 1: Implement `createStorefrontAiTools`**

Read `lib/services/storefront/get-public-menu.ts` first and match the exact return shape (e.g. `catalog` vs nested fields).

```ts
// lib/ai/tools.ts
import { tool } from "ai";
import { z } from "zod";
import { buildSearchIndex, rankMenuItems } from "@/lib/domain/menu/search";
import {
  getPublicMenuItem,
  getPublicStorefront,
} from "@/lib/services/storefront/get-public-menu";
import {
  getPublicStoreOpenStatus,
  getPublicStoreHoursSchedule,
} from "@/lib/services/store/store-hours";
import { addCartItem } from "@/lib/services/cart/cart-actions";
import { canAddWithoutCustomize } from "@/lib/ai/can-add-simple";
import { AppError } from "@/lib/utils/errors";

export function createStorefrontAiTools() {
  return {
    searchMenu: tool({
      description:
        "Search the live menu by craving, name, or keywords. Use before recommending dishes.",
      inputSchema: z.object({
        query: z.string().min(1).max(120),
        limit: z.number().int().min(1).max(8).optional(),
      }),
      execute: async ({ query, limit }) => {
        const storefront = await getPublicStorefront();
        const catalog = storefront.catalog;
        const items = rankMenuItems(
          buildSearchIndex(catalog),
          query,
          limit ?? 5,
        );
        return {
          items: items.map((i) => ({
            id: i.id,
            slug: i.slug,
            name: i.name,
            priceCents: i.priceCents,
            available: i.available,
            description: i.description,
          })),
        };
      },
    }),

    getItem: tool({
      description:
        "Get one menu item price, availability, description, and modifier requirements by slug or id.",
      inputSchema: z.object({ slugOrId: z.string().min(1).max(120) }),
      execute: async ({ slugOrId }) => {
        const { item } = await getPublicMenuItem(slugOrId);
        return {
          id: item.id,
          slug: item.slug,
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          available: item.available,
          modifierGroups: item.modifierGroups.map((g) => ({
            id: g.id,
            name: g.name,
            required: g.required,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            modifiers: g.modifiers.map((m) => ({
              id: m.id,
              name: m.name,
              priceDeltaCents: m.priceDeltaCents,
              available: m.available,
            })),
          })),
        };
      },
    }),

    getStoreStatus: tool({
      description:
        "Get whether the store is open, today’s hours message, and pickup/delivery basics.",
      inputSchema: z.object({}),
      execute: async () => {
        const [status, schedule] = await Promise.all([
          getPublicStoreOpenStatus(),
          getPublicStoreHoursSchedule(),
        ]);
        return {
          isOpen: status.isOpen,
          message: status.message,
          todayLabel: status.todayLabel,
          nextOpenLabel: status.nextOpenLabel,
          timezone: status.timezone,
          hoursConfigured: schedule.configured,
          fulfillment:
            "Customers choose pickup or delivery at checkout. Chat cannot place the order yet — guide them to cart/checkout.",
        };
      },
    }),

    openItem: tool({
      description:
        "Open the item customize page when modifiers are required or the user wants to see the dish.",
      inputSchema: z.object({ slug: z.string().min(1).max(120) }),
      execute: async ({ slug }) => ({ href: `/item/${slug}`, slug }),
    }),

    addToCart: tool({
      description:
        "Add a simple menu item to the session cart when no required modifiers. If customize is required, return needsCustomize instead.",
      inputSchema: z.object({
        menuItemId: z.string().cuid(),
        quantity: z.number().int().min(1).max(99).optional(),
      }),
      execute: async ({ menuItemId, quantity }) => {
        const { item } = await getPublicMenuItem(menuItemId);
        if (!item.available) {
          return { ok: false as const, error: "This item is sold out." };
        }
        if (!canAddWithoutCustomize(item.modifierGroups)) {
          return {
            ok: false as const,
            needsCustomize: true as const,
            slug: item.slug,
            reason: "This dish needs customization. Open the item page.",
          };
        }
        try {
          await addCartItem({
            menuItemId: item.id,
            quantity: quantity ?? 1,
            modifierIds: [],
          });
          return {
            ok: true as const,
            name: item.name,
            quantity: quantity ?? 1,
          };
        } catch (err) {
          const message =
            err instanceof AppError ? err.message : "Could not add to cart.";
          return { ok: false as const, error: message };
        }
      },
    }),
  };
}
```

- [ ] **Step 2: Typecheck tools file**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -50
```

Fix until `lib/ai/tools.ts` typechecks (or at least resolve errors in `lib/ai/**`).

- [ ] **Step 3: Commit**

```bash
git add lib/ai/tools.ts
git commit -m "$(cat <<'EOF'
feat: add storefront AI tool implementations

EOF
)"
```

---

### Task 5: Chat API route

**Files:**
- Create: `app/api/ai/chat/route.ts`

**Interfaces:**
- Consumes: `createStorefrontAiTools`, `STOREFRONT_AI_INSTRUCTIONS`, `AI_CHAT_MODEL`, `aiChatProviderOptions`
- Produces: `POST /api/ai/chat` UI message stream; rate limit **20 req / IP / minute** via `checkRateLimit`

- [ ] **Step 1: Implement route**

Use `getRequestIpFromRequest` from `lib/utils/request-ip.ts` (same as `app/api/cart/route.ts`).

```ts
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createStorefrontAiTools } from "@/lib/ai/tools";
import { STOREFRONT_AI_INSTRUCTIONS } from "@/lib/ai/prompt";
import { AI_CHAT_MODEL, aiChatProviderOptions } from "@/lib/ai/models";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

export const maxDuration = 30;

export async function POST(req: Request) {
  const ip = getRequestIpFromRequest(req);
  const limited = checkRateLimit(`ai-chat:${ip}`, 20, 60_000);
  if (!limited.allowed) {
    return Response.json(
      { error: "Too many messages. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  const body = await req.json();
  const messages = body.messages as UIMessage[];

  const result = streamText({
    model: AI_CHAT_MODEL,
    providerOptions: aiChatProviderOptions,
    instructions: STOREFRONT_AI_INSTRUCTIONS,
    messages: await convertToModelMessages(messages),
    tools: createStorefrontAiTools(),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
```

If `stepCountIs` / `toUIMessageStreamResponse` are missing from installed `ai`, switch to the package’s documented equivalents (`isStepCount`, `createUIMessageStreamResponse` + `toUIMessageStream`).

- [ ] **Step 2: Smoke the route locally**

With `npm run dev` and `OPENAI_API_KEY` set:

```bash
curl -sS -X POST http://localhost:3000/api/ai/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"Are you open?"}]}]}' \
  | head -c 500
```

Expected: streaming chunks (not HTTP 500). Adjust UIMessage JSON shape if the installed SDK expects a different client body.

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
- `openItem` → “Open dish” link from `href`
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
- Do not auto-navigate on `openItem` — require user click

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
- Modify: `lib/ai/prompt.ts` if manual tests show invention / verbosity

**Interfaces:**
- Consumes: `buildSearchSuggestions` / `rankMenuItems`
- Produces: typeahead order matches chat search quality

- [ ] **Step 1: Verify typeahead**

Type `plantain` / `smoky` in header — top hits match `rankMenuItems`. Fix suggest component if it re-sorts.

- [ ] **Step 2: Prompt polish**

Tighten instructions if the model invents prices or skips tools.

- [ ] **Step 3: Commit if changes**

```bash
git add components/features/storefront/menu-search-suggest.tsx lib/ai/prompt.ts
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
npm test -- tests/unit/menu-search.test.ts tests/unit/ai-can-add-simple.test.ts
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

- Mobile diner bottom-nav chat / profile header move
- Checkout, cards, addresses in chat
- Order status companion / pushes
- Embeddings / vector DB
- Sanity/blog grounding
- WhatsApp agent

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Smarter search, no embeddings | Task 2 |
| Floating chat web | Task 6 |
| Tools: search/getItem/store/add/open | Task 4–5 |
| Models 4o-mini → 5-mini | Task 3, 5 |
| Guest + sign-in nudge | Task 6 |
| Rate limit | Task 5 |
| Warm host, no invention | Task 3 prompt |
| Reuse cart/menu/hours | Task 4 |
| Unit tests search + helpers | Tasks 2–3, 8 |
| Mobile app / ordering / companion | Explicitly out of scope |
