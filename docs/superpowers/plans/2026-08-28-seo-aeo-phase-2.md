# SEO / AEO Phase 2 — Implementation Plan

**Date:** 2026-08-28  
**Status:** Complete  
**Depends on:** Pass 1 (robots, sitemap, JSON-LD, llms.txt, noindex)

## Goal

Close remaining local visibility and agent-discoverability gaps so the storefront is production-ready for SEO, AEO, and AI grounding without manual HTML work.

## Checklist

### Pass 1 (crawl + schema foundation)
- [x] `app/robots.ts` — disallow private routes, sitemap line
- [x] `app/sitemap.ts` — home, hours, blog, menu items, legal
- [x] `app/llms.txt/route.ts` — AI digest
- [x] JSON-LD: Restaurant, FAQ, Product, BlogPosting, BreadcrumbList
- [x] `privatePageMetadata` on account, cart, checkout, auth, dashboard
- [x] Unit tests (`tests/unit/seo-json-ld.test.ts`)

### Pass 2 (entity graph + agent feeds)
- [x] Organization + WebSite + SearchAction on storefront layout
- [x] Linked `@id` graph across schema types
- [x] `/menu.json` public catalog feed
- [x] Blog index schema, FAQ on `/hours`, canonical metadata everywhere public
- [x] `/chat` in sitemap + metadata

### Phase 2 completion (local trust + ops)
- [x] Google reviews config (`lib/integrations/google/places/*`)
- [x] Hero rating badge + reviews strip above FAQ
- [x] `AggregateRating` in Restaurant JSON-LD when rating available
- [x] Graceful fallback: “Read Google reviews” link when no API/override
- [x] `GOOGLE_SITE_VERIFICATION` support in root metadata
- [x] `.env.example` documented for Places API or manual override

## Env to set in production

**Live rating (pick one):**

1. **Places API (recommended):** `GOOGLE_PLACES_API_KEY` — auto text-search by address; optional `NEXT_PUBLIC_GOOGLE_PLACE_ID` to skip search
2. **Manual override:** `GOOGLE_PLACE_RATING` + `GOOGLE_PLACE_REVIEW_COUNT` until API is enabled

**Search Console:** `GOOGLE_SITE_VERIFICATION` — HTML tag from Search Console

## Post-deploy (manual)

1. Submit `https://naijajollofw.ca/sitemap.xml` in Search Console
2. Rich Results Test on `/` and an item page
3. Confirm Cloudflare managed `robots.txt` does not strip Next.js rules
4. Verify `/menu.json` and `/llms.txt` return 200

## Out of scope

- Google Places review text cards (v2 styled cache)
- Third-party review widget JS embed (CSP-heavy)
- RSS feed
