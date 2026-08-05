import { revalidateTag } from "next/cache";

export const STOREFRONT_CACHE_TAG = "storefront-public";

export function revalidateStorefrontCache() {
  revalidateTag(STOREFRONT_CACHE_TAG, "max");
}
