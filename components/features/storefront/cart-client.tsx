"use client";

import { useState } from "react";
import { CartPanel } from "@/components/features/storefront/cart-panel";
import type { CartView } from "@/lib/domain/cart/types";

type CartClientProps = {
  initialCart: CartView;
};

export function CartClient({ initialCart }: CartClientProps) {
  const [cart, setCart] = useState(initialCart);

  return (
    <CartPanel cart={cart} onCartChange={setCart} variant="page" />
  );
}
