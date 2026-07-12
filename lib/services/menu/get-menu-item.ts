import { requireStoreManager } from "@/lib/auth/session";
import {
  mapMenuItemToDetail,
  menuRepository,
} from "@/lib/db/repositories/menu.repository";
import type { MenuItemDetail } from "@/lib/domain/menu/types";
import { AppError } from "@/lib/utils/errors";

export async function getMenuItem(id: string): Promise<MenuItemDetail> {
  const user = await requireStoreManager();
  const item = await menuRepository.findItemByIdAndStoreId(id, user.storeId);

  if (!item) {
    throw new AppError("NOT_FOUND", "Menu item not found", 404);
  }

  return mapMenuItemToDetail(item);
}
