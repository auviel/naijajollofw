import { requireStoreManager } from "@/lib/auth/session";
import { menuRepository } from "@/lib/db/repositories/menu.repository";

export async function listMenuCategories() {
  const user = await requireStoreManager();
  return menuRepository.listCategoriesForStore(user.storeId);
}

export async function getMenuItemFormOptions() {
  const user = await requireStoreManager();
  const [categories, pickerItems] = await Promise.all([
    menuRepository.listCategoriesForStore(user.storeId),
    menuRepository.listPickerItemsForStore(user.storeId),
  ]);
  return { categories, pickerItems };
}
