"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CartLineThumbnail } from "@/components/features/storefront/cart-line-thumbnail";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBag, Trash } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import type { CartView } from "@/lib/domain/cart/types";
import { rememberCartSessionId } from "@/lib/utils/cart-session-client";
import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

type CartPanelProps = {
  cart: CartView;
  onCartChange: (cart: CartView) => void;
  /** drawer = compact chrome for sheet/sidebar; page = full cart route */
  variant?: "page" | "drawer";
  onClose?: () => void;
  onBrowseMenu?: () => void;
};

export function CartPanel({
  cart,
  onCartChange,
  variant = "page",
  onClose,
  onBrowseMenu,
}: CartPanelProps) {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const isDrawer = variant === "drawer";

  async function updateQuantity(lineId: string, quantity: number) {
    setPendingLineId(lineId);
    try {
      const response = await fetch(`/api/cart/${lineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        toastError(await readApiError(response));
        return;
      }

      const body = (await response.json()) as {
        data: CartView;
        sessionId?: string | null;
      };
      rememberCartSessionId(body.sessionId);
      onCartChange(body.data);
      router.refresh();
    } catch {
      toastError("Unable to update cart.");
    } finally {
      setPendingLineId(null);
    }
  }

  async function removeLine(lineId: string) {
    setPendingLineId(lineId);
    try {
      const response = await fetch(`/api/cart/${lineId}`, { method: "DELETE" });
      if (!response.ok) {
        toastError(await readApiError(response));
        return;
      }
      const body = (await response.json()) as {
        data: CartView;
        sessionId?: string | null;
      };
      rememberCartSessionId(body.sessionId);
      onCartChange(body.data);
      router.refresh();
    } catch {
      toastError("Unable to remove item.");
    } finally {
      setPendingLineId(null);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className={cn(isDrawer ? "px-5 py-8" : undefined)}>
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" aria-hidden />}
          title="Your cart is empty"
          description="Browse the menu and add something delicious."
          action={
            <Link
              href="/"
              onClick={() => {
                onBrowseMenu?.();
                onClose?.();
              }}
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-text-inverse"
            >
              Browse menu
            </Link>
          }
        />
      </div>
    );
  }

  const hasUnavailable = cart.items.some((item) => !item.available);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        !isDrawer && "space-y-6 pb-28",
      )}
    >
      {!isDrawer ? (
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
          >
            ← Keep shopping
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
            Cart
          </h1>
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 space-y-3 overflow-y-auto",
          isDrawer ? "px-5 py-4" : undefined,
        )}
      >
        {hasUnavailable ? (
          <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            Some items are no longer available. Remove them before checkout.
          </p>
        ) : null}

        {cart.items.map((line) => (
          <div
            key={line.id}
            className="rounded-2xl border border-border bg-surface-elevated p-4"
          >
            <div className="flex gap-3">
              <CartLineThumbnail line={line} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {line.name}
                      {!line.available ? (
                        <span className="ml-2 text-xs font-medium text-error">
                          Sold out
                        </span>
                      ) : null}
                    </p>
                    {line.modifiers.length > 0 ? (
                      <p className="mt-1 text-sm text-text-secondary">
                        {line.modifiers
                          .map((modifier) => modifier.name)
                          .join(", ")}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formatCadFromCents(line.lineTotalCents)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-surface hover:text-foreground"
                    disabled={pendingLineId === line.id}
                    onClick={() => removeLine(line.id)}
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                <div className="mt-3 flex w-fit items-center rounded-md border border-border">
                  <button
                    type="button"
                    className="h-10 w-10 text-lg disabled:opacity-40"
                    disabled={pendingLineId === line.id}
                    onClick={() => updateQuantity(line.id, line.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium tabular-nums">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    className="h-10 w-10 text-lg disabled:opacity-40"
                    disabled={pendingLineId === line.id || !line.available}
                    onClick={() => updateQuantity(line.id, line.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-border bg-background",
          isDrawer
            ? "px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
            : "fixed inset-x-0 bottom-0 z-30 bg-background/95 p-4 backdrop-blur safe-bottom md:static md:z-auto md:bg-transparent md:p-0 md:pt-4 md:backdrop-blur-none",
        )}
      >
        <div className={cn(!isDrawer && "mx-auto max-w-3xl")}>
          <div className="mb-3 flex items-center justify-between text-base">
            <span className="font-medium text-text-secondary">Subtotal</span>
            <span className="font-semibold text-foreground">
              {formatCadFromCents(cart.subtotalCents)}
            </span>
          </div>
          <Link
            href="/checkout"
            aria-disabled={hasUnavailable}
            onClick={(event) => {
              if (hasUnavailable) {
                event.preventDefault();
                return;
              }
              onClose?.();
            }}
            className={cn(
              "inline-flex h-12 w-full items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-hover",
              hasUnavailable && "pointer-events-none opacity-50",
            )}
          >
            Go to checkout · {formatCadFromCents(cart.subtotalCents)}
          </Link>
        </div>
      </div>
    </div>
  );
}
