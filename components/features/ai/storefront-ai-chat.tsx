"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AskAmakaChatShell } from "@/components/features/ai/ask-amaka-chat-shell";
import { AmakaAvatar } from "@/components/features/ai/amaka-avatar";
import { isChatPath } from "@/components/features/storefront/storefront-header-bar-gate";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { cn } from "@/lib/utils/cn";

function isCheckoutPath(pathname: string) {
  return pathname === "/checkout" || pathname.startsWith("/checkout/");
}

export function StorefrontAiChat() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [pathForOpen, setPathForOpen] = useState(pathname);
  const {
    cartOpen,
    setAiChatOpen,
    dismissAddedToCart,
    registerCloseAiChat,
  } = useStorefrontUi();

  // Close the floating panel when navigating to checkout (no effect needed).
  if (pathname !== pathForOpen) {
    setPathForOpen(pathname);
    if (isCheckoutPath(pathname) && open) {
      setOpen(false);
    }
  }

  // Hide behind the cart drawer — close panel so it does not snap back open.
  if (cartOpen && open) {
    setOpen(false);
  }

  const panelOpen = open && !isCheckoutPath(pathname) && !cartOpen;

  useEffect(() => {
    registerCloseAiChat(() => setOpen(false));
    return () => registerCloseAiChat(null);
  }, [registerCloseAiChat]);

  useEffect(() => {
    setAiChatOpen(panelOpen);
    if (panelOpen) {
      dismissAddedToCart();
    }
  }, [panelOpen, setAiChatOpen, dismissAddedToCart]);

  if (isChatPath(pathname) || isCheckoutPath(pathname) || cartOpen) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] hidden max-h-dvh justify-end overflow-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:flex md:p-6">
      <div className="pointer-events-auto flex max-h-[calc(100dvh-2rem)] flex-col items-end justify-end gap-3">
        {panelOpen ? (
          <AskAmakaChatShell
            onClose={() => setOpen(false)}
            className={cn(
              "h-[min(78dvh,680px)] max-h-[calc(100dvh-3rem)] w-[min(100vw-2rem,440px)] shrink-0 rounded-2xl border border-border shadow-lg",
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-full bg-accent py-2.5 pl-2.5 pr-4",
              "text-sm font-semibold text-white shadow-md transition hover:brightness-105",
            )}
            aria-expanded={false}
            aria-haspopup="dialog"
          >
            <AmakaAvatar size="sm" className="ring-white/30" />
            Ask Amaka
          </button>
        )}
      </div>
    </div>
  );
}
