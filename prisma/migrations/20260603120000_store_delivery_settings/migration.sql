-- AlterTable
ALTER TABLE "Store" ADD COLUMN "enabledUberDirect" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Store" ADD COLUMN "enabledDoorDashDrive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Store" ADD COLUMN "doordashExternalStoreId" TEXT;
