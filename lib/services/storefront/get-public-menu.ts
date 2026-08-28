import { unstable_cache } from "next/cache";
import { cache } from "react";
import { STOREFRONT_CACHE_TAG } from "@/lib/cache/storefront";
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

const loadPublicStorefront = unstable_cache(
  async (storeId: string): Promise<PublicStorefront | null> => {
    const storeRow = await storeRepository.findById(storeId);
    if (!storeRow) {
      return null;
    }

    const catalog = await menuRepository.getPublicCatalogForStore(storeId);
    return {
      store: mapStoreToProfile(storeRow),
      catalog,
      prepMinutes: storeRow.prepMinutes,
    };
  },
  ["public-storefront-v2"],
  { revalidate: 300, tags: [STOREFRONT_CACHE_TAG] },
);

export const getPublicStorefront = cache(async function getPublicStorefront(): Promise<PublicStorefront> {
  const storeId = await resolvePublicStoreId();
  const data = await loadPublicStorefront(storeId);
  if (!data) {
    throw new AppError("NOT_FOUND", "Restaurant is not set up yet.", 404);
  }
  return data;
});

export type PublicMenuItemResult = {
  store: StoreProfile;
  item: MenuItemDetail;
  /** True when the request used a legacy cuid URL that should redirect to the slug. */
  shouldRedirectToSlug: boolean;
};

/**
 * Resolve a public menu item by slug, or by legacy id (cuid).
 * Callers should redirect when `shouldRedirectToSlug` is true.
 */
export async function getPublicMenuItem(
  slugOrId: string,
): Promise<PublicMenuItemResult> {
  const key = slugOrId?.trim();
  if (!key || key === "undefined" || key === "null") {
    throw new AppError("NOT_FOUND", "Item not found", 404);
  }

  const storeId = await resolvePublicStoreId();
  const store = await storeRepository.getProfileById(storeId);
  if (!store) {
    throw new AppError("NOT_FOUND", "Restaurant is not set up yet.", 404);
  }

  const bySlug = await menuRepository.findPublicItemBySlug(key, storeId);
  if (bySlug) {
    return {
      store,
      item: mapMenuItemToDetail(bySlug),
      shouldRedirectToSlug: false,
    };
  }

  const byId = await menuRepository.findPublicItemById(key, storeId);
  if (byId) {
    return {
      store,
      item: mapMenuItemToDetail(byId),
      shouldRedirectToSlug: byId.slug !== key,
    };
  }

  throw new AppError("NOT_FOUND", "Item not found", 404);
}
