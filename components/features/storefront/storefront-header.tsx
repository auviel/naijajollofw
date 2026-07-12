import { Suspense } from "react";
import { StorefrontHeaderBar } from "@/components/features/storefront/storefront-header-bar";
import { StorefrontMobileNav } from "@/components/features/storefront/storefront-mobile-nav";
import { getCart } from "@/lib/services/cart/cart-actions";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";

export async function StorefrontHeader() {
  const [cart, storeId] = await Promise.all([getCart(), resolvePublicStoreId()]);
  const store = await storeRepository.getProfileById(storeId);
  const storeName = store?.name ?? "Order online";

  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-20 h-14 border-b border-transparent bg-background/90 sm:h-16" />
      }
    >
      <StorefrontHeaderBar
        storeName={storeName}
        cartItemCount={cart.itemCount}
      />
      <StorefrontMobileNav
        cartItemCount={cart.itemCount}
        cartSubtotalCents={cart.subtotalCents}
      />
    </Suspense>
  );
}
