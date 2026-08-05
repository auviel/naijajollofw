import { apiFetch } from "@/lib/api";
import type { CartView } from "@naijajollof/api-types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const EMPTY_CART: CartView = {
  id: null,
  storeId: "",
  itemCount: 0,
  subtotalCents: 0,
  currency: "CAD",
  items: [],
};

type CartContextValue = {
  cart: CartView;
  loading: boolean;
  refresh: () => Promise<CartView>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView>(EMPTY_CART);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await apiFetch<CartView>("/api/cart");
    setCart(data);
    return data;
  }, []);

  useEffect(() => {
    void refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo(
    () => ({ cart, loading, refresh }),
    [cart, loading, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
