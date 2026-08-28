# AI Storefront Assistant Design

**Date:** 2026-08-28  
**Status:** Approved for spec  
**Surfaces:** Web storefront (phase 1); mobile diner app (phase 2+)  
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
| Mobile app UX (later) | Chat on **bottom nav**; **profile moved to header** (match desktop) |
| Auth | **Anyone** for search/Q&A; **sign-in nudge** for account actions |
| Phase 1 actions | Answers + search + **add to cart** / **open item** — **no checkout/pay** |
| Voice | **Warm host** — short, clear Nigerian hospitality; no corporate fluff |
| Knowledge (phase 1) | **Live menu + store ops** (hours, open/closed, pickup vs delivery basics) |
| CMS / blog in agent | **Out of scope** for phase 1 |
| Embeddings DB | **Out of scope** for phase 1 — smarter ranking over live catalog |
| Checkout in chat | Deferred to phase A |
| In-chat order push alerts | Deferred to phase C |

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

## Architecture

```
┌─────────────────┐              ┌─────────────────┐
│ Header search   │              │ Floating chat   │
│ (ranked matches)│              │ (stream + cards)│
└────────┬────────┘              └────────┬────────┘
         │                                │
         ▼                                ▼
  shared searchMenu              POST /api/ai/chat
  ranking service                (streaming + tools)
         │                                │
         │              ┌─────────────────┼─────────────────┐
         │              ▼                 ▼                 ▼
         └──────► searchMenu / getItem   getStoreStatus   addToCart
                  (same ranking)         (hours/ops)      openItem
                         │                 │                 │
                         ▼                 ▼                 ▼
                  Public menu        Store config      Session cart
                  services           / hours           APIs
```

**Rules**

- Header search calls the **shared ranking service directly** (fast, no LLM required per keystroke)
- Chat may call the same `searchMenu` tool via the model when answering cravings / Q&A
- System prompt sets warm-host voice and “never invent menu/ops facts”
- Tools are the source of truth for prices, availability, hours
- Client never trusts model-invented cart lines — cart mutations go through existing cart session/APIs
- Rate-limit chat per IP/session

## Tools (phase 1)

| Tool | Purpose | Notes |
|------|---------|--------|
| `searchMenu` | Natural-language / intent menu search | Shared by chat + header search |
| `getItem` | Item detail, price, modifiers, availability | No invention |
| `getStoreStatus` | Open/closed, hours, pickup vs delivery basics | Existing store config |
| `addToCart` | Add item with clear/simple selection | Required/ambiguous modifiers → `openItem` |
| `openItem` | Navigate to `/item/[slug]` | Customize / “show me” |

**Deferred tools (later phases):** set fulfillment, choose address, list/pay with saved card, place order, get order status, subscribe to order updates.

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

- Same `searchMenu` brain as chat
- Typeahead lists ranked items
- Vague queries may show a short assistant hint + matches (not a second product)

### Edge behaviors

| Case | Behavior |
|------|----------|
| Ambiguous item (“jollof”) | Clarify plate vs tray / size before add |
| Required modifiers | “Let’s customize” + open item page |
| Unavailable item | Say so; suggest close alternatives via search |
| Store closed | State status + hours; browse/cart follow existing storefront rules |
| Tool failure | Apology + link to menu — never fabricate items |
| Off-topic | Gentle redirect to food/store help |

## Components & code layout (phase 1)

| Area | Responsibility |
|------|----------------|
| `app/api/ai/chat` | Streaming chat endpoint |
| `lib/ai/` | Prompt, tool defs, helpers, ranking |
| Chat UI components | Shell, message list, item cards, sign-in nudge |
| Header search | Call shared search (tool or service used by the tool) |

**Reuse:** public menu services, store hours/status, cart session/APIs, item slug routes. Do not rebuild checkout.

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
2. **Phase 2:** mobile diner — bottom-nav chat, profile in header, same API  
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
