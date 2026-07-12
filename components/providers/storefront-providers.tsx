"use client";

import { CartDrawer } from "@/components/features/storefront/cart-drawer";
import { StorefrontUiProvider } from "@/components/providers/storefront-ui-context";
import { ToastProvider } from "@/components/ui/toast";
import type { ReactNode } from "react";

export function StorefrontProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <StorefrontUiProvider>
        {children}
        <CartDrawer />
      </StorefrontUiProvider>
    </ToastProvider>
  );
}
