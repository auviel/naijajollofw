import { NextResponse } from "next/server";
import {
  getSquareApplicationId,
  getSquareEnvironment,
  getSquareLocationId,
  getTaxRateBps,
  isCheckoutSimulatePayments,
  isSquareConfigured,
} from "@/lib/integrations/payments/square/config";
import { getCart } from "@/lib/services/cart/cart-actions";
import { computeOrderTotals } from "@/lib/domain/order/totals";
import { handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const cart = await getCart();
    const configured = isSquareConfigured();
    const simulatePayments = isCheckoutSimulatePayments();

    return NextResponse.json({
      data: {
        configured,
        simulatePayments,
        applicationId: configured ? getSquareApplicationId() : null,
        locationId: configured ? getSquareLocationId() : null,
        environment: getSquareEnvironment(),
        taxRateBps: getTaxRateBps(),
        cart,
        preview: computeOrderTotals(cart.subtotalCents, 0),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
