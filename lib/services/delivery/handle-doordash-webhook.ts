import type { Prisma } from "@prisma/client";
import { deliveryRepository } from "@/lib/db/repositories/delivery.repository";
import { webhookEventRepository } from "@/lib/db/repositories/webhook-event.repository";
import { mapDoorDashStatusToDomain } from "@/lib/integrations/delivery/doordash/mappers";
import { doorDashDriveAdapter } from "@/lib/integrations/delivery/doordash/adapter";
import { parseDoorDashWebhook } from "@/lib/integrations/delivery/doordash/webhook";
import { syncDeliveryFromProvider } from "@/lib/services/delivery/sync-from-provider";
import { syncOrderFromLinkedDelivery } from "@/lib/services/order/sync-order-from-delivery";
import { logger } from "@/lib/utils/logger";

async function resolveDeliveryForWebhook(externalDeliveryId?: string) {
  if (!externalDeliveryId) {
    return null;
  }

  const byExternal = await deliveryRepository.findByExternalId(externalDeliveryId);
  if (byExternal) {
    return byExternal;
  }

  return deliveryRepository.findByProviderDeliveryId(externalDeliveryId);
}

/** Process a DoorDash Drive webhook event. */
export async function handleDoorDashWebhook(
  rawBody: string,
  headers: Headers,
): Promise<void> {
  const parsedEvent = await doorDashDriveAdapter.parseWebhook(rawBody, headers);
  if (!parsedEvent) {
    return;
  }

  const payload = parseDoorDashWebhook(rawBody);
  const eventId = parsedEvent.eventId;

  const { event, created } = await webhookEventRepository.createIfNotExists({
    eventId,
    eventType: payload.event_type ?? "doordash.webhook",
    payload: JSON.parse(rawBody) as Prisma.InputJsonValue,
  });

  if (!created && event.processedAt) {
    logger.info("webhook.duplicate", { eventId });
    return;
  }

  const delivery = await resolveDeliveryForWebhook(parsedEvent.externalOrderId);
  if (!delivery) {
    logger.warn("webhook.delivery_not_found", {
      eventId,
      externalDeliveryId: parsedEvent.externalOrderId,
    });
    await webhookEventRepository.markProcessed(event.id);
    return;
  }

  const status = mapDoorDashStatusToDomain(parsedEvent.status);

  let updated = await deliveryRepository.update(delivery.id, delivery.storeId, {
    status,
    ...(parsedEvent.providerOrderId
      ? {
          providerOrderId: parsedEvent.providerOrderId,
          providerDeliveryId:
            delivery.providerDeliveryId ?? parsedEvent.externalOrderId ?? undefined,
        }
      : {}),
  });

  if (status === "completed") {
    updated = await syncDeliveryFromProvider(updated);
  }

  await syncOrderFromLinkedDelivery(updated);

  await webhookEventRepository.markProcessed(event.id, updated.id);

  logger.info("webhook.processed", {
    eventId,
    deliveryId: updated.id,
    providerId: "doordash_drive",
    status: updated.status,
  });
}
