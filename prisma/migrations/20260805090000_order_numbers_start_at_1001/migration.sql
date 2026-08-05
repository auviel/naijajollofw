-- Start live / seeded stores at NJ-1001 (existing NJ-1…NJ-15 stay as-is).
ALTER TABLE "Store" ALTER COLUMN "nextOrderNumber" SET DEFAULT 1001;

UPDATE "Store"
SET "nextOrderNumber" = 1001
WHERE "nextOrderNumber" < 1001;
