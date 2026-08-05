-- CreateTable
CREATE TABLE "MenuItemCategory" (
    "itemId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuItemCategory_pkey" PRIMARY KEY ("itemId","categoryId")
);

-- CreateIndex
CREATE INDEX "MenuItemCategory_categoryId_sortOrder_idx" ON "MenuItemCategory"("categoryId", "sortOrder");

-- AddForeignKey
ALTER TABLE "MenuItemCategory" ADD CONSTRAINT "MenuItemCategory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemCategory" ADD CONSTRAINT "MenuItemCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
