-- Rename Stripe placeholder to Square payment id (restaurant already uses Square).
ALTER TABLE "Order" RENAME COLUMN "stripePaymentIntentId" TO "squarePaymentId";

ALTER INDEX "Order_stripePaymentIntentId_key" RENAME TO "Order_squarePaymentId_key";
