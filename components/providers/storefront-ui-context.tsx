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

export type AddedToCartItem = {
  name: string;
  imageUrl: string | null;
};

type StorefrontUiContextValue = {
  mobileSearchOpen: boolean;
  setMobileSearchOpen: (open: boolean) => void;
  openMobileSearch: () => void;
  /** Live header search draft (may lead URL `?q=` by a debounce). */
  menuSearchQuery: string;
  setMenuSearchQuery: (query: string) => void;
  /** Mobile search UI open, or non-empty search query — focus menu only. */
  menuSearchFocused: boolean;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Bumps when cart contents likely changed — client badges refetch `/api/cart`. */
  cartRevision: number;
  bumpCartRevision: () => void;
  addedToCart: AddedToCartItem | null;
  notifyItemAdded: (item: AddedToCartItem) => void;
  dismissAddedToCart: () => void;
  /** Floating Ask Amaka panel open — suppress header cart popover. */
  aiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;
  /** Closes the desktop floating Ask Amaka panel when set. */
  closeAiChat: () => void;
  registerCloseAiChat: (fn: (() => void) | null) => void;
};

const StorefrontUiContext = createContext<StorefrontUiContextValue | null>(
  null,
);

const ADDED_POPOVER_MS = 6000;

export function StorefrontUiProvider({ children }: { children: ReactNode }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartRevision, setCartRevision] = useState(0);
  const [addedToCart, setAddedToCart] = useState<AddedToCartItem | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const closeAiChatRef = useRef<(() => void) | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  const menuSearchFocused =
    mobileSearchOpen || Boolean(menuSearchQuery.trim());

  const bumpCartRevision = useCallback(() => {
    setCartRevision((n) => n + 1);
  }, []);

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
    bumpCartRevision();
  }, [bumpCartRevision]);

  const registerCloseAiChat = useCallback((fn: (() => void) | null) => {
    closeAiChatRef.current = fn;
  }, []);

  const closeAiChat = useCallback(() => {
    closeAiChatRef.current?.();
  }, []);

  const notifyItemAdded = useCallback((item: AddedToCartItem) => {
    bumpCartRevision();
    const desktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 640px)").matches;

    // Mobile, or chat open: badge / in-chat feedback only — no header popover.
    if (!desktop || aiChatOpen) {
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
  }, [aiChatOpen, bumpCartRevision]);

  const value = useMemo(
    () => ({
      mobileSearchOpen,
      setMobileSearchOpen,
      openMobileSearch,
      menuSearchQuery,
      setMenuSearchQuery,
      menuSearchFocused,
      cartOpen,
      openCart,
      closeCart,
      cartRevision,
      bumpCartRevision,
      addedToCart,
      notifyItemAdded,
      dismissAddedToCart,
      aiChatOpen,
      setAiChatOpen,
      closeAiChat,
      registerCloseAiChat,
    }),
    [
      mobileSearchOpen,
      openMobileSearch,
      menuSearchQuery,
      menuSearchFocused,
      cartOpen,
      openCart,
      closeCart,
      cartRevision,
      bumpCartRevision,
      addedToCart,
      notifyItemAdded,
      dismissAddedToCart,
      aiChatOpen,
      closeAiChat,
      registerCloseAiChat,
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
