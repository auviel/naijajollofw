import { requireStoreManager } from "@/lib/auth/session";
import { deliveryRepository } from "@/lib/db/repositories/delivery.repository";
import {
  mapOrderToStaffDetail,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import { canClaimCourierDispatch } from "@/lib/domain/order/fulfill-preconditions";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { fulfillDelivergoSchema } from "@/lib/domain/order/validation-staff";
import type { DeliveryProviderId } from "@/lib/domain/delivery/types";
import { buildProviderCancelRequest } from "@/lib/integrations/delivery/cancel-reasons";
import { getDeliveryProviderById } from "@/lib/integrations/delivery/provider.registry";
import { createDeliveryForStore } from "@/lib/services/delivery/create-delivery";
import { notifyOrderStatus } from "@/lib/services/order/notify-order-status";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

async function cancelOrphanCourierDelivery(
  deliveryId: string,
  storeId: string,
): Promise<void> {
  const delivery = await deliveryRepository.findByIdAndStoreId(
    deliveryId,
    storeId,
  );
  if (!delivery?.providerDeliveryId) {
    return;
  }

  try {
    const provider = getDeliveryProviderById(
      delivery.providerId as DeliveryProviderId,
    );
    await provider.cancelDelivery(
      delivery.providerDeliveryId,
      buildProviderCancelRequest({
        providerId: delivery.providerId as DeliveryProviderId,
        reason: "OTHER",
        details: "Order already assigned another courier; rolling back duplicate",
      }),
    );
    await deliveryRepository.update(deliveryId, storeId, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: "OTHER: duplicate dispatch rollback",
    });
  } catch (error) {
    logger.error("order.fulfill.orphan_delivery_cancel_failed", {
      deliveryId,
      storeId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function fulfillOrderDelivergo(
  orderId: string,
  input: unknown,
): Promise<StaffOrderDetail> {
  const user = await requireStoreManager();
  const parsed = fulfillDelivergoSchema.parse(input);

  const existing = await orderRepository.findByIdForStore(orderId, user.storeId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  if (
    !canClaimCourierDispatch({
      status: existing.status,
      fulfillmentType: existing.fulfillmentType,
      fulfillmentMethod: existing.fulfillmentMethod,
      deliveryId: existing.deliveryId,
    })
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      existing.fulfillmentType !== "delivery"
        ? "Courier dispatch is only for delivery orders."
        : existing.status !== "ready"
          ? "Order must be ready before dispatching a courier."
          : "This order is already assigned a fulfillment method.",
      400,
    );
  }

  if (!existing.dropoffAddress) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Delivery order is missing a dropoff address.",
      400,
    );
  }

  // Stable per-order key so double-clicks with the same quote reuse one provider job.
  const idempotencyKey =
    parsed.idempotencyKey ?? `order-dispatch-${orderId}`;

  const created = await createDeliveryForStore(
    user.storeId,
    {
      providerId: parsed.providerId,
      quoteId: parsed.quoteId,
      dropoffName: existing.customerName,
      dropoffPhone: existing.customerPhone,
      dropoffAddress: existing.dropoffAddress,
      scheduledPickupAt: parsed.scheduledPickupAt,
      idempotencyKey,
    },
    { source: "order" },
  );

  const updated = await orderRepository.linkDelivergoDelivery({
    orderId,
    storeId: user.storeId,
    deliveryId: created.id,
    actor: user.email,
  });

  if (!updated) {
    await cancelOrphanCourierDelivery(created.id, user.storeId);
    throw new AppError(
      "CONFLICT",
      "This order was already assigned a courier. Refresh and try again.",
      409,
    );
  }

  void notifyOrderStatus({
    userId: updated.userId,
    customerPhone: updated.customerPhone,
    customerEmail: updated.customerEmail,
    userEmail: updated.user?.email,
    customerName: updated.customerName,
    storeName: updated.store?.name ?? "Restaurant",
    orderId: updated.id,
    publicToken: updated.publicToken,
    status: updated.status,
    fulfillmentType: updated.fulfillmentType,
    courierTrackingUrl: created.trackingUrl ?? updated.delivery?.trackingUrl,
    displayNumber: updated.displayNumber,
  });

  return mapOrderToStaffDetail(updated);
}
