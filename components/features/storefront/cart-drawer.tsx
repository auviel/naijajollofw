"use client";

import { useEffect, useState } from "react";
import { CartPanel } from "@/components/features/storefront/cart-panel";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { X } from "@/components/ui/icons";
import type { CartView } from "@/lib/domain/cart/types";

const EMPTY_CART: CartView = {
  id: null,
  storeId: "",
  itemCount: 0,
  subtotalCents: 0,
  currency: "CAD",
  items: [],
};

export function CartDrawer() {
  const { cartOpen, closeCart } = useStorefrontUi();
  const [cart, setCart] = useState<CartView>(EMPTY_CART);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cartOpen) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/cart");
        const body = (await response.json().catch(() => ({}))) as {
          data?: CartView;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error ?? "Could not load cart.");
        }
        if (!cancelled && body.data) {
          setCart(body.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load cart.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cartOpen]);

  useEffect(() => {
    if (!cartOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [cartOpen, closeCart]);

  if (!cartOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close cart"
        onClick={closeCart}
      />

      {/* Mobile bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,40rem)] flex-col rounded-t-2xl border border-border bg-background shadow-lg md:hidden"
      >
        <div className="flex justify-center pt-3 md:hidden">
          <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
        </div>
        <CartDrawerChrome
          loading={loading}
          error={error}
          cart={cart}
          setCart={setCart}
          onClose={closeCart}
        />
      </div>

      {/* Desktop right sidebar */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title-desktop"
        className="absolute inset-y-0 right-0 hidden w-full max-w-md flex-col border-l border-border bg-background shadow-xl md:flex"
      >
        <CartDrawerChrome
          loading={loading}
          error={error}
          cart={cart}
          setCart={setCart}
          onClose={closeCart}
          titleId="cart-drawer-title-desktop"
        />
      </div>
    </div>
  );
}

function CartDrawerChrome({
  loading,
  error,
  cart,
  setCart,
  onClose,
  titleId = "cart-drawer-title",
}: {
  loading: boolean;
  error: string | null;
  cart: CartView;
  setCart: (cart: CartView) => void;
  onClose: () => void;
  titleId?: string;
}) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <h2
          id={titleId}
          className="font-display text-lg font-semibold text-foreground"
        >
          Cart
          {cart.itemCount > 0 ? (
            <span className="ml-2 text-sm font-medium text-text-secondary">
              ({cart.itemCount})
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface"
          aria-label="Close cart"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center p-10 text-sm text-text-secondary">
          Loading…
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
          <p className="text-sm text-text-secondary">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-foreground"
          >
            Close
          </button>
        </div>
      ) : (
        <CartPanel
          cart={cart}
          onCartChange={setCart}
          variant="drawer"
          onClose={onClose}
        />
      )}
    </>
  );
}
