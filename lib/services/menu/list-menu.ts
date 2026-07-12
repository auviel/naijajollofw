import { requireStoreManager } from "@/lib/auth/session";
import { menuRepository } from "@/lib/db/repositories/menu.repository";
import type { MenuCatalog } from "@/lib/domain/menu/types";

export async function listMenuCatalog(): Promise<MenuCatalog> {
  const user = await requireStoreManager();
  return menuRepository.getCatalogForStore(user.storeId);
}
