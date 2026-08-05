"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import type { TransitionAction } from "@/lib/domain/order/transitions";
import {
  CheckCircle,
  CookingPot,
  Handshake,
  Package,
  ShoppingBagCheck,
  X,
} from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

const ACTION_ICONS: Partial<
  Record<OrderStatus, typeof CheckCircle>
> = {
  accepted: Handshake,
  preparing: CookingPot,
  ready: Package,
  ready_for_pickup: ShoppingBagCheck,
  completed: CheckCircle,
  cancelled: X,
};

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Unable to update order.";
}

type OrderTransitionButtonsProps = {
  orderId: string;
  actions: TransitionAction[];
  onTransitioned?: (status: OrderStatus) => void;
  compact?: boolean;
  fullWidth?: boolean;
  className?: string;
  buttonClassName?: string;
};

export function OrderTransitionButtons({
  orderId,
  actions,
  onTransitioned,
  compact = false,
  fullWidth = false,
  className,
  buttonClassName,
}: OrderTransitionButtonsProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [pendingTo, setPendingTo] = useState<OrderStatus | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (actions.length === 0) {
    return null;
  }

  const cancelAction = actions.find((action) => action.to === "cancelled");

  async function runTransition(action: TransitionAction) {
    if (action.to === "cancelled") {
      setCancelOpen(true);
      return;
    }

    await executeTransition(action);
  }

  async function executeTransition(action: TransitionAction) {
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
      setCancelOpen(false);
      onTransitioned?.(action.to);
      router.refresh();
    } catch {
      toastError("Unable to update order.");
    } finally {
      setPendingTo(null);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        compact && "gap-1.5",
        fullWidth && "w-full",
        className,
      )}
    >
      {actions.map((action) => {
        const Icon = ACTION_ICONS[action.to];
        return (
          <button
            key={action.to}
            type="button"
            disabled={pendingTo !== null}
            onClick={() => void runTransition(action)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-opacity disabled:opacity-50",
              compact ? "h-9 gap-1.5 px-3" : "h-11 px-4",
              fullWidth && "h-11 w-full",
              action.variant === "primary" &&
                "bg-accent text-text-inverse hover:opacity-90",
              action.variant === "secondary" &&
                "border border-border bg-surface-elevated text-foreground",
              action.variant === "danger" &&
                "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
              buttonClassName,
            )}
          >
            {pendingTo === action.to ? (
              "…"
            ) : (
              <>
                {Icon ? (
                  <Icon
                    className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
                    aria-hidden
                  />
                ) : null}
                {action.label}
              </>
            )}
          </button>
        );
      })}

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this order?"
        description="The kitchen will stop this ticket. The diner will be notified."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        pending={pendingTo === "cancelled"}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => {
          if (cancelAction) {
            void executeTransition(cancelAction);
          }
        }}
      />
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
