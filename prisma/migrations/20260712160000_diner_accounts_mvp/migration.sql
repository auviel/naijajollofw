-- Diner accounts MVP
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DINER';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneE164" TEXT;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE INDEX IF NOT EXISTS "User_storeId_role_idx" ON "User"("storeId", "role");

CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_userId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
