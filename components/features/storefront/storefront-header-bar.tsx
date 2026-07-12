"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StoreBrandLogo } from "@/components/features/storefront/store-brand-logo";
import { ShoppingBag } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type StorefrontHeaderBarProps = {
  storeName: string;
  cartItemCount: number;
};

export function StorefrontHeaderBar({
  storeName,
  cartItemCount,
}: StorefrontHeaderBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const scroller =
      document.getElementById("storefront-scroll") ?? window;
    const readTop = () =>
      scroller instanceof Window
        ? scroller.scrollY
        : (scroller as HTMLElement).scrollTop;

    const onScroll = () => {
      setScrolled(readTop() > 8);
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md transition-[border-color,box-shadow] duration-normal ease-out",
        scrolled
          ? "border-border shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]"
          : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center text-foreground no-underline"
          aria-label={storeName}
        >
          <StoreBrandLogo alt={storeName} variant="header" priority />
        </Link>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/cart"
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-foreground no-underline transition-colors hover:bg-surface"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            <span className="sr-only sm:not-sr-only">Cart</span>
            {cartItemCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 py-0.5 text-[11px] font-semibold text-background">
                {cartItemCount}
              </span>
            ) : null}
          </Link>
          <Link
            href="/login"
            className="px-2 text-sm font-medium text-text-tertiary no-underline transition-colors hover:text-foreground"
          >
            Staff
          </Link>
        </nav>
      </div>
    </header>
  );
}
