import { StorefrontHeaderBar } from "@/components/features/storefront/storefront-header-bar";
import { getCart } from "@/lib/services/cart/cart-actions";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";

export async function StorefrontHeader() {
  const [cart, storeId] = await Promise.all([getCart(), resolvePublicStoreId()]);
  const store = await storeRepository.getProfileById(storeId);
  const storeName = store?.name ?? "Order online";

  return (
    <StorefrontHeaderBar storeName={storeName} cartItemCount={cart.itemCount} />
  );
}
