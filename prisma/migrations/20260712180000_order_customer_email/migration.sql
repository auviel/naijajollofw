-- Persist checkout receipt email for order status notifications
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
