# Product roadmap

Living plan for Naija Jollof Waterloo on top of the live storefront + kitchen + Square checkout.

Build in this order:

```
1  Notifications (diner + staff pings)
        ↓
2  Manager roles + staff invites
        ↓
3  Coupons (owner-only minting)
        ↘
4  Blog  ·  5  Google reviews     ← can run in parallel anytime
```

| # | Theme | Status | Effort | Depends on |
|---|--------|--------|--------|------------|
| 1 | [SMS & WhatsApp notifications](#1-sms--whatsapp-notifications) | Partial (staff WA + email) | M–L | Meta prod / SMS vendor |
| 2 | [Store manager permissions](#2-store-manager-permissions-and-functionality) | Binary RBAC only | M | Auth session |
| 3 | [Coupons and discounts](#3-coupons-and-discounts) | Not started | M–L | Checkout totals + #2 |
| 4 | [Blog](#4-setup-blog) | Placeholder `/blog` | S–M | None |
| 5 | [Google review widgets](#5-google-review-widgets) | Maps link only | S | Place ID |

---

## 1. SMS & WhatsApp notifications

**Goal:** Diners get reliable order updates on phone; staff get instant new-order pings. Email stays the default fallback.

**Today:**

| Channel | Status |
|---------|--------|
| Diner email (Resend) | Shipped — confirm + status |
| Staff email | Shipped — new / cancelled |
| Dashboard bell | Shipped — polls `pending_acceptance` |
| Staff WhatsApp bot | Shipped — dispatch courier (env allowlist) |
| Diner WhatsApp | Stub — `WHATSAPP_ORDER_UPDATES`, free-form text only |
| First-party SMS | None (Uber/DoorDash send their own courier SMS) |

Do **not** enable `WHATSAPP_ORDER_UPDATES=true` in production until templates + opt-in exist. Meta will drop or ban free-form messages outside the 24h window.

### Scope (v1)

**Diner**

- Checkout opt-in: WhatsApp and/or SMS (default off, or SMS on if they typed a mobile).
- Statuses already in `notify-order-status.ts`: accepted, ready / ready for pickup, out for delivery, completed, cancelled.
- WhatsApp: **approved utility templates** (not session text).
- SMS: Twilio (or equivalent CA-capable) transactional SMS.
- Store preference + unsubscribe (`STOP` for SMS; WhatsApp opt-out flag on customer).

**Staff**

- WhatsApp and/or SMS on new `pending_acceptance` (in addition to email + bell).
- Dashboard CRUD for staff phones (table `WhatsAppStaffPhone` already exists; today allowlist is `WHATSAPP_STAFF_PHONES` env).

### Out of scope (v1)

- Customer ordering via WhatsApp chat.
- Marketing blasts / campaigns.
- Replacing Uber courier PIN SMS.

### Delivery slices

| Slice | Work |
|-------|------|
| 1.1 Meta production | Business verification, live WABA, prod webhook on `new.naijajollofw.ca`, token rotation |
| 1.2 Templates | Submit utility templates; add `sendTemplateMessage` beside `sendTextMessage` |
| 1.3 Opt-in model | `Customer` / order flags: `whatsappOptIn`, `smsOptIn`; checkout checkboxes |
| 1.4 Diner WhatsApp | Route `notify-order-status` through templates when opted in |
| 1.5 SMS provider | Integration + send log; same status hooks as email/WA |
| 1.6 Staff pings | New-order WA/SMS; manage numbers in dashboard (#2 can restrict who edits) |

### Done when

- Opted-in diner gets WA **or** SMS on accept / ready / out / complete / cancel.
- Non-opted-in diner still gets email only.
- Staff get a phone ping within seconds of a new paid order.
- Failed sends are logged (Sentry + structured log), never block kitchen transitions.

---

## 2. Store manager permissions and functionality

**Goal:** More than one staff login without everyone being a superuser. Invite, deactivate, and scope what they can do.

**Today:** `UserRole` is `STORE_MANAGER | DINER`. `requireStoreManager()` unlocks the entire dashboard (orders, menu, courier, customers, hours, store profile). Staff are seeded; there is no invite UI.

### Roles (v1 proposal)

| Role | Intent |
|------|--------|
| `OWNER` | Full access + staff admin + coupons + store profile + WhatsApp/SMS settings |
| `MANAGER` | Orders, menu, customers, hours, courier dispatch (no staff admin, no minting 100% off codes) |
| `KITCHEN` | Kitchen board + order transitions only (no menu price edits, no customers PII list beyond ticket, no store settings) |

Migrate existing `STORE_MANAGER` → `OWNER` (or keep the enum value as alias during migration).

### Functionality gaps (beyond RBAC)

- Invite staff by email → magic link / temp password + role picker.
- Deactivate staff (block dashboard, keep audit actor name on past events).
- Staff notification prefs (email / WhatsApp / SMS).
- Dashboard account: change password / security (diners already have this).
- WhatsApp staff phone allowlist UI.
- Optional later: `DISPATCH` only (courier quotes, no kitchen).

### Delivery slices

| Slice | Work |
|-------|------|
| 2.1 Schema | Extend `UserRole` (or `StaffPermission` flags); migration + seed |
| 2.2 Auth gates | `requirePermission(...)` in services; hide nav items in sidebar / mobile nav |
| 2.3 Staff admin UI | `/dashboard/staff` — invite, role, deactivate (OWNER only) |
| 2.4 Notification prefs | Per-user channels for new-order alerts |
| 2.5 Audit | Order events already store `actor`; ensure staff user id/name is used |

### Done when

- Kitchen login cannot open store profile, coupons, or staff admin.
- Owner can invite a manager without sharing the seed password.
- Deactivated staff get signed out and cannot call dashboard APIs.

---

## 3. Coupons and discounts

**Goal:** Staff create promo codes; diners apply them at checkout; Square is charged the discounted total; tax is computed after discount.

**Today:** No coupon/promo models. Totals are `subtotal + HST + tip` in `lib/domain/order/totals.ts`. Checkout schema has no promo field.

### Scope (v1)

- Percent off or fixed CAD off food subtotal (not tip).
- Optional min subtotal, start/end dates, max redemptions (global + per phone/account).
- One code per order.
- Dashboard: create / pause / expire codes; redemption count.
- Storefront: promo field on checkout; live preview of new total.
- Persist `couponCode` + `discountCents` on `Order`.

### Out of scope (v1)

- Stacking codes, BOGO, free delivery, first-order auto-apply, loyalty points, Square Catalog discounts.

### Delivery slices

| Slice | Work |
|-------|------|
| 3.1 Schema | `Coupon` (`storeId`, `code` unique per store, `type`, `valueBps` or `valueCents`, `minSubtotalCents`, `startsAt`, `endsAt`, `maxRedemptions`, `maxPerCustomer`, `active`) + order fields |
| 3.2 Domain | `computeOrderTotals(subtotal, tip, taxRate, discount)` — tax on discounted food only |
| 3.3 Apply API | Validate + lock redemption at checkout (idempotent with payment key) |
| 3.4 Checkout UI | Code input, error states, updated line (“Promo · −$X”) |
| 3.5 Dashboard | `/dashboard/coupons` — owner/admin only once #2 exists |

### Done when

- Valid code reduces Square charge and receipt totals.
- Expired / over-limit / wrong min subtotal are rejected with clear copy.
- Kitchen order detail shows the code and discount.

---

## 4. Setup blog

**Goal:** Publish recipes, kitchen stories, and Waterloo updates on the site (SEO + social).

**Today:** `/blog` is a “coming soon” page. Footer already links there. `app/(marketing)/` is an empty layout island. No CMS.

### Approach

**v1 — MDX in-repo (recommended):** posts as files, typed frontmatter, static generation. Fast, no new vendor, fits `ARCHITECTURE.md` (“blog/marketing island, no Order coupling”).

**v2 — Sanity (optional):** if non-devs will publish weekly. Studio + GROQ + webhook revalidation. Not in the repo today.

### Delivery slices

| Slice | Work |
|-------|------|
| 4.1 Information architecture | Move index + `[slug]` under `(marketing)` or keep storefront chrome; `/blog` and `/blog/[slug]` |
| 4.2 MDX pipeline | Frontmatter: title, date, excerpt, cover, author, draft flag |
| 4.3 Index + post UI | Card grid, reading layout, OG images, sitemap entries |
| 4.4 First 3 posts | Seed content (jollof story, how to order, catering/teaser) |
| 4.5 (Later) CMS | Sanity only if publishing cadence needs it; gate write access with #2 |

### Done when

- `/blog` lists published posts; drafts stay unpublished.
- Posts are crawlable (title, description, sitemap).
- No Prisma/Order imports in blog code.

---

## 5. Google review widgets

**Goal:** Show real Google rating / recent reviews on the storefront to build trust.

**Today:** Hero + footer link to `https://maps.app.goo.gl/wG9369vQfH76S6BYA`. No Place ID, no widget, no review model.

### Approach

**v1 — official embed / badge (recommended):** Google Places Place ID + reviews widget or static rating badge + “Read reviews” deep link. No in-app review network.

**v2 (optional):** Server-side Places API cache → styled cards (no third-party JS, better CSP control). Needs API key + refresh job.

### Delivery slices

| Slice | Work |
|-------|------|
| 5.1 Config | `NEXT_PUBLIC_GOOGLE_PLACE_ID` (and/or server `GOOGLE_PLACES_API_KEY`) |
| 5.2 Storefront | Rating badge on hero + compact review strip above footer / FAQ |
| 5.3 CSP | Allow required Google domains in `next.config.ts` (same pattern as Square / Turnstile) |
| 5.4 Fallback | If widget blocked, keep the existing Maps link |

### Done when

- Homepage shows current Google rating without leaving the page.
- Click-through still opens Google Maps reviews.
- Site works if the widget script is blocked (graceful fallback).

---

## Cross-cutting

- **Square / checkout:** Coupons must change `createSquarePayment` amount. Do not apply discounts only in the UI.
- **Tax:** Ontario HST on discounted food subtotal; tip untaxed (current rule).
- **CSP + third parties:** Blog images (R2), Google widget, SMS vendor dashboards — update `next.config.ts` CSP when adding scripts.
- **Vercel env:** Notifications and Google widgets need production env on `new.naijajollofw.ca` (same class of issue as Square webhooks).
- **Tests:** Domain totals + coupon validation + permission matrix unit tests; Playwright for checkout promo + staff invite happy path.
- **Docs:** This file is the checklist. Restore or retire broken links in `ARCHITECTURE.md` / `README.md` to deleted `*_IMPLEMENTATION.md` files when convenient.

---

## Milestones

| Milestone | Includes | Outcome |
|-----------|----------|---------|
| **M1 — Reach diners on phone** | 1.1–1.5 | Opt-in WA templates + SMS on order status |
| **M2 — Safe multi-staff** | 2.1–2.3, 1.6 | Roles + invites + staff phone pings |
| **M3 — Promos** | 3 | Working codes at checkout, owner-only admin |
| **M4 — Marketing surface** | 4 v1 + 5 v1 | Live blog + Google rating on homepage |

M4 can start during M1 if you want SEO/trust wins without waiting on RBAC (static MDX + embed need no dashboard).
