/*
  Warnings:

  - You are about to drop the `UserAddress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserAddress" DROP CONSTRAINT "UserAddress_userId_fkey";

-- AlterTable
ALTER TABLE "CustomerAddress" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "prepMinutes" INTEGER NOT NULL DEFAULT 15;

-- DropTable
DROP TABLE "UserAddress";

-- CreateTable
CREATE TABLE "StoreHours" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "openMinute" INTEGER,
    "closeMinute" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreHours_storeId_idx" ON "StoreHours"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreHours_storeId_dayOfWeek_key" ON "StoreHours"("storeId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "StoreHours" ADD CONSTRAINT "StoreHours_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
