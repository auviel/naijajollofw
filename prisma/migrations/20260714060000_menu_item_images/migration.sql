-- CreateTable
CREATE TABLE "MenuItemImage" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "objectKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItemImage_itemId_sortOrder_idx" ON "MenuItemImage"("itemId", "sortOrder");

-- AddForeignKey
ALTER TABLE "MenuItemImage" ADD CONSTRAINT "MenuItemImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing cover images as gallery rows (ids generated in app-safe cuid style).
INSERT INTO "MenuItemImage" ("id", "itemId", "url", "objectKey", "sortOrder", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || "MenuItem"."id"),
  "MenuItem"."id",
  "MenuItem"."imageUrl",
  NULL,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "MenuItem"
WHERE "MenuItem"."imageUrl" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "MenuItemImage" mi WHERE mi."itemId" = "MenuItem"."id"
  );
