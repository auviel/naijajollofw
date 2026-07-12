"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import type { TransitionAction } from "@/lib/domain/order/transitions";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Unable to update order.";
}

type OrderTransitionButtonsProps = {
  orderId: string;
  actions: TransitionAction[];
  onTransitioned?: (status: OrderStatus) => void;
  compact?: boolean;
};

export function OrderTransitionButtons({
  orderId,
  actions,
  onTransitioned,
  compact = false,
}: OrderTransitionButtonsProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [pendingTo, setPendingTo] = useState<OrderStatus | null>(null);

  if (actions.length === 0) {
    return null;
  }

  async function runTransition(action: TransitionAction) {
    if (action.to === "cancelled") {
      const confirmed = window.confirm("Cancel this order?");
      if (!confirmed) {
        return;
      }
    }

    setPendingTo(action.to);
    try {
      const response = await fetch(`/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: action.to }),
      });

      if (!response.ok) {
        toastError(await readApiError(response));
        return;
      }

      success(`${action.label} — done`);
      onTransitioned?.(action.to);
      router.refresh();
    } catch {
      toastError("Unable to update order.");
    } finally {
      setPendingTo(null);
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}>
      {actions.map((action) => (
        <button
          key={action.to}
          type="button"
          disabled={pendingTo !== null}
          onClick={() => void runTransition(action)}
          className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-opacity disabled:opacity-50",
            compact ? "h-9 px-3" : "h-10 px-4",
            action.variant === "primary" &&
              "bg-accent text-text-inverse hover:opacity-90",
            action.variant === "secondary" &&
              "border border-border bg-surface-elevated text-foreground",
            action.variant === "danger" &&
              "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
          )}
        >
          {pendingTo === action.to ? "…" : action.label}
        </button>
      ))}
    </div>
  );
}

type OrderQuickLinkProps = {
  orderId: string;
  className?: string;
};

export function OrderDetailLink({ orderId, className }: OrderQuickLinkProps) {
  return (
    <Link
      href={`/dashboard/orders/${orderId}`}
      className={cn(
        "text-sm font-medium text-accent hover:underline",
        className,
      )}
    >
      Details
    </Link>
  );
}
