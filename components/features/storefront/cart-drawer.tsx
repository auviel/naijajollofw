"use client";

import { useEffect, useState } from "react";
import { CartPanel } from "@/components/features/storefront/cart-panel";
import { useBodyScrollLock } from "@/components/hooks/use-body-scroll-lock";
import { MotionSheet } from "@/components/motion/primitives";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { X } from "@/components/ui/icons";
import type { CartView } from "@/lib/domain/cart/types";
import { rememberCartSessionId } from "@/lib/utils/cart-session-client";

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
  const [wasOpen, setWasOpen] = useState(cartOpen);

  if (cartOpen !== wasOpen) {
    setWasOpen(cartOpen);
    if (cartOpen) {
      setLoading(true);
      setError(null);
    }
  }

  useEffect(() => {
    if (!cartOpen) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/cart");
        const body = (await response.json().catch(() => ({}))) as {
          data?: CartView;
          sessionId?: string | null;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error ?? "Could not load cart.");
        }
        if (!cancelled && body.data) {
          rememberCartSessionId(body.sessionId);
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

  useBodyScrollLock(cartOpen);

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
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [cartOpen, closeCart]);

  return (
    <MotionSheet
      open={cartOpen}
      onClose={closeCart}
      labelledBy="cart-drawer-title"
      desktopLabelledBy="cart-drawer-title-desktop"
    >
      {(slot) => (
        <>
          {slot === "mobile" ? (
            <div className="flex justify-center pt-3">
              <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
            </div>
          ) : null}
          <CartDrawerChrome
            loading={loading}
            error={error}
            cart={cart}
            setCart={setCart}
            onClose={closeCart}
            titleId={
              slot === "desktop"
                ? "cart-drawer-title-desktop"
                : "cart-drawer-title"
            }
          />
        </>
      )}
    </MotionSheet>
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
