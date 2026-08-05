"use client";

import Link from "next/link";
import { OrderStatusBadge } from "@/components/features/orders/order-status-badge";
import { OrderFulfillPanel } from "@/components/features/orders/order-fulfill-panel";
import { OrderTransitionButtons } from "@/components/features/orders/order-transition-buttons";
import { ArrowLeft, Calendar, Call, ExternalLink } from "@/components/ui/icons";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { getOrderStatusLabel } from "@/lib/domain/order/types";
import { formatKitchenScheduled } from "@/lib/domain/order/kitchen-format";
import { formatCadFromCents } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

type OrderDetailViewProps = {
  order: StaffOrderDetail;
};

export function OrderDetailView({ order }: OrderDetailViewProps) {
  const trackingPath = `/orders/${order.id}?token=${order.publicToken}`;
  const mode = order.fulfillmentType === "delivery" ? "Delivery" : "Pickup";
  const showFulfill =
    order.needsFulfillment ||
    Boolean(order.linkedDelivery) ||
    order.fulfillmentMethod === "manual";

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Board
          </Link>

          <div className="space-y-2">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-2">
              <h1 className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                {order.displayNumber ?? "Order"}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-1.5">
                <OrderStatusBadge status={order.status} className="shrink-0" />
                <span className="inline-flex shrink-0 items-center rounded-full bg-surface px-3 py-1 text-xs font-medium text-foreground">
                  {mode}
                </span>
              </div>
            </div>
            {order.scheduledFor ? (
              <p className="inline-flex items-center gap-1.5 text-base font-semibold text-amber-800">
                <Calendar className="h-4 w-4" aria-hidden />
                Scheduled {formatKitchenScheduled(order.scheduledFor)}
              </p>
            ) : null}
          </div>
        </div>

        <OrderTransitionButtons
          orderId={order.id}
          actions={order.allowedActions}
          className="w-full flex-col lg:w-auto lg:flex-row lg:justify-end"
          buttonClassName="w-full lg:w-auto"
        />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2 rounded-2xl bg-surface-elevated p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Customer
          </h2>
          <p className="text-base font-medium text-foreground">
            {order.customerName}
          </p>
          <a
            href={`tel:${order.customerPhone}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <Call className="h-4 w-4" aria-hidden />
            {order.customerPhone}
          </a>
          {order.dropoffAddress ? (
            <p className="text-sm text-text-secondary">{order.dropoffAddress}</p>
          ) : null}
          {order.notes ? (
            <p className="text-sm text-text-secondary">Note: {order.notes}</p>
          ) : null}
        </div>

        <div className="space-y-2 rounded-2xl bg-surface-elevated p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Guest tracking
          </h2>
          <p className="text-sm text-text-secondary">
            Share so the diner can follow status.
          </p>
          <Link
            href={trackingPath}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Open tracking page
          </Link>
        </div>
      </section>

      {showFulfill ? <OrderFulfillPanel order={order} /> : null}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
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
              <p className="shrink-0 tabular-nums text-text-secondary">
                {formatCadFromCents(line.lineTotalCents)}
              </p>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatCadFromCents(order.subtotalCents)}
            </span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Tax</span>
            <span className="tabular-nums">
              {formatCadFromCents(order.taxCents)}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-foreground">
            <span>Total</span>
            <span className="tabular-nums">
              {formatCadFromCents(order.totalCents)}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
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
                {getOrderStatusLabel(event.status)}
              </p>
              <p className="text-xs text-text-tertiary">
                {formatDateTime(event.createdAt)}
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
