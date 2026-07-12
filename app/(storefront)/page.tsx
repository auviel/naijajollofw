import { StorefrontMenu } from "@/components/features/storefront/storefront-menu";
import { getCart } from "@/lib/services/cart/cart-actions";
import { getPublicStoreOpenStatus } from "@/lib/services/store/store-hours";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function StorefrontHomePage({ searchParams }: PageProps) {
  const [{ q }, { store, catalog, prepMinutes }, cart, openStatus] =
    await Promise.all([
      searchParams,
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
      searchQuery={q?.trim() ?? ""}
    />
  );
}
