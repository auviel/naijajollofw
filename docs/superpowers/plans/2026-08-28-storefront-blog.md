# Storefront Blog (Sanity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a simple Naija Jollof storefront blog (`/blog`, `/blog/[slug]`) backed by a minimal Sanity Studio (`post` + schedule + auto SEO), with fixed brand author and NJ icons on the Sanity org/project.

**Architecture:** Standalone `studio/` (Vite) under the **Naija Jollof** Sanity org holds a single `post` schema. The Next.js app fetches published posts via `next-sanity` + Live Content API, renders stacked cards on the index and immersive related cards on the article page, and always shows **Naija Jollof** + brand mark as author. Commerce stays in Prisma; Sanity is content-only.

**Tech Stack:** Next.js App Router (existing), `next-sanity`, `@sanity/image-url`, `@portabletext/react`, Sanity Studio v3+, Vitest, existing storefront tokens/`STYLING.md`.

**Spec:** `docs/superpowers/specs/2026-08-28-storefront-blog-design.md`

## Global Constraints

- Sanity organization display name: **Naija Jollof**
- Studio: standalone `studio/` — do **not** embed at `/studio` in Next
- Document types in v1: **`post` only** (no author/category/settings docs)
- Author on site: always **Naija Jollof** + `public/brand/naija-jollof-mark.png` (or `icon-512.png`)
- Post fields: `title`, `slug`, `mainImage`, `body`, `publishedAt`, `seo` (auto from title/body)
- Index: stacked cards; no category filter in v1
- Related: immersive cards when image exists; auto by recency; page size **9**
- Share: copy-link only
- Dataset default: `production`
- Brand UI tokens: existing `--accent` / `--link` / storefront layout — no Uber-blue chrome
- Do not commit secrets (`.env`); document env keys in `.env.example` only

---

## File map

| Path | Responsibility |
|------|----------------|
| `studio/` | Standalone Sanity Studio app |
| `studio/sanity.config.ts` | Project config, brand title, minimal plugins |
| `studio/schemaTypes/post.ts` | `post` document schema |
| `studio/schemaTypes/index.ts` | Schema export |
| `studio/static/` | Studio favicon / brand icon copy |
| `lib/sanity/env.ts` | Public Sanity env helpers |
| `lib/sanity/client.ts` | Sanity client |
| `lib/sanity/live.ts` | `defineLive` / `sanityFetch` / `SanityLive` |
| `lib/sanity/image.ts` | Image URL builder for `next/image` |
| `lib/sanity/queries.ts` | GROQ queries |
| `lib/sanity/seo.ts` | Auto meta title/description helpers (pure) |
| `lib/sanity/types.ts` | Lightweight post types used by UI (until TypeGen) |
| `components/features/blog/*` | Blog UI components |
| `app/(storefront)/blog/page.tsx` | Index |
| `app/(storefront)/blog/[slug]/page.tsx` | Article |
| `app/layout.tsx` | Mount `<SanityLive />` when configured |
| `next.config.ts` | Allow `cdn.sanity.io` images |
| `.env.example` | Document Sanity env vars |
| `tests/unit/blog-seo.test.ts` | SEO helper tests |

---

### Task 1: Create Sanity project under Naija Jollof + brand icons

**Files:**
- Modify: `.env` (local only — never commit)
- Modify: `.env.example`
- Manual: Sanity Manage UI for org/project icons

**Interfaces:**
- Produces: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET=production`, `SANITY_API_READ_TOKEN` available to later tasks

- [ ] **Step 1: Resolve organization id**

Via Sanity MCP `list_organizations`, find the org whose name is **Naija Jollof**. Record its `id`.

If missing, create/rename the org in [Sanity Manage](https://www.sanity.io/manage) to **Naija Jollof** first, then re-list.

- [ ] **Step 2: Create project**

Via Sanity MCP `create_project`:

- `displayName`: `Naija Jollof Web` (or `Naija Jollof Blog` if preferred)
- `organizationId`: id from Step 1
- `corsOrigin`: `http://localhost:3000`
- `allowCredentials`: `true`

Save returned `projectId` and any API token.

Also add CORS for production storefront origin(s) later via `npx sanity cors add <url> --credentials` from `studio/`.

- [ ] **Step 3: Upload NJ icons in Manage**

In Sanity Manage:

1. Organization **Naija Jollof** → settings → upload icon from `public/brand/icon-512.png` (or `naija-jollof-mark.png`)
2. New project → settings → upload the **same** icon

Goal: org + project are visually obvious in the dashboard.

- [ ] **Step 4: Write env keys**

Append to `.env` (do not commit):

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=<projectId>
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01
SANITY_API_READ_TOKEN=<viewer-or-read-token>
```

Update `.env.example` with the same keys and empty/placeholder values + one-line comments.

- [ ] **Step 5: Commit env example only**

```bash
git add .env.example
git commit -m "$(cat <<'EOF'
chore: document Sanity env vars for storefront blog

EOF
)"
```

---

### Task 2: Scaffold minimal standalone Studio (`post` only)

**Files:**
- Create: `studio/package.json`, `studio/sanity.config.ts`, `studio/sanity.cli.ts`, `studio/tsconfig.json`, `studio/schemaTypes/post.ts`, `studio/schemaTypes/index.ts`, `studio/static/favicon.png` (copy from brand)

**Interfaces:**
- Consumes: project id + dataset from Task 1
- Produces: Studio runnable at `http://localhost:3333` with a single Posts desk

- [ ] **Step 1: Initialize studio folder**

From repo root (not inside `app/`):

```bash
npm create sanity@latest -- --project <projectId> --dataset production --template clean --typescript --output-path studio
```

If interactive prompts appear, choose: existing project, TypeScript, clean template, no embedded app.

Copy brand icon into Studio static assets:

```bash
cp "public/brand/icon-512.png" "studio/static/favicon.png"
```

- [ ] **Step 2: Replace schema with minimal `post`**

`studio/schemaTypes/post.ts`:

```ts
import { DocumentTextIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

function plainTextFromBlocks(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter((b): b is { _type: string; children?: { text?: string }[] } =>
      Boolean(b && typeof b === "object" && (b as { _type?: string })._type === "block"),
    )
    .map((b) => (b.children ?? []).map((c) => c.text ?? "").join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  icon: DocumentTextIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "mainImage",
      title: "Main image",
      type: "image",
      group: "content",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alt text",
          validation: (r) => r.required(),
        }),
      ],
    }),
    defineField({
      name: "publishedAt",
      title: "Publish at",
      description: "Set a future time to schedule. Past/now = live when published.",
      type: "datetime",
      group: "content",
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      group: "content",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "Heading 2", value: "h2" },
            { title: "Heading 3", value: "h3" },
          ],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  defineField({
                    name: "href",
                    type: "url",
                    title: "URL",
                    validation: (r) =>
                      r.uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }),
                  }),
                ],
              },
            ],
          },
        }),
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              type: "string",
              title: "Alt text",
              validation: (r) => r.required(),
            }),
          ],
        }),
      ],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      group: "seo",
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: "metaTitle",
          title: "Meta title",
          type: "string",
          description: "Defaults to the post title if empty.",
        }),
        defineField({
          name: "metaDescription",
          title: "Meta description",
          type: "text",
          rows: 3,
          description: "Defaults to the start of the body if empty.",
        }),
        defineField({
          name: "ogImage",
          title: "Social image",
          type: "image",
          description: "Defaults to the main image if empty.",
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "mainImage",
      publishedAt: "publishedAt",
    },
    prepare({ title, media, publishedAt }) {
      return {
        title: title ?? "Untitled",
        subtitle: publishedAt
          ? new Date(publishedAt).toLocaleString("en-CA")
          : "No schedule",
        media,
      };
    },
  },
});

export { plainTextFromBlocks };
```

`studio/schemaTypes/index.ts`:

```ts
import { post } from "./post";

export const schemaTypes = [post];
```

- [ ] **Step 3: Minimal `sanity.config.ts`**

Keep Studio focused — Posts only, NJ title, favicon:

```ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!;
const dataset = process.env.SANITY_STUDIO_DATASET || "production";

export default defineConfig({
  name: "naija-jollof",
  title: "Naija Jollof",
  projectId,
  dataset,
  icon: undefined, // favicon via static; set project icon in Manage
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Content")
          .items([S.documentTypeListItem("post").title("Posts")]),
    }),
  ],
  schema: { types: schemaTypes },
});
```

Wire `studio/.env` (gitignored) with `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET`.

Do **not** add Vision, Assist, or other plugins unless needed later.

- [ ] **Step 4: Run Studio**

```bash
cd studio && npm install && npm run dev
```

Expected: Studio at `http://localhost:3333`, desk shows **Posts** only.

Create one draft post titled `Welcome to the kitchen` with body text + `publishedAt` = now, publish it.

- [ ] **Step 5: Commit**

```bash
git add studio
git commit -m "$(cat <<'EOF'
feat: add minimal Sanity Studio for blog posts

EOF
)"
```

---

### Task 3: Next.js Sanity client, images, and SEO helpers

**Files:**
- Create: `lib/sanity/env.ts`, `lib/sanity/client.ts`, `lib/sanity/live.ts`, `lib/sanity/image.ts`, `lib/sanity/seo.ts`, `lib/sanity/types.ts`, `lib/sanity/queries.ts`
- Modify: `next.config.ts` (Sanity CDN remote pattern)
- Modify: `package.json` (deps)
- Test: `tests/unit/blog-seo.test.ts`

**Interfaces:**
- Produces:
  - `getSanityEnv(): { projectId: string; dataset: string; apiVersion: string }`
  - `isSanityConfigured(): boolean`
  - `client` — Sanity client
  - `{ sanityFetch, SanityLive }` from `defineLive`
  - `urlForImage(source)` — image builder
  - `defaultMetaTitle(title: string): string`
  - `defaultMetaDescription(plainBody: string, maxLength?: number): string`
  - `plainTextFromPortableText(blocks: unknown): string`
  - Queries: `POSTS_PAGE_QUERY`, `POST_BY_SLUG_QUERY`, `RELATED_POSTS_QUERY`

- [ ] **Step 1: Install deps at repo root**

```bash
npm install next-sanity @sanity/image-url @portabletext/react
```

- [ ] **Step 2: Write failing SEO tests**

`tests/unit/blog-seo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  defaultMetaDescription,
  defaultMetaTitle,
  plainTextFromPortableText,
} from "@/lib/sanity/seo";

describe("blog seo helpers", () => {
  it("uses title as meta title", () => {
    expect(defaultMetaTitle("Smoky party jollof")).toBe("Smoky party jollof");
  });

  it("truncates long titles with ellipsis under 60 chars", () => {
    const long = "A".repeat(80);
    const result = defaultMetaTitle(long);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith("…")).toBe(true);
  });

  it("builds description from portable text and truncates ~155", () => {
    const blocks = [
      {
        _type: "block",
        children: [{ _type: "span", text: "Hello kitchen. ".repeat(30) }],
      },
    ];
    const plain = plainTextFromPortableText(blocks);
    const desc = defaultMetaDescription(plain);
    expect(desc.length).toBeLessThanOrEqual(160);
    expect(desc.length).toBeGreaterThan(40);
  });
});
```

- [ ] **Step 3: Run tests — expect fail**

```bash
npm run test -- tests/unit/blog-seo.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement `lib/sanity/seo.ts`**

```ts
export function plainTextFromPortableText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter(
      (b): b is { _type: string; children?: { text?: string }[] } =>
        Boolean(
          b &&
            typeof b === "object" &&
            (b as { _type?: string })._type === "block",
        ),
    )
    .map((b) => (b.children ?? []).map((c) => c.text ?? "").join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function defaultMetaTitle(title: string, max = 60): string {
  const t = title.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function defaultMetaDescription(plainBody: string, max = 155): string {
  const t = plainBody.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}
```

- [ ] **Step 5: Implement env, client, live, image, types, queries**

`lib/sanity/env.ts`:

```ts
export function getSanityEnv() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() ?? "";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const apiVersion =
    process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2025-01-01";
  return { projectId, dataset, apiVersion };
}

export function isSanityConfigured(): boolean {
  return Boolean(getSanityEnv().projectId);
}
```

`lib/sanity/client.ts`:

```ts
import { createClient } from "next-sanity";
import { getSanityEnv } from "./env";

const { projectId, dataset, apiVersion } = getSanityEnv();

export const client = createClient({
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  useCdn: true,
});
```

`lib/sanity/live.ts`:

```ts
import { defineLive } from "next-sanity/live";
import { client } from "./client";
import { getSanityEnv } from "./env";

const { apiVersion } = getSanityEnv();

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({ apiVersion }),
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: process.env.SANITY_API_READ_TOKEN,
});
```

`lib/sanity/image.ts`:

```ts
import createImageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";
import { getSanityEnv } from "./env";

const { projectId, dataset } = getSanityEnv();
const builder = createImageUrlBuilder({ projectId, dataset });

export function urlForImage(source: SanityImageSource) {
  return builder.image(source);
}
```

`lib/sanity/types.ts`:

```ts
export type SanityImage = {
  asset?: { _ref?: string; _id?: string; url?: string };
  alt?: string;
} | null;

export type BlogPostListItem = {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string;
  mainImage: SanityImage;
  excerpt: string;
};

export type BlogPostDetail = BlogPostListItem & {
  body: unknown[];
  seo: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImage?: SanityImage;
  } | null;
};
```

`lib/sanity/queries.ts`:

```ts
import { defineQuery } from "next-sanity";

const postCardFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  mainImage,
  "excerpt": pt::text(body)[0..180]
`;

export const POSTS_PAGE_QUERY = defineQuery(`{
  "total": count(*[_type == "post" && defined(slug.current) && publishedAt <= now()]),
  "posts": *[_type == "post" && defined(slug.current) && publishedAt <= now()]
    | order(publishedAt desc) [$start...$end] {
      ${postCardFields}
    }
}`);

export const POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug && publishedAt <= now()][0] {
    ${postCardFields},
    body,
    seo
  }
`);

export const RELATED_POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current) && publishedAt <= now() && slug.current != $slug]
    | order(publishedAt desc) [0...$limit] {
      ${postCardFields}
    }
`);

export const POST_SLUGS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current) && publishedAt <= now()].slug.current
`);
```

- [ ] **Step 6: Allow Sanity images in `next.config.ts`**

Add to `images.remotePatterns` (merge with existing `r2RemotePatterns()`):

```ts
{
  protocol: "https",
  hostname: "cdn.sanity.io",
  pathname: "/images/**",
},
```

- [ ] **Step 7: Re-run SEO tests**

```bash
npm run test -- tests/unit/blog-seo.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add lib/sanity tests/unit/blog-seo.test.ts next.config.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: wire Sanity client, queries, and blog SEO helpers

EOF
)"
```

---

### Task 4: Blog UI components

**Files:**
- Create:
  - `components/features/blog/blog-index-hero.tsx`
  - `components/features/blog/blog-post-card-stacked.tsx`
  - `components/features/blog/blog-post-card-immersive.tsx`
  - `components/features/blog/blog-pagination.tsx`
  - `components/features/blog/blog-article-header.tsx`
  - `components/features/blog/blog-portable-text.tsx`
  - `components/features/blog/blog-share.tsx`
  - `components/features/blog/blog-related.tsx`
  - `components/features/blog/blog-cover-image.tsx`

**Interfaces:**
- Consumes: `BlogPostListItem`, `BlogPostDetail`, `urlForImage`
- Produces: presentational components listed above (no data fetching)

- [ ] **Step 1: Cover helper + stacked card**

`blog-cover-image.tsx` — `next/image` when URL exists; else brand-wash placeholder (`rounded-2xl`, accent-subtle gradient).

`blog-post-card-stacked.tsx` — link to `/blog/[slug]`; image → title (2-line clamp, `font-display`) → date (`en-CA`); whole card clickable; hover underline on title.

- [ ] **Step 2: Immersive related card**

Full-bleed image, bottom gradient, white title + date; if no image, render stacked card instead.

- [ ] **Step 3: Hero, pagination, article header, share, related, portable text**

- `BlogIndexHero`: eyebrow `Blog` + headline e.g. `Recipes, kitchen stories & Waterloo updates`
- `BlogPagination`: `Prev` / `Page {page} of {totalPages}` / `Next` using query `?page=`
- `BlogArticleHeader`: date, title, fixed author row with `/brand/naija-jollof-mark.png` + **Naija Jollof**
- `BlogShare`: client button that copies `window.location.href` and shows brief “Copied”
- `BlogRelated`: heading `Related articles` + count + grid of immersive cards
- `BlogPortableText`: `@portabletext/react` with NJ typography (prose-like classes using tokens), image blocks via `urlForImage`

Keep styles aligned with storefront (`text-foreground`, `text-text-secondary`, `rounded-2xl`, no Uber blue pills).

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: PASS for new files (fix any typed gaps).

- [ ] **Step 5: Commit**

```bash
git add components/features/blog
git commit -m "$(cat <<'EOF'
feat: add storefront blog UI components

EOF
)"
```

---

### Task 5: Blog routes + Live mounting

**Files:**
- Modify: `app/(storefront)/blog/page.tsx`
- Create: `app/(storefront)/blog/[slug]/page.tsx`
- Modify: `app/layout.tsx` (conditional `<SanityLive />`)

**Interfaces:**
- Consumes: `sanityFetch`, queries, blog components, `isSanityConfigured`
- Produces: working `/blog` and `/blog/[slug]`

- [ ] **Step 1: Index page**

Replace placeholder `app/(storefront)/blog/page.tsx`:

- `searchParams.page` (default 1), page size `9`
- If `!isSanityConfigured()`, keep a calm empty state (“Blog coming soon”) + link to `/#menu`
- Else `sanityFetch` `POSTS_PAGE_QUERY` with `$start` / `$end`
- Render hero, `All articles` + count, stacked grid, pagination
- Metadata: title `Blog`, description from existing placeholder copy

- [ ] **Step 2: Article page**

`app/(storefront)/blog/[slug]/page.tsx`:

- Fetch `POST_BY_SLUG_QUERY`; `notFound()` if missing
- `generateMetadata`: use `seo.metaTitle` || `defaultMetaTitle(title)`; description from `seo.metaDescription` || `defaultMetaDescription(plainTextFromPortableText(body) || excerpt)`; OG from `seo.ogImage` || `mainImage`
- Layout: header → optional cover → portable text → share → related (`RELATED_POSTS_QUERY` limit 3)

- [ ] **Step 3: Mount Live**

In `app/layout.tsx`, after children, if `isSanityConfigured()` render `<SanityLive />` from `@/lib/sanity/live`.

- [ ] **Step 4: Manual smoke**

```bash
npm run dev
# Studio: cd studio && npm run dev
```

Check:

1. `/blog` lists the sample post  
2. Click through to `/blog/<slug>` — author shows Naija Jollof + mark  
3. Copy link works  
4. Future `publishedAt` post does **not** appear  
5. Mobile width: single-column cards  

- [ ] **Step 5: Commit**

```bash
git add app/(storefront)/blog app/layout.tsx
git commit -m "$(cat <<'EOF'
feat: ship storefront blog index and article pages

EOF
)"
```

---

### Task 6: Polish + docs touch-up

**Files:**
- Modify: `docs/superpowers/specs/2026-08-28-storefront-blog-design.md` status already Approved
- Optional: short `studio/README.md` with `npm run dev` + env keys

- [ ] **Step 1: Studio README**

Document: install, `SANITY_STUDIO_PROJECT_ID`, run on `:3333`, Posts-only desk, schedule via `publishedAt`.

- [ ] **Step 2: Lint + tests**

```bash
npm run lint && npm run typecheck && npm run test -- tests/unit/blog-seo.test.ts
```

Expected: all PASS

- [ ] **Step 3: Final commit**

```bash
git add studio/README.md
git commit -m "$(cat <<'EOF'
docs: add Sanity Studio runbook for NJ blog

EOF
)"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Org Naija Jollof + icons | Task 1 |
| Standalone Studio, post only | Task 2 |
| Schedule via `publishedAt` | Task 2 + queries Task 3 |
| Auto SEO | Task 2 fields + Task 3 helpers + Task 5 metadata |
| Fixed author NJ + icon | Task 4 header |
| Index stacked cards, no filter | Task 4–5 |
| Related immersive + recency | Task 4–5 |
| `cdn.sanity.io` images | Task 3 |
| Out of v1 (categories, etc.) | Not implemented — intentional |

## Placeholder / consistency notes

- GROQ excerpt uses `pt::text(body)` — if TypeGen later complains, keep string projection as-is.
- `defineLive` import path follows current `next-sanity/live`; if install version differs, align to that package’s docs.
- Page size locked at **9** in index route.

---
