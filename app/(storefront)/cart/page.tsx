import type { Metadata } from "next";
import { CartClient } from "@/components/features/storefront/cart-client";
import { privatePageMetadata } from "@/lib/seo/noindex";
import { getCart } from "@/lib/services/cart/cart-actions";

export const metadata: Metadata = privatePageMetadata({
  title: "Cart",
  description: "Review items in your cart before checkout.",
});

export default async function CartPage() {
  const cart = await getCart();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <CartClient initialCart={cart} />
    </div>
  );
}
