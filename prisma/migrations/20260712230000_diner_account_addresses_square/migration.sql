-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "squareCustomerId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'CA',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "formatted" TEXT NOT NULL,
    "label" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_squareCustomerId_key" ON "User"("squareCustomerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserAddress_userId_idx" ON "UserAddress"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserAddress_userId_isDefault_idx" ON "UserAddress"("userId", "isDefault");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
