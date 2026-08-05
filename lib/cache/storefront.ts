import { revalidateTag } from "next/cache";
import { invalidateStoreReadCache } from "@/lib/db/repositories/store.repository";

export const STOREFRONT_CACHE_TAG = "storefront-public";

export function revalidateStorefrontCache() {
  invalidateStoreReadCache();
  revalidateTag(STOREFRONT_CACHE_TAG, "max");
}
