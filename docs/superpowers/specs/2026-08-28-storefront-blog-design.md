# Storefront Blog Design

**Date:** 2026-08-28  
**Status:** Approved  
**Surfaces:** Storefront `/blog`, `/blog/[slug]`  
**CMS:** Sanity (new integration)

## Goal

Ship a Naija Jollof blog for **recipes / kitchen stories** and **restaurant news** (roughly equal). UX is inspired by Uber Blog patterns (index grid, article readability, related discovery) but adapted to NJ brand tokens and storefront chrome — not a 1:1 clone.

Sanity stays **simple and modern**: one content type editors care about (`post`), scheduling to publish later, auto SEO, and a fixed brand author. Hide everything else in Studio.

## Decisions

| Topic | Choice |
|-------|--------|
| Content mix | Both recipes and news |
| Index cards | **Stacked (Direction A)** — image → title → date |
| Related cards (article footer) | **Immersive B-lite** when cover exists; else stacked fallback |
| Category UX | **Deferred** — no category docs / filter in v1 (keep the grid calm) |
| CMS | **Sanity** — standalone Studio in-repo + `next-sanity` on the Next app |
| Sanity org | **Naija Jollof** |
| Studio / project branding | Upload NJ icon to **org** and **project** so Manage + Studio are easy to spot |
| Studio hosting | Standalone `studio/` (Vite) — not embedded at `/studio` |
| Studio scope | Minimal: **Posts** (+ schedule). Hide unused tools / desk noise |
| Document types | **`post` only** (no author, category, or settings docs) |
| Author | Hardcoded **Naija Jollof** + brand icon on the site (not editable per post) |
| SEO | Auto-filled from title + body; editors can override if needed |
| Body format | Portable Text — keep basic (text, headings, lists, links, images) |
| Brand UI | Existing storefront tokens (`accent` orange, `link`/`success` green, display font) |

## Inspiration → NJ adaptations

| Uber pattern | We keep | We change |
|--------------|---------|-----------|
| Airy index hero (eyebrow + headline) | Yes | NJ copy + `surface` band; no black “Uber Blog” chrome |
| 3-up stacked cards | Yes | Simpler cards (title + date; no category pills in v1) |
| Centered article header | Yes | Always **Naija Jollof** + brand mark as author |
| Share row, images in body | Yes | Food-friendly; no engineering chart chrome |
| Related immersive cards | Yes (footer only) | Soft gradient; auto by recency |
| Category filter / multi-author | Skip for v1 | Simpler Studio + cleaner UI |

## Information architecture

| Route | Purpose |
|-------|---------|
| `/blog` | Index: hero + paginated grid |
| `/blog/[slug]` | Article detail + related |

Lives under existing **storefront** layout (header, footer, cart chrome).

## UX — Index (`/blog`)

### Hero

- Eyebrow: `Blog`
- One display headline (hardcoded copy OK for first ship)
- No hero image, no stats strip
- Quiet `surface` band; generous vertical space
- Mobile: same stack, smaller type

### Listing chrome

- Left: `All articles`
- Right: muted count only (`N articles`) — **no filter dropdown in v1**

### Grid

- Desktop 3 / tablet 2 / mobile 1
- Card: cover → title (2-line clamp) → date
- Whole card is the hit target; desktop title underline on hover
- Missing cover → soft brand-wash placeholder (never broken layout)

### Pagination

- Bottom center: `Prev` · page control · `Next`
- Quiet secondary text; no large numbered pager in v1

### Empty states

- Short message + link to menu

## UX — Article (`/blog/[slug]`)

### Header (centered)

- Date (from published / scheduled time)
- Title (display, large)
- Author row (fixed): brand icon + **Naija Jollof** (no per-post author picker)

### Lead visual

- Cover from `mainImage` when set; else first image in body if present
- Prefer real food / place photography

### Body

- Readable column (~65–70ch), left-aligned, comfortable leading
- Portable Text: paragraphs, H2/H3, lists, links (underline + brand green), inline images with alt
- **Share:** “Share this article” + copy-link (social optional later)
- Soft “Order now” CTA can be a simple link in body — no custom CTA schema required in v1

### Footer

- **Related articles:** heading + count; auto by recency (exclude current); max 3–6
- Desktop: immersive B-lite cards; mobile: single column
- No cover → stacked card fallback

## Sanity org, project & branding

| Item | Value |
|------|--------|
| Organization | **Naija Jollof** |
| Project | New blog / content project under that org (name TBD at create time, e.g. `naija-jollof-web`) |
| Dataset | `production` (default) |
| Org icon | Upload NJ mark/icon so the org is recognizable in [Sanity Manage](https://www.sanity.io/manage) |
| Project icon | Same (or matching) icon on the project so the dashboard stays easy to scan |

**Asset source (repo):** prefer `public/brand/icon-512.png` or `public/brand/naija-jollof-mark.png` for Manage/Studio icons; site author avatar uses the same brand mark.

## Content model (Sanity) — keep it tiny

### Document: `post` only

| Field | Type | Notes |
|-------|------|--------|
| `title` | string | Required |
| `slug` | slug | Auto from title; unique |
| `mainImage` | image + alt | Optional but recommended for cards / OG |
| `body` | Portable Text | Required — text, headings, lists, links, images |
| `publishedAt` | datetime | Used for listing order + “Schedule” (publish later) |
| `seo` | object | `metaTitle`, `metaDescription`, `ogImage` — **auto-filled**, overridable |

**No** separate `author`, `category`, `blogSettings`, `keyFacts`, or manual `related` documents/fields in v1.

### Author (site only, not a Sanity doc)

- Always display **Naija Jollof**
- Avatar = brand icon/mark from `public/brand/`
- Not chosen or edited in Studio

### SEO auto-fill rules

| SEO field | Default |
|-----------|---------|
| `metaTitle` | `title` (truncated to a sensible length if needed) |
| `metaDescription` | Plain-text excerpt from start of `body` (~155 chars) |
| `ogImage` | `mainImage`, else first body image |

Studio: show SEO as a collapsed “SEO” group so it stays out of the way; values prefill when title/body change unless the editor has customized them (or use read-only computed fields + optional overrides — pick the simpler pattern in implementation).

### Scheduling

- Editors set `publishedAt` in the future to **schedule**
- Index / detail only show posts where `publishedAt <= now()` (and published, not draft)
- Prefer Sanity’s scheduled publishing where it fits; otherwise gate on `publishedAt` in GROQ

### Portable Text (v1 — basic)

- Blocks: normal, h2, h3, bullet, number
- Marks: strong, em, link
- Image block with required `alt`
- No custom blocks (no key-facts strip, tables, or CTA objects) unless we add them later

## Sanity architecture

```
repo/
├── studio/                 # Standalone Sanity Studio (Vite) — minimal desk
│   ├── sanity.config.ts    # Brand title/icon; hide unused plugins/tools
│   ├── schemaTypes/        # post only
│   └── static/             # Studio favicon / project icon assets
├── app/(storefront)/blog/  # Next.js routes
├── lib/sanity/             # client, live, queries, image helpers
└── components/features/blog/
```

### Studio UX principles

- Desk shows **Posts** only (clean structure; no cluttered default lists)
- Hide or omit tools editors don’t need (keep Studio focused on writing + scheduling)
- Project name + icon match **Naija Jollof** branding
- Field groups: **Content** (title, image, body, publish time) → **SEO** (collapsed)

### Integration choices

| Concern | Approach |
|---------|----------|
| Studio | Standalone `studio/` — not embedded in Next |
| Fetching | `next-sanity` + Live Content API (`defineLive`) preferred |
| Images | Sanity image pipeline + `next/image` |
| Types | Sanity TypeGen from schema + GROQ |
| Draft / preview | Draft Mode later if needed; v1 can ship published-only |
| CORS | Local + production storefront origins |
| Env | `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_READ_TOKEN` |

Menu / orders / Prisma stay the source of truth for commerce. Sanity is **content-only** for the blog.

## Components (frontend)

| Component | Role |
|-----------|------|
| `BlogIndexHero` | Eyebrow + headline |
| `BlogPostCardStacked` | Index / fallback card |
| `BlogPostCardImmersive` | Related footer card |
| `BlogPagination` | Prev / page / next |
| `BlogArticleHeader` | Date, title, fixed NJ author |
| `BlogPortableText` | Body renderer |
| `BlogShare` | Copy link |
| `BlogRelated` | Related grid |

## SEO (site)

- Per-post `metadata` from auto SEO fields with fallbacks
- Open Graph + Twitter from `ogImage` / cover
- Canonical `/blog/[slug]`
- Index listing: static title/description for v1

## Out of v1

- Category filter / category documents  
- Multi-author or editable author in Studio  
- Comments, search, newsletter  
- Key facts strip, custom table/CTA schema blocks  
- Dedicated category landings  
- Staff dashboard CMS UI (Studio is the editor)  
- Blog in mobile apps  
- Embedded Studio in Next  

## Success criteria

- Org + project show **Naija Jollof** icon in Sanity Manage  
- Editor opens Studio, sees a simple Posts desk, writes title + body, sets schedule, SEO is mostly automatic  
- Published (or due) posts appear on `/blog` without a code deploy  
- Every article shows **Naija Jollof** + brand icon as author  
- Index and article match storefront visual language  

## Open for implementation plan (non-blocking)

- Exact page size (default: **9** posts per page)
- Social share beyond copy-link (default: copy-link only)
- Exact Sanity project display name at create time
- Whether category filter returns in a later pass
