import {
  cartRepository,
  mapCartToView,
} from "@/lib/db/repositories/cart.repository";
import {
  mapOrderToPublicView,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import { getOptionalSessionUser } from "@/lib/auth/session";
import type { PublicOrderView } from "@/lib/domain/order/types";
import { computeOrderTotals } from "@/lib/domain/order/totals";
import {
  checkoutRequestSchema,
  type CheckoutRequest,
} from "@/lib/domain/order/validation";
import { getAppBaseUrl } from "@/lib/integrations/email/resend-client";
import { sendEmailInBackground } from "@/lib/integrations/email/send";
import { buildOrderConfirmationEmail } from "@/lib/integrations/email/templates";
import { createSquarePayment } from "@/lib/integrations/payments/square/client";
import { readCartSessionId } from "@/lib/services/cart/session";
import {
  getPublicStoreHoursSchedule,
  getPublicStoreOpenStatus,
} from "@/lib/services/store/store-hours";
import {
  formatScheduledForLabel,
  isValidScheduleSlot,
} from "@/lib/domain/store/schedule-slots";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";
import { formatCadFromCents } from "@/lib/utils/currency";
import { AppError } from "@/lib/utils/errors";
import { normalizeCanadianPhone } from "@/lib/utils/phone";
import { logger } from "@/lib/utils/logger";

function resolveReceiptEmail(
  parsedEmail: string | undefined,
  dinerEmail: string | undefined,
): string | null {
  const fromForm = parsedEmail?.trim().toLowerCase() || "";
  if (fromForm) return fromForm;
  const fromDiner = dinerEmail?.trim().toLowerCase() || "";
  return fromDiner || null;
}

function sendOrderConfirmationEmail(
  order: PublicOrderView,
  to: string,
  timeZone: string,
): void {
  const trackUrl = `${getAppBaseUrl()}/orders/${order.id}?token=${order.publicToken}`;
  const scheduledLabel = order.scheduledFor
    ? formatScheduledForLabel(order.scheduledFor, timeZone)
    : null;
  const email = buildOrderConfirmationEmail({
    customerName: order.customerName,
    storeName: order.storeName,
    fulfillmentType: order.fulfillmentType,
    totalLabel: formatCadFromCents(order.totalCents),
    trackUrl,
    scheduledLabel,
  });
  sendEmailInBackground({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    idempotencyKey: `order-confirm/${order.id}`,
  });
}

export type CheckoutResult = {
  order: PublicOrderView;
};

export async function checkoutWithSquare(
  input: unknown,
): Promise<CheckoutResult> {
  const parsed: CheckoutRequest = checkoutRequestSchema.parse(input);
  const storeId = await resolvePublicStoreId();
  const sessionUser = await getOptionalSessionUser();
  const diner =
    sessionUser?.role === "DINER" && sessionUser.storeId === storeId
      ? sessionUser
      : null;

  const [openStatus, hours] = await Promise.all([
    getPublicStoreOpenStatus(storeId),
    getPublicStoreHoursSchedule(storeId),
  ]);

  const scheduledFor: Date | null = parsed.scheduledFor ?? null;

  if (!openStatus.isOpen) {
    if (!scheduledFor) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Choose a pickup or delivery time — the restaurant is closed right now.",
        400,
      );
    }
  }

  if (scheduledFor) {
    const valid = isValidScheduleSlot({
      scheduledFor,
      days: hours.days,
      timeZone: hours.timezone,
    });
    if (!valid) {
      throw new AppError(
        "VALIDATION_ERROR",
        "That time is not available. Pick another slot.",
        400,
      );
    }
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

  const customerName =
    parsed.customerName.trim() || diner?.name?.trim() || "";
  if (!customerName) {
    throw new AppError("VALIDATION_ERROR", "Enter your name.", 400);
  }

  const phoneRaw = parsed.customerPhone.trim() || diner?.phoneE164 || "";
  const phone = normalizeCanadianPhone(phoneRaw);
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

  const receiptEmail = resolveReceiptEmail(
    parsed.customerEmail || undefined,
    diner?.email,
  );

  const existing = await orderRepository.findBySquarePaymentId(payment.paymentId);
  if (existing) {
    await cartRepository.clearCart(cart.id);
    const existingView = mapOrderToPublicView(existing);
    if (receiptEmail) {
      sendOrderConfirmationEmail(existingView, receiptEmail, hours.timezone);
    } else {
      logger.info("email.order_confirm_skipped_no_address", {
        orderId: existingView.id,
      });
    }
    return { order: existingView };
  }

  try {
    const order = await orderRepository.createPaidOrder({
      storeId,
      userId: diner?.id ?? null,
      fulfillmentType: parsed.fulfillmentType,
      customerName,
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

    const orderView = mapOrderToPublicView(order);
    if (receiptEmail) {
      sendOrderConfirmationEmail(orderView, receiptEmail, hours.timezone);
    } else {
      logger.info("email.order_confirm_skipped_no_address", {
        orderId: orderView.id,
      });
    }

    return { order: orderView };
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
