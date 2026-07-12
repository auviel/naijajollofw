"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PublicOrderView } from "@/lib/domain/order/types";
import { ORDER_STATUS_LABELS } from "@/lib/domain/order/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

type OrderStatusClientProps = {
  orderId: string;
  token: string;
  initialOrder: PublicOrderView | null;
  initialError: string | null;
};

export function OrderStatusClient({
  orderId,
  token,
  initialOrder,
  initialError,
}: OrderStatusClientProps) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const error = initialError;

  useEffect(() => {
    if (!token || !order) {
      return;
    }

    const terminal =
      order.status === "completed" || order.status === "cancelled";
    if (terminal) {
      return;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/orders/${orderId}?token=${encodeURIComponent(token)}`,
            { cache: "no-store" },
          );
          if (!response.ok) {
            return;
          }
          const body = (await response.json()) as { data: PublicOrderView };
          setOrder(body.data);
          router.refresh();
        } catch {
          // Keep showing last known status.
        }
      })();
    }, 12_000);

    return () => window.clearInterval(interval);
  }, [orderId, token, order, router]);

  if (error || !order) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Order not found
        </h1>
        <p className="text-sm text-text-secondary">
          {error ?? "This tracking link is invalid or expired."}
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-text-inverse"
        >
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium text-text-secondary">{order.storeName}</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {ORDER_STATUS_LABELS[order.status]}
        </h1>
        <p className="text-base text-text-secondary">{order.statusMessage}</p>
        <p className="text-sm text-text-tertiary">
          {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"} for{" "}
          {order.customerName}
        </p>
        {order.scheduledFor ? (
          <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            Scheduled for{" "}
            <span className="font-medium text-foreground">
              {new Date(order.scheduledFor).toLocaleString("en-CA", {
                weekday: "long",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </p>
        ) : null}
      </div>

      {order.timeline.cancelled ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="status"
        >
          This order was cancelled.
        </p>
      ) : (
        <ol className="space-y-0">
          {order.timeline.steps.map((step, index) => (
            <li key={step.id} className="flex gap-3">
              <div className="flex w-6 flex-col items-center">
                <span
                  className={cn(
                    "mt-1 flex h-3 w-3 shrink-0 rounded-full",
                    step.state === "complete" && "bg-accent",
                    step.state === "current" && "bg-accent ring-4 ring-accent/20",
                    step.state === "upcoming" && "bg-border",
                  )}
                />
                {index < order.timeline.steps.length - 1 ? (
                  <span
                    className={cn(
                      "w-px flex-1",
                      step.state === "complete" ? "bg-accent/40" : "bg-border",
                    )}
                  />
                ) : null}
              </div>
              <div
                className={cn(
                  "pb-5",
                  step.state === "upcoming" && "opacity-50",
                )}
              >
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.state === "current"
                      ? "text-foreground"
                      : "text-text-secondary",
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-text-tertiary">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {order.tracking?.url ? (
        <a
          href={order.tracking.url}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-text-inverse"
        >
          Track with {order.tracking.providerLabel ?? "courier"}
        </a>
      ) : null}

      {order.dropoffAddress ? (
        <p className="text-sm text-text-secondary">
          Delivering to {order.dropoffAddress}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Items
        </h2>
        <ul className="space-y-3">
          {order.lineItems.map((line) => (
            <li key={line.id} className="flex justify-between gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  {line.quantity}× {line.name}
                </p>
                {line.modifiers.length > 0 ? (
                  <p className="text-text-secondary">
                    {line.modifiers.map((m) => m.name).join(", ")}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-text-secondary">
                {formatCadFromCents(line.lineTotalCents)}
              </p>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span>{formatCadFromCents(order.subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Tax</span>
            <span>{formatCadFromCents(order.taxCents)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Tip</span>
            <span>{formatCadFromCents(order.tipCents)}</span>
          </div>
          <div className="flex justify-between font-semibold text-foreground">
            <span>Total</span>
            <span>{formatCadFromCents(order.totalCents)}</span>
          </div>
        </div>
      </section>

      <Link
        href="/"
        className="inline-flex text-sm font-medium text-accent hover:underline"
      >
        Order something else
      </Link>
    </div>
  );
}
