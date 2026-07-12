import type { Prisma } from "@prisma/client";
import { deliveryRepository } from "@/lib/db/repositories/delivery.repository";
import { webhookEventRepository } from "@/lib/db/repositories/webhook-event.repository";
import { mapProviderStatusToDomain } from "@/lib/domain/delivery/status";
import { uberDirectAdapter } from "@/lib/integrations/delivery/uber/adapter";
import {
  getUberWebhookSigningSecret,
  parseUberStatusChangedWebhook,
  UBER_STATUS_CHANGED_EVENT,
  verifyUberWebhookSignature,
} from "@/lib/integrations/delivery/uber/webhook";
import { syncDeliveryFromProvider } from "@/lib/services/delivery/sync-from-provider";
import { syncOrderFromLinkedDelivery } from "@/lib/services/order/sync-order-from-delivery";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

async function resolveDeliveryForWebhook(input: {
  externalOrderId?: string;
  orderId?: string;
}) {
  if (input.externalOrderId) {
    const byExternal = await deliveryRepository.findByExternalId(input.externalOrderId);
    if (byExternal) {
      return byExternal;
    }
  }

  if (input.orderId) {
    const byProviderDelivery = await deliveryRepository.findByProviderDeliveryId(
      input.orderId,
    );
    if (byProviderDelivery) {
      return byProviderDelivery;
    }

    const byProviderOrder = await deliveryRepository.findByProviderOrderId(
      input.orderId,
    );
    if (byProviderOrder) {
      return byProviderOrder;
    }
  }

  return null;
}

/** Process an Uber Direct dapi.status_changed webhook. */
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

  let payload: ReturnType<typeof parseUberStatusChangedWebhook>;
  try {
    payload = parseUberStatusChangedWebhook(rawBody);
  } catch (error) {
    logger.error("webhook.parse.failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError("VALIDATION_ERROR", "Invalid webhook payload", 400);
  }

  if (payload.event_type !== UBER_STATUS_CHANGED_EVENT) {
    logger.info("webhook.ignored", { eventType: payload.event_type });
    return;
  }

  const parsedEvent = await uberDirectAdapter.parseWebhook(rawBody, headers);
  if (!parsedEvent) {
    return;
  }

  const { event, created } = await webhookEventRepository.createIfNotExists({
    eventId: payload.event_id,
    eventType: payload.event_type,
    payload: JSON.parse(rawBody) as Prisma.InputJsonValue,
  });

  if (!created && event.processedAt) {
    logger.info("webhook.duplicate", { eventId: payload.event_id });
    return;
  }

  const delivery = await resolveDeliveryForWebhook({
    externalOrderId: payload.meta.external_order_id,
    orderId: payload.meta.order_id,
  });

  if (!delivery) {
    logger.warn("webhook.delivery_not_found", {
      eventId: payload.event_id,
      externalOrderId: payload.meta.external_order_id,
      orderId: payload.meta.order_id,
    });
    await webhookEventRepository.markProcessed(event.id);
    return;
  }

  const status = mapProviderStatusToDomain(payload.meta.status);

  let updated = await deliveryRepository.update(delivery.id, delivery.storeId, {
    status,
    ...(payload.meta.order_id
      ? {
          providerOrderId: payload.meta.order_id,
          providerDeliveryId: delivery.providerDeliveryId ?? payload.meta.order_id,
        }
      : {}),
  });

  if (status === "completed") {
    updated = await syncDeliveryFromProvider(updated);
  }

  await syncOrderFromLinkedDelivery(updated);

  await webhookEventRepository.markProcessed(event.id, updated.id);

  logger.info("webhook.processed", {
    eventId: payload.event_id,
    deliveryId: updated.id,
    status: updated.status,
  });
}
