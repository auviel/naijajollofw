import { requireStoreManager } from "@/lib/auth/session";
import { menuRepository } from "@/lib/db/repositories/menu.repository";
import { createCategorySchema } from "@/lib/domain/menu/validation";
import { logger } from "@/lib/utils/logger";

export async function createMenuCategory(input: unknown) {
  const user = await requireStoreManager();
  const parsed = createCategorySchema.parse(input);
  const sortOrder =
    parsed.sortOrder ?? (await menuRepository.nextCategorySortOrder(user.storeId));

  const category = await menuRepository.createCategory({
    storeId: user.storeId,
    name: parsed.name,
    sortOrder,
  });

  logger.info("menu.category.created", {
    categoryId: category.id,
    storeId: user.storeId,
  });

  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    active: category.active,
  };
}
