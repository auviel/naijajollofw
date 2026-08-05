-- Lifetime order numbers (NJ-1084) + daily kitchen tickets (#12)

ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "orderNumberPrefix" TEXT NOT NULL DEFAULT 'NJ';
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "nextOrderNumber" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "displayNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "dayTicket" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "dayTicketDate" DATE;

CREATE TABLE IF NOT EXISTS "StoreDayTicket" (
    "storeId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "nextTicket" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StoreDayTicket_pkey" PRIMARY KEY ("storeId", "localDate")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StoreDayTicket_storeId_fkey'
  ) THEN
    ALTER TABLE "StoreDayTicket"
      ADD CONSTRAINT "StoreDayTicket_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill lifetime numbers per store (skip unpaid drafts).
WITH numbered AS (
  SELECT
    id,
    "storeId",
    ROW_NUMBER() OVER (
      PARTITION BY "storeId"
      ORDER BY COALESCE("placedAt", "createdAt") ASC, id ASC
    ) AS seq
  FROM "Order"
  WHERE status <> 'pending_payment'
    AND "displayNumber" IS NULL
)
UPDATE "Order" o
SET "displayNumber" = s."orderNumberPrefix" || '-' || numbered.seq::text
FROM numbered
JOIN "Store" s ON s.id = numbered."storeId"
WHERE o.id = numbered.id;

UPDATE "Store" s
SET "nextOrderNumber" = COALESCE((
  SELECT MAX(
    NULLIF(substring(o."displayNumber" from '[0-9]+$'), '')::int
  )
  FROM "Order" o
  WHERE o."storeId" = s.id
    AND o."displayNumber" IS NOT NULL
), 0) + 1;

-- Backfill daily tickets in America/Toronto (STORE_TIMEZONE default).
WITH day_numbered AS (
  SELECT
    id,
    (timezone('America/Toronto', COALESCE("placedAt", "createdAt")))::date AS local_date,
    ROW_NUMBER() OVER (
      PARTITION BY "storeId", (timezone('America/Toronto', COALESCE("placedAt", "createdAt")))::date
      ORDER BY COALESCE("placedAt", "createdAt") ASC, id ASC
    ) AS ticket
  FROM "Order"
  WHERE status <> 'pending_payment'
    AND "dayTicket" IS NULL
)
UPDATE "Order" o
SET
  "dayTicket" = day_numbered.ticket,
  "dayTicketDate" = day_numbered.local_date
FROM day_numbered
WHERE o.id = day_numbered.id;

INSERT INTO "StoreDayTicket" ("storeId", "localDate", "nextTicket")
SELECT "storeId", "dayTicketDate", MAX("dayTicket") + 1
FROM "Order"
WHERE "dayTicketDate" IS NOT NULL AND "dayTicket" IS NOT NULL
GROUP BY "storeId", "dayTicketDate"
ON CONFLICT ("storeId", "localDate") DO UPDATE
SET "nextTicket" = GREATEST("StoreDayTicket"."nextTicket", EXCLUDED."nextTicket");

CREATE UNIQUE INDEX IF NOT EXISTS "Order_storeId_displayNumber_key"
  ON "Order"("storeId", "displayNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_storeId_dayTicketDate_dayTicket_key"
  ON "Order"("storeId", "dayTicketDate", "dayTicket");
