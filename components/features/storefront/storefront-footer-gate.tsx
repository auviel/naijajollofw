"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * App-flow routes stay chrome-light (no marketing footer).
 * Browse / info pages keep the full storefront footer.
 */
function showStorefrontFooter(pathname: string): boolean {
  if (
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname.startsWith("/orders/") ||
    pathname.startsWith("/item/")
  ) {
    return false;
  }
  return true;
}

export function StorefrontFooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (!showStorefrontFooter(pathname)) {
    return null;
  }
  return children;
}
