import type { Metadata } from "next";
import Link from "next/link";
import { requireDiner } from "@/lib/auth/session";
import {
  mapOrderToPublicView,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import { formatCadFromCents } from "@/lib/utils/currency";

export const metadata: Metadata = {
  title: "Orders",
  description: "Your order history.",
};

export default async function AccountOrdersPage() {
  const user = await requireDiner();
  const orders = await orderRepository.findManyForUser(user.id, 50);
  const views = orders.map((order) => mapOrderToPublicView(order));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Orders
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Track pickups and deliveries from this restaurant.
        </p>
      </div>

      {views.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No orders yet.{" "}
          <Link href="/#menu" className="font-medium text-accent no-underline hover:underline">
            Browse the menu
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {views.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}?token=${order.publicToken}`}
                className="flex flex-col gap-1 py-4 no-underline transition-colors hover:bg-surface/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {order.statusMessage}
                  </p>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {order.placedAt
                      ? new Date(order.placedAt).toLocaleString("en-CA", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Placed recently"}
                    <span aria-hidden className="mx-1.5">
                      ·
                    </span>
                    {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
                  </p>
                </div>
                <p className="text-sm font-medium text-foreground tabular-nums">
                  {formatCadFromCents(order.totalCents)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
