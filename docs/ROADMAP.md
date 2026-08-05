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
| 1 | [SMS & WhatsApp notifications](#1-sms--whatsapp-notifications) | Partial — email + staff WA bot shipped; diner SMS/WA + staff pings left | M | Twilio + Meta prod templates |
| 2 | [Store manager permissions](#2-store-manager-permissions-and-functionality) | Binary RBAC only | M | Auth session |
| 3 | [Coupons and discounts](#3-coupons-and-discounts) | Not started | M–L | Checkout totals + #2 |
| 4 | [Blog](#4-setup-blog) | Placeholder `/blog` | S–M | None |
| 5 | [Google review widgets](#5-google-review-widgets) | Maps link only | S | Place ID |

---

## 1. SMS & WhatsApp notifications

**Goal:** Diners get reliable order updates on phone; staff get instant new-order pings. Email stays the fallback.

Hooks already exist (`notify-order-status.ts`, `notifyStaffOrder`, checkout confirm). Do not rebuild the notification bus — extend it.

**Today:**

| Channel | Status |
|---------|--------|
| Diner email (Resend) | **Shipped** — confirm + accepted / ready (delivery) or ready_for_pickup (pickup) / out / cancelled. Email required at checkout. |
| Staff email | **Shipped** — new order + external cancel (Square fail). No mail when staff cancel from the dashboard. |
| Dashboard bell + kitchen chime + tab badge | **Shipped** — `pending_acceptance` poll (10s) |
| Staff WhatsApp bot | **Shipped** — inbound courier dispatch (`WHATSAPP_STAFF_PHONES` / `WhatsAppStaffPhone`). Not an outbound pager. |
| Diner WhatsApp | **Stub** — `WHATSAPP_ORDER_UPDATES` free-form text. Keep **off** in prod until templates + opt-in. |
| First-party SMS | **None** — hook is ready; no vendor. Uber/DoorDash still send their own courier SMS. |

**Vendor (locked):**

- **SMS:** Twilio Programmable Messaging + **verified toll-free** (1-8xx) for CA/US. Vercel Marketplace messaging is Resend-only (email). Telnyx is the fallback if Twilio onboarding stalls.
- **WhatsApp:** existing Meta Cloud API account. Staff bot stays. Diner updates need **approved utility templates** + checkout opt-in — not session text.
- **Email:** Resend (unchanged).

### Noise cut (done)

| Cut | What we did |
|-----|-------------|
| Pickup `ready` **and** `ready_for_pickup` | One diner ping: `ready_for_pickup` for pickup, `ready` for delivery. |
| Diner `completed` / “Enjoy” | Dropped. Review-ask can come later. |
| Staff cancel email when **they** cancelled | Dashboard cancel is silent for staff. Square fail/cancel still mails the kitchen. |
| Signup welcome + verify | One email: “Welcome — verify your email”. Resend stays verify-only. |

Leave `preparing` silent (accepted copy already says the kitchen is starting). Checkout email is required (same as phone).

### Scope (remaining v1)

**Diner**

- Checkout opt-in: SMS and/or WhatsApp (default off, or SMS on if they typed a mobile). Persist `smsOptIn` / `whatsappOptIn` on customer or order.
- Phone statuses: **accepted**, **ready or ready_for_pickup** (one), **out_for_delivery**, **cancelled**. Email always sent (required at checkout).
- SMS via Twilio; honor `STOP` / `START` inbound webhook.
- WhatsApp only after Meta templates are approved; same status set.

**Staff**

- Outbound **new `pending_acceptance` ping** on WhatsApp and/or SMS (in addition to email + bell + chime).
- Reuse `WhatsAppStaffPhone` + env allowlist; dashboard CRUD can wait on #2.4 / #2.5 if needed.
- Optional later: escalate if still unaccepted after 3–5 minutes. Scheduled tickets stay off the live kitchen board (and bell) until prep window.

### Out of scope (v1)

- Customer ordering via WhatsApp chat.
- Marketing blasts / campaigns.
- Replacing Uber/DoorDash courier PIN SMS.
- Knock / Novu / other notification clouds.
- Browser / PWA push.
- Diner “password changed” mail (tiny; separate hygiene).

### Delivery slices

| Slice | Status | Work |
|-------|--------|------|
| 1.0 Noise cut | **Done** | Pickup one-ready ping; no completed diner mail; no staff self-cancel mail; signup welcome+verify merged; checkout email required |
| 1.1 Meta production | **Partial** | Staff WA bot already live in sandbox/prod wiring. Finish business verification, live WABA, prod webhook on `new.naijajollofw.ca`, token rotation |
| 1.2 WA templates | **Todo** | Submit utility templates; `sendTemplateMessage` beside `sendTextMessage`; never enable free-form diner updates |
| 1.3 Opt-in model | **Todo** | `smsOptIn` / `whatsappOptIn`; checkout checkboxes; unsubscribe / STOP |
| 1.4 Diner WhatsApp | **Todo** | Route `notify-order-status` through templates when opted in (+ idempotency — stub has none today) |
| 1.5 SMS (Twilio) | **Todo** | Account + toll-free verification; `lib/integrations/sms/`; send log; same status hooks as email |
| 1.6 Staff pings | **Todo** | New-order WA and/or SMS on `notifyStaffOrder("new_order")`. Highest kitchen-impact slice; can ship before diner SMS |

### Done when

- Noise cuts are live (one pickup-ready ping; no completed mail; no staff self-cancel mail).
- Opted-in diner gets SMS **or** templated WA on accept / ready / out / cancel.
- Non-opted-in diner still gets email (required at checkout).
- Staff get a phone ping within seconds of a new paid ASAP order.
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
| **M1 — Reach diners on phone** | 1.0, 1.3, 1.5, then 1.1–1.2 / 1.4 | Noise cut + Twilio SMS; WA templates when Meta is ready |
| **M2 — Safe multi-staff** | 2.1–2.3, 1.6 | Roles + invites + staff phone pings (1.6 can ship during M1) |
| **M3 — Promos** | 3 | Working codes at checkout, owner-only admin |
| **M4 — Marketing surface** | 4 v1 + 5 v1 | Live blog + Google rating on homepage |

M4 can start during M1 if you want SEO/trust wins without waiting on RBAC (static MDX + embed need no dashboard).
