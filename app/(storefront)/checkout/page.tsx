import { CheckoutClient } from "@/components/features/storefront/checkout-client";
import { getOptionalSessionUser } from "@/lib/auth/session";
import { phoneE164ToFormValue } from "@/lib/domain/customer/format";
import { computeOrderTotals } from "@/lib/domain/order/totals";
import { userAddressRepository } from "@/lib/db/repositories/user-address.repository";
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

export default async function CheckoutPage() {
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

  const addresses = diner
    ? await userAddressRepository.listForUser(diner.id)
    : [];
  const defaultAddress =
    addresses.find((item) => item.isDefault) ?? addresses[0] ?? null;

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
      />
    </div>
  );
}
