import { requireStoreManager } from "@/lib/auth/session";
import { menuRepository } from "@/lib/db/repositories/menu.repository";
import { updateCategorySchema } from "@/lib/domain/menu/validation";
import { AppError } from "@/lib/utils/errors";

export async function updateMenuCategory(id: string, input: unknown) {
  const user = await requireStoreManager();
  const parsed = updateCategorySchema.parse(input);

  const category = await menuRepository.updateCategory(id, user.storeId, {
    name: parsed.name,
    sortOrder: parsed.sortOrder,
    active: parsed.active,
  });

  if (!category) {
    throw new AppError("NOT_FOUND", "Category not found", 404);
  }

  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    active: category.active,
  };
}
