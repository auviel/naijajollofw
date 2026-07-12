import {
  mapMenuItemToDetail,
  menuRepository,
} from "@/lib/db/repositories/menu.repository";
import {
  mapStoreToProfile,
  storeRepository,
} from "@/lib/db/repositories/store.repository";
import type { MenuCatalog, MenuItemDetail } from "@/lib/domain/menu/types";
import type { StoreProfile } from "@/lib/domain/store/types";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";
import { AppError } from "@/lib/utils/errors";

export type PublicStorefront = {
  store: StoreProfile;
  catalog: MenuCatalog;
  prepMinutes: number;
};

export async function getPublicStorefront(): Promise<PublicStorefront> {
  const storeId = await resolvePublicStoreId();
  const storeRow = await storeRepository.findById(storeId);
  if (!storeRow) {
    throw new AppError("NOT_FOUND", "Restaurant is not set up yet.", 404);
  }

  const catalog = await menuRepository.getPublicCatalogForStore(storeId);
  return {
    store: mapStoreToProfile(storeRow),
    catalog,
    prepMinutes: storeRow.prepMinutes,
  };
}

export async function getPublicMenuItem(id: string): Promise<{
  store: StoreProfile;
  item: MenuItemDetail;
}> {
  const storeId = await resolvePublicStoreId();
  const store = await storeRepository.getProfileById(storeId);
  if (!store) {
    throw new AppError("NOT_FOUND", "Restaurant is not set up yet.", 404);
  }

  const item = await menuRepository.findPublicItemById(id, storeId);
  if (!item) {
    throw new AppError("NOT_FOUND", "Item not found", 404);
  }

  return { store, item: mapMenuItemToDetail(item) };
}
