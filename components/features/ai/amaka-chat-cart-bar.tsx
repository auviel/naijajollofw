"use client";

import { useCallback, useEffect, useState } from "react";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { ShoppingBag } from "@/components/ui/icons";
import { formatCadFromCents } from "@/lib/utils/currency";
import { rememberCartSessionId } from "@/lib/utils/cart-session-client";

type CartSummary = {
  itemCount: number;
  subtotalCents: number;
};

export function useCartSummary(refreshKey = 0) {
  const [summary, setSummary] = useState<CartSummary>({
    itemCount: 0,
    subtotalCents: 0,
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/cart");
      if (!response.ok) return;
      const body = (await response.json()) as {
        itemCount?: number;
        subtotalCents?: number;
        sessionId?: string | null;
      };
      rememberCartSessionId(body.sessionId);
      setSummary({
        itemCount: body.itemCount ?? 0,
        subtotalCents: body.subtotalCents ?? 0,
      });
    } catch {
      // Keep last known count.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cart summary is fetched from an external API
    void refresh();
  }, [refresh, refreshKey]);

  return { ...summary, refresh };
}

/** Slim cart shortcut above the chat composer when items are in cart. */
export function AmakaChatCartBar({ refreshKey = 0 }: { refreshKey?: number }) {
  const { openCart, closeAiChat } = useStorefrontUi();
  const { itemCount, subtotalCents } = useCartSummary(refreshKey);

  if (itemCount <= 0) return null;

  const label =
    itemCount === 1 ? "1 item in cart" : `${itemCount} items in cart`;

  function openCartFromChat() {
    closeAiChat();
    openCart();
  }

  return (
    <div className="border-t border-border bg-surface-elevated/80 px-3 py-2">
      <button
        type="button"
        onClick={openCartFromChat}
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5 text-left transition hover:bg-surface-elevated"
      >
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
          <ShoppingBag className="size-4 shrink-0 text-accent" aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-ink">
          {formatCadFromCents(subtotalCents)}
        </span>
      </button>
    </div>
  );
}
