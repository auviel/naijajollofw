import { requireStoreManager } from "@/lib/auth/session";
import { menuRepository } from "@/lib/db/repositories/menu.repository";

export async function listMenuCategories() {
  const user = await requireStoreManager();
  return menuRepository.listCategoriesForStore(user.storeId);
}
