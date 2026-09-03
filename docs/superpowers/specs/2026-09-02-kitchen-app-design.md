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
| Permission priming (post-login) | With insist / push |
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
- Swipe left: Read/Unread + Delete; long swipe toggles read

**Insist** (separate from inbox): full-screen for *incoming* until Accept or Bump.  
**Push:** same deep link as inbox row.

### Account stack

Account home (scroll) → push for details:

1. **You** — editable name, email, phone; role read-only (humanized). Email change sends a 6-digit OTP to the *new* address before commit; name/phone save immediately. Security: Change password (email OTP → code → new/confirm); Passkeys row **Coming soon** (not actionable).
2. **Store** — editable name, phone, email, address (+ unit); weekly hours (closed toggle + open/close). Persists via `PATCH /api/store` and `PUT /api/store/hours`. Pull-to-refresh; skeleton while loading.
3. **Preferences** — Notifications (sound / haptic / push / quiet); Appearance (system / light; dark later). Push toggle respects OS permission; if denied, deep-link to system Settings.  
4. **Sign out**

Web dashboard: **Account** page mirrors You profile + password OTP (store profile/hours stay under Store / Hours).

Sub-screens: chevron-only back (`headerBackButtonDisplayMode: "minimal"`).

### Inbox chrome

- Single title from stack header (no duplicate in-body “Inbox”).
- Empty / caught-up: “You’re caught up” (or unread count meta).
- Swipe left: **Read** / **Unread** + **Delete**. Long swipe past threshold auto-toggles read/unread (Mail pattern). Stub feed until real push/inbox API.

### Permission priming (planned — avoid dead ends)

**Principle:** After sign-in (first successful session), explain *why* before the OS permission dialog. Never surprise staff mid-shift with a bare system prompt, and never leave push/insist as a dead end they discover only when a ticket arrives.

**When**

- Once per install (or until Allow / Maybe later is chosen), after login lands on Board — **not** on the login form itself.
- Re-prompt only from Account → Preferences → Notifications (or when enabling push if previously deferred).
- Do not re-show the sheet every cold launch.

**Pattern (in-app bottom sheet → then OS dialog)**

1. Dim Board behind a bottom sheet (rounded top, solid white / glass-ok sparse chrome).
2. Title: e.g. **Allow notifications**.
3. Short benefit rows (icon + one line each), kitchen-specific — not marketing fluff. Suggested copy:
   - Hear new tickets even when the phone is down  
   - Insist alerts until someone Accepts or Bumps  
   - Change this anytime in Account → Preferences  
4. Primary **Allow** → dismiss sheet → fire the **system** notification permission prompt.  
5. Secondary **Maybe later** → dismiss; app stays usable (board + poll still work; insist may be weaker without push).

**Permissions in scope**

| Permission | Why | Priming |
|------------|-----|---------|
| **Notifications** | Insist + inbox push for new / cancelled tickets | Bottom sheet as above (v1) |
| Others (mic, camera, location) | Not needed for kitchen v1 | Out of scope |

**Non-goals for this flow**

- No multi-permission carousel.
- No blocking gate — Board must load even if they tap Maybe later or Deny.
- No fake “Allow” that skips the OS dialog.

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

## Loading / skeletons (planned quality bar)

**Principle:** Skeletons are a preview of the real screen, not a generic spinner block. When content arrives, nothing jumps.

### Geometry = final UI (zero layout shift)

- Skeleton blocks use the **same heights, radii, gaps, and card structure** as the settled layout (ticket card, menu row, customer row, order row).
- Known chrome stays **real immediately** — tab bar, stack header, Board column pills shell, bell — only the *data* slots pulse.
- Prefer one content-shaped skeleton per screen (`KitchenBoardSkeleton`, ticket, menu list, customers, orders) over a centered spinner.
- Measure against the real component: if swapping skeleton → live causes reflow, the skeleton is wrong.

### Progressive reveal (text before images)

- Paint **text and metadata first** (ticket #, name, price, status, counts) as soon as that data exists.
- Hold **image / photo slots** as skeletons (or muted placeholders) until the asset is ready — then fade in. Do not block the whole card on an image.
- Kitchen v1 is mostly text (Board, ticket, customers); apply this strictly when Menu (or any surface) shows item photos.
- Never replace an entire populated list with a full-screen skeleton on background poll — cold load only.

### Per surface

| Screen | Cold load | After data |
|--------|-----------|------------|
| Board | Card-shaped rows matching ticket cards | Live cards; poll keeps them |
| Ticket | Two-card layout (order + guest) + action slots | Live; no spinner |
| Menu / Customers / Orders | Row skeletons matching list rows | Text first; image slots last if any |
| Login | No skeleton — static glass form |

### Non-goals

- Fancy shimmer colors or brand-colored bones.
- Skeleton on every optimistic bump or 10s poll.

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

## Stack layout (cross-device)

- **Opaque stack headers** (`headerTransparent: false`) so content never draws under the nav bar on Dynamic Island, notch, or Android cutouts.
- Stack bodies use `StackScroll`: horizontal padding + **bottom safe-area inset** for the home indicator.
- Tab screens keep `SafeScreen` (top inset only; tab bar owns the bottom).
- Prefer system insets over hard-coded header heights.

## Liquid glass (2026)

- iOS NativeTabs for system liquid-glass tab bar.
- Dense lists (tickets) use **solid elevated cards** (glass washes out on flat gray).
- Glass/blur OK for sparse chrome (login, account panels) with visible border.
- Stack screens use **opaque** headers (not transparent blur) for predictable layout across device sizes.

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

### Loading quality (iterate with each screen)

- [ ] Skeletons match final geometry (no layout shift on settle)  
- [ ] Known chrome (tabs / headers) stays real while content bones pulse  
- [ ] Text / metadata paint before images; image slots hold placeholder until ready  
- [ ] Menu / Customers / Orders lists use row-shaped skeletons (not spinners)  

### Nav shell (next)

- [ ] Tabs: Board · Menu · Customers · Account  
- [ ] Board header: All orders + bell  
- [ ] Orders stack with on-page search/filters  
- [ ] Customers tab stub or list  
- [ ] Account home merges profile + settings  
- [ ] Inbox stub + unread badge hook  

### Permissions (with insist / push)

- [ ] Post-login notification priming bottom sheet (once)  
- [ ] Allow → system prompt; Maybe later → skip without blocking Board  
- [ ] Account → Preferences can re-request or open system Settings if denied  
