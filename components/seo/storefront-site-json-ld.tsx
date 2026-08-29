import { JsonLdScript } from "@/components/seo/json-ld-script";
import { isTransientDbError } from "@/lib/db/is-transient-db-error";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo/json-ld";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";
import type { StoreProfile } from "@/lib/domain/store/types";
import { isAppError } from "@/lib/utils/errors";

async function loadStoreForJsonLd(): Promise<StoreProfile | null> {
  try {
    const { store } = await getPublicStorefront();
    return store;
  } catch (error) {
    if (
      (isAppError(error) && error.code === "NOT_FOUND") ||
      isTransientDbError(error)
    ) {
      return null;
    }
    throw error;
  }
}

export async function StorefrontSiteJsonLd() {
  const store = await loadStoreForJsonLd();
  if (!store) {
    return null;
  }

  return (
    <JsonLdScript
      data={[buildOrganizationJsonLd(store), buildWebSiteJsonLd()]}
    />
  );
}
