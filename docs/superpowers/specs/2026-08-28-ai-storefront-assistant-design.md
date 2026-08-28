# AI Storefront Assistant Design

**Date:** 2026-08-28  
**Status:** Phase 1 + Phase 2 implemented  
**Surfaces:** Web storefront (phase 1); mobile diner app Ask Amaka tab (phase 2)  
**Approach:** Tool-calling agent (shared brain for search + chat)

## Goal

Ship a warm, hospitable AI host for Naija Jollof that helps diners find food and understand the store — then grow into conversational ordering and an order companion. Phase 1 is useful without charging cards or inventing menu facts.

## Phasing (locked)

| Order | Focus | Ship when |
|-------|--------|-----------|
| **B** | Smarter menu search / recommendations | Phase 1 |
| **D** | Store assistant (Q&A: food + hours/ops) | Phase 1 |
| **A** | Conversational ordering (address, pay, place order) | Later |
| **C** | Order companion (status Q&A + in-chat alerts) | Later |

Build order for delivery: **web first** → shared API → **mobile chat tab** → ordering tools → companion.

## Decisions

| Topic | Choice |
|-------|--------|
| Architecture | **Tool-calling agent** — one brain; facts from tools only |
| Surfaces (phase 1) | Header search + **floating chat** (desktop + mobile web) |
| Mobile app UX (phase 2) | Chat on **bottom nav**; **profile moved to header** (match desktop) |
| Auth | **Anyone** for search/Q&A; **sign-in nudge** for account actions |
| Phase 1 actions | Answers + search + **add to cart** / **open item** — **no checkout/pay** |
| Voice | **Amaka** (“Ask Amaka”) — warm Nigerian hospitality host; short and clear |
| Knowledge (phase 1) | **Live menu + store ops** (hours, open/closed, pickup vs delivery basics) |
| CMS / blog in agent | **Out of scope** for phase 1 |
| Embeddings DB | **Out of scope** for phase 1 — smarter ranking over live catalog |
| Checkout in chat | Deferred to phase A |
| In-chat order push alerts | Deferred to phase C |
| Chat model (primary) | **`openai/gpt-4o-mini`** — cheap, tools, sufficient for grounded Q&A + cart |
| Chat model (fallback) | **`openai/gpt-5-mini`** — if 4o-mini errors / unavailable |
| Header search | **No LLM** — shared ranking over live catalog only |
| Model access | Vercel AI SDK via AI Gateway (`provider/model` strings); OpenAI key OK for local/BYOK |
| Code structure | **Ports & adapters** — vertical-agnostic AI core; restaurant adapter in phase 1; pharmacy later without core rewrite |
| Cost / caching | Header search = no LLM; stable prompts; history trim; tool caps; per-request memo + short TTL for **read** tools only; never cache cart mutations |

## Product shape

### What phase 1 is

A storefront assistant that:

- Answers questions about menu items (spice, portions, plate vs tray, availability, price from tools)
- Answers store ops (open/closed, hours, pickup vs delivery basics)
- Powers natural-language menu search in the header
- Can open an item page or add a simple item to the session cart
- Nudges sign-in when the user asks for account-only actions (saved address, cards, order history, place order)

### What phase 1 is not

- End-to-end ordering in chat
- Payment / card vault actions
- Address create/update
- Order status streaming or push-in-chat
- WhatsApp / SMS agent
- Staff/kitchen AI

## Architecture principles (scale & reuse)

Build a **commerce assistant core** with **vertical adapters** — not a restaurant-only chatbot. Phase 1 ships the **restaurant** adapter for Naija Jollof; the same core should later plug into pharmacy / retail with new adapters, not a rewrite.

### Layering (ports & adapters)

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation                                                │
│  Header search · Floating chat shell · Product result cards │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ AI core (vertical-agnostic)                                 │
│  models · rate limit · stream route · tool registry         │
│  prompt composer (brand + vertical + safety)                │
│  catalog ranking (pure: id/slug/name/description/price…)    │
└────────────────────────────┬────────────────────────────────┘
                             │ ports (interfaces)
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
  CatalogPort          CartPort            MerchantPort
  search / getById     addSimple /         open status,
                       needsCustomize      hours, fulfillment
        │                    │                    │
        ▼                    ▼                    ▼
  Restaurant adapter   Restaurant cart     Restaurant store
  (menu services)      (session cart)      (hours/status)
```

**Rules for reuse**

| Principle | Practice |
|-----------|----------|
| Dependency inversion | Core depends on **ports** (interfaces), not Prisma menu types |
| One vertical adapter | `lib/ai/verticals/restaurant/` implements ports + voice copy |
| Generic catalog shape | Rank over `CatalogSearchItem` (id, slug, name, description, priceCents, available, imageUrl) — menu/pharmacy map into it |
| Generic tool names | `searchCatalog`, `getProduct`, `getMerchantStatus`, `addToCart`, `openProduct` |
| Prompt composition | `composeAssistantPrompt({ brand, vertical, policies })` — restaurant “cravings” vs pharmacy “symptoms/OTC” is vertical copy only |
| UI shell is generic | Chat widget talks “products”; restaurant CSS/copy injected via props/config |
| YAGNI | Do **not** build a pharmacy vertical in phase 1 — only leave clean seams |
| No shared DB coupling in core | Adapters call existing services; core never imports `menu.repository` |

**Vertical swap example (later)**  
Pharmacy adapter: same tools; `CatalogPort` → SKUs; prompt forbids diagnosis; `addToCart` may require age/Rx gates via port methods the restaurant adapter leaves as no-ops.

### Runtime shape (phase 1)

```
┌─────────────────┐              ┌─────────────────┐
│ Header search   │              │ Floating chat   │
│ (ranked matches)│              │ (stream + cards)│
└────────┬────────┘              └────────┬────────┘
         │                                │
         ▼                                ▼
  catalog ranking                 POST /api/ai/chat
  (pure + CatalogPort)            (core + restaurant tools)
         │                                │
         └──────────► searchCatalog / getProduct / getMerchantStatus
                      addToCart / openProduct
                              │
                              ▼
                   Restaurant adapters → menu, hours, cart
```

**Runtime rules**

- Header search calls **catalog ranking** directly (fast, no LLM per keystroke)
- Chat uses the same ranking via `searchCatalog`
- Chat model: `openai/gpt-4o-mini`, failover `openai/gpt-5-mini`
- Prompt: brand + restaurant vertical + “never invent catalog/merchant facts”
- Tools are the source of truth for prices, availability, hours
- Client never trusts model-invented cart lines — cart mutations through `CartPort` → existing session APIs
- Rate-limit chat per IP/session

## Models

| Role | Slug | Notes |
|------|------|--------|
| Primary chat | `openai/gpt-4o-mini` | Lowest OpenAI cost; tool calling; phase 1 default |
| Fallback chat | `openai/gpt-5-mini` | Stronger mini if 4o-mini fails or quality regresses |
| Not used (phase 1) | `gpt-5.4`, Haiku, Gemini, DeepSeek, free Gateway models | Revisit only if cost/quality needs change |

Wire through AI SDK with gateway-style model strings and ordered failover (primary → fallback). Do not send typeahead keystrokes through either model.

## Tools (phase 1)

Commerce-generic names; restaurant adapter supplies behavior.

| Tool | Purpose | Notes |
|------|---------|--------|
| `searchCatalog` | Natural-language / intent product search | Shared by chat + header ranking |
| `getProduct` | Detail, price, options/modifiers, availability | No invention |
| `getMerchantStatus` | Open/closed, hours, fulfillment basics | Store config via MerchantPort |
| `addToCart` | Add simple product | Required options → `openProduct` |
| `openProduct` | Deep-link to product page | `/item/[slug]` for restaurant |

**Deferred tools (later phases):** set fulfillment, choose address, list/pay with saved card, place order, get order status, subscribe to order updates. Same core; new tools register on the tool registry.

## UX

### Floating chat (web)

- Desktop: floating entry (bottom-end), expandable panel
- Mobile web: same floating pattern in phase 1 (app tab comes later)
- Opening line: short host prompt (e.g. craving / how can I help)
- Streaming text replies
- Item results as compact cards: name, price, **Add** / **View**
- Add confirmation in chat (“Added … to your cart”)
- Account-gated asks → sign-in CTA, no fake success

### Header search

- Same catalog ranking brain as chat (`rankCatalogItems`) — **no LLM**
- Typeahead lists ranked items
- Vague queries may show a short static hint + matches (not a second LLM product)

### Edge behaviors (happy + unhappy)

| Case | Behavior |
|------|----------|
| Menu / hours / cart help | Tools only; short warm answers; 1–3 product suggestions |
| Ambiguous item (“jollof”) | Clarify plate vs tray / size before add |
| Required modifiers | `openProduct` — do not force `addToCart` |
| Unavailable item | Say so; suggest close alternatives via search |
| Store closed | Status + hours from tools; browse/cart follow storefront rules |
| Empty cart + checkout ask | Say cart is empty; offer to find food |
| Guest vs signed-in | Follow Customer context (sign-in CTA vs `/checkout`) |
| Cart tool success | Only claim add/update/remove when tool returns `ok: true` |
| Tool failure | Apology + link to menu — never fabricate items/prices |
| Insults / rudeness | Calm one-liner; offer menu help; no arguing |
| Off-topic / trivia / Google / coding / medical / legal | Hard redirect: 1–2 sentences, **do not define or summarize** outside content |
| Soft drink / juice craving | Drink-scoped search + synonyms; never fall back to bread/sides |
| Empty search | No product cards; say not on menu; do not pivot to unrelated food |
| Prices in chat | Quote tool `price` CAD strings only — no cents integers in model payload |
| Competitors / other restaurants | Refuse; stay on this storefront |
| Jailbreak / “ignore instructions” | Refuse; stay in store-host role |

## Components & code layout (phase 1)

| Area | Responsibility |
|------|----------------|
| `lib/ai/core/` | Models, rate limit helpers, prompt composer, stream/chat factory |
| `lib/ai/ports/` | `CatalogPort`, `CartPort`, `MerchantPort` (+ types) |
| `lib/ai/catalog/` | Pure `rankCatalogItems` over generic `CatalogSearchItem` |
| `lib/ai/verticals/restaurant/` | Adapters + restaurant prompt fragment + tool wiring |
| `app/api/ai/chat` | Thin route: auth/rate-limit + `createRestaurantChatHandler()` |
| `components/features/ai/` | Generic chat shell + product cards (vertical labels via props) |
| Header search | Uses `rankCatalogItems` via menu→catalog mapping (existing menu search can re-export) |
| `lib/ai/core/cost.ts` | History trim, tool-result caps, stable prompt hashing notes |
| `lib/ai/core/tool-cache.ts` | Short-TTL in-memory cache for read-only tool results (search / merchant / product) |

**Reuse:** public menu services, store hours/status, cart session/APIs, item slug routes — **only inside the restaurant adapter**. Do not rebuild checkout.

**Do not:** import Prisma/menu repositories from `lib/ai/core` or from UI components.

## Caching & cost control

Goal: keep **4o-mini** bills low without stale prices or wrong cart state.

### What we already reuse

| Data | Mechanism | Notes |
|------|-----------|--------|
| Public catalog | `unstable_cache` ~300s + `STOREFRONT_CACHE_TAG` | Adapters call `getPublicStorefront` — do not re-query Prisma per keystroke |
| Store hours rows | Same tag / revalidate | Merchant status stays cheap |

### AI-layer rules (phase 1)

| Layer | Strategy | Saves |
|-------|----------|--------|
| **Header search** | Ranking only — **never** call the LLM | Most “search” traffic is free of token cost |
| **Stable system prompt** | `composeAssistantPrompt` output must be byte-stable across requests (no timestamps/random). Prefer provider **cached input** discounts when available | Repeated prompt tokens |
| **History window** | Send only the last **N** UI messages to the model (N=12 default); keep UI transcript full client-side | Input tokens on long chats |
| **Tool output caps** | `searchCatalog` returns ≤5 items; strip unused fields (no full modifier trees in search results). `getProduct` returns detail only when needed | Output→next-input tokens |
| **Step budget** | `stopWhen: stepCountIs(5)` max | Runaway tool loops |
| **Read-tool memo (per request)** | Within one chat POST, memoize identical `searchCatalog` / `getProduct` / `getMerchantStatus` args | Duplicate tool calls in one turn |
| **Short TTL read cache** | Process-local TTL cache (~30–60s) for normalized `searchCatalog` query + `getMerchantStatus` + `getProduct(slug)`. **Never** cache `addToCart` | Repeated “are you open?” / same craving across users on same isolate |
| **Mutations** | `addToCart` / `openProduct` — no result caching | Correctness |
| **Model choice** | Primary `gpt-4o-mini`; fallback only on failure | Sticker price |
| **Rate limit** | 20 chat req / IP / min | Abuse cost |

### Explicitly out of scope (phase 1)

- Vector/embeddings index (ops + infra cost without proven need)
- Caching full LLM **completions** (risk of stale/wrong personalized answers)
- Cross-region Redis for tool cache (start in-process; upgrade if multi-isolate waste shows up)
- Prompt injection of entire menu into the system prompt (expensive + stale) — always tool-fetch

### Invalidation

- Catalog/hours: existing `revalidateStorefrontCache()` on menu/store writes covers adapter data
- AI TTL caches: expire by time only (short); no need to hook menu writes for 30–60s windows
- Cart: never cached at AI layer

### Success metric (cost)

Spot-check: identical “are you open?” within TTL should hit merchant cache (no extra DB). Header typeahead never appears in AI provider logs/usage.

## Safety & privacy

- No hallucinated prices, availability, or hours
- Do not log payment data (none in phase 1)
- Guest chat allowed; session/IP rate limits
- Later payment tools must require auth + explicit confirmation UI (not silent charge)

## Testing

- **Unit:** search ranking / query parsing; tool input validation; closed-store and unavailable-item handling
- **Integration:** tool → cart add; guest vs signed-in nudge paths
- **Manual:** vague dietary queries; plate vs tray clarify; modifier-required items open customize; search and chat return consistent items

## Roadmap (same architecture)

1. **Phase 1 (this spec):** web search + Q&A + add/open item  
2. **Phase 2 (implemented):** mobile diner — bottom-nav chat, profile in header, same API  
3. **Phase 3:** conversational ordering tools (fulfillment, address, saved card, place order) with confirmations  
4. **Phase 4:** order companion — status Q&A + in-chat status alerts while the chat is open  

## Success criteria (phase 1)

- Diners can ask natural questions and get grounded answers from live menu + hours
- Vague craving queries return useful ranked items (better than substring-only)
- Add-to-cart from chat works for simple items; complex items hand off to item page
- No invented menu facts in spot checks
- Clear path to later ordering without rewriting the chat surface

## Out of scope (explicit)

- Sanity/blog grounding in the agent
- Embeddings index / vector DB
- WhatsApp diner ordering bot
- Staff dashboard AI
- Loyalty / coupons (unless already productized elsewhere)
