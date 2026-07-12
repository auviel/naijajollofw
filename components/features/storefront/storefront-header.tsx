import { Suspense } from "react";
import { StorefrontHeaderBar } from "@/components/features/storefront/storefront-header-bar";
import { StorefrontMobileNav } from "@/components/features/storefront/storefront-mobile-nav";
import { getCart } from "@/lib/services/cart/cart-actions";
import { buildSearchIndex } from "@/lib/domain/menu/search";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";

export async function StorefrontHeader() {
  const [cart, { store, catalog }] = await Promise.all([
    getCart(),
    getPublicStorefront(),
  ]);
  const storeName = store.name;
  const searchIndex = buildSearchIndex(catalog);

  return (
    <Suspense
      fallback={
        <header className="h-[var(--storefront-header-offset)] shrink-0" />
      }
    >
      <StorefrontHeaderBar
        storeName={storeName}
        cartItemCount={cart.itemCount}
        searchIndex={searchIndex}
      />
      <StorefrontMobileNav
        cartItemCount={cart.itemCount}
        cartSubtotalCents={cart.subtotalCents}
      />
    </Suspense>
  );
}
