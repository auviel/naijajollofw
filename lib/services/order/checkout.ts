import {
  cartRepository,
  mapCartToView,
} from "@/lib/db/repositories/cart.repository";
import {
  mapOrderToPublicView,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import type { PublicOrderView } from "@/lib/domain/order/types";
import { computeOrderTotals } from "@/lib/domain/order/totals";
import {
  checkoutRequestSchema,
  type CheckoutRequest,
} from "@/lib/domain/order/validation";
import { createSquarePayment } from "@/lib/integrations/payments/square/client";
import { readCartSessionId } from "@/lib/services/cart/session";
import { getPublicStoreOpenStatus } from "@/lib/services/store/store-hours";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";
import { AppError } from "@/lib/utils/errors";
import { normalizeCanadianPhone } from "@/lib/utils/phone";
import { logger } from "@/lib/utils/logger";

export type CheckoutResult = {
  order: PublicOrderView;
};

export async function checkoutWithSquare(
  input: unknown,
): Promise<CheckoutResult> {
  const parsed: CheckoutRequest = checkoutRequestSchema.parse(input);
  const storeId = await resolvePublicStoreId();
  const openStatus = await getPublicStoreOpenStatus(storeId);

  let scheduledFor: Date | null = null;
  if (!openStatus.isOpen) {
    if (!openStatus.nextOpenAt) {
      throw new AppError(
        "VALIDATION_ERROR",
        openStatus.message || "The restaurant is currently closed.",
        400,
      );
    }
    scheduledFor = new Date(openStatus.nextOpenAt);
  }

  const sessionId = await readCartSessionId();

  if (!sessionId) {
    throw new AppError("VALIDATION_ERROR", "Your cart is empty.", 400);
  }

  const cart = await cartRepository.findByStoreAndSession(storeId, sessionId);
  const cartView = mapCartToView(storeId, cart);

  if (!cart || cartView.items.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Your cart is empty.", 400);
  }

  const unavailable = cartView.items.filter((line) => !line.available);
  if (unavailable.length > 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Some items are no longer available. Update your cart before paying.",
      400,
    );
  }

  const phone = normalizeCanadianPhone(parsed.customerPhone);
  if (!phone) {
    throw new AppError("VALIDATION_ERROR", "Enter a valid Canadian phone number.", 400);
  }

  const totals = computeOrderTotals(cartView.subtotalCents, parsed.tipCents);
  if (totals.totalCents < 50) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Order total is too small to charge.",
      400,
    );
  }

  const payment = await createSquarePayment({
    sourceId: parsed.sourceId,
    amountCents: totals.totalCents,
    currency: totals.currency,
    idempotencyKey: parsed.idempotencyKey,
    note: `deliverGO ${parsed.fulfillmentType} order`,
    referenceId: sessionId.slice(0, 40),
  });

  const existing = await orderRepository.findBySquarePaymentId(payment.paymentId);
  if (existing) {
    await cartRepository.clearCart(cart.id);
    return { order: mapOrderToPublicView(existing) };
  }

  try {
    const order = await orderRepository.createPaidOrder({
      storeId,
      fulfillmentType: parsed.fulfillmentType,
      customerName: parsed.customerName.trim(),
      customerPhone: phone,
      dropoffAddress:
        parsed.fulfillmentType === "delivery"
          ? parsed.dropoffAddress?.trim() ?? null
          : null,
      dropoffLat:
        parsed.fulfillmentType === "delivery" ? (parsed.dropoffLat ?? null) : null,
      dropoffLng:
        parsed.fulfillmentType === "delivery" ? (parsed.dropoffLng ?? null) : null,
      notes: parsed.notes?.trim() || null,
      scheduledFor,
      subtotalCents: totals.subtotalCents,
      tipCents: totals.tipCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      currency: totals.currency,
      squarePaymentId: payment.paymentId,
      lineItems: cartView.items.map((line) => ({
        name: line.name,
        description: line.description,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
        modifiers: line.modifiers,
        lineTotalCents: line.lineTotalCents,
        menuItemId: line.menuItemId,
      })),
    });

    await cartRepository.clearCart(cart.id);

    return { order: mapOrderToPublicView(order) };
  } catch (error) {
    logger.error("checkout.order_create_failed", {
      paymentId: payment.paymentId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError(
      "INTERNAL_ERROR",
      "Payment succeeded but we could not save your order. Contact the restaurant with your payment receipt.",
      500,
      { paymentId: payment.paymentId },
    );
  }
}
