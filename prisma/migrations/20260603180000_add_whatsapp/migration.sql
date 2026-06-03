-- CreateTable
CREATE TABLE "WhatsAppStaffPhone" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppStaffPhone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConversation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "staffPhoneE164" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'idle',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Store" ADD COLUMN "whatsappPhoneNumberId" TEXT;

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'dashboard';

-- CreateIndex
CREATE INDEX "WhatsAppStaffPhone_storeId_idx" ON "WhatsAppStaffPhone"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppStaffPhone_storeId_phoneE164_key" ON "WhatsAppStaffPhone"("storeId", "phoneE164");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_storeId_staffPhoneE164_idx" ON "WhatsAppConversation"("storeId", "staffPhoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversation_storeId_staffPhoneE164_key" ON "WhatsAppConversation"("storeId", "staffPhoneE164");

-- AddForeignKey
ALTER TABLE "WhatsAppStaffPhone" ADD CONSTRAINT "WhatsAppStaffPhone_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
