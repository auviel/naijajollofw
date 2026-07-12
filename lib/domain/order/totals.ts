import { getTaxRateBps } from "@/lib/integrations/payments/square/config";
import type { OrderTotals } from "@/lib/domain/order/types";

/** Tax applies to food subtotal only (not tip), Ontario HST by default. */
export function computeOrderTotals(
  subtotalCents: number,
  tipCents: number,
  taxRateBps = getTaxRateBps(),
): OrderTotals {
  const safeSubtotal = Math.max(0, Math.floor(subtotalCents));
  const safeTip = Math.max(0, Math.floor(tipCents));
  const taxCents = Math.round((safeSubtotal * taxRateBps) / 10_000);

  return {
    subtotalCents: safeSubtotal,
    tipCents: safeTip,
    taxCents,
    totalCents: safeSubtotal + taxCents + safeTip,
    currency: "CAD",
  };
}
