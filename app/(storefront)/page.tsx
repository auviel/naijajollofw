import { StorefrontMenu } from "@/components/features/storefront/storefront-menu";
import { getCart } from "@/lib/services/cart/cart-actions";
import { getPublicStoreOpenStatus } from "@/lib/services/store/store-hours";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";

export default async function StorefrontHomePage() {
  const [{ store, catalog, prepMinutes }, cart, openStatus] = await Promise.all([
    getPublicStorefront(),
    getCart(),
    getPublicStoreOpenStatus(),
  ]);

  return (
    <StorefrontMenu
      store={store}
      catalog={catalog}
      cartItemCount={cart.itemCount}
      cartSubtotalCents={cart.subtotalCents}
      openStatus={openStatus}
      prepMinutes={prepMinutes}
    />
  );
}
