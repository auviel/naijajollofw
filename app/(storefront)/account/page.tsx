import type { Metadata } from "next";
import Link from "next/link";
import { DinerChangePasswordForm } from "@/components/features/storefront/diner-change-password-form";
import { DinerSignOutButton } from "@/components/features/storefront/diner-sign-out-button";
import { EmailVerifyBanner } from "@/components/features/storefront/email-verify-banner";
import { requireDiner } from "@/lib/auth/session";
import { formatPhoneForDisplay } from "@/lib/domain/customer/format";
import {
  mapOrderToPublicView,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { formatCadFromCents } from "@/lib/utils/currency";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Naija Jollof Waterloo account and orders.",
};

export default async function AccountPage() {
  const sessionUser = await requireDiner();
  const [dbUser, orders] = await Promise.all([
    userRepository.findById(sessionUser.id),
    orderRepository.findManyForUser(sessionUser.id, 20),
  ]);
  const views = orders.map((order) => mapOrderToPublicView(order));
  const emailVerified = Boolean(dbUser?.emailVerifiedAt);

  return (
    <section className="mx-auto w-full max-w-2xl py-8 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Account
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {sessionUser.name}
            <span aria-hidden className="mx-2 text-border-strong">
              ·
            </span>
            {sessionUser.email}
            {sessionUser.phoneE164 ? (
              <>
                <span aria-hidden className="mx-2 text-border-strong">
                  ·
                </span>
                {formatPhoneForDisplay(sessionUser.phoneE164)}
              </>
            ) : null}
          </p>
        </div>
        <DinerSignOutButton />
      </div>

      {!emailVerified ? (
        <EmailVerifyBanner email={sessionUser.email} />
      ) : null}

      <section className="mt-10" aria-labelledby="security-heading">
        <h2
          id="security-heading"
          className="font-display text-xl font-semibold text-foreground"
        >
          Security
        </h2>
        <div className="mt-4 rounded-2xl border border-border bg-background p-5 sm:p-6">
          <DinerChangePasswordForm emailVerified={emailVerified} />
        </div>
      </section>

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
