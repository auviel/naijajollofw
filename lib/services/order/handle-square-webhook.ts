import { orderRepository } from "@/lib/db/repositories/order.repository";
import {
  parseSquareWebhookEvent,
  verifySquareWebhookSignature,
} from "@/lib/integrations/payments/square/webhook";
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
    await orderRepository.updateStatusBySquarePaymentId(
      paymentId,
      "cancelled",
      `Square payment ${status.toLowerCase()}`,
    );
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
