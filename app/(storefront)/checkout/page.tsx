import { CheckoutClient } from "@/components/features/storefront/checkout-client";
import { computeOrderTotals } from "@/lib/domain/order/totals";
import {
  getSquareApplicationId,
  getSquareEnvironment,
  getSquareLocationId,
  getTaxRateBps,
  isSquareConfigured,
} from "@/lib/integrations/payments/square/config";
import { getCart } from "@/lib/services/cart/cart-actions";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import {
  getPublicStoreHoursSchedule,
  getPublicStoreOpenStatus,
} from "@/lib/services/store/store-hours";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";

export default async function CheckoutPage() {
  const storeId = await resolvePublicStoreId();
  const [cart, openStatus, hours, store] = await Promise.all([
    getCart(),
    getPublicStoreOpenStatus(storeId),
    getPublicStoreHoursSchedule(storeId),
    storeRepository.getProfileById(storeId),
  ]);
  const configured = isSquareConfigured();
  const taxRateBps = getTaxRateBps();

  computeOrderTotals(cart.subtotalCents, 0, taxRateBps);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <CheckoutClient
        initialCart={cart}
        configured={configured}
        applicationId={configured ? getSquareApplicationId() : null}
        locationId={configured ? getSquareLocationId() : null}
        environment={getSquareEnvironment()}
        taxRateBps={taxRateBps}
        openStatus={openStatus}
        storeName={store?.name ?? "Restaurant"}
        scheduleDays={hours.days}
        scheduleTimeZone={hours.timezone}
      />
    </div>
  );
}
