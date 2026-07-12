import { CartClient } from "@/components/features/storefront/cart-client";
import { getCart } from "@/lib/services/cart/cart-actions";

export default async function CartPage() {
  const cart = await getCart();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <CartClient initialCart={cart} />
    </div>
  );
}
