import { orderRepository } from "@/lib/db/repositories/order.repository";
import {
  parseSquareWebhookEvent,
  verifySquareWebhookSignature,
} from "@/lib/integrations/payments/square/webhook";
import { notifyOrderStatus } from "@/lib/services/order/notify-order-status";
import { logger } from "@/lib/utils/logger";

export async function handleSquareWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<void> {
  await verifySquareWebhookSignature(rawBody, signatureHeader);

  const event = parseSquareWebhookEvent(rawBody);
  const payment = event.data?.object?.payment;
  const paymentId = payment?.id?.trim();
  const status = payment?.status?.toUpperCase();

  if (!paymentId || !event.type?.startsWith("payment.")) {
    logger.info("square.webhook.ignored", { type: event.type });
    return;
  }

  if (status === "FAILED" || status === "CANCELED") {
    const previous = await orderRepository.findBySquarePaymentId(paymentId);
    const updated = await orderRepository.updateStatusBySquarePaymentId(
      paymentId,
      "cancelled",
      `Square payment ${status.toLowerCase()}`,
    );
    if (
      updated &&
      updated.status === "cancelled" &&
      previous?.status !== "cancelled"
    ) {
      void notifyOrderStatus({
        customerPhone: updated.customerPhone,
        customerEmail: updated.customerEmail,
        userEmail: updated.user?.email,
        customerName: updated.customerName,
        storeName: updated.store?.name ?? "Restaurant",
        orderId: updated.id,
        publicToken: updated.publicToken,
        status: "cancelled",
        fulfillmentType: updated.fulfillmentType,
        note: `Square payment ${status.toLowerCase()}`,
      });
    }
    return;
  }

  if (status === "COMPLETED" || status === "APPROVED") {
    const existing = await orderRepository.findBySquarePaymentId(paymentId);
    if (!existing) {
      logger.info("square.webhook.payment_without_order", { paymentId, status });
      return;
    }
    if (existing.status === "pending_payment") {
      await orderRepository.updateStatusBySquarePaymentId(
        paymentId,
        "pending_acceptance",
        "Square payment confirmed",
      );
    }
  }
}
