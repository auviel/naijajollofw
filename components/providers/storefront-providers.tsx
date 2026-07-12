"use client";

import { CartDrawer } from "@/components/features/storefront/cart-drawer";
import { CartSessionPersistence } from "@/components/features/storefront/cart-session-persistence";
import { PwaRegister } from "@/components/features/storefront/pwa-register";
import { StorefrontUiProvider } from "@/components/providers/storefront-ui-context";
import { ToastProvider } from "@/components/ui/toast";
import type { ReactNode } from "react";

export function StorefrontProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <StorefrontUiProvider>
        <PwaRegister />
        <CartSessionPersistence />
        {children}
        <CartDrawer />
      </StorefrontUiProvider>
    </ToastProvider>
  );
}
