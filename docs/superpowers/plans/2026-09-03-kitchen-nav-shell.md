# Kitchen Nav Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved Kitchen nav shell — four tabs (Board · Menu · Customers · Account), Board header chrome (All orders + bell), Orders list stack, inbox stub, Account home with sub-routes, and Customers list — without building Menu CRUD or insist/push yet.

**Architecture:** Expo Router `(tabs)` gains a Customers trigger; root `Stack` adds `orders/index`, `inbox`, Account sub-screens, and `customers/[id]`. Shared `KitchenHeaderActions` for All orders / bell. Lists reuse staff Bearer APIs (`/api/orders`, `/api/customers`). Unread badge is a local stub until push/inbox backend exists. Auto notification permission on login is deferred (prep for permission-priming plan).

**Tech Stack:** Expo Router 57, NativeTabs (iOS) + floating Tabs (Android), `@naijajollof/ui`, `@naijajollof/api-types`, existing `apiFetch` + `kv` storage.

**Out of scope (separate plans):** Menu CRUD, insist overlay, notification priming bottom sheet, real push inbox feed, customer past-orders detail depth, swipe bump.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-02-kitchen-app-design.md` (nav IA + loading/skeletons + permission priming notes).
- Typography: `KType` only; weights 400–700; neutrals first (`#E8E8EC` canvas); orange only for primary CTAs.
- Opaque stack headers (`headerScreenOptions`); `StackScroll` for stack bodies; `SafeScreen` for tab roots.
- Skeletons must match final list/card geometry; chrome (tabs, header actions) stays real while data bones pulse.
- Staff login: `admin@naijajollofw.ca` / `123456`. API via `EXPO_PUBLIC_API_URL`.
- Do **not** commit unless the user explicitly asks (skip commit steps during execution).
- Do **not** trigger EAS builds unless asked.

## File map

| Path | Responsibility |
|------|----------------|
| `mobile/staff/src/lib/kitchen/inbox-unread.ts` | Stub unread count + setter (AsyncStorage/`kv`) |
| `mobile/staff/src/components/kitchen/header-actions.tsx` | All orders link + bell → inbox |
| `mobile/staff/src/app/(tabs)/_layout.tsx` | Add Customers tab (iOS + Android) |
| `mobile/staff/src/app/(tabs)/customers.tsx` | Customers list tab |
| `mobile/staff/src/app/(tabs)/account.tsx` | Account home rows |
| `mobile/staff/src/components/kitchen/board-screen.tsx` | Wire header actions |
| `mobile/staff/src/app/_layout.tsx` | Register stack screens |
| `mobile/staff/src/app/orders/index.tsx` | All orders list + search/filters |
| `mobile/staff/src/app/inbox.tsx` | Inbox stub |
| `mobile/staff/src/app/account/you.tsx` | You detail |
| `mobile/staff/src/app/account/store.tsx` | Store read-first |
| `mobile/staff/src/app/account/preferences.tsx` | Notifications / appearance stubs |
| `mobile/staff/src/app/customers/[id].tsx` | Customer detail stub |
| `mobile/packages/ui/src/skeleton.tsx` | Ticket 2-card skeleton + customers list skeleton |
| `mobile/staff/src/lib/auth.tsx` + `lib/push.ts` | Stop auto permission request on hydrate/sign-in |

---

### Task 1: Inbox unread stub + header actions

**Files:**
- Create: `mobile/staff/src/lib/kitchen/inbox-unread.ts`
- Create: `mobile/staff/src/components/kitchen/header-actions.tsx`

**Interfaces:**
- Produces: `getInboxUnreadCount(): Promise<number>`, `setInboxUnreadCount(n: number): Promise<void>`, `useInboxUnread(): { count: number; refresh: () => void }`
- Produces: `KitchenHeaderActions({ showAllOrders?: boolean })`

- [ ] **Step 1: Unread helper**

```ts
// mobile/staff/src/lib/kitchen/inbox-unread.ts
import { useCallback, useEffect, useState } from "react";
import { kvGet, kvSet } from "@/lib/kv";

const KEY = "kitchen.inbox.unread";

export async function getInboxUnreadCount(): Promise<number> {
  const raw = await kvGet(KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function setInboxUnreadCount(n: number): Promise<void> {
  await kvSet(KEY, String(Math.max(0, Math.floor(n))));
}

export function useInboxUnread() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    void getInboxUnreadCount().then(setCount);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { count, refresh };
}
```

- [ ] **Step 2: Header actions component**

```tsx
// mobile/staff/src/components/kitchen/header-actions.tsx
import { useInboxUnread } from "@/lib/kitchen/inbox-unread";
import { KType } from "@/lib/kitchen/typography";
import { Colors } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function KitchenHeaderActions({
  showAllOrders = false,
}: {
  showAllOrders?: boolean;
}) {
  const router = useRouter();
  const { count } = useInboxUnread();

  return (
    <View style={styles.row}>
      {showAllOrders ? (
        <Pressable
          onPress={() => router.push("/orders")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="All orders"
        >
          <Text style={styles.link}>All orders</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => router.push("/inbox")}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
        style={styles.bellWrap}
      >
        <Ionicons
          name={count > 0 ? "notifications" : "notifications-outline"}
          size={22}
          color={Colors.text}
        />
        {count > 0 ? <View style={styles.dot} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  link: { ...KType.metaStrong, color: Colors.accent },
  bellWrap: { position: "relative", padding: 4 },
  dot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
});
```

- [ ] **Step 3: Typecheck**

Run: `cd mobile/staff && npm run typecheck`  
Expected: PASS

---

### Task 2: Add Customers tab (4 tabs)

**Files:**
- Modify: `mobile/staff/src/app/(tabs)/_layout.tsx`
- Create: `mobile/staff/src/app/(tabs)/customers.tsx` (placeholder until Task 8)

**Interfaces:**
- Consumes: existing NativeTabs / Tabs patterns
- Produces: tab route name `customers`

- [ ] **Step 1: Placeholder customers tab**

```tsx
// mobile/staff/src/app/(tabs)/customers.tsx
import { SafeScreen } from "@/components/kitchen/safe-screen";
import { KType } from "@/lib/kitchen/typography";
import { Text } from "react-native";

export default function CustomersTab() {
  return (
    <SafeScreen>
      <Text style={[KType.page, { margin: 20 }]}>Customers</Text>
    </SafeScreen>
  );
}
```

- [ ] **Step 2: iOS NativeTabs — insert Customers between Menu and Account**

Add trigger:

```tsx
<NativeTabs.Trigger name="customers">
  <NativeTabs.Trigger.Icon
    sf={{ default: "person.2", selected: "person.2.fill" }}
  />
  <NativeTabs.Trigger.Label>Customers</NativeTabs.Trigger.Label>
</NativeTabs.Trigger>
```

- [ ] **Step 3: Android Tabs.Screen for customers**

```tsx
<Tabs.Screen
  name="customers"
  options={{
    title: "Customers",
    tabBarLabel: "Customers",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="people-outline" color={color} size={size} />
    ),
  }}
/>
```

Order of screens: `index`, `menu`, `customers`, `account`.

- [ ] **Step 4: Smoke on device**

Run Expo; confirm 4 tabs labeled Board · Menu · Customers · Account.

---

### Task 3: Board header — All orders + bell

**Files:**
- Modify: `mobile/staff/src/components/kitchen/board-screen.tsx`

**Interfaces:**
- Consumes: `KitchenHeaderActions`

- [ ] **Step 1: Put actions in `topRow`**

In the Board header `styles.topRow` View, keep store name + “N new” on the left; add:

```tsx
<KitchenHeaderActions showAllOrders />
```

Import from `@/components/kitchen/header-actions`.

- [ ] **Step 2: Keep chrome during skeleton**

Do **not** hide `KitchenHeaderActions` while `initialLoading` — only the column/list area uses `KitchenBoardSkeleton`. Store title stays real; “N new” may stay empty until data.

- [ ] **Step 3: Smoke**

Board shows All orders + bell; taps navigate once Task 4–5 register routes (will no-op / warn until then — OK to finish Task 4 next).

---

### Task 4: Root stack routes

**Files:**
- Modify: `mobile/staff/src/app/_layout.tsx`
- Create stub files listed below so Expo Router resolves

**Interfaces:**
- Produces routes: `/orders`, `/inbox`, `/account/you`, `/account/store`, `/account/preferences`, `/customers/[id]`

- [ ] **Step 1: Minimal stub screens** (replace with real UI in later tasks)

Create empty default exports that render `SafeScreen` + title text for:
- `orders/index.tsx` → “Orders”
- `inbox.tsx` → “Inbox”
- `account/you.tsx`, `account/store.tsx`, `account/preferences.tsx`
- `customers/[id].tsx`

- [ ] **Step 2: Register in root Stack**

```tsx
<Stack.Screen
  name="orders/index"
  options={{ title: "Orders", headerBackButtonDisplayMode: "minimal" }}
/>
<Stack.Screen
  name="orders/[id]"
  options={{ title: "Order", headerBackButtonDisplayMode: "minimal" }}
/>
<Stack.Screen
  name="inbox"
  options={{ title: "Inbox", headerBackButtonDisplayMode: "minimal" }}
/>
<Stack.Screen
  name="account/you"
  options={{ title: "You", headerBackButtonDisplayMode: "minimal" }}
/>
<Stack.Screen
  name="account/store"
  options={{ title: "Store", headerBackButtonDisplayMode: "minimal" }}
/>
<Stack.Screen
  name="account/preferences"
  options={{ title: "Preferences", headerBackButtonDisplayMode: "minimal" }}
/>
<Stack.Screen
  name="customers/[id]"
  options={{ title: "Customer", headerBackButtonDisplayMode: "minimal" }}
/>
```

Keep `(tabs)` and `login` as today.

- [ ] **Step 3: Typecheck**

Run: `cd mobile/staff && npm run typecheck`  
Expected: PASS

---

### Task 5: Orders list (All orders)

**Files:**
- Replace: `mobile/staff/src/app/orders/index.tsx`
- Optionally reuse: `OrdersScreenSkeleton` from `@naijajollof/ui`

**Interfaces:**
- Consumes: `GET /api/orders?filter=&q=&channel=kitchen&limit=50` via `apiFetch<ListStaffOrdersResult>`
- Filter chips: `active` | `completed` | `cancelled` | `all` (maps to existing `StaffOrderListFilter`)

- [ ] **Step 1: Implement list screen**

Structure:

```tsx
export default function OrdersListScreen() {
  // state: q, filter, data, error, refreshing
  // load: `/api/orders?filter=${filter}&channel=kitchen&limit=50&q=${encodeURIComponent(q)}`
  // debounce q ~300ms or search on submit / clear
  return (
    <Screen>
      <StackScroll>
        <Field placeholder="Ticket #, name, phone" value={q} onChangeText={setQ} />
        <View style={chipRow}>
          {(["active", "completed", "cancelled", "all"] as const).map(...)}
        </View>
        {initialLoading ? <OrdersScreenSkeleton /> : rows}
      </StackScroll>
    </Screen>
  );
}
```

Row: display number / day ticket, customer name, status, total → `router.push(\`/orders/${id}\`)`.

Use solid white cards (`Card`) + `KType`; chip selected = accent text or soft fill (`Colors.accentSoft`), not orange backgrounds.

- [ ] **Step 2: Pull-to-refresh**

`RefreshControl` on ScrollView; do not swap to full skeleton on refresh.

- [ ] **Step 3: Smoke**

From Board → All orders → see seeded tickets; search by phone; open a row → existing ticket detail.

---

### Task 6: Inbox stub

**Files:**
- Replace: `mobile/staff/src/app/inbox.tsx`

- [ ] **Step 1: Empty inbox UI**

```tsx
export default function InboxScreen() {
  return (
    <Screen>
      <StackScroll>
        <Text style={KType.page}>Inbox</Text>
        <Text style={KType.meta}>You’re caught up</Text>
        {/* Dev-only: button to setInboxUnreadCount(0) / (1) for badge QA */}
      </StackScroll>
    </Screen>
  );
}
```

In `__DEV__`, add buttons to set unread 0/1 and call `useInboxUnread().refresh` via a small effect or focus listener — enough to QA the Board bell dot.

- [ ] **Step 2: Smoke**

Bell → Inbox; empty copy shows; badge toggles in dev.

---

### Task 7: Account home + sub-screens

**Files:**
- Replace: `mobile/staff/src/app/(tabs)/account.tsx`
- Replace stubs: `account/you.tsx`, `account/store.tsx`, `account/preferences.tsx`

**Interfaces:**
- Consumes: `useAuth()` → `user`, `store`, `signOut`
- Preferences: UI stubs only (sound/haptic/push/quiet + appearance); push enable calls `registerStaffPushDevice` only when user taps (after Task 9 deferral)

- [ ] **Step 1: Account home as scroll of rows**

```tsx
// Rows (Pressable → router.push):
// You → /account/you
// Store → /account/store
// Preferences → /account/preferences
// Sign out → Button danger/secondary calling signOut()
```

Use `GlassSurface` or solid `Card` list — one card with dividers is fine. No triple title stack; section kickers OK (`You`, `Store`, …).

- [ ] **Step 2: You screen**

Show `user.name`, `user.email`, `user.role` with `StackScroll`.

- [ ] **Step 3: Store screen**

Show `store?.name`, `store?.phone` (expand later when `/api/me` returns address/hours). Read-first; no edit.

- [ ] **Step 4: Preferences screen**

Static rows / switches local state only:

- Notifications: Sound, Haptic, Push (on → `registerStaffPushDevice()`), Quiet hours (disabled stub)
- Appearance: System / Light (persist with `kv` keys `kitchen.pref.*` if easy; else local state)

Copy: if push denied, show meta “Open system Settings to enable” (Linking.openSettings).

- [ ] **Step 5: Smoke**

Account → each sub-route → chevron back; Sign out → login.

---

### Task 8: Customers list + detail stub

**Files:**
- Replace: `mobile/staff/src/app/(tabs)/customers.tsx`
- Replace: `mobile/staff/src/app/customers/[id].tsx`
- Modify: `mobile/packages/ui/src/skeleton.tsx` — add `KitchenCustomersSkeleton` (row-shaped)
- Modify: `mobile/packages/ui/src/index.ts` — export it

**Interfaces:**
- Consumes: `apiFetch<{ items: CustomerListItem[]; search: string }>("/api/customers?q=&limit=50")`
- Note: `apiFetch` unwraps `{ data }` — type the unwrapped payload.
- `CustomerListItem` lives in server `lib/domain/customer/types.ts` — either duplicate a slim type in `mobile/packages/api-types` or inline:

```ts
type StaffCustomerRow = {
  id: string;
  name: string;
  primaryPhone: string | null;
  primaryAddress: string | null;
  orderCount: number;
};
```

Prefer adding to `mobile/packages/api-types` if that package already mirrors staff types.

- [ ] **Step 1: Skeleton**

```tsx
export function KitchenCustomersSkeleton() {
  return (
    <View style={{ padding: 20, gap: 10 }} accessibilityLabel="Loading customers">
      <Skeleton height={44} radius={Radii.sm} />
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={styles.orderCard}>
          <Skeleton height={16} width="55%" />
          <Skeleton height={12} width="40%" style={{ marginTop: Space.xs }} />
        </View>
      ))}
    </View>
  );
}
```

Match final row padding/radius.

- [ ] **Step 2: Customers tab**

- Search `Field` on-screen (not a tab)
- Cold load: `KitchenCustomersSkeleton`
- Rows: name, phone, order count → `router.push(\`/customers/${id}\`)`
- Pull-to-refresh; poll not required

- [ ] **Step 3: Detail stub**

`GET /api/customers/[id]` → show name, phones, addresses, notes if present; “Past orders” section placeholder text for a later plan.

- [ ] **Step 4: Typecheck + smoke**

List loads with seed/store customers; search filters; detail opens.

---

### Task 9: Defer auto notification permission

**Files:**
- Modify: `mobile/staff/src/lib/auth.tsx`
- Modify: `mobile/staff/src/lib/push.ts` (optional helper)

**Why:** Spec permission priming must explain before OS dialog. Today `signIn` / `hydrate` call `registerStaffPushDevice()` which requests permission immediately.

- [ ] **Step 1: Remove auto-register from auth**

Delete `void registerStaffPushDevice()` from `hydrate` and `signIn` in `auth.tsx`.

- [ ] **Step 2: Keep explicit path**

Account → Preferences (and any temporary Account button) still call `registerStaffPushDevice()`.

- [ ] **Step 3: Smoke**

Fresh install / cleared permissions: login does **not** show system notification prompt. Preferences → Push still can.

---

### Task 10: Align ticket skeleton + Board chrome loading

**Files:**
- Modify: `mobile/packages/ui/src/skeleton.tsx` → `KitchenTicketSkeleton`
- Modify: `mobile/packages/ui/src/skeleton.tsx` → `KitchenBoardSkeleton` (optional: drop fake title bones if Board keeps real header)

- [ ] **Step 1: Ticket skeleton = 2 cards**

Match `orders/[id].tsx`: one order card (notes + lines + total), one guest card, two action button bones. Remove 3 mini item cards.

- [ ] **Step 2: Board skeleton**

If Board header is always visible, remove the top title/meta skeleton lines from `KitchenBoardSkeleton` so settling does not shift under the real header — keep segment + ticket card bones only.

- [ ] **Step 3: Visual check**

Cold-load Board and a ticket: no jump when data arrives.

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| Tabs Board · Menu · Customers · Account | 2 |
| Board All orders + bell | 1, 3 |
| Orders stack search/filters | 4, 5 |
| Customers tab list | 8 |
| Account merges profile + settings | 7 |
| Inbox stub + unread badge hook | 1, 6 |
| Skeletons match geometry / chrome real | 3, 5, 8, 10 |
| Permission priming UI | **Follow-on plan** (Task 9 only defers auto-prompt) |
| Menu CRUD | **Follow-on plan** (Menu tab stays stub) |
| Insist overlay | **Follow-on plan** |

## Follow-on plans (do not implement here)

1. **Kitchen Menu CRUD** — list/edit/add via `/api/menu/*`
2. **Kitchen Insist + notification priming** — bottom sheet → OS dialog; insist overlay; real inbox events
3. **Customer detail depth** — past orders list, call/SMS actions

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-09-03-kitchen-nav-shell.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
