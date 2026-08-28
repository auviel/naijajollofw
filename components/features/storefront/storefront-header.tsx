import { Suspense } from "react";
import { StorefrontHeaderBar } from "@/components/features/storefront/storefront-header-bar";
import { StorefrontHeaderBarGate } from "@/components/features/storefront/storefront-header-bar-gate";
import { StorefrontHeaderSwitch } from "@/components/features/storefront/storefront-header-switch";
import { StorefrontMobileNav } from "@/components/features/storefront/storefront-mobile-nav";
import { getCart } from "@/lib/services/cart/cart-actions";
import { buildSearchIndex } from "@/lib/domain/menu/search";
import type { MenuSearchIndex } from "@/lib/domain/menu/search";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";
import { isAppError } from "@/lib/utils/errors";

type HeaderData = {
  storeName: string;
  cartItemCount: number;
  cartSubtotalCents: number;
  searchIndex: MenuSearchIndex;
};

async function loadHeaderData(): Promise<HeaderData> {
  try {
    const [cart, { store, catalog }] = await Promise.all([
      getCart(),
      getPublicStorefront(),
    ]);
    return {
      storeName: store.name,
      cartItemCount: cart.itemCount,
      cartSubtotalCents: cart.subtotalCents,
      searchIndex: buildSearchIndex(catalog),
    };
  } catch (error) {
    if (!isAppError(error) || error.code !== "NOT_FOUND") {
      throw error;
    }
    return {
      storeName: "Naija Jollof",
      cartItemCount: 0,
      cartSubtotalCents: 0,
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
                cartItemCount={data.cartItemCount}
                searchIndex={data.searchIndex}
              />
            </StorefrontHeaderBarGate>
            <StorefrontMobileNav
              cartItemCount={data.cartItemCount}
              cartSubtotalCents={data.cartSubtotalCents}
            />
          </>
        }
      />
    </Suspense>
  );
}
