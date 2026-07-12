"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@/components/ui/toast";

export type AddedToCartItem = {
  name: string;
  imageUrl: string | null;
};

type StorefrontUiContextValue = {
  mobileSearchOpen: boolean;
  setMobileSearchOpen: (open: boolean) => void;
  openMobileSearch: () => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addedToCart: AddedToCartItem | null;
  notifyItemAdded: (item: AddedToCartItem) => void;
  dismissAddedToCart: () => void;
};

const StorefrontUiContext = createContext<StorefrontUiContextValue | null>(
  null,
);

const ADDED_POPOVER_MS = 6000;

export function StorefrontUiProvider({ children }: { children: ReactNode }) {
  const { success } = useToast();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState<AddedToCartItem | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

  const dismissAddedToCart = useCallback(() => {
    if (dismissTimerRef.current != null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setAddedToCart(null);
  }, []);

  const openMobileSearch = useCallback(() => {
    setMobileSearchOpen(true);
  }, []);

  const openCart = useCallback(() => {
    setMobileSearchOpen(false);
    dismissAddedToCart();
    setCartOpen(true);
  }, [dismissAddedToCart]);

  const closeCart = useCallback(() => {
    setCartOpen(false);
  }, []);

  const notifyItemAdded = useCallback(
    (item: AddedToCartItem) => {
      const desktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 640px)").matches;

      if (!desktop) {
        success("Added to cart");
        return;
      }

      if (dismissTimerRef.current != null) {
        window.clearTimeout(dismissTimerRef.current);
      }
      setAddedToCart(item);
      dismissTimerRef.current = window.setTimeout(() => {
        setAddedToCart(null);
        dismissTimerRef.current = null;
      }, ADDED_POPOVER_MS);
    },
    [success],
  );

  const value = useMemo(
    () => ({
      mobileSearchOpen,
      setMobileSearchOpen,
      openMobileSearch,
      cartOpen,
      openCart,
      closeCart,
      addedToCart,
      notifyItemAdded,
      dismissAddedToCart,
    }),
    [
      mobileSearchOpen,
      openMobileSearch,
      cartOpen,
      openCart,
      closeCart,
      addedToCart,
      notifyItemAdded,
      dismissAddedToCart,
    ],
  );

  return (
    <StorefrontUiContext.Provider value={value}>
      {children}
    </StorefrontUiContext.Provider>
  );
}

export function useStorefrontUi() {
  const context = useContext(StorefrontUiContext);
  if (!context) {
    throw new Error("useStorefrontUi must be used within StorefrontUiProvider");
  }
  return context;
}
