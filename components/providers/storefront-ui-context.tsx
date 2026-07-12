"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type StorefrontUiContextValue = {
  mobileSearchOpen: boolean;
  setMobileSearchOpen: (open: boolean) => void;
  openMobileSearch: () => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const StorefrontUiContext = createContext<StorefrontUiContextValue | null>(
  null,
);

export function StorefrontUiProvider({ children }: { children: ReactNode }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const openMobileSearch = useCallback(() => {
    setMobileSearchOpen(true);
  }, []);

  const openCart = useCallback(() => {
    setMobileSearchOpen(false);
    setCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setCartOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      mobileSearchOpen,
      setMobileSearchOpen,
      openMobileSearch,
      cartOpen,
      openCart,
      closeCart,
    }),
    [
      mobileSearchOpen,
      openMobileSearch,
      cartOpen,
      openCart,
      closeCart,
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
