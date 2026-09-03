# Naija Jollof Kitchen App — Design Spec

**Date:** 2026-09-02  
**Surface:** Expo staff app (`mobile/staff`) — display name **Naija Jollof Kitchen**  
**Status:** Nav IA approved; Board built; Menu / Customers / Orders / Inbox next

## Problem

Kitchen staff need a phone-first app to see live tickets, bump status without friction, get insisted on new orders, manage menu and customers, and handle account/settings without opening the web dashboard.

## Goals

1. **Cook speed first** — bump from the board card; detail is secondary.
2. **Insist on new tickets** — looping alert until Accept or Bump (Accept does not change status).
3. **Menu ops** — list/edit prices, edit items, add items.
4. **Customers** — look up guests on the phone during a shift (tab).
5. **Same UI for cook + manager** — no role-gated screens in v1; cook path stays fastest.

## Non-goals (this phase)

- Tablet landscape KDS
- Full courier / DoorDash ops beyond what’s already on ticket detail
- Replacing the web dashboard
- Realtime websockets (keep 10s poll + pull-to-refresh for Board v1)
- Global Search tab (search is on-list only)

## Product layers

| Layer | When |
|-------|------|
| Pocket KDS (Board + bump) | **Done / iterating** |
| Nav shell (4 tabs + header chrome) | **Next** |
| Insist overlay + inbox | Soon |
| Menu CRUD | After nav shell |
| Customers list + detail | After nav shell |
| Orders history (from Board) | After nav shell |
| Tablet landscape | Later |

---

## Navigation (approved)

### Bottom tabs (4)

**Board · Menu · Customers · Account**

| Tab | Role |
|-----|------|
| **Board** | Home / default. Live New · Cooking · Ready + Later. |
| **Menu** | Categories + items; price / availability / add / edit. |
| **Customers** | Guest list + detail. Search + filters **on this screen**. |
| **Account** | You + store + app preferences + sign out (one stack). |

**Not tabs**

- **Orders** — Board header **All orders** → stacked list (search + filters on page).
- **Search** — never a tab; field on Orders / Customers.
- **Settings** — merged into Account (not a separate tab).

iOS: NativeTabs + SF Symbols, minimize-on-scroll.  
Android: floating tab bar + icons.  
Insist overlay renders **above** tabs.

### Header + notifications

**Board header**

- Left: store name + “N new”
- Right: **All orders** → Orders stack
- Far right: **bell** → notification inbox (unread badge/dot)

**Other tabs:** title + shared **bell** (same inbox / unread). No All orders except on Board.

**Inbox**

- Chronological: new order, cancelled, etc.
- Tap → ticket (or customer when relevant)
- Empty: “You’re caught up”

**Insist** (separate from inbox): full-screen for *incoming* until Accept or Bump.  
**Push:** same deep link as inbox row.

### Account stack

Account home (scroll) → push for details:

1. **You** — name, email, role  
2. **Store** — name, address, hours summary → store detail (read-first)  
3. **Preferences** — Notifications (sound / haptic / push / quiet); Appearance (system / light; dark later)  
4. **Sign out**

Sub-screens: chevron-only back (`headerBackButtonDisplayMode: "minimal"`).

### Orders (stack from Board)

- Search: ticket #, name, phone  
- Filter chips / sheet: Active / Completed / Cancelled / All  
- Row → ticket detail  
- Skeleton on first load; pull-to-refresh  

### Customers (tab)

- Search: name / phone / email  
- List → customer detail (past orders; phone actions later)  
- Skeleton on first load  

---

## Board

### Layout

- Header as above (All orders + bell).
- Segmented columns: **New · Cooking · Ready** (counts). Auto-select first column with work.
- Ticket cards; **Later** collapsible for deferred scheduled `pending_acceptance`.

### Ticket card

- Number, wait, total, customer, fulfillment, summary, notes (1 line).
- **Primary bump** = solid primary button inside card (Start / Ready / Picked up / Fulfill).
- Body tap → ticket detail.
- Swipe-right → same primary bump (optional enhancement).
- Delivery `ready` + unassigned → **Fulfill** → detail (no fake complete).

### Bump

- Optimistic + rollback.
- Maps: `pending_acceptance`/`accepted` → `preparing` (Start); preparing → ready / ready_for_pickup; ready_for_pickup / out_for_delivery → completed; etc. (unchanged).

### Data

- `GET /api/orders?filter=active&channel=kitchen&limit=80` every 10s while active; pause in background; foreground + pull refresh.
- Do **not** show “refreshes every 10s” in UI.

### Loading

- First load: content-shaped **KitchenBoardSkeleton** (pulse).
- Poll / bump: keep live content (no spinner flash).
- Pull-to-refresh: system control only.
- Ticket detail: **KitchenTicketSkeleton**, not centered spinner.

---

## Menu

- List categories → items (reuse staff menu APIs).
- Edit: name, price cents, available, description.
- Add item into a category.
- No full modifier-graph editor unless APIs already support it simply.

---

## Brand / color

- **Neutrals first:** gray canvas (`#E8E8EC`) + white cards + dark text. No peach/orange page washes.
- **Primary:** CTAs, active tint, new badge, wait chips — not backgrounds.
- **Secondary:** quieter chrome / secondary buttons.
- Cards: white + border + shadow so they separate from the canvas.

## Brand / type

- System fonts (SF Pro / Roboto). `KType` in `mobile/staff/src/lib/kitchen/typography.ts`.
- Weights **400–700** only. Page ~22; ticket ~17; body 15; meta 13.

## Liquid glass (2026)

- iOS NativeTabs for system liquid-glass tab bar.
- Dense lists (tickets) use **solid elevated cards** (glass washes out on flat gray).
- Glass/blur OK for sparse chrome (login, account panels) with visible border.
- Quiet neutral washes only; `ThemeProvider` at root.

---

## Architecture

- Expo Router: `(tabs)` = Board / Menu / Customers / Account.
- Root stack: `(tabs)`, login, `orders/index` (All orders), `orders/[id]`, inbox, Account sub-routes, customer detail.
- `components/kitchen/` board UI; `lib/kitchen/` bump + format + typography.
- Shared `@naijajollof/api-types`.
- One insist module; don’t scatter sound/haptic.
- Order API ids: allow stable non-cuid seed ids (`orderIdParamSchema`).

---

## Seed / test data

Dense kitchen board: many tickets across New / Cooking / Ready / Later, pickup + delivery, notes, modifiers.

Staff: `admin@naijajollofw.ca` / `123456`

---

## Success criteria

### Board (current)

- [x] Board columns + Later + seeded density  
- [x] Primary bump on card (optimistic)  
- [x] Ticket detail + transitions  
- [x] Pull-to-refresh + 10s poll (no “every 10s” copy)  
- [x] Skeletons on cold load  
- [x] Neutral palette + distinguishable cards  
- [x] Chevron-only back  

### Nav shell (next)

- [ ] Tabs: Board · Menu · Customers · Account  
- [ ] Board header: All orders + bell  
- [ ] Orders stack with on-page search/filters  
- [ ] Customers tab stub or list  
- [ ] Account home merges profile + settings  
- [ ] Inbox stub + unread badge hook  
