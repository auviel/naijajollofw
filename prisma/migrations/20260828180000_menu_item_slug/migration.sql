-- Add readable public slugs for menu items (unique per store).

ALTER TABLE "MenuItem" ADD COLUMN "slug" TEXT;

-- Derive a URL-safe base from the name.
UPDATE "MenuItem"
SET "slug" = trim(
  both '-' FROM lower(
    regexp_replace(
      regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'),
      '-{2,}',
      '-',
      'g'
    )
  )
);

UPDATE "MenuItem"
SET "slug" = 'item'
WHERE "slug" IS NULL OR "slug" = '';

-- Disambiguate collisions within a store: first keeps base, rest get -2, -3, …
WITH ranked AS (
  SELECT
    "id",
    "slug",
    ROW_NUMBER() OVER (
      PARTITION BY "storeId", "slug"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "MenuItem"
)
UPDATE "MenuItem" AS m
SET "slug" = ranked."slug" || '-' || ranked.rn
FROM ranked
WHERE m."id" = ranked."id"
  AND ranked.rn > 1;

ALTER TABLE "MenuItem" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "MenuItem_storeId_slug_key" ON "MenuItem"("storeId", "slug");
