-- Merge Customer ↔ Diner and Order ↔ Delivery (Phase 1–2 schema)

CREATE TYPE "OrderSource" AS ENUM ('storefront', 'dashboard', 'whatsapp');

ALTER TABLE "User" ADD COLUMN "customerId" TEXT;
CREATE UNIQUE INDEX "User_customerId_key" ON "User"("customerId");

ALTER TABLE "CustomerAddress" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE "CustomerAddress" ALTER COLUMN "longitude" DROP NOT NULL;
ALTER TABLE "CustomerAddress" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "CustomerAddress_customerId_isPrimary_idx" ON "CustomerAddress"("customerId", "isPrimary");

ALTER TABLE "Order" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Order" ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'storefront';
CREATE INDEX "Order_storeId_source_idx" ON "Order"("storeId", "source");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt" DESC);

ALTER TABLE "Delivery" DROP COLUMN IF EXISTS "orderId";

-- Migrate UserAddress → CustomerAddress
DO $$
DECLARE
  r RECORD;
  cust_id TEXT;
  existing_phone TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'UserAddress'
  ) THEN
    FOR r IN
      SELECT
        a.id AS address_id,
        a."userId" AS user_id,
        a.line1,
        a.line2,
        a.city,
        a.province,
        a."postalCode" AS postal_code,
        a.country,
        a.latitude,
        a.longitude,
        a.formatted,
        a.label,
        a."isDefault" AS is_default,
        a."createdAt" AS created_at,
        a."updatedAt" AS updated_at,
        u."storeId" AS store_id,
        u.name AS user_name,
        u."phoneE164" AS user_phone,
        u."customerId" AS user_customer_id
      FROM "UserAddress" a
      INNER JOIN "User" u ON u.id = a."userId"
      WHERE u.role = 'DINER'
    LOOP
      cust_id := r.user_customer_id;

      IF cust_id IS NULL AND r.user_phone IS NOT NULL THEN
        SELECT cp."customerId" INTO cust_id
        FROM "CustomerPhone" cp
        WHERE cp."storeId" = r.store_id AND cp."phoneE164" = r.user_phone
        LIMIT 1;
      END IF;

      IF cust_id IS NULL THEN
        cust_id := 'c' || replace(gen_random_uuid()::text, '-', '');
        INSERT INTO "Customer" (id, "storeId", name, "createdAt", "updatedAt")
        VALUES (cust_id, r.store_id, r.user_name, NOW(), NOW());

        IF r.user_phone IS NOT NULL THEN
          SELECT cp."phoneE164" INTO existing_phone
          FROM "CustomerPhone" cp
          WHERE cp."storeId" = r.store_id AND cp."phoneE164" = r.user_phone
          LIMIT 1;

          IF existing_phone IS NULL THEN
            INSERT INTO "CustomerPhone" (id, "storeId", "customerId", "phoneE164", "isPrimary", "createdAt")
            VALUES (
              'c' || replace(gen_random_uuid()::text, '-', ''),
              r.store_id,
              cust_id,
              r.user_phone,
              true,
              NOW()
            );
          END IF;
        END IF;

        UPDATE "User" SET "customerId" = cust_id WHERE id = r.user_id AND "customerId" IS NULL;
      ELSIF r.user_customer_id IS NULL THEN
        UPDATE "User" SET "customerId" = cust_id WHERE id = r.user_id AND "customerId" IS NULL;
      END IF;

      INSERT INTO "CustomerAddress" (
        id, "customerId", line1, line2, city, province, "postalCode", country,
        latitude, longitude, formatted, label, "isPrimary", "createdAt", "updatedAt"
      )
      VALUES (
        'c' || replace(gen_random_uuid()::text, '-', ''),
        cust_id,
        r.line1,
        r.line2,
        r.city,
        r.province,
        r.postal_code,
        r.country,
        r.latitude,
        r.longitude,
        r.formatted,
        r.label,
        COALESCE(r.is_default, false),
        r.created_at,
        r.updated_at
      );
    END LOOP;

    DROP TABLE "UserAddress";
  END IF;
END $$;

ALTER TABLE "User"
  ADD CONSTRAINT "User_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
