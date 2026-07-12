import type { Metadata } from "next";
import Link from "next/link";
import { requireDiner } from "@/lib/auth/session";
import { formatPhoneForDisplay } from "@/lib/domain/customer/format";
import { userAddressRepository } from "@/lib/db/repositories/user-address.repository";
import {
  mapOrderToPublicView,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import { canManageSquareCards } from "@/lib/integrations/payments/square/cards";
import { formatCadFromCents } from "@/lib/utils/currency";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Naija Jollof Waterloo account overview.",
};

export default async function AccountOverviewPage() {
  const user = await requireDiner();
  const [orders, addresses] = await Promise.all([
    orderRepository.findManyForUser(user.id, 5),
    userAddressRepository.listForUser(user.id),
  ]);
  const views = orders.map((order) => mapOrderToPublicView(order));
  const cardsAvailable = canManageSquareCards();

  return (
    <section className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
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

      <div className="grid gap-3 sm:grid-cols-3">
        <OverviewStat label="Recent orders" value={String(views.length)} href="/account/orders" />
        <OverviewStat
          label="Saved addresses"
          value={String(addresses.length)}
          href="/account/address"
        />
        <OverviewStat
          label="Payment"
          value={cardsAvailable ? "Manage cards" : "Unavailable"}
          href="/account/payment"
        />
      </div>

      <section aria-labelledby="recent-orders-heading">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="recent-orders-heading"
            className="font-display text-xl font-semibold text-foreground"
          >
            Recent orders
          </h2>
          <Link
            href="/account/orders"
            className="text-sm font-medium text-accent no-underline hover:underline"
          >
            View all
          </Link>
        </div>
        {views.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            No orders yet.{" "}
            <Link href="/#menu" className="font-medium text-accent no-underline hover:underline">
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

function OverviewStat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-surface-elevated px-4 py-3 no-underline transition-colors hover:border-border-strong"
    >
      <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </Link>
  );
}
