# Naija Jollof Sanity Studio

Minimal Studio for the storefront blog. **Posts only.**

**Live:** https://naija-jollof.sanity.studio/

## Local

```bash
cd studio
npm install
npm run dev
```

Opens at http://localhost:3333

Project: `c7b8chvo` · Dataset: `production` · Org: Naija Jollof

## Deploy (push to Sanity hosting)

```bash
cd studio
npm run deploy
# same as: npx sanity deploy
```

First deploy created hostname `naija-jollof`. Later deploys reuse `appId` in `sanity.cli.ts`.

## Editing

- Create a **Post** with title, body, optional main image
- **Publish at** — future datetime schedules the post (site only shows `publishedAt <= now()`)
- **SEO** group is collapsed; leave blank to auto-fill from title/body on the site

Author is always **Naija Jollof** on the website (not editable here).
