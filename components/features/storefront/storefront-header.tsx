import { Suspense } from "react";
import { StorefrontHeaderBar } from "@/components/features/storefront/storefront-header-bar";
import { StorefrontHeaderBarGate } from "@/components/features/storefront/storefront-header-bar-gate";
import { StorefrontHeaderSwitch } from "@/components/features/storefront/storefront-header-switch";
import { StorefrontMobileNav } from "@/components/features/storefront/storefront-mobile-nav";
import { buildHeaderSearchIndex } from "@/lib/domain/menu/search";
import type { MenuSearchIndex } from "@/lib/domain/menu/search";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";
import { isAppError } from "@/lib/utils/errors";

type HeaderData = {
  storeName: string;
  searchIndex: MenuSearchIndex;
};

async function loadHeaderData(): Promise<HeaderData> {
  try {
    const { store, catalog } = await getPublicStorefront();
    return {
      storeName: store.name,
      searchIndex: buildHeaderSearchIndex(catalog),
    };
  } catch (error) {
    if (!isAppError(error) || error.code !== "NOT_FOUND") {
      throw error;
    }
    return {
      storeName: "Naija Jollof",
      searchIndex: { items: [] },
    };
  }
}

export async function StorefrontHeader() {
  const data = await loadHeaderData();

  return (
    <Suspense
      fallback={
        <header className="h-[var(--storefront-header-offset)] shrink-0" />
      }
    >
      <StorefrontHeaderSwitch
        storefront={
          <>
            <StorefrontHeaderBarGate>
              <StorefrontHeaderBar
                storeName={data.storeName}
                searchIndex={data.searchIndex}
              />
            </StorefrontHeaderBarGate>
            <StorefrontMobileNav />
          </>
        }
      />
    </Suspense>
  );
}
