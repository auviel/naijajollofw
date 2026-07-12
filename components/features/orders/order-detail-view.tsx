"use client";

import Link from "next/link";
import { OrderStatusBadge } from "@/components/features/orders/order-status-badge";
import { OrderFulfillPanel } from "@/components/features/orders/order-fulfill-panel";
import { OrderTransitionButtons } from "@/components/features/orders/order-transition-buttons";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { ORDER_STATUS_LABELS } from "@/lib/domain/order/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

type OrderDetailViewProps = {
  order: StaffOrderDetail;
};

export function OrderDetailView({ order }: OrderDetailViewProps) {
  const trackingPath = `/orders/${order.id}?token=${order.publicToken}`;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <span className="text-sm text-text-secondary">
              {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            Placed{" "}
            {new Date(order.placedAt ?? order.createdAt).toLocaleString("en-CA", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <OrderTransitionButtons orderId={order.id} actions={order.allowedActions} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 rounded-2xl border border-border bg-surface-elevated p-4">
          <h2 className="text-sm font-semibold text-foreground">Customer</h2>
          <p className="text-sm text-foreground">{order.customerName}</p>
          <p className="text-sm text-text-secondary">{order.customerPhone}</p>
          {order.dropoffAddress ? (
            <p className="text-sm text-text-secondary">{order.dropoffAddress}</p>
          ) : null}
          {order.notes ? (
            <p className="pt-2 text-sm text-text-secondary">Note: {order.notes}</p>
          ) : null}
        </div>
        <div className="space-y-1 rounded-2xl border border-border bg-surface-elevated p-4">
          <h2 className="text-sm font-semibold text-foreground">Guest tracking</h2>
          <p className="text-sm text-text-secondary">
            Share this link so the diner can follow status.
          </p>
          <Link
            href={trackingPath}
            className="inline-flex text-sm font-medium text-accent hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Open tracking page
          </Link>
        </div>
      </section>

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
          <div className="flex justify-between font-semibold text-foreground">
            <span>Total</span>
            <span>{formatCadFromCents(order.totalCents)}</span>
          </div>
        </div>
      </section>

      <OrderFulfillPanel order={order} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Timeline
        </h2>
        <ol className="space-y-3 border-l border-border pl-4">
          {order.events.map((event, index) => (
            <li key={event.id} className="relative space-y-0.5">
              <span
                className={cn(
                  "absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full",
                  index === order.events.length - 1 ? "bg-accent" : "bg-border",
                )}
              />
              <p className="text-sm font-medium text-foreground">
                {ORDER_STATUS_LABELS[event.status]}
              </p>
              <p className="text-xs text-text-tertiary">
                {new Date(event.createdAt).toLocaleString("en-CA", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {" · "}
                {event.actor}
                {event.note ? ` · ${event.note}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
