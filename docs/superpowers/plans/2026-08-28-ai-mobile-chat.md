# AI Mobile Chat — Phase 2 Plan

**Date:** 2026-08-28  
**Status:** Implemented  
**Spec:** [2026-08-28-ai-storefront-assistant-design.md](../specs/2026-08-28-ai-storefront-assistant-design.md)

## Goal

Diner Expo app: **Ask Amaka** bottom tab + Account via header profile; same `POST /api/ai/chat` with Bearer + `x-cart-sid`.

## Checklist

- [x] Tabs: Menu · Cart · Orders · Ask Amaka (drop Account tab)
- [x] Stack `app/account.tsx` + root `Stack.Screen name="account"`
- [x] Profile control: Android `headerRight`; iOS `DinerTabHeader` on each tab
- [x] `ai` + `@ai-sdk/react` in `mobile/customer`
- [x] `createDinerChatTransport` — custom fetch with auth + cart sid, 401 refresh once
- [x] `AskAmakaChat` — messages, product cards, Add via `apiFetch`, sign-in nudge
- [x] Fix stale `item/[id]` → `item/[slug]` in root stack
- [x] Spec status Phase 2 implemented

## Manual smoke

1. Guest opens Ask Amaka → welcome copy → ask menu/hours question
2. Product card **Add** → Cart tab badge updates (shared `x-cart-sid`)
3. Profile icon → Account stack; sign-in from nudge → `/login`
4. Network: chat POST includes `x-cart-sid` after any prior `/api/cart` load

## Out of scope

Checkout-in-chat, order companion pushes, pharmacy vertical.
