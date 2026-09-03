# Kitchen Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Kitchen app Board tab with column switcher, bumpable tickets, Later section, tabs shell (Board · Menu · Account), and dense seed orders for testing.

**Architecture:** Expo Router `(tabs)` shell; Board polls `/api/orders?filter=active&channel=kitchen&limit=80`; client-side primary bump via transition helpers; optimistic list updates; Prisma seed creates many active orders across columns.

**Tech Stack:** Expo Router 57, React Native, gesture-handler, Reanimated (optional swipe), Prisma seed, `@naijajollof/api-types`, `@naijajollof/ui`.

## Global Constraints

- Kitchen typography: system fonts via existing `@naijajollof/ui` Type (no Inter).
- Nav: Board · Menu · Account; Orders via Board header later if needed.
- Do not commit unless the user asks.
- Staff seed login: `admin@naijajollofw.ca` / `123456`.
- Poll 10s while active; pause in background.

---

### Task 1: Dense kitchen board seed

**Files:**
- Modify: `prisma/seed.ts`

**Interfaces:**
- Produces: Many `storefront` orders on `seed-store-waterloo` in `pending_acceptance`, `preparing`, `ready`, `ready_for_pickup`, `out_for_delivery`, plus deferred scheduled New tickets.

- [ ] **Step 1: Clear prior seeded kitchen orders for the store**

Before staff upsert, after menu seed, delete events/line items/orders for store where `id` starts with `seed-kitchen-` OR delete all storefront active-ish orders created by seed. Prefer stable ids `seed-kitchen-01` … so re-seed is idempotent:

```ts
await prisma.orderEvent.deleteMany({
  where: { order: { storeId: store.id, id: { startsWith: "seed-kitchen-" } } },
});
await prisma.orderLineItem.deleteMany({
  where: { order: { storeId: store.id, id: { startsWith: "seed-kitchen-" } } },
});
await prisma.order.deleteMany({
  where: { storeId: store.id, id: { startsWith: "seed-kitchen-" } },
});
```

- [ ] **Step 2: Create ~16 orders covering all board columns**

Helper:

```ts
async function seedKitchenOrder(input: {
  id: string;
  storeId: string;
  status: OrderStatus;
  fulfillmentType: "pickup" | "delivery";
  customerName: string;
  customerPhone: string;
  displayNumber: string;
  dayTicket: number;
  notes?: string | null;
  scheduledFor?: Date | null;
  placedAt: Date;
  lines: Array<{
    name: string;
    quantity: number;
    unitPriceCents: number;
    modifiers?: Array<{ name: string }>;
  }>;
  dropoffAddress?: string | null;
}) { /* create order + lines + events matching status path */ }
```

Coverage (minimum):
- 4× New (`pending_acceptance`) ASAP pickup/delivery, one with notes
- 2× New Later (scheduled 2–4h ahead)
- 3× Cooking (`preparing`) mix pickup/delivery
- 2× Ready pickup (`ready_for_pickup`)
- 2× Ready delivery unassigned (`ready`)
- 1× Out for delivery
- Multi-item + modifiers on several tickets
- Set `dayTicketDate` to today (UTC date or store-local date string) and unique `dayTicket` 1..N
- `source: "storefront"`, `squarePaymentId: seed-kitchen-pay-{n}` unique

- [ ] **Step 3: Run seed**

Run: `cd "Naija Jollof" && npx prisma db seed`  
Expected: Seed complete log; Staff login printed; no unique constraint errors.

- [ ] **Step 4: Smoke-check via API or Studio**

Confirm counts: several `pending_acceptance`, `preparing`, ready statuses visible for store.

---

### Task 2: Expo tabs shell

**Files:**
- Create: `mobile/staff/src/app/(tabs)/_layout.tsx`
- Create: `mobile/staff/src/app/(tabs)/index.tsx` (Board — move from root index)
- Create: `mobile/staff/src/app/(tabs)/menu.tsx` (stub)
- Create: `mobile/staff/src/app/(tabs)/account.tsx` (move from `account.tsx`)
- Modify: `mobile/staff/src/app/_layout.tsx`
- Delete: `mobile/staff/src/app/index.tsx`, `mobile/staff/src/app/account.tsx`

- [ ] **Step 1: Tabs layout**

```tsx
import { Tabs } from "expo-router";
import { Colors } from "@naijajollof/ui";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { backgroundColor: Colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Board", tabBarLabel: "Board" }} />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarLabel: "Menu" }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarLabel: "Account" }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Root stack**

```tsx
<Stack screenOptions={headerScreenOptions}>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="login" options={{ headerShown: false }} />
  <Stack.Screen name="orders/[id]" options={{ title: "Ticket" }} />
</Stack>
```

Gate: logged-in users `router.replace("/")` still works (tabs index).

- [ ] **Step 3: Menu stub**

Simple Screen: “Menu editing comes next — prices & items.”

- [ ] **Step 4: Typecheck**

Run: `cd mobile/staff && npm run typecheck`  
Expected: PASS (or fix path imports).

---

### Task 3: Kitchen bump + format helpers

**Files:**
- Create: `mobile/staff/src/lib/kitchen/bump.ts`
- Create: `mobile/staff/src/lib/kitchen/format.ts`

- [ ] **Step 1: `primaryBumpFor`**

```ts
import type { FulfillmentMethod, FulfillmentType, OrderStatus, TransitionAction } from "@naijajollof/api-types";

export function primaryBumpFor(order: {
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  fulfillmentMethod: FulfillmentMethod;
}): TransitionAction | { kind: "fulfill" } | null {
  if (order.status === "pending_acceptance" || order.status === "accepted") {
    return { to: "preparing", label: "Start", variant: "primary" };
  }
  if (order.status === "preparing") {
    if (order.fulfillmentType === "pickup") {
      return { to: "ready_for_pickup", label: "Ready", variant: "primary" };
    }
    return { to: "ready", label: "Ready", variant: "primary" };
  }
  if (order.status === "ready_for_pickup") {
    return { to: "completed", label: "Picked up", variant: "primary" };
  }
  if (order.status === "out_for_delivery") {
    return { to: "completed", label: "Complete", variant: "primary" };
  }
  if (
    order.status === "ready" &&
    order.fulfillmentType === "delivery" &&
    order.fulfillmentMethod === "unassigned"
  ) {
    return { kind: "fulfill" };
  }
  if (order.status === "ready" && order.fulfillmentType === "pickup") {
    return { to: "completed", label: "Picked up", variant: "primary" };
  }
  return null;
}
```

- [ ] **Step 2: Wait / scheduled formatters** (mirror web `kitchen-format`, hardcode `America/Toronto` fallback).

---

### Task 4: Board UI components

**Files:**
- Create: `mobile/staff/src/components/kitchen/column-tabs.tsx`
- Create: `mobile/staff/src/components/kitchen/ticket-card.tsx`
- Create: `mobile/staff/src/components/kitchen/board-screen.tsx`
- Modify: `mobile/staff/src/app/(tabs)/index.tsx` → render `<BoardScreen />`

- [ ] **Step 1: Column tabs** — New / Cooking / Ready with counts; `onChange(columnId)`.

- [ ] **Step 2: Ticket card**

- Show number, wait, total, customer, fulfillment, summary, notes snippet.
- Primary bump `Pressable` calls `onBump`.
- Body press → `onOpen`.
- Optional: `Swipeable` from `react-native-gesture-handler` calling `onBump`.

- [ ] **Step 3: Board screen**

- Load/poll as current `index.tsx`.
- Split live vs later via `isKitchenBoardDeferred`.
- Segmented active column list.
- Optimistic bump: `POST /api/orders/:id/transition` with `{ to }`; update local item status; reload on failure.
- Fulfill bump → `router.push(/orders/${id})`.
- Empty states per column.

---

### Task 5: Manual verify on device

- [ ] **Step 1:** Ensure API + Postgres running; seed applied.
- [ ] **Step 2:** Expo Go staff app — login — Board shows dense columns.
- [ ] **Step 3:** Bump New → Cooking; Cooking → Ready; pull refresh.
- [ ] **Step 4:** Open Later tickets; open detail; Menu stub visible.

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Tabs Board · Menu · Account | 2 |
| Column switcher + Later | 4 |
| Card bump + optimistic | 3, 4 |
| Dense seed | 1 |
| Menu CRUD | Deferred (stub only) |
| Insist overlay | Deferred (next slice) |

## Handoff

Plan saved. Prefer **inline execution** in this session (user asked to build Board now). Menu CRUD and insist follow after Board works.
