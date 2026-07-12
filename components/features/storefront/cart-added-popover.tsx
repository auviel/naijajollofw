"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CartLineThumbnail } from "@/components/features/storefront/cart-line-thumbnail";
import {
  useStorefrontUi,
  type AddedToCartItem,
} from "@/components/providers/storefront-ui-context";

type CartAddedPopoverProps = {
  item: AddedToCartItem;
  onViewCart: () => void;
  onDismiss: () => void;
};

export function CartAddedPopover({
  item,
  onViewCart,
  onDismiss,
}: CartAddedPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current) {
        return;
      }
      if (!panelRef.current.contains(event.target as Node)) {
        onDismiss();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onDismiss]);

  return (
    <div
      ref={panelRef}
      role="status"
      aria-live="polite"
      className="absolute top-full right-0 z-50 mt-2 w-[min(calc(100vw-2rem),28rem)] rounded-xl border border-border bg-background p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
    >
      <span
        aria-hidden
        className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-t border-l border-border bg-background"
      />
      <p className="relative text-sm font-semibold text-foreground">
        Added to cart
      </p>
      <div className="relative mt-3 flex items-center gap-3">
        <CartLineThumbnail
          line={{ name: item.name, imageUrl: item.imageUrl }}
          size="sm"
        />
        <p className="min-w-0 flex-1 truncate text-sm text-foreground">
          {item.name}
        </p>
      </div>
      <div className="relative mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onViewCart}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-surface text-sm font-medium text-foreground transition-colors hover:bg-border"
        >
          View cart
        </button>
        <Link
          href="/checkout"
          onClick={onDismiss}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-text-inverse no-underline transition-colors hover:bg-accent-hover"
        >
          Go to checkout
        </Link>
      </div>
    </div>
  );
}

/** Renders the desktop “added to cart” popover when active. */
export function CartAddedPopoverHost({
  onViewCart,
}: {
  onViewCart: () => void;
}) {
  const { addedToCart, dismissAddedToCart } = useStorefrontUi();
  if (!addedToCart) {
    return null;
  }
  return (
    <CartAddedPopover
      item={addedToCart}
      onViewCart={onViewCart}
      onDismiss={dismissAddedToCart}
    />
  );
}
