"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";

/**
 * App-flow routes stay chrome-light (no marketing footer).
 * Browse / info pages keep the full storefront footer.
 * Active menu search stays focused (no footer).
 */
function showStorefrontFooter(
  pathname: string,
  searching: boolean,
): boolean {
  if (searching) {
    return false;
  }
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
  const searchParams = useSearchParams();
  const { mobileSearchOpen } = useStorefrontUi();
  const hasQuery = Boolean(searchParams.get("q")?.trim());
  const searching =
    mobileSearchOpen || (pathname === "/" && hasQuery);

  if (!showStorefrontFooter(pathname, searching)) {
    return null;
  }
  return children;
}
