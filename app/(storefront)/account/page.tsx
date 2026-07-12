import type { Metadata } from "next";
import Link from "next/link";
import { DinerSignOutButton } from "@/components/features/storefront/diner-sign-out-button";
import { requireDiner } from "@/lib/auth/session";
import { formatPhoneForDisplay } from "@/lib/domain/customer/format";
import {
  mapOrderToPublicView,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import { formatCadFromCents } from "@/lib/utils/currency";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Naija Jollof Waterloo account and orders.",
};

export default async function AccountPage() {
  const user = await requireDiner();
  const orders = await orderRepository.findManyForUser(user.id, 20);
  const views = orders.map((order) => mapOrderToPublicView(order));

  return (
    <section className="mx-auto w-full max-w-2xl py-8 sm:py-12">
      <p className="text-sm text-text-tertiary">
        <Link
          href="/"
          className="text-text-secondary no-underline transition-colors hover:text-foreground"
        >
          Home
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <span>Account</span>
      </p>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Account
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {user.name}
            <span aria-hidden className="mx-2 text-border-strong">
              ·
            </span>
            {user.email}
            {user.phoneE164 ? (
              <>
                <span aria-hidden className="mx-2 text-border-strong">
                  ·
                </span>
                {formatPhoneForDisplay(user.phoneE164)}
              </>
            ) : null}
          </p>
        </div>
        <DinerSignOutButton />
      </div>

      <section className="mt-10" aria-labelledby="orders-heading">
        <h2
          id="orders-heading"
          className="font-display text-xl font-semibold text-foreground"
        >
          Your orders
        </h2>

        {views.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            No orders yet.{" "}
            <Link
              href="/#menu"
              className="font-medium text-accent no-underline hover:underline"
            >
              Browse the menu
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
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
                      {order.fulfillmentType === "delivery"
                        ? "Delivery"
                        : "Pickup"}
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
    </section>
  );
}
