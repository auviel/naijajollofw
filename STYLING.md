# deliverGO — Styling & Design Guide

> Visual and UX direction for deliverGO.  
> **North star:** Uber Direct dashboard — clean, trusted, zero friction.  
> **System reference:** [Uber Base Design System](https://baseweb.design) (tokens and patterns, not the Base Web library itself).

---

## Design philosophy

### What we take from Uber

Uber's product UI succeeds because it optimizes for **confidence under time pressure**. A store manager dispatching a delivery needs to trust what they see, act in seconds, and never wonder if something worked.

| Principle | In practice for deliverGO |
|-----------|---------------------------|
| **Clarity over decoration** | One primary action per screen. No competing CTAs. |
| **Information hierarchy** | Status and fee are always visible before secondary details. |
| **Progressive disclosure** | Quote details appear only after address is valid. POD options collapsed by default. |
| **Immediate feedback** | Loading states on every async action. Toasts for success/failure. |
| **Trust through transparency** | Show exact fee, ETA, and sandbox/test mode clearly. Never hide costs. |
| **Consistency** | Same spacing, type scale, and button styles everywhere. |

### 2026 design guidelines

These sit on top of Uber's foundations for a modern, trustworthy B2B dashboard:

1. **Generous whitespace** — cards breathe; dense tables are avoided in v1.
2. **Semantic color only** — never raw hex in components; always tokens (`text-primary`, `surface-elevated`).
3. **Motion with purpose** — 150–300ms transitions on hover/focus; no decorative animation.
4. **Accessibility first** — WCAG 2.2 AA minimum; visible focus rings; 44px touch targets.
5. **Reduced cognitive load** — max 5 nav items; forms grouped into clear sections.
6. **Status as UI** — delivery state drives color, icon, and layout — not the other way around.
7. **Dark mode ready** — tokens defined for light + dark even if v1 ships light only.

---

## Brand identity (deliverGO × Uber)

deliverGO is a **white-label dispatch tool** for merchants — it should feel like it belongs in Uber's ecosystem without copying Uber's consumer rider app wholesale.

- **Tone:** Professional, calm, direct. No playful copy on error states.
- **Voice examples:**
  - ✅ "Delivery quote ready — $8.42 CAD"
  - ✅ "Courier en route to pickup"
  - ❌ "Awesome! Your delivery is on its way 🚀"
- **Logo area:** Wordmark `deliverGO` in semibold; optional small "Powered by Uber Direct" in footer of login + settings.

---

## Design tokens

Implement these in `app/globals.css` (Tailwind v4 `@theme`) or a `tokens.css` file. Names follow Uber Base's **semantic token** pattern.

### Color palette

#### Primitives

```css
/* Light theme primitives — inspired by Uber Base */
--color-black:        #000000;
--color-white:        #FFFFFF;
--color-gray-50:      #F6F6F6;
--color-gray-100:     #EEEEEE;
--color-gray-200:     #E2E2E2;
--color-gray-300:     #CBCBCB;
--color-gray-400:     #AFAFAF;
--color-gray-500:     #757575;
--color-gray-600:     #545454;
--color-gray-700:      #333333;
--color-green-500:    #05944F;   /* Uber success / positive */
--color-green-600:    #047857;
--color-blue-500:     #276EF1;   /* Links, info */
--color-red-500:      #E11900;   /* Errors, cancel */
--color-amber-500:    #F5A623;   /* Warnings, scheduled */
```

#### Semantic tokens (use these in components)

| Token | Light value | Usage |
|-------|-------------|-------|
| `--background` | `#FFFFFF` | Page background |
| `--foreground` | `#000000` | Primary text |
| `--surface` | `#F6F6F6` | Cards, sidebar |
| `--surface-elevated` | `#FFFFFF` | Elevated cards (with border) |
| `--border` | `rgba(0,0,0,0.08)` | Dividers, card borders (Base `border200`) |
| `--border-strong` | `rgba(0,0,0,0.12)` | Input borders |
| `--text-primary` | `#000000` | Headings, body |
| `--text-secondary` | `#545454` | Labels, meta |
| `--text-tertiary` | `#757575` | Placeholders, timestamps |
| `--text-inverse` | `#FFFFFF` | Text on dark buttons |
| `--accent` | `#000000` | Primary buttons (Uber uses black CTAs) |
| `--accent-hover` | `#333333` | Primary button hover |
| `--accent-subtle` | `#F6F6F6` | Secondary button background |
| `--link` | `#276EF1` | Links, tracking URL |
| `--success` | `#05944F` | Completed status |
| `--warning` | `#F5A623` | Scheduled, pending |
| `--error` | `#E11900` | Failed, cancel, validation |
| `--info` | `#276EF1` | En route, informational badges |
| `--sandbox-banner` | `#FFF8E6` | Test mode banner background |
| `--sandbox-text` | `#7A5B00` | Test mode banner text |

### Typography

Uber Base uses a modular scale with named levels. We map them to Tailwind utilities.

**Font stack**

```css
--font-sans: "Uber Move Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-display: "Uber Move", "Helvetica Neue", Helvetica, Arial, sans-serif;
```

> **Note:** Uber Move is a licensed font. For v1, use **Inter** or **system-ui** as fallback until brand fonts are licensed. Configure in `@theme { --font-sans: Inter, ... }`.

| Level | Size | Weight | Line height | Tailwind | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 36px | 700 | 1.1 | `text-4xl font-bold` | Login hero (optional) |
| Heading XL | 28px | 700 | 1.2 | `text-2xl font-bold` | Page titles |
| Heading LG | 22px | 600 | 1.3 | `text-xl font-semibold` | Section headers |
| Heading MD | 18px | 600 | 1.4 | `text-lg font-semibold` | Card titles |
| Label | 14px | 500 | 1.4 | `text-sm font-medium` | Form labels, table headers |
| Paragraph | 16px | 400 | 1.5 | `text-base` | Body text |
| Paragraph SM | 14px | 400 | 1.5 | `text-sm` | Secondary body, table cells |
| Caption | 12px | 400 | 1.4 | `text-xs` | Timestamps, hints |
| Mono | 13px | 400 | 1.4 | `font-mono text-xs` | External IDs, quote IDs |

**Rules**

- One `Heading XL` per page — the page title only.
- Form labels always `Label` — never use placeholder as label.
- Fees use `Heading MD` + tabular nums (`font-variant-numeric: tabular-nums`).

### Spacing (8px grid)

Uber Base uses `scale100` = 4px, `scale200` = 8px, etc. We use an 8px base grid.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Icon gaps |
| `--space-2` | 8px | Tight padding |
| `--space-3` | 12px | Input padding vertical |
| `--space-4` | 16px | Card padding, form gaps |
| `--space-5` | 24px | Section gaps |
| `--space-6` | 32px | Page padding |
| `--space-8` | 48px | Large section breaks |
| `--space-10` | 64px | Login page vertical rhythm |

**Layout widths**

- Sidebar: `240px` fixed
- Content max-width: `960px` (forms); `1200px` (list tables)
- Page padding: `32px` desktop, `16px` mobile

### Borders & radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Badges, small chips |
| `--radius-md` | 8px | Inputs, buttons |
| `--radius-lg` | 12px | Cards |
| `--radius-full` | 9999px | Avatars, pills |

Border style matches Base Web `border200`: `1px solid rgba(0,0,0,0.08)`.

### Shadows & elevation

Uber web apps use **flat surfaces + borders** over heavy shadows. Use shadows sparingly.

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.06)` | Dropdown menus |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.12)` | Modals only |

Cards on `--surface` background: border only, no shadow.

### Motion

From Uber Base animation tokens:

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Hover, focus |
| `--duration-normal` | 250ms | Panel open, toast |
| `--duration-slow` | 400ms | Page transitions |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Enter |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default |

Respect `prefers-reduced-motion: reduce` — disable transitions.

---

## Components

### Buttons

| Variant | Style | Usage |
|---------|-------|-------|
| **Primary** | Black bg, white text, `radius-md`, h-48px | "Send delivery", "Get quote" |
| **Secondary** | Gray-100 bg, black text, border | "Cancel" in forms (not destructive) |
| **Ghost** | Transparent, underline on hover | Tertiary actions |
| **Destructive** | Red text or red outline | "Cancel delivery" on detail page |

**Rules**

- One primary button visible per viewport section.
- Primary button shows spinner + disabled state during API calls.
- Min width 120px on primary CTAs; full-width on mobile.

### Inputs

- Height: `48px`
- Border: `--border-strong`; focus: `2px solid --foreground` (Uber-style bold focus, not blue glow)
- Background: `--background`
- Error state: red border + caption error text below
- Phone input: prefix `+1` shown, user enters 10 digits

### Cards

```
┌─────────────────────────────────────┐
│  Section title          (optional)  │
│  ─────────────────────────────────  │
│  Content                            │
└─────────────────────────────────────┘
```

- Background: `--surface-elevated`
- Border: `--border`
- Radius: `--radius-lg`
- Padding: `--space-4` (16px) or `--space-5` (24px) for quote cards

### Status badges

Delivery status maps to fixed colors — never invent per-row colors.

| Status | Background | Text | Icon |
|--------|------------|------|------|
| Pending | gray-100 | gray-700 | clock |
| Scheduled | amber-100 | amber-800 | calendar |
| En route (pickup/dropoff) | blue-50 | blue-700 | arrow |
| At pickup / At dropoff | blue-100 | blue-800 | pin |
| Completed | green-50 | green-700 | check |
| Cancelled | gray-100 | gray-500 | x |
| Failed | red-50 | red-700 | alert |

Badge shape: pill (`radius-full`), `text-xs font-medium`, px-3 py-1.

### Status timeline (delivery detail)

Vertical stepper — Uber trip tracker pattern simplified:

- Completed steps: green dot + solid line
- Current step: black dot + pulse (subtle)
- Future steps: gray dot + dashed line
- Each step: label + optional timestamp

### Quote card

Highlighted card when quote is fetched:

- Fee in large type (`Heading LG`, tabular nums)
- ETA lines in `--text-secondary`
- Expiry countdown in `--warning` when < 3 min left
- Green left border accent (`4px solid --success`) when valid

### Sandbox banner

Persistent top banner when `UBER_LIVE_MODE=false`:

- Background: `--sandbox-banner`
- Text: `--sandbox-text`
- Copy: **"Test mode — deliveries use robo courier. No real drivers."**
- Cannot be dismissed (trust requirement)

### Toast notifications

- Position: bottom-right (desktop), bottom-center (mobile)
- Success: green left border
- Error: red left border
- Auto-dismiss: 5s; errors persist until dismissed

### Empty states

Centered illustration optional; prefer simple icon + text:

- "No deliveries yet"
- Subtext: "Create your first delivery to get started."
- Primary CTA: "New delivery"

---

## Page layouts

### Login (`/login`)

```
┌────────────────────────────────────────┐
│                                        │
│           deliverGO                    │
│     Sign in to manage deliveries       │
│                                        │
│     ┌──────────────────────────┐       │
│     │  Email                   │       │
│     │  Password                │       │
│     │  [ Sign in ]             │       │
│     └──────────────────────────┘       │
│                                        │
│     Powered by Uber Direct             │
└────────────────────────────────────────┘
```

- Centered card, max-width 400px
- White background, minimal — no sidebar
- Sandbox note in caption if test credentials documented

### Dashboard shell

```
┌──────────┬─────────────────────────────────────────┐
│ SIDEBAR  │  [Sandbox banner if test mode]          │
│          ├─────────────────────────────────────────┤
│ Logo     │  Page title              [Primary CTA]  │
│          │                                         │
│ Nav      │  ┌─────────────────────────────────┐    │
│ • Deliv  │  │  Main content                   │    │
│ • New    │  │                                 │    │
│          │  └─────────────────────────────────┘    │
│          │                                         │
│ Store    │                                         │
│ Logout   │                                         │
└──────────┴─────────────────────────────────────────┘
```

- Sidebar: `--surface` background, right border
- Active nav item: black text + `--surface-elevated` pill or left bar accent
- Store name at bottom of sidebar

### Deliveries list

- Page title left, "New delivery" button right
- Filter tabs below title (underline active tab — Uber pattern)
- List as **rows** (not heavy table): each row is a clickable card
  - Left: name + address
  - Right: status badge + fee + chevron

### New delivery

Single-column form, max-width 640px, sections stacked:

1. **Pickup** — read-only gray card
2. **Dropoff** — editable fields
3. **Schedule** — toggle + datetime
4. **Proof of delivery** — toggles with helper text
5. **Quote** — appears after "Get quote"
6. **Actions** — sticky bottom bar on mobile: Quote + Send buttons

### Delivery detail

Two-column on desktop (≥1024px):

- **Left (60%):** timeline + pickup/dropoff cards
- **Right (40%):** fee, tracking link, cancel, POD gallery

Tracking link: prominent `Open tracking →` button (opens new tab).

POD images: rounded corners, max-height 240px, click to expand.

---

## Icons

Use **Lucide React** (stroke icons, 1.5px weight) — visually close to Uber's line icons.

| Context | Icon |
|---------|------|
| Deliveries nav | `Package` |
| New delivery | `Plus` |
| Tracking | `ExternalLink` |
| Cancel | `XCircle` |
| Schedule | `Calendar` |
| POD signature | `PenLine` |
| POD photo | `Camera` |
| Success | `CheckCircle2` |
| Error | `AlertCircle` |

Icon size: 20px inline, 24px in nav.

---

## Forms & validation UX

- Validate on blur, not every keystroke (except phone formatting).
- Show geocoded address preview before enabling quote.
- Disable "Send delivery" until quote is valid and not expired.
- Cancel delivery requires confirmation modal — never one-click destructive.
- All monetary values: `$X.XX CAD` — fee from Uber is in cents; format in UI layer.

---

## Responsive breakpoints

| Name | Min width | Behavior |
|------|-----------|----------|
| `sm` | 640px | Stack → row for some form fields |
| `md` | 768px | Sidebar collapses to icon rail (optional v1: keep sidebar) |
| `lg` | 1024px | Detail page two-column |
| `xl` | 1280px | Max content width enforced |

Mobile priority: new delivery form and delivery detail must be fully usable at 375px.

---

## Storefront mobile UX (future reference)

Single-restaurant storefront should feel like **Uber Eats consumer**, adapted for one store — not a marketplace.

### Bottom sheets (preferred on mobile)

On phones, **action menus and secondary flows should open as bottom sheets**, not centered desktop dialogs.

**Why:** thumbs rest along the bottom half of the screen. Sliding a sheet up puts primary actions in the easy-reach zone; dimming the page behind keeps focus without a hard navigation.

**Pattern (Uber Eats–style):**

```
┌─────────────────────────────┐
│  Dimmed page (hero, menu…)  │
│                             │
│ ╭─────────────────────────╮ │
│ │  rounded top sheet      │ │
│ │  • action + icon        │ │
│ │  • action + icon        │ │
│ │  • Store info           │ │
│ │    Address, hours…      │ │
│ ╰─────────────────────────╯ │
└─────────────────────────────┘
```

| Rule | Detail |
|------|--------|
| **Entry** | Sheet slides up from the bottom; backdrop fades in |
| **Shape** | Full-bleed width; large top corner radius; optional drag handle |
| **Actions** | Vertical list, icon left, label (+ optional caption); large tap targets (≥44px) |
| **Dismiss** | Tap backdrop, swipe down, or Escape (a11y) |
| **Desktop** | Same content can use a centered modal or popover — keep **mobile = bottom sheet** |

**Good candidates for bottom sheets later:** store info, item options / modifiers overflow, cart overflow actions, filters, “more” menus — anything that is a short choice list, not a long form.

**Avoid on mobile:** tiny centered modals floating mid-screen; nested sheets without a clear back affordance.

### Header (shipped direction)

| Viewport | Auth | Search |
|----------|------|--------|
| Mobile | Sign up only when logged out; **Account (User icon)** when logged in | Icon that expands inline search |
| Desktop | Log in + Sign up → Account icon when logged in | Full pill search field |

Session-aware header: use live session state so auth controls update without a full reload.

### Not marketplace chrome

Do **not** add Uber Eats location / “Deliver to… · Now” in the header for a single store. Address + pickup/delivery stay at checkout; store address + hours live in the hero / store info.

---

## Accessibility checklist

- [ ] Color contrast ≥ 4.5:1 for body text, 3:1 for large text
- [ ] Focus visible on all interactive elements (2px outline)
- [ ] Form inputs linked to labels via `htmlFor` / `id`
- [ ] Status badges include `aria-label` with full status text
- [ ] Modals trap focus and close on Escape
- [ ] Images in POD section have alt text ("Delivery signature", "Delivery photo")
- [ ] Skip link to main content on dashboard pages

---

## File structure (styling)

```
app/
  globals.css          # @theme tokens + base styles
components/
  ui/
    button.tsx
    input.tsx
    card.tsx
    badge.tsx
    toast.tsx
    modal.tsx
    timeline.tsx
  layout/
    sidebar.tsx
    sandbox-banner.tsx
lib/
  cn.ts                # clsx + tailwind-merge helper
```

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use semantic tokens everywhere | Hardcode `#000` in components |
| Show fee before dispatch | Hide cost until after delivery created |
| Show test mode prominently | Silently run sandbox deliveries |
| Link out to Uber tracking URL | Embed or modify tracking URL |
| Keep one primary CTA per section | Multiple black buttons competing |
| Use plain language for errors | Show raw API error JSON to users |
| Group form sections with headings | Long unbroken form fields |

---

## Reference

- [Uber Base Web — Theming](https://baseweb.design/guides/theming/)
- [Uber Base Web — Colors](https://baseweb.design/guides/theming/#colors)
- [Introducing Base Web (Uber Engineering Blog)](https://www.uber.com/blog/introducing-base-web/)
- [Uber Direct Developer Docs](https://developer.uber.com/docs/deliveries/overview)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
