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
import { getPublicStoreOpenStatus } from "@/lib/services/store/store-hours";

export default async function CheckoutPage() {
  const [cart, openStatus] = await Promise.all([
    getCart(),
    getPublicStoreOpenStatus(),
  ]);
  const configured = isSquareConfigured();
  const taxRateBps = getTaxRateBps();

  // Touch totals so SSR and client stay aligned when env tax rate is set.
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
      />
    </div>
  );
}
