import type { Prisma } from "@prisma/client";
import { deliveryRepository } from "@/lib/db/repositories/delivery.repository";
import { webhookEventRepository } from "@/lib/db/repositories/webhook-event.repository";
import { mapUberDeliveryStatus } from "@/lib/integrations/delivery/uber/mappers";
import {
  getUberWebhookSigningSecret,
  parseUberDeliveryWebhook,
  UBER_DAAS_DELIVERY_STATUS_EVENT,
  UBER_STATUS_CHANGED_EVENT,
  verifyUberWebhookSignature,
} from "@/lib/integrations/delivery/uber/webhook";
import { syncDeliveryFromProvider } from "@/lib/services/delivery/sync-from-provider";
import { syncOrderFromLinkedDelivery } from "@/lib/services/order/sync-order-from-delivery";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

async function resolveDeliveryForWebhook(input: {
  externalOrderId?: string;
  providerDeliveryId?: string;
  providerOrderId?: string;
}) {
  if (input.externalOrderId) {
    const byExternal = await deliveryRepository.findByExternalId(input.externalOrderId);
    if (byExternal) {
      return byExternal;
    }
  }

  if (input.providerDeliveryId) {
    const byProviderDelivery = await deliveryRepository.findByProviderDeliveryId(
      input.providerDeliveryId,
    );
    if (byProviderDelivery) {
      return byProviderDelivery;
    }
  }

  if (input.providerOrderId) {
    const byProviderOrder = await deliveryRepository.findByProviderOrderId(
      input.providerOrderId,
    );
    if (byProviderOrder) {
      return byProviderOrder;
    }

    const byProviderDelivery = await deliveryRepository.findByProviderDeliveryId(
      input.providerOrderId,
    );
    if (byProviderDelivery) {
      return byProviderDelivery;
    }
  }

  return null;
}

/** Process Uber Direct DaaS or Eats Direct status webhooks. */
export async function handleUberWebhook(
  rawBody: string,
  headers: Headers,
): Promise<void> {
  const secret = getUberWebhookSigningSecret();
  if (!secret) {
    throw new AppError(
      "PROVIDER_ERROR",
      "Webhook signing secret is not configured. Set UBER_WEBHOOK_SIGNING_SECRET or UBER_CLIENT_SECRET.",
      500,
    );
  }

  const signature = headers.get("x-uber-signature");
  if (!verifyUberWebhookSignature(rawBody, signature, secret)) {
    throw new AppError("UNAUTHORIZED", "Invalid webhook signature", 401);
  }

  let payload: ReturnType<typeof parseUberDeliveryWebhook>;
  try {
    payload = parseUberDeliveryWebhook(rawBody);
  } catch (error) {
    logger.error("webhook.parse.failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError("VALIDATION_ERROR", "Invalid webhook payload", 400);
  }

  if ("ignore" in payload) {
    logger.info("webhook.ignored", { eventType: payload.eventType });
    return;
  }

  if (
    payload.eventType !== UBER_STATUS_CHANGED_EVENT &&
    payload.eventType !== UBER_DAAS_DELIVERY_STATUS_EVENT
  ) {
    logger.info("webhook.ignored", { eventType: payload.eventType });
    return;
  }

  const { event, created } = await webhookEventRepository.createIfNotExists({
    eventId: payload.eventId,
    eventType: payload.eventType,
    payload: JSON.parse(rawBody) as Prisma.InputJsonValue,
  });

  if (!created && event.processedAt) {
    logger.info("webhook.duplicate", { eventId: payload.eventId });
    return;
  }

  const delivery = await resolveDeliveryForWebhook({
    externalOrderId: payload.externalOrderId,
    providerDeliveryId: payload.providerDeliveryId,
    providerOrderId: payload.providerOrderId,
  });

  if (!delivery) {
    logger.warn("webhook.delivery_not_found", {
      eventId: payload.eventId,
      externalOrderId: payload.externalOrderId,
      providerDeliveryId: payload.providerDeliveryId,
      providerOrderId: payload.providerOrderId,
    });
    await webhookEventRepository.markProcessed(event.id);
    return;
  }

  const status = mapUberDeliveryStatus(payload.status);

  let updated = await deliveryRepository.update(delivery.id, delivery.storeId, {
    status,
    ...(payload.providerOrderId
      ? { providerOrderId: payload.providerOrderId }
      : {}),
    ...(payload.providerDeliveryId
      ? {
          providerDeliveryId:
            delivery.providerDeliveryId ?? payload.providerDeliveryId,
        }
      : {}),
  });

  if (status === "completed") {
    updated = await syncDeliveryFromProvider(updated);
  }

  await syncOrderFromLinkedDelivery(updated);

  await webhookEventRepository.markProcessed(event.id, updated.id);

  logger.info("webhook.processed", {
    eventId: payload.eventId,
    deliveryId: updated.id,
    status: updated.status,
  });
}
