import type { Metadata } from "next";
import { CheckoutClient } from "@/components/features/storefront/checkout-client";
import { getOptionalSessionUser } from "@/lib/auth/session";
import { privatePageMetadata } from "@/lib/seo/noindex";
import { phoneE164ToFormValue } from "@/lib/domain/customer/format";
import { clampTipCents } from "@/lib/domain/order/tip";
import { computeOrderTotals } from "@/lib/domain/order/totals";
import { customerRepository } from "@/lib/db/repositories/customer.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import {
  getSquareApplicationId,
  getSquareEnvironment,
  getSquareLocationId,
  getTaxRateBps,
  isCheckoutSimulatePayments,
  isSquareConfigured,
} from "@/lib/integrations/payments/square/config";
import { getCart } from "@/lib/services/cart/cart-actions";
import {
  getPublicStoreHoursSchedule,
  getPublicStoreOpenStatus,
} from "@/lib/services/store/store-hours";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";

export const metadata: Metadata = privatePageMetadata({
  title: "Checkout",
  description: "Complete your Naija Jollof Waterloo order.",
});

type PageProps = {
  searchParams: Promise<{
    cartSid?: string;
    fulfillment?: string;
    tipCents?: string;
  }>;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const storeId = await resolvePublicStoreId();
  const [cart, openStatus, hours, sessionUser] = await Promise.all([
    getCart(),
    getPublicStoreOpenStatus(storeId),
    getPublicStoreHoursSchedule(storeId),
    getOptionalSessionUser(),
  ]);
  const configured = isSquareConfigured();
  const simulatePayments = isCheckoutSimulatePayments();
  const taxRateBps = getTaxRateBps();

  computeOrderTotals(cart.subtotalCents, 0, taxRateBps);

  const diner =
    sessionUser?.role === "DINER" && sessionUser.storeId === storeId
      ? sessionUser
      : null;

  let defaultAddress: {
    formatted: string;
    line2: string | null;
  } | null = null;

  if (diner) {
    const fullUser = await userRepository.findById(diner.id);
    const customerId = fullUser?.customerId;
    if (customerId) {
      const addresses = await customerRepository.listAddresses(customerId);
      const primary =
        addresses.find((item) => item.isPrimary) ?? addresses[0] ?? null;
      if (primary) {
        defaultAddress = {
          formatted: primary.formatted,
          line2: primary.line2,
        };
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <CheckoutClient
        initialCart={cart}
        configured={configured}
        simulatePayments={simulatePayments}
        applicationId={configured ? getSquareApplicationId() : null}
        locationId={configured ? getSquareLocationId() : null}
        environment={getSquareEnvironment()}
        taxRateBps={taxRateBps}
        openStatus={openStatus}
        scheduleDays={hours.days}
        scheduleTimeZone={hours.timezone}
        initialCustomerName={diner?.name ?? ""}
        initialCustomerPhone={
          diner?.phoneE164 ? phoneE164ToFormValue(diner.phoneE164) : ""
        }
        initialCustomerEmail={diner?.email ?? ""}
        initialDeliveryAddress={defaultAddress?.formatted ?? ""}
        initialDeliveryUnit={defaultAddress?.line2 ?? ""}
        initialFulfillmentType={
          params.fulfillment === "delivery" ? "delivery" : "pickup"
        }
        initialTipCents={clampTipCents(Number(params.tipCents ?? 0))}
      />
    </div>
  );
}
