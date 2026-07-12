"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CartView } from "@/lib/domain/cart/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ShoppingBag } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

type CartClientProps = {
  initialCart: CartView;
};

export function CartClient({ initialCart }: CartClientProps) {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [cart, setCart] = useState(initialCart);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);

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

      const body = (await response.json()) as { data: CartView };
      setCart(body.data);
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
      const body = (await response.json()) as { data: CartView };
      setCart(body.data);
      router.refresh();
    } catch {
      toastError("Unable to remove item.");
    } finally {
      setPendingLineId(null);
    }
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" aria-hidden />}
        title="Your cart is empty"
        description="Browse the menu and add something delicious."
        action={
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-text-inverse"
          >
            Browse menu
          </Link>
        }
      />
    );
  }

  const hasUnavailable = cart.items.some((item) => !item.available);

  return (
    <div className="space-y-6 pb-28">
      <div>
        <Link
          href="/"
          className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
        >
          ← Keep shopping
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Cart</h1>
      </div>

      {hasUnavailable ? (
        <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
          Some items are no longer available. Remove them before checkout.
        </p>
      ) : null}

      <div className="space-y-3">
        {cart.items.map((line) => (
          <div
            key={line.id}
            className="rounded-lg border border-border bg-surface-elevated p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {line.name}
                  {!line.available ? (
                    <span className="ml-2 text-xs font-medium text-error">Sold out</span>
                  ) : null}
                </p>
                {line.modifiers.length > 0 ? (
                  <p className="mt-1 text-sm text-text-secondary">
                    {line.modifiers.map((modifier) => modifier.name).join(", ")}
                  </p>
                ) : null}
                <p className="mt-2 text-sm font-medium text-foreground">
                  {formatCadFromCents(line.lineTotalCents)}
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-text-tertiary hover:text-foreground"
                disabled={pendingLineId === line.id}
                onClick={() => removeLine(line.id)}
              >
                Remove
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
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 text-base">
        <span className="font-medium text-text-secondary">Subtotal</span>
        <span className="font-semibold text-foreground">
          {formatCadFromCents(cart.subtotalCents)}
        </span>
      </div>

      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-border bg-background/95 p-4 backdrop-blur md:bottom-0 md:safe-bottom">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/checkout"
            aria-disabled={hasUnavailable}
            onClick={(event) => {
              if (hasUnavailable) {
                event.preventDefault();
              }
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
