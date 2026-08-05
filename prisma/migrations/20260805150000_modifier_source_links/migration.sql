-- AlterTable
ALTER TABLE "MenuModifierGroup" ADD COLUMN "sourceCategoryId" TEXT;

-- AlterTable
ALTER TABLE "MenuModifier" ADD COLUMN "sourceItemId" TEXT;

-- CreateIndex
CREATE INDEX "MenuModifierGroup_sourceCategoryId_idx" ON "MenuModifierGroup"("sourceCategoryId");

-- CreateIndex
CREATE INDEX "MenuModifier_sourceItemId_idx" ON "MenuModifier"("sourceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuModifier_groupId_sourceItemId_key" ON "MenuModifier"("groupId", "sourceItemId");

-- AddForeignKey
ALTER TABLE "MenuModifierGroup" ADD CONSTRAINT "MenuModifierGroup_sourceCategoryId_fkey" FOREIGN KEY ("sourceCategoryId") REFERENCES "MenuCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuModifier" ADD CONSTRAINT "MenuModifier_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
